import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "#/components/assistant-ui/thread";
import { ThreadList } from "#/components/assistant-ui/thread-list";
import { GChatRuntimeProvider } from "#/components/runtime-provider";
import { SettingsDialog } from "#/components/settings-dialog";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<GChatRuntimeProvider>
			<div className="grid h-full grid-cols-1 md:grid-cols-[280px_1fr]">
				<aside className="hidden h-full border-r bg-muted/20 p-3 md:flex md:flex-col md:gap-3">
					<div className="flex items-center justify-between">
						<h1 className="font-semibold text-sm">GChat</h1>
						<SettingsDialog />
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						<ThreadList />
					</div>
				</aside>

				<main className="h-full min-h-0">
					<Thread />
				</main>
			</div>
		</GChatRuntimeProvider>
	);
}
