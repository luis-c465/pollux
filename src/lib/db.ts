import type {
	ExportedMessageRepositoryItem,
	ThreadMessage,
} from "@assistant-ui/react";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export type ThreadStatus = "regular" | "archived";

export type StoredThread = {
	id: string;
	title: string;
	status: ThreadStatus;
	createdAt: number;
	updatedAt: number;
};

export type StoredMessage = {
	id: string;
	threadId: string;
	parentId: string | null;
	role: ThreadMessage["role"];
	content: string;
	createdAt: number;
	attachments?: string;
	status?: string;
	metadata: string;
	runConfig?: string;
};

export type StoredAttachment = {
	id: string;
	messageId: string;
	threadId: string;
	name: string;
	contentType: string;
	type: "image" | "document";
	size: number;
	blob: Blob;
};

export type AttachmentRef = {
	id: string;
	name: string;
	contentType: string;
	type: "image" | "document";
	size: number;
};

type GChatDBSchema = DBSchema & {
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
		value: StoredAttachment;
		indexes: {
			messageId: string;
			threadId: string;
		};
	};
};

const DB_NAME = "gchat-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<GChatDBSchema>> | undefined;

const jsonParse = <T>(value: string | undefined, fallback: T): T => {
	if (!value) return fallback;

	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
};

export const serializeMessage = (
	item: ExportedMessageRepositoryItem,
): StoredMessage => {
	const createdAt = item.message.createdAt.getTime();
	const attachments = item.message.attachments?.map((attachment) => {
		const { file: _file, ...rest } = attachment;
		return rest;
	});

	return {
		id: item.message.id ?? crypto.randomUUID(),
		threadId: "",
		parentId: item.parentId,
		role: item.message.role,
		content: JSON.stringify(item.message.content),
		createdAt,
		attachments: attachments ? JSON.stringify(attachments) : undefined,
		status: item.message.status
			? JSON.stringify(item.message.status)
			: undefined,
		metadata: JSON.stringify(item.message.metadata ?? { custom: {} }),
		runConfig: item.runConfig ? JSON.stringify(item.runConfig) : undefined,
	};
};

export const deserializeMessage = (
	storedMessage: StoredMessage,
): ExportedMessageRepositoryItem => {
	const message = {
		id: storedMessage.id,
		role: storedMessage.role,
		content: jsonParse<ThreadMessage["content"]>(storedMessage.content, []),
		createdAt: new Date(storedMessage.createdAt),
		attachments: jsonParse(storedMessage.attachments, undefined),
		status: jsonParse(storedMessage.status, undefined),
		metadata: jsonParse(storedMessage.metadata, { custom: {} }),
	} as ThreadMessage;

	return {
		message,
		parentId: storedMessage.parentId,
		runConfig: jsonParse<ExportedMessageRepositoryItem["runConfig"]>(
			storedMessage.runConfig,
			undefined,
		),
	};
};

// ---------------------------------------------------------------------------
// Database initialization with versioned migration
// ---------------------------------------------------------------------------

export const getDB = async (): Promise<IDBPDatabase<GChatDBSchema>> => {
	if (!dbPromise) {
		dbPromise = openDB<GChatDBSchema>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				// v1: threads + messages stores
				if (oldVersion < 1) {
					const threadStore = db.createObjectStore("threads", {
						keyPath: "id",
					});
					threadStore.createIndex("status", "status");
					threadStore.createIndex("updatedAt", "updatedAt");

					const messageStore = db.createObjectStore("messages", {
						keyPath: "id",
					});
					messageStore.createIndex("threadId", "threadId");
					messageStore.createIndex("threadId_createdAt", [
						"threadId",
						"createdAt",
					]);
				}

				// v2: attachments store (binary blob storage)
				if (oldVersion < 2) {
					const attachmentStore = db.createObjectStore("attachments", {
						keyPath: "id",
					});
					attachmentStore.createIndex("messageId", "messageId");
					attachmentStore.createIndex("threadId", "threadId");
				}
			},
		});
	}

	return dbPromise;
};

