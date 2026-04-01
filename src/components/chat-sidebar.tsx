import { ThreadListPrimitive } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { ThreadList } from "#/components/assistant-ui/thread-list";
import { SettingsDialog } from "#/components/settings-dialog";
import ThemeToggle from "#/components/ThemeToggle";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "#/components/ui/sidebar";

export function ChatSidebar() {
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
						variant="secondary"
						className="h-9 justify-start gap-2 rounded-lg px-2.5 text-sm group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
					>
						<PlusIcon className="size-4" />
						<span className="group-data-[collapsible=icon]:hidden">
							New Chat
						</span>
					</Button>
				</ThreadListPrimitive.New>
			</SidebarHeader>

			<SidebarContent>
				<ScrollArea className="h-full px-2 pb-2">
					<ThreadList />
				</ScrollArea>
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
