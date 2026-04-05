import { useAui } from "@assistant-ui/react";
import uFuzzy from "@leeoniya/ufuzzy";
import { SearchIcon } from "lucide-react";
import {
	type KeyboardEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Input } from "#/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { loadSearchableThreads, type SearchableThread } from "#/lib/db";
import { OPEN_SEARCH_EVENT } from "#/lib/keyboard-shortcuts";

// ---------------------------------------------------------------------------
// uFuzzy instance (module-level singleton — no state)
// ---------------------------------------------------------------------------

const uf = new uFuzzy({
	intraIns: 1,
	interIns: 3,
	interLft: 1,
	interRgt: 1,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchResult = {
	threadId: string;
	title: string;
	titleHtml: string;
	snippet: string;
	updatedAt: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SNIPPET_RADIUS = 80; // chars before/after match centre

/**
 * Applies uFuzzy highlight ranges to text, returning an HTML string with
 * <mark> tags around matched characters.
 */
function applyHighlight(text: string, ranges: number[]): string {
	if (!ranges.length) return escapeHtml(text);
	return uFuzzy.highlight(text, ranges, (part, matched) =>
		matched
			? `<mark class="bg-yellow-200 dark:bg-yellow-700 rounded-sm">${escapeHtml(part)}</mark>`
			: escapeHtml(part),
	) as string;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

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
// Search logic
// ---------------------------------------------------------------------------

const MAX_RESULTS = 25;

function runSearch(data: SearchableThread[], query: string): SearchResult[] {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const titles = data.map((t) => t.title);
	const contents = data.map((t) => t.textContent);

	// Search titles (2× weight) and content (1× weight) separately
	const [titleIdxs, titleInfo, titleOrder] = uf.search(titles, trimmed);
	const [contentIdxs, contentInfo, contentOrder] = uf.search(contents, trimmed);

	// Accumulate scores per threadId
	const scoreMap = new Map<
		string,
		{
			score: number;
			titleRanges: number[];
			contentRanges: number[];
			thread: SearchableThread;
		}
	>();

	if (titleIdxs && titleOrder) {
		for (let r = 0; r < titleOrder.length; r++) {
			const orderIdx = titleOrder[r];
			if (orderIdx === undefined) continue;
			const dataIdx = titleIdxs[orderIdx];
			if (dataIdx === undefined) continue;
			const thread = data[dataIdx];
			if (!thread) continue;
			const intra = titleInfo?.intraIns[orderIdx] ?? 0;
			const rankBonus = Math.max(0, MAX_RESULTS - r);
			const titleRanges = titleInfo?.ranges[orderIdx] ?? [];
			const entry = scoreMap.get(thread.threadId);
			if (entry) {
				entry.score += (rankBonus + 10 - intra) * 2;
				if (!entry.titleRanges.length) entry.titleRanges = titleRanges;
			} else {
				scoreMap.set(thread.threadId, {
					score: (rankBonus + 10 - intra) * 2,
					titleRanges,
					contentRanges: [],
					thread,
				});
			}
		}
	}

	if (contentIdxs && contentOrder) {
		for (let r = 0; r < contentOrder.length; r++) {
			const orderIdx = contentOrder[r];
			if (orderIdx === undefined) continue;
			const dataIdx = contentIdxs[orderIdx];
			if (dataIdx === undefined) continue;
			const thread = data[dataIdx];
			if (!thread) continue;
			const intra = contentInfo?.intraIns[orderIdx] ?? 0;
			const rankBonus = Math.max(0, MAX_RESULTS - r);
			const contentRanges = contentInfo?.ranges[orderIdx] ?? [];
			const entry = scoreMap.get(thread.threadId);
			if (entry) {
				entry.score += rankBonus + 10 - intra;
				if (!entry.contentRanges.length) entry.contentRanges = contentRanges;
			} else {
				scoreMap.set(thread.threadId, {
					score: rankBonus + 10 - intra,
					titleRanges: [],
					contentRanges,
					thread,
				});
			}
		}
	}

	// Sort and slice
	const sorted = [...scoreMap.values()].sort((a, b) => b.score - a.score);
	const top = sorted.slice(0, MAX_RESULTS);

	return top.map(({ thread, titleRanges, contentRanges }) => {
		const titleHtml = applyHighlight(thread.title, titleRanges);

		let snippet = "";
		if (contentRanges.length && thread.textContent) {
			// Re-locate the ranges relative to the snippet slice start
			const firstStart = contentRanges[0] ?? 0;
			const snippetStart = Math.max(0, firstStart - SNIPPET_RADIUS);
			const snippetEnd = Math.min(
				thread.textContent.length,
				firstStart + SNIPPET_RADIUS,
			);
			const snippetText = thread.textContent.slice(snippetStart, snippetEnd);
			const shiftedRanges = contentRanges.map((n) =>
				Math.max(0, n - snippetStart),
			);
			const snippetHtml = applyHighlight(snippetText, shiftedRanges);
			const prefix = snippetStart > 0 ? "…" : "";
			const suffix = snippetEnd < thread.textContent.length ? "…" : "";
			snippet = prefix + snippetHtml + suffix;
		} else if (thread.textContent) {
			// No content match — show plain beginning
			snippet = escapeHtml(thread.textContent.slice(0, 120));
			if (thread.textContent.length > 120) snippet += "…";
		}

		return {
			threadId: thread.threadId,
			title: thread.title,
			titleHtml,
			snippet,
			updatedAt: thread.updatedAt,
		};
	});
}

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
	const [searchData, setSearchData] = useState<SearchableThread[] | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const aui = useAui();

	// Listen for the open-search custom event
	useEffect(() => {
		const handleOpen = () => setOpen(true);
		window.addEventListener(OPEN_SEARCH_EVENT, handleOpen);
		return () => window.removeEventListener(OPEN_SEARCH_EVENT, handleOpen);
	}, []);

	// Pre-load search data on mount so it's ready when the sheet opens
	useEffect(() => {
		loadSearchableThreads()
			.then((data) => {
				setSearchData(data);
			})
			.catch(console.error);
	}, []);

	// Reload search data and reset query whenever the sheet opens
	useEffect(() => {
		if (!open) return;

		setQuery("");
		setActiveIndex(0);

		setIsLoading(true);
		loadSearchableThreads()
			.then((data) => {
				setSearchData(data);
			})
			.catch(console.error)
			.finally(() => setIsLoading(false));
	}, [open]);

	// Focus the input when the sheet opens (after animation)
	useEffect(() => {
		if (!open) return;
		const timer = window.setTimeout(() => {
			inputRef.current?.focus();
		}, 50);
		return () => window.clearTimeout(timer);
	}, [open]);

	// Compute search results
	const results = useMemo<SearchResult[]>(() => {
		if (!searchData || !query.trim()) return [];
		return runSearch(searchData, query);
	}, [searchData, query]);

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
					{isLoading ? (
						<p className="px-3 py-4 text-center text-muted-foreground text-sm">
							Loading…
						</p>
					) : !query.trim() ? (
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