// ---------------------------------------------------------------------------
// Thread queries — use the updatedAt index for sorted retrieval
// ---------------------------------------------------------------------------

/** Returns all threads sorted by updatedAt descending, using the B-tree index. */
export const getAllThreads = async (): Promise<StoredThread[]> => {
	const db = await getDB();
	const tx = db.transaction("threads", "readonly");
	const index = tx.store.index("updatedAt");
	const threads: StoredThread[] = [];

	let cursor = await index.openCursor(null, "prev");
	while (cursor) {
		threads.push(cursor.value);
		cursor = await cursor.continue();
	}

	await tx.done;
	return threads;
};

/**
 * Returns a page of threads sorted by updatedAt descending.
 * Pass `beforeUpdatedAt` to fetch the next page (cursor-based pagination).
 * Optionally filter by `status` (defaults to "regular").
 */
export const getThreadsPage = async (
	limit: number,
	beforeUpdatedAt?: number,
	status: ThreadStatus = "regular",
): Promise<{ threads: StoredThread[]; hasMore: boolean }> => {
	const db = await getDB();
	const tx = db.transaction("threads", "readonly");
	const index = tx.store.index("updatedAt");

	const range = beforeUpdatedAt
		? IDBKeyRange.upperBound(beforeUpdatedAt, true)
		: undefined;

	const threads: StoredThread[] = [];
	let cursor = await index.openCursor(range, "prev");

	while (cursor && threads.length < limit + 1) {
		if (cursor.value.status === status) {
			threads.push(cursor.value);
		}
		cursor = await cursor.continue();
	}

	const hasMore = threads.length > limit;
	if (hasMore) threads.pop();

	await tx.done;
	return { threads, hasMore };
};

/** Returns the total count of threads, optionally filtered by status. */
export const getThreadCount = async (
	status?: ThreadStatus,
): Promise<number> => {
	const db = await getDB();
	if (status) {
		return db.countFromIndex("threads", "status", status);
	}
	return db.count("threads");
};

export const getThread = async (
	id: string,
): Promise<StoredThread | undefined> => {
	const db = await getDB();
	return db.get("threads", id);
};

export const createThread = async (
	thread: Partial<StoredThread> & {
		id?: string;
		title?: string;
		status?: ThreadStatus;
	},
): Promise<StoredThread> => {
	const db = await getDB();
	const now = Date.now();
	const entry: StoredThread = {
		id: thread.id ?? crypto.randomUUID(),
		title: thread.title ?? "New Chat",
		status: thread.status ?? "regular",
		createdAt: thread.createdAt ?? now,
		updatedAt: thread.updatedAt ?? now,
	};

	await db.put("threads", entry);
	return entry;
};

export const updateThread = async (
	id: string,
	updates: Partial<Omit<StoredThread, "id" | "createdAt">>,
): Promise<StoredThread> => {
	const db = await getDB();
	const tx = db.transaction("threads", "readwrite");
	const existing = await tx.store.get(id);

	if (!existing) {
		throw new Error(`Thread not found: ${id}`);
	}

	const nextThread: StoredThread = {
		...existing,
		...updates,
		updatedAt: updates.updatedAt ?? Date.now(),
	};

	await tx.store.put(nextThread);
	await tx.done;
	return nextThread;
};

// ---------------------------------------------------------------------------
// Message operations
// ---------------------------------------------------------------------------

const deleteMessagesByThreadIdInTransaction = async (
	db: IDBPDatabase<GChatDBSchema>,
	threadId: string,
): Promise<void> => {
	const tx = db.transaction("messages", "readwrite");
	const keys = await tx.store.index("threadId").getAllKeys(threadId);

	await Promise.all(keys.map((key) => tx.store.delete(key)));
	await tx.done;
};

export const deleteMessagesByThreadId = async (
	threadId: string,
): Promise<void> => {
	const db = await getDB();
	await deleteMessagesByThreadIdInTransaction(db, threadId);
};

