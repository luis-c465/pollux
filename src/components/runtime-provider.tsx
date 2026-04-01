import {
	AssistantRuntimeProvider,
	useLocalRuntime,
	useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import type { PropsWithChildren } from "react";
import { geminiAdapter } from "#/lib/gemini-adapter";
import { useSettings } from "#/lib/settings";
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
	return useLocalRuntime(geminiAdapter);
}

export function GChatRuntimeProvider({ children }: PropsWithChildren) {
	const runtime = useRemoteThreadListRuntime({
		runtimeHook: useGChatLocalRuntime,
		adapter: threadListAdapter,
	});
	const settings = useSettings();

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			{!settings.hasApiKey ? <MissingApiKeyNotice /> : null}
			{children}
		</AssistantRuntimeProvider>
	);
}
