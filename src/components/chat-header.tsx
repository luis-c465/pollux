import { useAuiState } from "@assistant-ui/react";
import { PanelLeftIcon } from "lucide-react";
import { ContextDisplay } from "#/components/assistant-ui/context-display";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";

type ChatHeaderProps = {
	onToggleSidebar: () => void;
	sidebarCollapsed: boolean;
	modelContextWindow: number;
};

export function ChatHeader({
	onToggleSidebar,
	sidebarCollapsed,
	modelContextWindow,
}: ChatHeaderProps) {
	const activeThreadTitle = useAuiState((s) => {
		const activeThread = s.threads.threadItems.find(
			(thread) => thread.id === s.threads.mainThreadId,
		);

		return activeThread?.title?.trim() || "New Chat";
	});

	return (
		<header className="relative flex h-12 items-center border-b px-4">
			<div className="z-10 flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggleSidebar}
					aria-label="Toggle sidebar"
					title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
				>
					<PanelLeftIcon className="size-4" />
				</Button>
				<Separator orientation="vertical" className="h-4" />
			</div>
			<div className="pointer-events-none absolute inset-x-0 flex justify-center px-24">
				<p className="max-w-full truncate font-medium text-foreground text-sm">
					{activeThreadTitle}
				</p>
			</div>
			<div className="z-10 ml-auto">
				<ContextDisplay.Bar modelContextWindow={modelContextWindow} />
			</div>
		</header>
	);
}
