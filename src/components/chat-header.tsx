import { useAuiState } from "@assistant-ui/react";
import {
	PanelLeftIcon,
	PlusIcon,
	SearchIcon,
	SettingsIcon,
} from "lucide-react";
import { openSettingsDialog } from "#/components/settings-dialog";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { NEW_CHAT_EVENT, OPEN_SEARCH_EVENT } from "#/lib/keyboard-shortcuts";

type ChatHeaderProps = {
	onToggleSidebar: () => void;
	sidebarCollapsed: boolean;
};

export function ChatHeader({
	onToggleSidebar,
	sidebarCollapsed,
}: ChatHeaderProps) {
	const activeThreadTitle = useAuiState((s) => {
		const activeThread = s.threads.threadItems.find(
			(thread) => thread.id === s.threads.mainThreadId,
		);

		return activeThread?.title?.trim() || "New Chat";
	});

	return (
		<header className="relative flex h-12 items-center border-b px-4">
			<div className="z-10 flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={onToggleSidebar}
					aria-label="Toggle sidebar"
					title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
				>
					<PanelLeftIcon className="size-4" />
				</Button>
				<Separator orientation="vertical" className="h-4" />
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => {
						window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
					}}
					aria-label="Search chats"
					title="Search (Alt+F)"
				>
					<SearchIcon className="size-4" />
				</Button>
				<Separator orientation="vertical" className="h-4" />
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => {
						window.dispatchEvent(new Event(NEW_CHAT_EVENT));
					}}
					aria-label="New chat"
					title="New Chat"
				>
					<PlusIcon className="size-4" />
				</Button>
			</div>
			<div className="z-10 ml-auto">
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={openSettingsDialog}
					aria-label="Open settings"
					title="Settings"
				>
					<SettingsIcon className="size-4" />
				</Button>
			</div>
			<div className="pointer-events-none absolute inset-x-0 flex justify-center px-24">
				<p className="max-w-full truncate font-medium text-foreground text-sm">
					{activeThreadTitle}
				</p>
			</div>
		</header>
	);
}
