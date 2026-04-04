import {
	AuiIf,
	ThreadListItemPrimitive,
	ThreadListPrimitive,
	useAuiState,
} from "@assistant-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	ArchiveIcon,
	ChevronRightIcon,
	TrashIcon,
	Undo2Icon,
} from "lucide-react";
import {
	Component,
	type FC,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "#/components/ui/context-menu";
import { Skeleton } from "#/components/ui/skeleton";
import { getAllThreads } from "#/lib/db";

// ---------------------------------------------------------------------------
// Time group helpers
// ---------------------------------------------------------------------------

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const TIME_GROUPS = {
	today: "Today",
	last3Days: "Last 3 Days",
	week: "Week",
	month: "Month",
	year: "Year",
	older: "Older than a year",
} as const;

type TimeGroup = keyof typeof TIME_GROUPS;

const getStartOfToday = (timestamp = Date.now()): number => {
	const date = new Date(timestamp);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
};

const getTimeGroup = (updatedAt: number, now = Date.now()): TimeGroup => {
	const startOfToday = getStartOfToday(now);

	if (updatedAt >= startOfToday) return "today";
	if (updatedAt >= startOfToday - 3 * DAY_IN_MS) return "last3Days";
	if (updatedAt >= startOfToday - 7 * DAY_IN_MS) return "week";
	if (updatedAt >= startOfToday - 30 * DAY_IN_MS) return "month";
	if (updatedAt >= startOfToday - 365 * DAY_IN_MS) return "year";
	return "older";
};

// ---------------------------------------------------------------------------
// Hook: load time groups from DB (single scan, simplified refresh key)
// ---------------------------------------------------------------------------

const useThreadTimeGroups = () => {
	// Simplified refresh key: only re-scan when thread count changes,
	// not on every title/status change.
	const threadCount = useAuiState(
		(s) => s.threads.threadIds.length + s.threads.archivedThreadIds.length,
	);
	const [threadTimeGroups, setThreadTimeGroups] = useState<
		Map<string, TimeGroup>
	>(() => new Map());
	const [hasLoaded, setHasLoaded] = useState(false);

	useEffect(() => {
		let isActive = true;

		const load = async (count: number) => {
			try {
				// count param ensures the compiler sees threadCount as used
				if (count < 0) return;

				const threads = await getAllThreads();
				if (!isActive) return;

				const now = Date.now();
				const groupById = new Map<string, TimeGroup>();
				for (const thread of threads) {
					groupById.set(thread.id, getTimeGroup(thread.updatedAt, now));
				}

				setThreadTimeGroups(groupById);
				setHasLoaded(true);
			} catch {
				if (!isActive) return;
				setThreadTimeGroups(new Map());
				setHasLoaded(false);
			}
		};

		void load(threadCount);
		return () => {
			isActive = false;
		};
	}, [threadCount]);

	return { hasLoaded, threadTimeGroups };
};

// ---------------------------------------------------------------------------
// Virtual row types
// ---------------------------------------------------------------------------

type VirtualRow =
	| { type: "header"; group: TimeGroup; key: string }
	| { type: "thread"; threadIndex: number; threadId: string; key: string };

const HEADER_HEIGHT = 28;
const THREAD_ITEM_HEIGHT = 36;

// ---------------------------------------------------------------------------
// Error boundary: catches stale thread lookups during deletion race conditions.
// When a thread is deleted, assistant-ui removes it from its internal registry
// before the virtualizer re-renders, causing ItemByIndex to look up a thread
// that no longer exists. This boundary renders null for the stale frame, and
// the virtualizer recalculates on the next render (unmounting this instance).
// ---------------------------------------------------------------------------

class ThreadItemErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) return null;
		return this.props.children;
	}
}

// ---------------------------------------------------------------------------
// Virtualized regular thread list
// ---------------------------------------------------------------------------

