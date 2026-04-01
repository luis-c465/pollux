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
};

const DB_NAME = "gchat-db";
const DB_VERSION = 1;

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

	return {
		id: item.message.id ?? crypto.randomUUID(),
		threadId: "",
		parentId: item.parentId,
		role: item.message.role,
		content: JSON.stringify(item.message.content),
		createdAt,
		attachments: item.message.attachments
			? JSON.stringify(item.message.attachments)
			: undefined,
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

export const getDB = async () => {
	if (!dbPromise) {
		dbPromise = openDB<GChatDBSchema>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains("threads")) {
					const threadStore = db.createObjectStore("threads", {
						keyPath: "id",
					});
					threadStore.createIndex("status", "status");
					threadStore.createIndex("updatedAt", "updatedAt");
				}

				if (!db.objectStoreNames.contains("messages")) {
					const messageStore = db.createObjectStore("messages", {
						keyPath: "id",
					});
					messageStore.createIndex("threadId", "threadId");
					messageStore.createIndex("threadId_createdAt", [
						"threadId",
						"createdAt",
					]);
				}
			},
		});
	}

	return dbPromise;
};

export const getAllThreads = async () => {
	const db = await getDB();
	const threads = await db.getAll("threads");

	return threads.sort((left, right) => right.updatedAt - left.updatedAt);
};

export const getThread = async (id: string) => {
	const db = await getDB();
	return db.get("threads", id);
};

export const createThread = async (
	thread: Partial<StoredThread> & {
		id?: string;
		title?: string;
		status?: ThreadStatus;
	},
) => {
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
) => {
	const db = await getDB();
	const existing = await db.get("threads", id);

	if (!existing) {
		throw new Error(`Thread not found: ${id}`);
	}

	const nextThread: StoredThread = {
		...existing,
		...updates,
		updatedAt: updates.updatedAt ?? Date.now(),
	};

	await db.put("threads", nextThread);
	return nextThread;
};

const deleteMessagesByThreadIdInTransaction = async (
	db: IDBPDatabase<GChatDBSchema>,
	threadId: string,
) => {
	const tx = db.transaction("messages", "readwrite");
	const keys = await tx.store.index("threadId").getAllKeys(threadId);

	await Promise.all(keys.map((key) => tx.store.delete(key)));
	await tx.done;
};

export const deleteMessagesByThreadId = async (threadId: string) => {
	const db = await getDB();
	await deleteMessagesByThreadIdInTransaction(db, threadId);
};

export const deleteThread = async (id: string) => {
	const db = await getDB();
	const tx = db.transaction(["threads", "messages"], "readwrite");

	await tx.objectStore("threads").delete(id);

	const messageKeys = await tx
		.objectStore("messages")
		.index("threadId")
		.getAllKeys(id);

	await Promise.all(
		messageKeys.map((key) => tx.objectStore("messages").delete(key)),
	);

	await tx.done;
};

export const getMessagesByThreadId = async (threadId: string) => {
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
) => {
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
