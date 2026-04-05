import { useAui } from "@assistant-ui/react";
import { SearchIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Input } from "#/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { OPEN_SEARCH_EVENT } from "#/lib/keyboard-shortcuts";
import type { SearchResult } from "#/lib/search-worker";
import { getSearchWorker } from "#/lib/search-worker-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeDate(timestamp: number): string {
	const diff = timestamp - Date.now(); // negative = past
	const absDiff = Math.abs(diff);
	if (absDiff < 60_000) return "just now";
	if (absDiff < 3_600_000)
		return rtf.format(Math.round(diff / 60_000), "minute");
	if (absDiff < 86_400_000)
		return rtf.format(Math.round(diff / 3_600_000), "hour");
	if (absDiff < 2_592_000_000)
		return rtf.format(Math.round(diff / 86_400_000), "day");
	if (absDiff < 31_536_000_000)
		return rtf.format(Math.round(diff / 2_592_000_000), "month");
	return rtf.format(Math.round(diff / 31_536_000_000), "year");
}

// ---------------------------------------------------------------------------
// Debounce delay (ms)
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 150;

// ---------------------------------------------------------------------------
// SearchResultItem
// ---------------------------------------------------------------------------

function SearchResultItem({
	result,
	isActive,
	onSelect,
	id,
}: {
	result: SearchResult;
	isActive: boolean;
	onSelect: () => void;
	id: string;
}) {
	const ref = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (isActive) {
			ref.current?.scrollIntoView({ block: "nearest" });
		}
	}, [isActive]);

	return (
		<button
			ref={ref}
			id={id}
			type="button"
			role="option"
			aria-selected={isActive}
			onClick={onSelect}
			className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors focus:outline-none ${
				isActive
					? "bg-accent text-accent-foreground"
					: "hover:bg-accent/60 text-foreground"
			}`}
		>
			<div className="flex items-baseline justify-between gap-2">
				<p
					className="truncate text-sm font-medium leading-snug"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: controlled highlight HTML
					dangerouslySetInnerHTML={{ __html: result.titleHtml }}
				/>
				<span className="shrink-0 text-xs text-muted-foreground">
					{formatRelativeDate(result.updatedAt)}
				</span>
			</div>
			{result.snippet ? (
				<p
					className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: controlled highlight HTML
					dangerouslySetInnerHTML={{ __html: result.snippet }}
				/>
			) : null}
		</button>
	);
}

// ---------------------------------------------------------------------------
// SearchSheet
// ---------------------------------------------------------------------------

export function SearchSheet() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const aui = useAui();

	// Listen for the open-search custom event
	useEffect(() => {
		const handleOpen = () => setOpen(true);
		window.addEventListener(OPEN_SEARCH_EVENT, handleOpen);
		return () => window.removeEventListener(OPEN_SEARCH_EVENT, handleOpen);
	}, []);

	// Pre-warm: mount persistent FlexSearch index in the worker on mount.
	// The index is incrementally updated, so no reload needed on sheet open.
	useEffect(() => {
		getSearchWorker().init().catch(console.error);
	}, []);

	// Reset UI state when the sheet opens
	useEffect(() => {
		if (!open) return;
		setQuery("");
		setDebouncedQuery("");
		setActiveIndex(0);
		setResults([]);
	}, [open]);

	// Focus the input when the sheet opens (after animation)
	useEffect(() => {
		if (!open) return;
		const timer = window.setTimeout(() => {
			inputRef.current?.focus();
		}, 50);
		return () => window.clearTimeout(timer);
	}, [open]);

	// Debounce the query — wait DEBOUNCE_MS after the user stops typing
	useEffect(() => {
		const timer = window.setTimeout(
			() => setDebouncedQuery(query),
			DEBOUNCE_MS,
		);
		return () => window.clearTimeout(timer);
	}, [query]);

	// Run the search in the worker whenever the debounced query changes
	useEffect(() => {
		const trimmed = debouncedQuery.trim();
		if (!trimmed) {
			setResults([]);
			return;
		}
		let cancelled = false;
		getSearchWorker()
			.search(trimmed)
			.then((r) => {
				if (!cancelled) {
					setResults(r);
					setActiveIndex(0);
				}
			})
			.catch(console.error);
		return () => {
			cancelled = true;
		};
	}, [debouncedQuery]);

	function handleSelect(threadId: string) {
		aui.threads().switchToThread(threadId);
		setOpen(false);
	}

	function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => Math.min(i + 1, results.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const result = results[activeIndex];
			if (result) handleSelect(result.threadId);
		}
	}

	const listboxId = "search-results-listbox";
	const activeResultId =
		results.length > 0 ? `search-result-${activeIndex}` : undefined;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent
				side="right"
				showCloseButton={false}
				className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
			>
				<SheetHeader className="border-b px-4 py-3">
					<SheetTitle className="sr-only">Search chats</SheetTitle>
					<div className="relative flex items-center">
						<SearchIcon className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none" />
						<Input
							ref={inputRef}
							role="combobox"
							aria-expanded={results.length > 0}
							aria-controls={listboxId}
							aria-activedescendant={activeResultId}
							aria-autocomplete="list"
							placeholder="Search chats…"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								setActiveIndex(0);
							}}
							onKeyDown={handleKeyDown}
							className="pl-9 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
						/>
					</div>
				</SheetHeader>

				<div
					id={listboxId}
					role="listbox"
					aria-label="Search results"
					className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2"
				>
					{!query.trim() ? (
						<p className="px-3 py-4 text-center text-muted-foreground text-sm">
							Type to search across all your chats
						</p>
					) : results.length === 0 ? (
						<p className="px-3 py-4 text-center text-muted-foreground text-sm">
							No results for &ldquo;{query}&rdquo;
						</p>
					) : (
						results.map((result, index) => (
							<SearchResultItem
								key={result.threadId}
								id={`search-result-${index}`}
								result={result}
								isActive={index === activeIndex}
								onSelect={() => handleSelect(result.threadId)}
							/>
						))
					)}
				</div>

				<div className="border-t px-4 py-2 text-muted-foreground text-xs flex items-center gap-4">
					<span>
						<kbd className="font-mono">↑↓</kbd> navigate
					</span>
					<span>
						<kbd className="font-mono">↵</kbd> open
					</span>
					<span>
						<kbd className="font-mono">Esc</kbd> close
					</span>
				</div>
			</SheetContent>
		</Sheet>
	);
}
