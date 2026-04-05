import { useThreadListNew } from "@assistant-ui/core/react";
import { useEffect } from "react";
import { focusChatInput, NEW_CHAT_EVENT } from "#/lib/keyboard-shortcuts";

export function useNewChatHandler(): void {
	const { switchToNewThread } = useThreadListNew();

	useEffect(() => {
		const handleNewChat = () => {
			switchToNewThread();
			setTimeout(() => {
				focusChatInput();
			}, 50);
		};

		window.addEventListener(NEW_CHAT_EVENT, handleNewChat);
		return () => {
			window.removeEventListener(NEW_CHAT_EVENT, handleNewChat);
		};
	}, [switchToNewThread]);

	useEffect(() => {
		const handleShortcut = (event: KeyboardEvent) => {
			const isMeta = event.metaKey || event.ctrlKey;
			if (!isMeta || !event.shiftKey) return;
			if (event.key.toLowerCase() !== "n") return;

			event.preventDefault();
			switchToNewThread();
		};

		window.addEventListener("keydown", handleShortcut);
		return () => {
			window.removeEventListener("keydown", handleShortcut);
		};
	}, [switchToNewThread]);
}
