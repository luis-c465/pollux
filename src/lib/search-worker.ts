import * as Comlink from "comlink";
import { Charset, Document } from "flexsearch";
import { type DBSchema, openDB } from "idb";

// ---------------------------------------------------------------------------
// We duplicate the minimal DB types here so the worker doesn't import from
// db.ts (which pulls in @assistant-ui/react — a main-thread-only library).
// ---------------------------------------------------------------------------

type ThreadStatus = "regular" | "archived";

type StoredThread = {
	id: string;
	title: string;
	status: ThreadStatus;
	createdAt: number;
	updatedAt: number;
};

type StoredMessage = {
	id: string;
	threadId: string;
	parentId: string | null;
	role: string;
	content: string;
	createdAt: number;
	attachments?: string;
	status?: string;
	metadata: string;
	runConfig?: string;
};

type PolluxDBSchema = DBSchema & {
	threads: {
		key: string;
		value: StoredThread;
		indexes: {
			status: ThreadStatus;
			updatedAt: number;
		};
	};
	messages: {
		key: string;
		value: StoredMessage;
		indexes: {
			threadId: string;
			threadId_createdAt: [string, number];
		};
	};
	attachments: {
		key: string;
		value: {
			id: string;
			messageId: string;
			threadId: string;
			name: string;
			contentType: string;
			type: "image" | "document";
			size: number;
			blob: Blob;
		};
		indexes: {
			messageId: string;
			threadId: string;
		};
	};
};

// ---------------------------------------------------------------------------
// DB access (worker gets its own connection to pollux-db)
// ---------------------------------------------------------------------------

const DB_NAME = "pollux-db";
const DB_VERSION = 2;

let dbPromise: ReturnType<typeof openDB<PolluxDBSchema>> | undefined;

