import {
	ActionBarMorePrimitive,
	ActionBarPrimitive,
	AuiIf,
	BranchPickerPrimitive,
	ComposerPrimitive,
	ErrorPrimitive,
	MessagePrimitive,
	ThreadPrimitive,
	useAuiState,
} from "@assistant-ui/react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CopyIcon,
	DownloadIcon,
	MoreHorizontalIcon,
	PencilIcon,
	RefreshCwIcon,
	SquareIcon,
} from "lucide-react";
import { type FC, useEffect, useRef } from "react";
import {
	ComposerAddAttachment,
	ComposerAttachments,
	UserMessageAttachments,
} from "#/components/assistant-ui/attachment";
import { MarkdownText } from "#/components/assistant-ui/markdown-text";
import { MessageTiming } from "#/components/assistant-ui/message-timing";
import {
	ComposerQuotePreview,
	QuoteBlock,
	SelectionToolbar,
} from "#/components/assistant-ui/quote";
import { Reasoning } from "#/components/assistant-ui/reasoning";
import { Sources } from "#/components/assistant-ui/sources";
import { ToolFallback } from "#/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "#/components/assistant-ui/tooltip-icon-button";
import { ComposerGroundingToggle } from "#/components/composer-grounding-toggle";
import { ComposerModelConfigSheet } from "#/components/composer-model-config-sheet";
import { ComposerModelSelector } from "#/components/composer-model-selector";
import { ComposerThinkingSelector } from "#/components/composer-thinking-selector";
import { openSettingsDialog } from "#/components/settings-dialog";
import { Button } from "#/components/ui/button";
import { FOCUS_CHAT_INPUT_EVENT } from "#/lib/keyboard-shortcuts";
import { useSettings } from "#/lib/settings";
import { cn } from "#/lib/utils";

export const Thread: FC = () => {
	return (
		<ThreadPrimitive.Root
			className="aui-root aui-thread-root @container flex h-full flex-col bg-background"
			style={{
				["--thread-max-width" as string]: "44rem",
				["--composer-radius" as string]: "24px",
				["--composer-padding" as string]: "10px",
			}}
		>
			<ThreadPrimitive.Viewport
				turnAnchor="top"
				className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4"
			>
				<AuiIf condition={(s) => s.thread.isEmpty}>
					<ThreadWelcome />
				</AuiIf>

				<ThreadPrimitive.Messages>
					{() => <ThreadMessage />}
				</ThreadPrimitive.Messages>

				<ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) bg-background pb-4 md:pb-6">
					<ThreadScrollToBottom />
					<Composer />
				</ThreadPrimitive.ViewportFooter>
			</ThreadPrimitive.Viewport>
			<SelectionToolbar />
		</ThreadPrimitive.Root>
	);
};

const ThreadMessage: FC = () => {
	const role = useAuiState((s) => s.message.role);
	const isEditing = useAuiState((s) => s.message.composer.isEditing);
	if (isEditing) return <EditComposer />;
	if (role === "user") return <UserMessage />;
	return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
	return (
		<ThreadPrimitive.ScrollToBottom asChild>
			<TooltipIconButton
				tooltip="Scroll to bottom"
				variant="outline"
				className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:border-border dark:bg-background dark:hover:bg-accent"
			>
				<ArrowDownIcon />
			</TooltipIconButton>
		</ThreadPrimitive.ScrollToBottom>
	);
};

const ThreadWelcome: FC = () => {
	const { hasApiKey } = useSettings();

	return (
		<div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
			<div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
				<div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
					<h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-semibold text-2xl duration-200">
						<span>Welcome to </span>
						<span className="pollux-text inline-flex">
							Pollux
							<img
								src={`${import.meta.env.BASE_URL}star.svg`}
								alt="Pollux"
								className="size-8"
							/>
						</span>
					</h1>
					<p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-xl delay-75 duration-200">
						Pollux is the brightest star in the Gemini constellation — and your
						gateway to Google Gemini models, right in the browser.
					</p>
					<p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-sm delay-100 duration-200 mt-2">
						Every conversation is stored locally on your computer and never
						leaves your browser.
					</p>
					{!hasApiKey ? (
						<div className="mt-3 flex items-center gap-3">
							<p className="text-amber-700 text-sm dark:text-amber-300">
								To get started, set your Gemini API key in Settings.
							</p>
							<Button size="sm" variant="outline" onClick={openSettingsDialog}>
								Open Settings
							</Button>
						</div>
					) : null}
					<p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground/60 text-xs delay-150 duration-200 mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1">
						<span>Made with ❤️ by Luis Canada</span>
						<span className="select-none">·</span>
						<span>
							Using{" "}
							<a
								href="https://ui.shadcn.com"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-foreground transition-colors"
							>
								Shadcn
							</a>{" "}
							and{" "}
							<a
								href="https://www.assistant-ui.com/"
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-2 hover:text-foreground transition-colors"
							>
								Assistant UI
							</a>
						</span>
						<span className="select-none">·</span>
						<span>v{__APP_VERSION__}</span>
						<span className="select-none">·</span>
						<a
							href="https://github.com/luis-c465/pollux"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-foreground transition-colors"
						>
							GitHub
						</a>
					</p>
				</div>
			</div>
			<ThreadSuggestions />
		</div>
	);
};

