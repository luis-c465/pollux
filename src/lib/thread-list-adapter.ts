import type {
	RemoteThreadListAdapter,
	ThreadMessage,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";

import {
	createThread,
	deleteThread,
	getAllThreads,
	getThread,
	updateThread,
} from "@/lib/db";
import { ThreadHistoryProvider } from "@/lib/thread-history-adapter";

const NEW_CHAT_TITLE = "New Chat";
const TITLE_MAX_LENGTH = 50;

const getTitleFromMessages = (messages: readonly ThreadMessage[]) => {
	const firstUserMessage = messages.find((message) => message.role === "user");
	if (!firstUserMessage) {
		return NEW_CHAT_TITLE;
	}

	const textContent = firstUserMessage.content
		.filter((part) => part.type === "text")
		.map((part) => part.text.trim())
		.filter(Boolean)
		.join(" ");

	if (!textContent) {
		return NEW_CHAT_TITLE;
	}

	return textContent.slice(0, TITLE_MAX_LENGTH);
};

export const threadListAdapter: RemoteThreadListAdapter = {
	list: async () => {
		const threads = await getAllThreads();

		return {
			threads: threads.map((thread) => ({
				remoteId: thread.id,
				status: thread.status,
				title: thread.title,
			})),
		};
	},
	initialize: async (localId) => {
		await createThread({
			id: localId,
			title: NEW_CHAT_TITLE,
			status: "regular",
		});

		return {
			remoteId: localId,
			externalId: undefined,
		};
	},
	rename: async (remoteId, newTitle) => {
		await updateThread(remoteId, { title: newTitle });
	},
	archive: async (remoteId) => {
		await updateThread(remoteId, { status: "archived" });
	},
	unarchive: async (remoteId) => {
		await updateThread(remoteId, { status: "regular" });
	},
	delete: async (remoteId) => {
		await deleteThread(remoteId);
	},
	generateTitle: async (remoteId, messages) => {
		const title = getTitleFromMessages(messages);
		await updateThread(remoteId, { title });

		return createAssistantStream((controller) => {
			controller.appendText(title);
			controller.close();
		});
	},
	fetch: async (remoteId) => {
		const thread = await getThread(remoteId);

		if (!thread) {
			throw new Error(`Thread not found: ${remoteId}`);
		}

		return {
			remoteId: thread.id,
			status: thread.status,
			title: thread.title,
		};
	},
	unstable_Provider: ThreadHistoryProvider,
};