function getDB() {
	if (!dbPromise) {
		dbPromise = openDB<PolluxDBSchema>(DB_NAME, DB_VERSION, {
			// No upgrade here — the main thread handles migrations.
		});
	}
	return dbPromise;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

type ContentPart = { type: string; text?: string };

function jsonParse<T>(value: string | undefined, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

function extractTextFromContent(content: string): string {
	const parts = jsonParse<ContentPart[]>(content, []);
	return parts
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text as string)
		.join(" ");
}

// ---------------------------------------------------------------------------
// FlexSearch document type
// ---------------------------------------------------------------------------

type SearchDoc = {
	id: string;
	title: string;
	content: string;
	updatedAt: number;
};

/** Result type returned to the main thread. */
export type SearchResult = {
	threadId: string;
	title: string;
	titleHtml: string;
	snippet: string;
	updatedAt: number;
};

// ---------------------------------------------------------------------------
// FlexSearch index
//
// Typed as `any` because after mount() the generic S doesn't update and
// operations that TypeScript types as sync actually return Promises at
// runtime.  Using `any` avoids misleading type-level guarantees.
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noExplicitAny: FlexSearch generic limitation after mount()
let searchIndex: any = null;
let initPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// HTML helpers — XSS-safe highlighting
//
// We use ASCII control characters (\x01 / \x02) as FlexSearch highlight
// markers.  After escaping HTML in the entire string (neutralising any
// user-supplied markup), we replace the control chars with <mark> tags.
// ---------------------------------------------------------------------------

const MARK_START = "\x01";
const MARK_END = "\x02";

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

const MARK_OPEN = '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded-sm">';
const MARK_CLOSE = "</mark>";

function highlightToHtml(highlighted: string): string {
	const escaped = escapeHtml(highlighted);
	return escaped
		.replaceAll(MARK_START, MARK_OPEN)
		.replaceAll(MARK_END, MARK_CLOSE);
}

// ---------------------------------------------------------------------------
// Build a SearchDoc for a given thread by reading from pollux-db
// ---------------------------------------------------------------------------

async function buildSearchDoc(threadId: string): Promise<SearchDoc | null> {
	const db = await getDB();
	const thread = await db.get("threads", threadId);
	if (!thread) return null;

	const messages = await db.getAllFromIndex("messages", "threadId", threadId);
	const textParts: string[] = [];
	for (const msg of messages) {
		if (msg.role !== "user" && msg.role !== "assistant") continue;
		const text = extractTextFromContent(msg.content);
		if (text.trim()) textParts.push(text);
	}

	return {
		id: thread.id,
		title: thread.title,
		content: textParts.join(" "),
		updatedAt: thread.updatedAt,
	};
}

// ---------------------------------------------------------------------------
// Custom IDB persistence for FlexSearch
//
// FlexSearch's built-in IndexedDB adapter uses `window.indexedDB` which is
// undefined in Web Workers.  We roll our own: a simple key-value store in a
// separate `pollux-search` IDB database (using the `idb` library, which
// correctly uses the bare `indexedDB` global available in workers).
//
// Persistence is done via FlexSearch's export(handler)/import(key, data) API:
//   - saveIndex()  — calls index.export() and writes each chunk to IDB
//   - loadIndex()  — reads all chunks from IDB and feeds them to index.import()
// ---------------------------------------------------------------------------

type SearchIndexSchema = DBSchema & {
	chunks: {
		key: string;
		value: string;
	};
};

const SEARCH_DB_NAME = "pollux-search";
const SEARCH_DB_VERSION = 1;

let searchDbPromise: ReturnType<typeof openDB<SearchIndexSchema>> | undefined;

function getSearchDB() {
	if (!searchDbPromise) {
		searchDbPromise = openDB<SearchIndexSchema>(
			SEARCH_DB_NAME,
			SEARCH_DB_VERSION,
			{
				upgrade(db) {
					db.createObjectStore("chunks");
				},
			},
		);
	}
	return searchDbPromise;
}

/** Persist the entire in-memory index to our IDB store. */
async function saveIndex(): Promise<void> {
	const sdb = await getSearchDB();
	const chunks: Array<[string, string]> = [];

	// Document.export() is synchronous — it calls the handler once per chunk
	// and returns undefined when done (no sentinel call).
	searchIndex.export((key: string, data: string) => {
		if (data !== undefined) {
			chunks.push([key, data]);
		}
	});

	const tx = sdb.transaction("chunks", "readwrite");
	// Clear stale chunks before writing the new snapshot
	await tx.store.clear();
	await Promise.all(chunks.map(([key, data]) => tx.store.put(data, key)));
	await tx.done;
}

/** Restore the in-memory index from our IDB store. */
async function loadPersistedIndex(): Promise<boolean> {
	const sdb = await getSearchDB();
	const keys = await sdb.getAllKeys("chunks");
	if (!keys.length) return false;

	const tx = sdb.transaction("chunks", "readonly");
	await Promise.all(
		keys.map(async (key) => {
			const data = await tx.store.get(key);
			if (data !== undefined) {
				searchIndex.import(key, data);
			}
		}),
	);
	await tx.done;
	return true;
}

function createIndex(): Document<SearchDoc> {
	return new Document<SearchDoc>({
		tokenize: "forward",
		encoder: Charset.LatinBalance,
		document: {
			id: "id",
			index: [
				{ field: "title", resolution: 9 },
				{ field: "content", resolution: 3 },
			],
			store: true,
		},
	});
}

async function doRebuild(): Promise<void> {
	searchIndex = createIndex();

	const db = await getDB();
	const [threads, allMessages] = await Promise.all([
		db.getAll("threads"),
		db.getAll("messages"),
	]);

	// Group message text by threadId
	const textByThread = new Map<string, string[]>();
	for (const message of allMessages) {
		if (message.role !== "user" && message.role !== "assistant") continue;
		const text = extractTextFromContent(message.content);
		if (!text.trim()) continue;
		const existing = textByThread.get(message.threadId);
		if (existing) {
			existing.push(text);
		} else {
			textByThread.set(message.threadId, [text]);
		}
	}

	for (const thread of threads) {
		const doc: SearchDoc = {
			id: thread.id,
			title: thread.title,
			content: textByThread.get(thread.id)?.join(" ") ?? "",
			updatedAt: thread.updatedAt,
		};
		searchIndex.add(doc);
	}

	await saveIndex();
}

async function doInit(): Promise<void> {
	searchIndex = createIndex();

	// Try to restore from persisted IDB chunks first
	const restored = await loadPersistedIndex();

	if (!restored) {
		// No persisted index — build from scratch
		await doRebuild();
	}
}

async function ensureInitialized(): Promise<void> {
	if (!initPromise) {
		initPromise = doInit();
	}
	await initPromise;
}

// ---------------------------------------------------------------------------
// Worker API
// ---------------------------------------------------------------------------

const MAX_RESULTS = 25;

const workerApi = {
	/** Mount persistent storage, auto-rebuild if stale. */
	async init(): Promise<void> {
		await ensureInitialized();
	},

	/** Add or update a single thread in the search index. */
	async indexThread(threadId: string): Promise<void> {
		await ensureInitialized();
		const doc = await buildSearchDoc(threadId);
		if (doc) {
			searchIndex.update(doc);
			await saveIndex();
		}
	},

	/** Remove a thread from the search index. */
	async removeThread(threadId: string): Promise<void> {
		await ensureInitialized();
		searchIndex.remove(threadId);
		await saveIndex();
	},

	/** Full rebuild from pollux-db. */
	async rebuildIndex(): Promise<void> {
		await ensureInitialized();
		await doRebuild();
	},

	/** Run a search query and return pre-rendered HTML results. */
	async search(query: string): Promise<SearchResult[]> {
		await ensureInitialized();
		const trimmed = query.trim();
		if (!trimmed) return [];

		const results = searchIndex.search(trimmed, {
			limit: MAX_RESULTS,
			enrich: true,
			merge: true,
			suggest: true,
			highlight: {
				template: `${MARK_START}$1${MARK_END}`,
				boundary: { before: 50, after: 50, total: 120 },
				ellipsis: "…",
			},
		});

		// results is MergedDocumentSearchResults<SearchDoc>
		// Each item: { id, doc?, field?, highlight? }
		// biome-ignore lint/suspicious/noExplicitAny: FlexSearch merged result type
		return (results as any[]).map((item) => {
			const doc: SearchDoc | null = item.doc;
			const highlights: Record<string, string> | undefined = item.highlight;

			const title = doc?.title ?? String(item.id);
			const titleHtml = highlights?.title
				? highlightToHtml(highlights.title)
				: escapeHtml(title);

			let snippet = "";
			if (highlights?.content) {
				snippet = highlightToHtml(highlights.content);
			} else if (doc?.content) {
				snippet = escapeHtml(doc.content.slice(0, 120));
				if (doc.content.length > 120) snippet += "\u2026";
			}

			return {
				threadId: String(item.id),
				title,
				titleHtml,
				snippet,
				updatedAt: doc?.updatedAt ?? 0,
			};
		});
	},
};

export type SearchWorkerApi = typeof workerApi;

Comlink.expose(workerApi);