const STARTER_PROMPTS = [
	"Explain how React hooks work",
	"Write a TypeScript function to debounce",
	"What's the difference between TCP and UDP?",
	"Help me plan a weekend trip",
] as const;

const ThreadSuggestions: FC = () => {
	return (
		<div className="aui-thread-welcome-suggestions grid w-full @md:grid-cols-2 gap-2 pb-4">
			{STARTER_PROMPTS.map((prompt) => (
				<ThreadSuggestionItem key={prompt} prompt={prompt} />
			))}
		</div>
	);
};

const ThreadSuggestionItem: FC<{ prompt: string }> = ({ prompt }) => {
	return (
		<div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
			<ThreadPrimitive.Suggestion prompt={prompt} send asChild>
				<Button
					variant="ghost"
					className="aui-thread-welcome-suggestion h-auto w-full flex-col items-start justify-start gap-1 rounded-3xl border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
				>
					<span className="aui-thread-welcome-suggestion-text-1 line-clamp-2 w-full break-words font-medium">
						{prompt}
					</span>
				</Button>
			</ThreadPrimitive.Suggestion>
		</div>
	);
};

const Composer: FC = () => {
	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		const handleFocusChatInput = () => {
			inputRef.current?.focus();
		};

		window.addEventListener(FOCUS_CHAT_INPUT_EVENT, handleFocusChatInput);
		return () => {
			window.removeEventListener(FOCUS_CHAT_INPUT_EVENT, handleFocusChatInput);
		};
	}, []);

	return (
		<ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
			<ComposerPrimitive.AttachmentDropzone asChild>
				<div
					data-slot="composer-shell"
					className="flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-background p-(--composer-padding) transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50"
				>
					<ComposerAttachments />
					<ComposerQuotePreview />
					<ComposerPrimitive.Input
						ref={inputRef}
						placeholder="Send a message..."
						className="aui-composer-input max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none placeholder:text-muted-foreground/80"
						rows={1}
						autoFocus
						aria-label="Message input"
					/>
					<ComposerAction />
				</div>
			</ComposerPrimitive.AttachmentDropzone>
		</ComposerPrimitive.Root>
	);
};

const ComposerAction: FC = () => {
	return (
		<div className="aui-composer-action-wrapper relative flex items-center justify-between">
			<div className="flex items-center gap-2">
				<ComposerAddAttachment />
				<ComposerModelSelector />
				<div className="hidden items-center gap-2 sm:flex">
					<ComposerThinkingSelector />
					<ComposerGroundingToggle />
				</div>
				<div className="sm:hidden">
					<ComposerModelConfigSheet />
				</div>
			</div>
			<AuiIf condition={(s) => !s.thread.isRunning}>
				<ComposerPrimitive.Send asChild>
					<TooltipIconButton
						tooltip="Send message"
						side="bottom"
						type="button"
						variant="default"
						size="icon"
						className="aui-composer-send size-8 rounded-full"
						aria-label="Send message"
					>
						<ArrowUpIcon className="aui-composer-send-icon size-4" />
					</TooltipIconButton>
				</ComposerPrimitive.Send>
			</AuiIf>
			<AuiIf condition={(s) => s.thread.isRunning}>
				<ComposerPrimitive.Cancel asChild>
					<Button
						type="button"
						variant="default"
						size="icon"
						className="aui-composer-cancel size-8 rounded-full"
						aria-label="Stop generating"
					>
						<SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
					</Button>
				</ComposerPrimitive.Cancel>
			</AuiIf>
		</div>
	);
};

const MessageError: FC = () => {
	return (
		<MessagePrimitive.Error>
			<ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
				<ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
			</ErrorPrimitive.Root>
		</MessagePrimitive.Error>
	);
};

const ThinkingIndicator: FC = () => {
	const isWaiting = useAuiState(
		(s) => s.message.status?.type === "running" && s.message.parts.length === 0,
	);
	if (!isWaiting) return null;
	return (
		<div className="flex items-center gap-1 px-1 py-2">
			<span className="size-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
			<span className="size-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
			<span className="size-2 rounded-full bg-muted-foreground animate-bounce" />
		</div>
	);
};

