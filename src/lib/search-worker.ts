import uFuzzy from "@leeoniya/ufuzzy";
import * as Comlink from "comlink";
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
// DB access (worker gets its own connection)
// ---------------------------------------------------------------------------

const DB_NAME = "pollux-db";
const DB_VERSION = 2;

let dbPromise: ReturnType<typeof openDB<PolluxDBSchema>> | undefined;

function getDB() {
	if (!dbPromise) {
		dbPromise = openDB<PolluxDBSchema>(DB_NAME, DB_VERSION, {
			// No upgrade here — the main thread handles migrations.
			// If the DB doesn't exist yet this is a no-op.
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
// Searchable thread type + cached index
// ---------------------------------------------------------------------------

type SearchableThread = {
	threadId: string;
	title: string;
	textContent: string;
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

let cachedData: SearchableThread[] | null = null;
let cachedTitles: string[] = [];
let cachedContents: string[] = [];

// ---------------------------------------------------------------------------
// uFuzzy instance
// ---------------------------------------------------------------------------

const uf = new uFuzzy({
	intraIns: 1,
	interIns: 3,
	interLft: 1,
	interRgt: 1,
});

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function applyHighlight(text: string, ranges: number[]): string {
	if (!ranges.length) return escapeHtml(text);
	return uFuzzy.highlight(text, ranges, (part, matched) =>
		matched
			? `<mark class="bg-yellow-200 dark:bg-yellow-700 rounded-sm">${escapeHtml(part)}</mark>`
			: escapeHtml(part),
	) as string;
}

// ---------------------------------------------------------------------------
// Worker API
// ---------------------------------------------------------------------------

const SNIPPET_RADIUS = 80;
const MAX_RESULTS = 25;

const workerApi = {
	/**
	 * Load all threads + messages from IndexedDB and rebuild the in-memory
	 * search index. Runs entirely in the worker thread.
	 */
	async loadIndex(): Promise<number> {
		const db = await getDB();

		const [threads, allMessages] = await Promise.all([
			(async () => {
				const tx = db.transaction("threads", "readonly");
				const index = tx.store.index("updatedAt");
				const result: StoredThread[] = [];
				let cursor = await index.openCursor(null, "prev");
				while (cursor) {
					result.push(cursor.value);
					cursor = await cursor.continue();
				}
				await tx.done;
				return result;
			})(),
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

		cachedData = threads.map((thread) => ({
			threadId: thread.id,
			title: thread.title,
			textContent: textByThread.get(thread.id)?.join(" ") ?? "",
			updatedAt: thread.updatedAt,
		}));

		cachedTitles = cachedData.map((t) => t.title);
		cachedContents = cachedData.map((t) => t.textContent);

		return cachedData.length;
	},

	/**
	 * Run fuzzy search against the cached index. Returns pre-rendered HTML
	 * so the main thread does zero string processing.
	 */
	search(query: string): SearchResult[] {
		if (!cachedData) return [];
		const trimmed = query.trim();
		if (!trimmed) return [];

		// Search titles (2x weight) and content (1x weight) separately
		const [titleIdxs, titleInfo, titleOrder] = uf.search(cachedTitles, trimmed);
		const [contentIdxs, contentInfo, contentOrder] = uf.search(
			cachedContents,
			trimmed,
		);

		// Accumulate scores per threadId
		const scoreMap = new Map<
			string,
			{
				score: number;
				titleRanges: number[];
				contentRanges: number[];
				thread: SearchableThread;
			}
		>();

		if (titleIdxs && titleOrder) {
			for (let r = 0; r < titleOrder.length; r++) {
				const orderIdx = titleOrder[r];
				if (orderIdx === undefined) continue;
				const dataIdx = titleIdxs[orderIdx];
				if (dataIdx === undefined) continue;
				const thread = cachedData[dataIdx];
				if (!thread) continue;
				const intra = titleInfo?.intraIns[orderIdx] ?? 0;
				const rankBonus = Math.max(0, MAX_RESULTS - r);
				const titleRanges = titleInfo?.ranges[orderIdx] ?? [];
				const entry = scoreMap.get(thread.threadId);
				if (entry) {
					entry.score += (rankBonus + 10 - intra) * 2;
					if (!entry.titleRanges.length) entry.titleRanges = titleRanges;
				} else {
					scoreMap.set(thread.threadId, {
						score: (rankBonus + 10 - intra) * 2,
						titleRanges,
						contentRanges: [],
						thread,
					});
				}
			}
		}

		if (contentIdxs && contentOrder) {
			for (let r = 0; r < contentOrder.length; r++) {
				const orderIdx = contentOrder[r];
				if (orderIdx === undefined) continue;
				const dataIdx = contentIdxs[orderIdx];
				if (dataIdx === undefined) continue;
				const thread = cachedData[dataIdx];
				if (!thread) continue;
				const intra = contentInfo?.intraIns[orderIdx] ?? 0;
				const rankBonus = Math.max(0, MAX_RESULTS - r);
				const contentRanges = contentInfo?.ranges[orderIdx] ?? [];
				const entry = scoreMap.get(thread.threadId);
				if (entry) {
					entry.score += rankBonus + 10 - intra;
					if (!entry.contentRanges.length) entry.contentRanges = contentRanges;
				} else {
					scoreMap.set(thread.threadId, {
						score: rankBonus + 10 - intra,
						titleRanges: [],
						contentRanges,
						thread,
					});
				}
			}
		}

		// Sort and slice
		const sorted = [...scoreMap.values()].sort((a, b) => b.score - a.score);
		const top = sorted.slice(0, MAX_RESULTS);

		return top.map(({ thread, titleRanges, contentRanges }) => {
			const titleHtml = applyHighlight(thread.title, titleRanges);

			let snippet = "";
			if (contentRanges.length && thread.textContent) {
				const firstStart = contentRanges[0] ?? 0;
				const snippetStart = Math.max(0, firstStart - SNIPPET_RADIUS);
				const snippetEnd = Math.min(
					thread.textContent.length,
					firstStart + SNIPPET_RADIUS,
				);
				const snippetText = thread.textContent.slice(snippetStart, snippetEnd);
				const shiftedRanges = contentRanges.map((n) =>
					Math.max(0, n - snippetStart),
				);
				const snippetHtml = applyHighlight(snippetText, shiftedRanges);
				const prefix = snippetStart > 0 ? "\u2026" : "";
				const suffix = snippetEnd < thread.textContent.length ? "\u2026" : "";
				snippet = prefix + snippetHtml + suffix;
			} else if (thread.textContent) {
				snippet = escapeHtml(thread.textContent.slice(0, 120));
				if (thread.textContent.length > 120) snippet += "\u2026";
			}

			return {
				threadId: thread.threadId,
				title: thread.title,
				titleHtml,
				snippet,
				updatedAt: thread.updatedAt,
			};
		});
	},
};

export type SearchWorkerApi = typeof workerApi;

Comlink.expose(workerApi);
