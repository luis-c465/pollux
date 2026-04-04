import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type {
	GroupImperativeHandle,
	Layout,
	PanelImperativeHandle,
} from "react-resizable-panels";
import { Thread } from "#/components/assistant-ui/thread";
import { ChatHeader } from "#/components/chat-header";
import { ChatSidebar } from "#/components/chat-sidebar";
import { GChatRuntimeProvider } from "#/components/runtime-provider";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable";
import { TooltipProvider } from "#/components/ui/tooltip";
import { useAppHotkeys } from "#/hooks/use-app-hotkeys";

export const Route = createFileRoute("/")({ component: App });

const RESIZABLE_LAYOUT_STORAGE_KEY = "chat-layout";

function App() {
	const panelGroupRef = useRef<GroupImperativeHandle | null>(null);
	const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	useAppHotkeys();

	useEffect(() => {
		const rawLayout = window.localStorage.getItem(RESIZABLE_LAYOUT_STORAGE_KEY);
		if (!rawLayout) return;

		try {
			const parsedLayout = JSON.parse(rawLayout) as Layout;
			panelGroupRef.current?.setLayout(parsedLayout);
			setIsSidebarCollapsed((parsedLayout.sidebar ?? 0) <= 0);
		} catch {
			window.localStorage.removeItem(RESIZABLE_LAYOUT_STORAGE_KEY);
		}
	}, []);

	const toggleSidebar = () => {
		const sidebarPanel = sidebarPanelRef.current;
		if (!sidebarPanel) return;

		if (sidebarPanel.isCollapsed()) {
			sidebarPanel.expand();
			return;
		}

		sidebarPanel.collapse();
	};

	return (
		<GChatRuntimeProvider>
			<TooltipProvider>
				<ResizablePanelGroup
					id="chat-main-layout"
					groupRef={panelGroupRef}
					onLayoutChanged={(layout) => {
						window.localStorage.setItem(
							RESIZABLE_LAYOUT_STORAGE_KEY,
							JSON.stringify(layout),
						);
						setIsSidebarCollapsed((layout.sidebar ?? 0) <= 0);
					}}
					orientation="horizontal"
					className="h-full min-h-0"
				>
					<ResizablePanel
						id="sidebar"
						panelRef={sidebarPanelRef}
						defaultSize="22%"
						minSize="16%"
						maxSize="35%"
						collapsedSize={0}
						collapsible
						onResize={(size) => {
							setIsSidebarCollapsed(size.asPercentage <= 0);
						}}
						className="min-w-0 border-r"
					>
						<ChatSidebar />
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel id="content" minSize={50} className="min-w-0">
						<main className="relative flex h-full w-full flex-1 flex-col bg-background">
							<ChatHeader
								onToggleSidebar={toggleSidebar}
								sidebarCollapsed={isSidebarCollapsed}
							/>
							<div className="min-h-0 flex-1">
								<Thread />
							</div>
						</main>
					</ResizablePanel>
				</ResizablePanelGroup>
			</TooltipProvider>
		</GChatRuntimeProvider>
	);
}
