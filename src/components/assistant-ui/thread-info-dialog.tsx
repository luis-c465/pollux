import { type FC, useEffect, useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { getThreadStats, type ThreadStats } from "#/lib/db";

type ThreadInfoDialogProps = {
	threadId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const formatBytes = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatDate = (timestamp: number | undefined): string => {
	if (!timestamp) return "-";
	return new Date(timestamp).toLocaleString();
};

const emptyStats: ThreadStats = {
	thread: undefined,
	messageCount: 0,
	userMessageCount: 0,
	assistantMessageCount: 0,
	attachmentCount: 0,
	totalAttachmentSize: 0,
	attachments: [],
};

export const ThreadInfoDialog: FC<ThreadInfoDialogProps> = ({
	threadId,
	open,
	onOpenChange,
}) => {
	const [stats, setStats] = useState<ThreadStats>(emptyStats);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;

		let isActive = true;
		setIsLoading(true);
		setError(null);

		void getThreadStats(threadId)
			.then((nextStats) => {
				if (!isActive) return;
				setStats(nextStats);
			})
			.catch(() => {
				if (!isActive) return;
				setError("Failed to load chat info.");
			})
			.finally(() => {
				if (!isActive) return;
				setIsLoading(false);
			});

		return () => {
			isActive = false;
		};
	}, [open, threadId]);

	const attachmentSummary = useMemo(() => {
		if (stats.attachmentCount === 0) return "No files";
		const fileWord = stats.attachmentCount === 1 ? "file" : "files";
		return `${stats.attachmentCount} ${fileWord} · ${formatBytes(stats.totalAttachmentSize)}`;
	}, [stats.attachmentCount, stats.totalAttachmentSize]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85dvh] overflow-hidden p-0 sm:max-w-2xl">
				<div className="flex max-h-[85dvh] flex-col">
					<DialogHeader className="border-b px-6 py-4">
						<DialogTitle>Chat Info</DialogTitle>
						<DialogDescription>
							Metadata for this conversation and its files.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-5 overflow-y-auto px-6 py-4">
						{isLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="h-4 w-1/2" />
								<Skeleton className="h-24 w-full" />
							</div>
						) : error ? (
							<p className="text-destructive text-sm">{error}</p>
						) : (
							<>
								<div className="space-y-1">
									<p className="font-medium text-sm">
										{stats.thread?.title ?? "Untitled chat"}
									</p>
									<p className="truncate text-muted-foreground text-xs">
										ID: {threadId}
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-2">
									<div className="rounded-md border p-3">
										<p className="text-muted-foreground text-xs">Created</p>
										<p className="mt-1 text-sm">
											{formatDate(stats.thread?.createdAt)}
										</p>
									</div>
									<div className="rounded-md border p-3">
										<p className="text-muted-foreground text-xs">
											Last updated
										</p>
										<p className="mt-1 text-sm">
											{formatDate(stats.thread?.updatedAt)}
										</p>
									</div>
									<div className="rounded-md border p-3">
										<p className="text-muted-foreground text-xs">Messages</p>
										<p className="mt-1 text-sm">
											{stats.messageCount} total ({stats.userMessageCount} user,{" "}
											{stats.assistantMessageCount} assistant)
										</p>
									</div>
									<div className="rounded-md border p-3">
										<p className="text-muted-foreground text-xs">Files</p>
										<p className="mt-1 text-sm">{attachmentSummary}</p>
									</div>
								</div>

								<div className="space-y-2">
									<p className="font-medium text-sm">Attachments</p>
									{stats.attachments.length === 0 ? (
										<p className="text-muted-foreground text-sm">
											No files attached in this chat.
										</p>
									) : (
										<ul className="divide-y rounded-md border">
											{stats.attachments.map((attachment) => (
												<li
													key={attachment.id}
													className="flex items-center justify-between gap-3 px-3 py-2"
												>
													<div className="min-w-0">
														<p className="truncate text-sm">
															{attachment.name}
														</p>
														<span className="mt-1 inline-flex max-w-full truncate rounded-full border px-2 py-0.5 font-normal text-[10px]">
															{attachment.contentType}
														</span>
													</div>
													<p className="shrink-0 text-muted-foreground text-xs">
														{formatBytes(attachment.size)}
													</p>
												</li>
											))}
										</ul>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
