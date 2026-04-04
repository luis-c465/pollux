import { ThreadListPrimitive } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { ThreadList } from "#/components/assistant-ui/thread-list";
import { SettingsDialog } from "#/components/settings-dialog";
import ThemeToggle from "#/components/ThemeToggle";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatSidebar() {
	const newThreadButtonRef = useRef<HTMLButtonElement | null>(null);

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

	return (
		<div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
			<div className="flex flex-col gap-3 border-b p-2">
				<div className="flex items-center px-2 py-1">
					<span className="font-semibold text-sidebar-foreground text-sm">
						GChat
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
				<ThreadList />
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
