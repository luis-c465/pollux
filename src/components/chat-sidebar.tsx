import { ThreadListPrimitive } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { ThreadList } from "#/components/assistant-ui/thread-list";
import { SettingsDialog } from "#/components/settings-dialog";
import ThemeToggle from "#/components/ThemeToggle";
import { Button } from "#/components/ui/button";
import { useSidebar } from "#/components/ui/sidebar";
import { focusChatInput, NEW_CHAT_EVENT } from "#/lib/keyboard-shortcuts";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatSidebar() {
	const newThreadButtonRef = useRef<HTMLButtonElement | null>(null);
	const { isMobile, setOpenMobile } = useSidebar();

	useEffect(() => {
		const handleShortcut = (event: KeyboardEvent) => {
			const isMeta = event.metaKey || event.ctrlKey;
			if (!isMeta || !event.shiftKey) return;
			if (event.key.toLowerCase() !== "n") return;

			event.preventDefault();
			newThreadButtonRef.current?.click();
		};

		window.addEventListener("keydown", handleShortcut);
		return () => {
			window.removeEventListener("keydown", handleShortcut);
		};
	}, []);

	useEffect(() => {
		const handleNewChat = () => {
			newThreadButtonRef.current?.click();
			setTimeout(() => {
				focusChatInput();
			}, 50);
		};

		window.addEventListener(NEW_CHAT_EVENT, handleNewChat);
		return () => {
			window.removeEventListener(NEW_CHAT_EVENT, handleNewChat);
		};
	}, []);

	return (
		<div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
			<div className="flex flex-col gap-3 border-b p-2">
				<div className="flex items-center gap-2 px-2 py-1">
					<img src="/favicon.svg" alt="Pollux" className="size-5 shrink-0" />
					<span
						className="font-semibold text-sm"
						style={{
							background:
								"linear-gradient(135deg, #ff3300 0%, #ff9900 50%, #ffff00 100%)",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							backgroundClip: "text",
						}}
					>
						Pollux
					</span>
				</div>
				<ThreadListPrimitive.New asChild>
					<Button
						ref={newThreadButtonRef}
						variant="secondary"
						className="h-9 justify-start gap-2 rounded-lg px-2.5 text-sm"
						title="New Chat (Ctrl/Cmd+Shift+N)"
					>
						<PlusIcon className="size-4" />
						<span>New Chat</span>
					</Button>
				</ThreadListPrimitive.New>
				<p className="truncate px-1 text-muted-foreground text-xs">
					No chats yet? Start a new conversation.
				</p>
			</div>

			<ScrollArea className="min-h-0 flex-1 max-w-full">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: event delegation wrapper for mobile sidebar close */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events are handled by the interactive thread item buttons inside */}
				<div
					onClick={(e) => {
						if (
							isMobile &&
							(e.target as HTMLElement).closest(".aui-thread-list-item-trigger")
						) {
							setOpenMobile(false);
						}
					}}
				>
					<ThreadList />
				</div>
			</ScrollArea>

			<div className="border-t p-2">
				<div className="flex items-center justify-between gap-2">
					<SettingsDialog />
					<ThemeToggle />
				</div>
			</div>
		</div>
	);
}
