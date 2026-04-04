import {
	AuiIf,
	ThreadListItemPrimitive,
	ThreadListPrimitive,
	useAuiState,
} from "@assistant-ui/react";
import {
	ArchiveIcon,
	ChevronRightIcon,
	TrashIcon,
	Undo2Icon,
} from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
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

const getStartOfToday = (timestamp = Date.now()) => {
	const date = new Date(timestamp);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
};

const getTimeGroup = (updatedAt: number, now = Date.now()): TimeGroup => {
	const startOfToday = getStartOfToday(now);

	if (updatedAt >= startOfToday) {
		return "today";
	}

	if (updatedAt >= startOfToday - 3 * DAY_IN_MS) {
		return "last3Days";
	}

	if (updatedAt >= startOfToday - 7 * DAY_IN_MS) {
		return "week";
	}

	if (updatedAt >= startOfToday - 30 * DAY_IN_MS) {
		return "month";
	}

	if (updatedAt >= startOfToday - 365 * DAY_IN_MS) {
		return "year";
	}

	return "older";
};

const useThreadTimeGroups = () => {
	const refreshKey = useAuiState(
		(s) =>
			`${s.threads.threadIds.join("|")}:${s.threads.archivedThreadIds.join("|")}:${s.threads.threadItems
				.map((item) => `${item.id}:${item.title ?? ""}:${item.status}`)
				.join("|")}`,
	);
	const [threadTimeGroups, setThreadTimeGroups] = useState<
		Map<string, TimeGroup>
	>(() => new Map());
	const [hasLoadedThreadTimeGroups, setHasLoadedThreadTimeGroups] =
		useState(false);

	useEffect(() => {
		let isActive = true;

		const loadThreadGroups = async (_refreshKey: string) => {
			try {
				const threads = await getAllThreads();
				if (!isActive) return;

				const now = Date.now();
				const groupById = new Map<string, TimeGroup>();

				for (const thread of threads) {
					groupById.set(thread.id, getTimeGroup(thread.updatedAt, now));
				}

				setThreadTimeGroups(groupById);
				setHasLoadedThreadTimeGroups(true);
			} catch {
				if (!isActive) return;
				setThreadTimeGroups(new Map());
				setHasLoadedThreadTimeGroups(false);
			}
		};

		void loadThreadGroups(refreshKey);

		return () => {
			isActive = false;
		};
	}, [refreshKey]);

	return { hasLoadedThreadTimeGroups, threadTimeGroups };
};

const ThreadListGroupedItems: FC = () => {
	const regularThreadIds = useAuiState((s) => s.threads.threadIds);
	const { hasLoadedThreadTimeGroups, threadTimeGroups } = useThreadTimeGroups();

	const headersByThreadId = useMemo(() => {
		const seenGroups = new Set<TimeGroup>();
		const headers = new Map<string, TimeGroup>();

		for (const threadId of regularThreadIds) {
			const group = threadTimeGroups.get(threadId) ?? "older";
			if (seenGroups.has(group)) {
				continue;
			}

			seenGroups.add(group);
			headers.set(threadId, group);
		}

		return headers;
	}, [regularThreadIds, threadTimeGroups]);

	if (!hasLoadedThreadTimeGroups) {
		return (
			<ThreadListPrimitive.Items>
				{() => <ThreadListItem />}
			</ThreadListPrimitive.Items>
		);
	}

	return (
		<ThreadListPrimitive.Items>
			{({ threadListItem }) => {
				const headerGroup = headersByThreadId.get(threadListItem.id);

				return (
					<>
						{headerGroup ? (
							<p className="px-3 pb-1 pt-2 text-muted-foreground text-xs">
								{TIME_GROUPS[headerGroup]}
							</p>
						) : null}
						<ThreadListItem />
					</>
				);
			}}
		</ThreadListPrimitive.Items>
	);
};

export const ThreadList: FC = () => {
	return (
		<ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex h-full min-h-0 flex-col gap-1">
			<AuiIf condition={(s) => s.threads.isLoading}>
				<ThreadListSkeleton />
			</AuiIf>
			<AuiIf condition={(s) => !s.threads.isLoading}>
				<ThreadListGroupedItems />
				<Collapsible defaultOpen={false} className="mx-1 mt-1">
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
							{() => <ThreadListItem archived />}
						</ThreadListPrimitive.Items>
					</CollapsibleContent>
				</Collapsible>
			</AuiIf>
		</ThreadListPrimitive.Root>
	);
};

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

const ThreadListItem: FC<{ archived?: boolean }> = ({ archived = false }) => {
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
				{archived ? (
					<ThreadListItemPrimitive.Unarchive asChild>
						<ContextMenuItem>
							<Undo2Icon className="size-4" />
							Unarchive
						</ContextMenuItem>
					</ThreadListItemPrimitive.Unarchive>
				) : (
					<ThreadListItemPrimitive.Archive asChild>
						<ContextMenuItem>
							<ArchiveIcon className="size-4" />
							Archive
						</ContextMenuItem>
					</ThreadListItemPrimitive.Archive>
				)}
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
};
