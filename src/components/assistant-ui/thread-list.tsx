import {
	AuiIf,
	ThreadListItemPrimitive,
	ThreadListPrimitive,
} from "@assistant-ui/react";
import {
	ArchiveIcon,
	ChevronRightIcon,
	TrashIcon,
	Undo2Icon,
} from "lucide-react";
import type { FC } from "react";
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

export const ThreadList: FC = () => {
	return (
		<ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex h-full min-h-0 flex-col gap-1">
			<AuiIf condition={(s) => s.threads.isLoading}>
				<ThreadListSkeleton />
			</AuiIf>
			<AuiIf condition={(s) => !s.threads.isLoading}>
				<ThreadListPrimitive.Items>
					{() => <ThreadListItem />}
				</ThreadListPrimitive.Items>
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
