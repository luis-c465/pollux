import {
	RuntimeAdapterProvider,
	type ThreadHistoryAdapter,
	useAui,
} from "@assistant-ui/react";
import { createElement, type ReactNode, useMemo } from "react";

import {
	addMessage,
	deserializeMessage,
	getMessagesByThreadId,
} from "@/lib/db";

type ThreadHistoryProviderProps = {
	children: ReactNode;
};

export const ThreadHistoryProvider = ({
	children,
}: ThreadHistoryProviderProps) => {
	const aui = useAui();

	const history = useMemo<ThreadHistoryAdapter>(
		() => ({
			load: async () => {
				const { remoteId } = aui.threadListItem().getState();
				if (!remoteId) {
					return { messages: [] };
				}

				const storedMessages = await getMessagesByThreadId(remoteId);
				const messages = storedMessages.map(deserializeMessage);

				return {
					headId: messages.at(-1)?.message.id ?? null,
					messages,
				};
			},
			append: async (item) => {
				const { remoteId } = await aui.threadListItem().initialize();
				await addMessage(remoteId, item);
			},
		}),
		[aui],
	);

	const adapters = useMemo(() => ({ history }), [history]);

	return createElement(RuntimeAdapterProvider, { adapters, children });
};
