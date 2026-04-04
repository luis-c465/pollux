"use client";

import { useAuiState } from "@assistant-ui/react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
	type ComponentProps,
	memo,
	type PropsWithChildren,
	useEffect,
	useState,
} from "react";
import { MarkdownText } from "#/components/assistant-ui/markdown-text";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import { cn } from "#/lib/utils";

type ReasoningProps = {
	className?: string;
	text?: string;
};

function ReasoningRoot({
	className,
	...props
}: ComponentProps<typeof Collapsible>) {
	return (
		<Collapsible
			className={cn(
				"aui-reasoning-root overflow-hidden rounded-xl border border-border/70 bg-muted/30",
				className,
			)}
			{...props}
		/>
	);
}

function ReasoningTrigger({
	active,
	className,
	children,
	...props
}: ComponentProps<typeof CollapsibleTrigger> & { active?: boolean }) {
	return (
		<CollapsibleTrigger
			className={cn(
				"aui-reasoning-trigger flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-muted-foreground text-xs transition-colors hover:bg-muted/60 hover:text-foreground [&[data-state=open]_.aui-reasoning-chevron]:rotate-180",
				active && "text-foreground",
				className,
			)}
			{...props}
		>
			{children ?? (
				<>
					<span className="inline-flex items-center gap-1.5 font-medium">
						<BrainIcon className="size-3.5" />
						Reasoning
					</span>
					<ChevronDownIcon className="aui-reasoning-chevron size-3.5 transition-transform" />
				</>
			)}
		</CollapsibleTrigger>
	);
}

function ReasoningContent({
	className,
	...props
}: ComponentProps<typeof CollapsibleContent>) {
	return (
		<CollapsibleContent
			className={cn(
				"aui-reasoning-content border-t border-border/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1",
				className,
			)}
			{...props}
		/>
	);
}

function ReasoningText({
	className,
	children,
	...props
}: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"aui-reasoning-text px-3 py-2 text-muted-foreground text-xs leading-6 [&_.aui-md]:text-xs",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

function ReasoningFade({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			aria-hidden
			className={cn(
				"aui-reasoning-fade pointer-events-none h-8 bg-gradient-to-t from-background to-transparent",
				className,
			)}
			{...props}
		/>
	);
}

const ReasoningImpl = ({ className }: ReasoningProps) => {
	const isStreaming = useAuiState((s) => s.message.status?.type === "running");
	const [open, setOpen] = useState(isStreaming);

	useEffect(() => {
		if (isStreaming) {
			setOpen(true);
		}
	}, [isStreaming]);

	return (
		<ReasoningRoot className={className} open={open} onOpenChange={setOpen}>
			<ReasoningTrigger active={isStreaming} />
			<ReasoningContent aria-busy={isStreaming}>
				<ReasoningText>
					<MarkdownText />
				</ReasoningText>
			</ReasoningContent>
		</ReasoningRoot>
	);
};

const ReasoningBase = memo(ReasoningImpl);

export const Reasoning = Object.assign(ReasoningBase, {
	Root: ReasoningRoot,
	Trigger: ReasoningTrigger,
	Content: ReasoningContent,
	Text: ReasoningText,
	Fade: ReasoningFade,
});

export function ReasoningGroup({
	children,
	className,
	...props
}: PropsWithChildren<ComponentProps<"div">>) {
	return (
		<div
			className={cn("aui-reasoning-group flex flex-col gap-2", className)}
			{...props}
		>
			{children}
		</div>
	);
}

export {
	ReasoningContent,
	ReasoningFade,
	ReasoningRoot,
	ReasoningText,
	ReasoningTrigger,
};
