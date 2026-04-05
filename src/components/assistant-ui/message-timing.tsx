"use client";

import { useMessageTiming } from "@assistant-ui/react";
import type { FC } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { useIsTouchDevice } from "#/hooks/use-mobile";
import { cn } from "#/lib/utils";

function formatTimingMs(ms: number | undefined): string {
	if (ms === undefined) return "-";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

type TimingData = NonNullable<ReturnType<typeof useMessageTiming>>;

function TimingDetails({ timing }: { timing: TimingData }) {
	return (
		<div className="grid min-w-35 gap-1.5 px-3 py-2 text-xs">
			{timing.firstTokenTime !== undefined ? (
				<div className="flex items-center justify-between gap-4">
					<span className="text-muted-foreground">First token</span>
					<span className="font-mono tabular-nums">
						{formatTimingMs(timing.firstTokenTime)}
					</span>
				</div>
			) : null}
			<div className="flex items-center justify-between gap-4">
				<span className="text-muted-foreground">Total</span>
				<span className="font-mono tabular-nums">
					{formatTimingMs(timing.totalStreamTime)}
				</span>
			</div>
			{timing.tokensPerSecond !== undefined ? (
				<div className="flex items-center justify-between gap-4">
					<span className="text-muted-foreground">Speed</span>
					<span className="font-mono tabular-nums">
						{timing.tokensPerSecond.toFixed(1)} tok/s
					</span>
				</div>
			) : null}
			<div className="flex items-center justify-between gap-4">
				<span className="text-muted-foreground">Chunks</span>
				<span className="font-mono tabular-nums">{timing.totalChunks}</span>
			</div>
		</div>
	);
}

export const MessageTiming: FC<{
	className?: string;
	side?: "top" | "right" | "bottom" | "left";
}> = ({ className, side = "right" }) => {
	const timing = useMessageTiming();
	const isTouch = useIsTouchDevice();

	if (timing?.totalStreamTime === undefined) return null;

	const triggerClassName = cn(
		"flex items-center rounded-md p-1 font-mono text-muted-foreground text-xs tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
		className,
	);

	const contentClassName =
		"w-fit p-0 rounded-lg border bg-popover text-popover-foreground shadow-md";

	const label = formatTimingMs(timing.totalStreamTime);

	if (isTouch) {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<button
						type="button"
						data-slot="message-timing-trigger"
						aria-label="Message timing"
						className={triggerClassName}
					>
						{label}
					</button>
				</PopoverTrigger>
				<PopoverContent
					side={side}
					sideOffset={8}
					align="start"
					data-slot="message-timing-popover"
					className={contentClassName}
				>
					<TimingDetails timing={timing} />
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					data-slot="message-timing-trigger"
					aria-label="Message timing"
					className={triggerClassName}
				>
					{label}
				</button>
			</TooltipTrigger>
			<TooltipContent
				side={side}
				sideOffset={8}
				data-slot="message-timing-popover"
				className={contentClassName}
			>
				<TimingDetails timing={timing} />
			</TooltipContent>
		</Tooltip>
	);
};