const VirtualizedThreadItems: FC = () => {
	const regularThreadIds = useAuiState((s) => s.threads.threadIds);
	const { hasLoaded, threadTimeGroups } = useThreadTimeGroups();
	const parentRef = useRef<HTMLDivElement>(null);

	// Build a flat list of rows: interleaved headers + thread indices
	const rows = useMemo<VirtualRow[]>(() => {
		if (!hasLoaded) return [];

		const result: VirtualRow[] = [];
		const seenGroups = new Set<TimeGroup>();

		for (let i = 0; i < regularThreadIds.length; i++) {
			const threadId = regularThreadIds[i];
			if (!threadId) continue;
			const group = threadTimeGroups.get(threadId) ?? "older";

			if (!seenGroups.has(group)) {
				seenGroups.add(group);
				result.push({
					type: "header",
					group,
					key: `header-${group}`,
				});
			}

			result.push({
				type: "thread",
				threadIndex: i,
				threadId,
				key: threadId,
			});
		}

		return result;
	}, [regularThreadIds, threadTimeGroups, hasLoaded]);

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: (index) =>
			rows[index]?.type === "header" ? HEADER_HEIGHT : THREAD_ITEM_HEIGHT,
		overscan: 15,
		getItemKey: (index) => rows[index]?.key ?? index,
	});

	if (!hasLoaded) {
		return <ThreadListSkeleton />;
	}

	return (
		<div
			ref={parentRef}
			className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden"
		>
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualizer.getVirtualItems().map((virtualItem) => {
					const row = rows[virtualItem.index];
					if (!row) return null;

					if (row.type === "header") {
						return (
							<div
								key={virtualItem.key}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: `${virtualItem.size}px`,
									transform: `translateY(${virtualItem.start}px)`,
								}}
							>
								<p className="px-3 pb-1 pt-2 text-muted-foreground text-xs">
									{TIME_GROUPS[row.group]}
								</p>
							</div>
						);
					}

					return (
						<div
							key={virtualItem.key}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`,
							}}
						>
							<ThreadItemErrorBoundary>
								<ThreadListPrimitive.ItemByIndex
									index={row.threadIndex}
									components={{ ThreadListItem: RegularThreadListItem }}
								/>
							</ThreadItemErrorBoundary>
						</div>
					);
				})}
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Main ThreadList
// ---------------------------------------------------------------------------

export const ThreadList: FC = () => {
	return (
		<ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex h-full min-h-0 flex-col gap-1">
			<AuiIf condition={(s) => s.threads.isLoading}>
				<ThreadListSkeleton />
			</AuiIf>
			<AuiIf condition={(s) => !s.threads.isLoading}>
				<VirtualizedThreadItems />
				<Collapsible defaultOpen={false} className="mx-1 mt-1 shrink-0">
					<CollapsibleTrigger asChild>
						<Button
							variant="ghost"
							className="group h-8 w-full justify-start gap-1.5 px-2 text-muted-foreground text-xs hover:text-sidebar-foreground"
						>
							<ChevronRightIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
							Archived
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="space-y-1">
						<ThreadListPrimitive.Items archived>
							{() => <ArchivedThreadListItem />}
						</ThreadListPrimitive.Items>
					</CollapsibleContent>
				</Collapsible>
			</AuiIf>
		</ThreadListPrimitive.Root>
	);
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const ThreadListSkeleton: FC = () => {
	const skeletonIds = [
		"thread-skeleton-1",
		"thread-skeleton-2",
		"thread-skeleton-3",
		"thread-skeleton-4",
		"thread-skeleton-5",
	] as const;

	return (
		<div className="flex flex-col gap-1 px-1">
			{skeletonIds.map((id) => (
				<output
					key={id}
					aria-label="Loading threads"
					className="aui-thread-list-skeleton-wrapper flex h-9 items-center px-3"
				>
					<Skeleton className="aui-thread-list-skeleton h-4 w-full" />
				</output>
			))}
		</div>
	);
};

// ---------------------------------------------------------------------------
// Thread list items (regular + archived variants)
// ---------------------------------------------------------------------------

function RegularThreadListItem() {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<ThreadListItemPrimitive.Root className="aui-thread-list-item group mx-1 flex h-9 w-full min-w-0 items-center rounded-lg transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none data-active:bg-sidebar-accent">
					<ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex h-8 min-w-0 flex-1 items-center overflow-hidden px-3 text-sidebar-foreground text-start text-sm">
						<span className="aui-thread-list-item-title block min-w-0 flex-1 truncate">
							<ThreadListItemPrimitive.Title fallback="New Chat" />
						</span>
					</ThreadListItemPrimitive.Trigger>
				</ThreadListItemPrimitive.Root>
			</ContextMenuTrigger>
			<ContextMenuContent className="min-w-40">
				<ThreadListItemPrimitive.Archive asChild>
					<ContextMenuItem>
						<ArchiveIcon className="size-4" />
						Archive
					</ContextMenuItem>
				</ThreadListItemPrimitive.Archive>
				<ContextMenuSeparator />
				<ThreadListItemPrimitive.Delete asChild>
					<ContextMenuItem variant="destructive">
						<TrashIcon className="size-4" />
						Delete
					</ContextMenuItem>
				</ThreadListItemPrimitive.Delete>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function ArchivedThreadListItem() {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<ThreadListItemPrimitive.Root className="aui-thread-list-item group mx-1 flex h-9 w-full min-w-0 items-center rounded-lg transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none data-active:bg-sidebar-accent">
					<ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex h-8 min-w-0 flex-1 items-center overflow-hidden px-3 text-sidebar-foreground text-start text-sm">
						<span className="aui-thread-list-item-title block min-w-0 flex-1 truncate">
							<ThreadListItemPrimitive.Title fallback="New Chat" />
						</span>
					</ThreadListItemPrimitive.Trigger>
				</ThreadListItemPrimitive.Root>
			</ContextMenuTrigger>
			<ContextMenuContent className="min-w-40">
				<ThreadListItemPrimitive.Unarchive asChild>
					<ContextMenuItem>
						<Undo2Icon className="size-4" />
						Unarchive
					</ContextMenuItem>
				</ThreadListItemPrimitive.Unarchive>
				<ContextMenuSeparator />
				<ThreadListItemPrimitive.Delete asChild>
					<ContextMenuItem variant="destructive">
						<TrashIcon className="size-4" />
						Delete
					</ContextMenuItem>
				</ThreadListItemPrimitive.Delete>
			</ContextMenuContent>
		</ContextMenu>
	);
}