export const deleteThread = async (id: string): Promise<void> => {
	const db = await getDB();
	const tx = db.transaction(
		["threads", "messages", "attachments"],
		"readwrite",
	);

	await tx.objectStore("threads").delete(id);

	// Delete all messages for this thread
	const messageKeys = await tx
		.objectStore("messages")
		.index("threadId")
		.getAllKeys(id);

	await Promise.all(
		messageKeys.map((key) => tx.objectStore("messages").delete(key)),
	);

	// Delete all attachments for this thread
	const attachmentKeys = await tx
		.objectStore("attachments")
		.index("threadId")
		.getAllKeys(id);

	await Promise.all(
		attachmentKeys.map((key) => tx.objectStore("attachments").delete(key)),
	);

	await tx.done;
};

export const getMessagesByThreadId = async (
	threadId: string,
): Promise<StoredMessage[]> => {
	const db = await getDB();
	const tx = db.transaction("messages", "readonly");
	const entries = await tx.store
		.index("threadId_createdAt")
		.getAll(
			IDBKeyRange.bound([threadId, 0], [threadId, Number.MAX_SAFE_INTEGER]),
		);

	await tx.done;
	return entries;
};

export const addMessage = async (
	threadId: string,
	item: ExportedMessageRepositoryItem,
): Promise<StoredMessage> => {
	const db = await getDB();
	const tx = db.transaction(["threads", "messages"], "readwrite");

	const now = Date.now();
	const serialized = serializeMessage(item);
	const message: StoredMessage = {
		...serialized,
		id: serialized.id || crypto.randomUUID(),
		threadId,
	};

	await tx.objectStore("messages").put(message);

	const existingThread = await tx.objectStore("threads").get(threadId);
	if (existingThread) {
		await tx.objectStore("threads").put({
			...existingThread,
			updatedAt: now,
		});
	} else {
		await tx.objectStore("threads").put({
			id: threadId,
			title: "New Chat",
			status: "regular",
			createdAt: now,
			updatedAt: now,
		});
	}

	await tx.done;

	return message;
};

// ---------------------------------------------------------------------------
// Attachment operations (binary Blob storage)
// ---------------------------------------------------------------------------

/** Persist attachment blobs and return lightweight references. */
export const saveAttachments = async (
	threadId: string,
	messageId: string,
	attachments: Array<{
		name: string;
		contentType: string;
		type: "image" | "document";
		data: Blob;
	}>,
): Promise<AttachmentRef[]> => {
	const db = await getDB();
	const tx = db.transaction("attachments", "readwrite");
	const refs: AttachmentRef[] = [];

	for (const attachment of attachments) {
		const id = crypto.randomUUID();
		const stored: StoredAttachment = {
			id,
			messageId,
			threadId,
			name: attachment.name,
			contentType: attachment.contentType,
			type: attachment.type,
			size: attachment.data.size,
			blob: attachment.data,
		};
		await tx.store.put(stored);
		refs.push({
			id,
			name: attachment.name,
			contentType: attachment.contentType,
			type: attachment.type,
			size: attachment.data.size,
		});
	}

	await tx.done;
	return refs;
};

/** Load a single attachment blob by ID (lazy-load on demand). */
export const getAttachmentById = async (
	id: string,
): Promise<StoredAttachment | undefined> => {
	const db = await getDB();
	return db.get("attachments", id);
};

/** Load all attachments for a given message. */
export const getAttachmentsByMessageId = async (
	messageId: string,
): Promise<StoredAttachment[]> => {
	const db = await getDB();
	return db.getAllFromIndex("attachments", "messageId", messageId);
};

/** Delete all attachments for a given thread. */
export const deleteAttachmentsByThreadId = async (
	threadId: string,
): Promise<void> => {
	const db = await getDB();
	const tx = db.transaction("attachments", "readwrite");
	const keys = await tx.store.index("threadId").getAllKeys(threadId);
	await Promise.all(keys.map((key) => tx.store.delete(key)));
	await tx.done;
};