const AssistantMessage: FC = () => {
	return (
		<MessagePrimitive.Root
			className="aui-assistant-message-root fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-3 duration-150"
			data-role="assistant"
		>
			<div className="aui-assistant-message-content wrap-break-word px-2 text-foreground leading-relaxed">
				<ThinkingIndicator />
				<MessagePrimitive.Parts>
					{({ part }) => {
						if (part.type === "reasoning") return <Reasoning {...part} />;
						if (part.type === "text") return <MarkdownText />;
						if (part.type === "source") return <Sources {...part} />;
						if (part.type === "tool-call")
							return part.toolUI ?? <ToolFallback {...part} />;
						return null;
					}}
				</MessagePrimitive.Parts>
				<MessageError />
			</div>

			<div className="aui-assistant-message-footer mt-1 ml-2 flex min-h-6 items-center">
				<BranchPicker />
				<AssistantActionBar />
			</div>
		</MessagePrimitive.Root>
	);
};

const AssistantActionBar: FC = () => {
	return (
		<ActionBarPrimitive.Root
			hideWhenRunning
			autohide="not-last"
			className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground"
		>
			<ActionBarPrimitive.Copy asChild>
				<TooltipIconButton tooltip="Copy">
					<AuiIf condition={(s) => s.message.isCopied}>
						<CheckIcon />
					</AuiIf>
					<AuiIf condition={(s) => !s.message.isCopied}>
						<CopyIcon />
					</AuiIf>
				</TooltipIconButton>
			</ActionBarPrimitive.Copy>
			<ActionBarPrimitive.Reload asChild>
				<TooltipIconButton tooltip="Refresh">
					<RefreshCwIcon />
				</TooltipIconButton>
			</ActionBarPrimitive.Reload>

			<ActionBarMorePrimitive.Root>
				<ActionBarMorePrimitive.Trigger asChild>
					<TooltipIconButton
						tooltip="More"
						className="data-[state=open]:bg-accent"
					>
						<MoreHorizontalIcon />
					</TooltipIconButton>
				</ActionBarMorePrimitive.Trigger>
				<ActionBarMorePrimitive.Content
					side="bottom"
					align="start"
					className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
				>
					<ActionBarPrimitive.ExportMarkdown asChild>
						<ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
							<DownloadIcon className="size-4" />
							Export as Markdown
						</ActionBarMorePrimitive.Item>
					</ActionBarPrimitive.ExportMarkdown>
				</ActionBarMorePrimitive.Content>
			</ActionBarMorePrimitive.Root>

			<MessageTiming />
		</ActionBarPrimitive.Root>
	);
};

const UserMessage: FC = () => {
	return (
		<MessagePrimitive.Root
			className="aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
			data-role="user"
		>
			<UserMessageAttachments />

			<div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
				<div className="aui-user-message-content wrap-break-word peer rounded-2xl bg-muted px-4 py-2.5 text-foreground empty:hidden">
					<MessagePrimitive.Quote>
						{(quote) => <QuoteBlock {...quote} />}
					</MessagePrimitive.Quote>
					<MessagePrimitive.Parts />
				</div>
				<div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2 peer-empty:hidden">
					<UserActionBar />
				</div>
			</div>

			<BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
		</MessagePrimitive.Root>
	);
};

const UserActionBar: FC = () => {
	return (
		<ActionBarPrimitive.Root
			hideWhenRunning
			autohide="not-last"
			className="aui-user-action-bar-root flex flex-col items-end"
		>
			<ActionBarPrimitive.Edit asChild>
				<TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
					<PencilIcon />
				</TooltipIconButton>
			</ActionBarPrimitive.Edit>
		</ActionBarPrimitive.Root>
	);
};

const EditComposer: FC = () => {
	return (
		<MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
			<ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
				<ComposerPrimitive.Input
					className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
					autoFocus
				/>
				<div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
					<ComposerPrimitive.Cancel asChild>
						<Button variant="ghost" size="sm">
							Cancel
						</Button>
					</ComposerPrimitive.Cancel>
					<ComposerPrimitive.Send asChild>
						<Button size="sm">Update</Button>
					</ComposerPrimitive.Send>
				</div>
			</ComposerPrimitive.Root>
		</MessagePrimitive.Root>
	);
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
	className,
	...rest
}) => {
	return (
		<BranchPickerPrimitive.Root
			hideWhenSingleBranch
			className={cn(
				"aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs",
				className,
			)}
			{...rest}
		>
			<BranchPickerPrimitive.Previous asChild>
				<TooltipIconButton tooltip="Previous">
					<ChevronLeftIcon />
				</TooltipIconButton>
			</BranchPickerPrimitive.Previous>
			<span className="aui-branch-picker-state font-medium">
				<BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
			</span>
			<BranchPickerPrimitive.Next asChild>
				<TooltipIconButton tooltip="Next">
					<ChevronRightIcon />
				</TooltipIconButton>
			</BranchPickerPrimitive.Next>
		</BranchPickerPrimitive.Root>
	);
};
