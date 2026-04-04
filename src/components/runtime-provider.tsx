import {
	AssistantRuntimeProvider,
	useAuiState,
	useLocalRuntime,
	useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { Loader2Icon } from "lucide-react";
import { type PropsWithChildren, useEffect, useState } from "react";
import { compositeAttachmentAdapter } from "#/lib/attachment-adapter";
import { geminiAdapter } from "#/lib/gemini-adapter";
import { useSettings } from "#/lib/settings";
import { useStreamingStore } from "#/lib/streaming-store";
import { threadListAdapter } from "#/lib/thread-list-adapter";

function MissingApiKeyNotice() {
	return (
		<div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-800 text-sm dark:text-amber-200">
			Gemini API key not set. Open Settings to add your key before sending
			messages.
		</div>
	);
}

function useGChatLocalRuntime() {
	return useLocalRuntime(geminiAdapter, {
		adapters: {
			attachments: compositeAttachmentAdapter,
		},
	});
}

function StreamingStateSync() {
	const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
	const isRunning = useAuiState((s) => s.thread.isRunning);

	useEffect(() => {
		if (!mainThreadId) {
			return;
		}

		useStreamingStore.getState().setRunning(mainThreadId, isRunning);
	}, [isRunning, mainThreadId]);

	return null;
}

export function GChatRuntimeProvider({ children }: PropsWithChildren) {
	const runtime = useRemoteThreadListRuntime({
		runtimeHook: useGChatLocalRuntime,
		adapter: threadListAdapter,
	});
	const settings = useSettings();
	const [isInitializing, setIsInitializing] = useState(true);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setIsInitializing(false);
		}, 250);

		return () => window.clearTimeout(timer);
	}, []);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<StreamingStateSync />
			{isInitializing ? (
				<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
					<Loader2Icon className="mr-2 size-4 animate-spin" />
					Loading your local chat history…
				</div>
			) : null}
			{!settings.hasApiKey ? <MissingApiKeyNotice /> : null}
			{isInitializing ? null : children}
		</AssistantRuntimeProvider>
	);
}
