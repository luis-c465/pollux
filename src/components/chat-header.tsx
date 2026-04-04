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
	return (
		<header className="flex h-12 items-center gap-2 border-b px-4">
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
			<div className="ml-auto">
				<ContextDisplay.Bar modelContextWindow={modelContextWindow} />
			</div>
		</header>
	);
}
