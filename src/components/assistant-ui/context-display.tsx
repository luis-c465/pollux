import {
	type ThreadTokenUsage,
	useThreadTokenUsage,
} from "@assistant-ui/react-ai-sdk";
import type * as React from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

type ContextDisplayBarProps = {
	modelContextWindow: number;
	className?: string;
	side?: React.ComponentProps<typeof TooltipContent>["side"];
	usage?: ThreadTokenUsage;
};

const formatTokenCount = (value: number | undefined): string => {
	return value === undefined ? "-" : value.toLocaleString();
};

const getPercentage = (usedTokens: number, maxTokens: number): number => {
	if (maxTokens <= 0) {
		return 0;
	}

	return Math.max(0, Math.min(100, (usedTokens / maxTokens) * 100));
};

const getUsageColorClass = (percentage: number): string => {
	if (percentage > 85) {
		return "bg-red-500";
	}

	if (percentage >= 65) {
		return "bg-amber-500";
	}

	return "bg-emerald-500";
};

function ContextDisplayBar({
	modelContextWindow,
	className,
	side = "bottom",
	usage,
}: ContextDisplayBarProps) {
	const threadUsage = useThreadTokenUsage();
	const resolvedUsage = usage ?? threadUsage;
	const totalTokens = resolvedUsage?.totalTokens ?? 0;
	const percentage = getPercentage(totalTokens, modelContextWindow);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label="Conversation context usage"
					className={cn(
						"inline-flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-xs",
						className,
					)}
				>
					<span className="text-muted-foreground">Context</span>
					<div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
						<div
							className={cn(
								"h-full transition-[width]",
								getUsageColorClass(percentage),
							)}
							style={{ width: `${percentage}%` }}
						/>
					</div>
					<span className="font-mono tabular-nums">
						{Math.round(percentage)}%
					</span>
				</button>
			</TooltipTrigger>
			<TooltipContent
				side={side}
				className="min-w-56 space-y-1 bg-popover text-popover-foreground"
			>
				<div className="mb-1 flex items-center justify-between border-b pb-1 text-xs">
					<span className="text-muted-foreground">Usage</span>
					<span className="font-mono tabular-nums">
						{percentage.toFixed(1)}%
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Input</span>
					<span className="font-mono tabular-nums">
						{formatTokenCount(resolvedUsage?.inputTokens)}
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Cached</span>
					<span className="font-mono tabular-nums">
						{formatTokenCount(resolvedUsage?.cachedInputTokens)}
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Output</span>
					<span className="font-mono tabular-nums">
						{formatTokenCount(resolvedUsage?.outputTokens)}
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Reasoning</span>
					<span className="font-mono tabular-nums">
						{formatTokenCount(resolvedUsage?.reasoningTokens)}
					</span>
				</div>
				<div className="mt-1 flex items-center justify-between border-t pt-1 text-xs">
					<span className="text-muted-foreground">Total</span>
					<span className="font-mono tabular-nums">
						{totalTokens.toLocaleString()} /{" "}
						{modelContextWindow.toLocaleString()}
					</span>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

export const ContextDisplay = {
	Bar: ContextDisplayBar,
};
