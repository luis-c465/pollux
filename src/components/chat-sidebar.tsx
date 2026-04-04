import { ThreadListPrimitive } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { ThreadList } from "#/components/assistant-ui/thread-list";
import { SettingsDialog } from "#/components/settings-dialog";
import ThemeToggle from "#/components/ThemeToggle";
import { Button } from "#/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "#/components/ui/sidebar";

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
		<Sidebar collapsible="icon" className="border-r">
			<SidebarHeader className="gap-3 border-b">
				<div className="flex items-center px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<span className="font-semibold text-sidebar-foreground text-sm group-data-[collapsible=icon]:hidden">
						GChat
					</span>
					<span className="hidden font-semibold text-sidebar-foreground text-sm group-data-[collapsible=icon]:inline">
						G
					</span>
				</div>
				<ThreadListPrimitive.New asChild>
					<Button
						ref={newThreadButtonRef}
						variant="secondary"
						className="h-9 justify-start gap-2 rounded-lg px-2.5 text-sm group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
						title="New Chat (Ctrl/Cmd+Shift+N)"
					>
						<PlusIcon className="size-4" />
						<span className="group-data-[collapsible=icon]:hidden">
							New Chat
						</span>
					</Button>
				</ThreadListPrimitive.New>
				<p className="truncate px-1 text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
					No chats yet? Start a new conversation.
				</p>
			</SidebarHeader>

			<SidebarContent className="max-w-full">

					<ThreadList />

			</SidebarContent>

			<SidebarFooter className="border-t">
				<div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
					<SettingsDialog />
					<ThemeToggle />
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
