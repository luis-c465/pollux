import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "#/components/assistant-ui/thread";
import { ChatHeader } from "#/components/chat-header";
import { ChatSidebar } from "#/components/chat-sidebar";
import { GChatRuntimeProvider } from "#/components/runtime-provider";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<GChatRuntimeProvider>
			<SidebarProvider className="h-full min-h-0">
				<ChatSidebar />
				<SidebarInset className="min-w-0">
					<ChatHeader />
					<div className="min-h-0 flex-1">
						<Thread />
					</div>
				</SidebarInset>
			</SidebarProvider>
		</GChatRuntimeProvider>
	);
}
