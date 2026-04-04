const DEFAULT_REFRESH_RATE = 60;
const MIN_REFRESH_RATE = 30;
const MAX_REFRESH_RATE = 240;
const REFRESH_RATE_SAMPLE_SIZE = 6;

type TypewriterControllerOptions = {
	backlogThresholdChars?: number;
	initialRefreshRate?: number;
	maxCatchUpMultiplier?: number;
};

type TypewriterController = {
	complete: () => void;
	drainFrame: (abortSignal: AbortSignal) => Promise<string | null>;
	getDisplayedText: () => string;
	getFullText: () => string;
	hasPendingText: () => boolean;
	push: (text: string) => void;
	setRefreshRate: (refreshRate: number) => void;
};

let refreshRatePromise: Promise<number> | null = null;

const createAbortError = () => new DOMException("Aborted", "AbortError");

const clamp = (value: number, min: number, max: number): number => {
	if (value < min) {
		return min;
	}

	if (value > max) {
		return max;
	}

	return value;
};

const normalizeRefreshRate = (refreshRate: number): number => {
	if (!Number.isFinite(refreshRate) || refreshRate <= 0) {
		return DEFAULT_REFRESH_RATE;
	}

	return Math.round(clamp(refreshRate, MIN_REFRESH_RATE, MAX_REFRESH_RATE));
};

const isWhitespaceCode = (code: number): boolean => {
	return (
		code === 9 ||
		code === 10 ||
		code === 11 ||
		code === 12 ||
		code === 13 ||
		code === 32
	);
};

const findNextWordBoundary = (
	value: string,
	startIndex: number,
	allowIncompleteWord: boolean,
): number => {
	if (startIndex >= value.length) {
		return startIndex;
	}

	let index = startIndex;

	while (index < value.length && isWhitespaceCode(value.charCodeAt(index))) {
		index += 1;
	}

	while (index < value.length && !isWhitespaceCode(value.charCodeAt(index))) {
		index += 1;
	}

	if (
		!allowIncompleteWord &&
		index === value.length &&
		index > startIndex &&
		!isWhitespaceCode(value.charCodeAt(index - 1))
	) {
		return startIndex;
	}

	while (index < value.length && isWhitespaceCode(value.charCodeAt(index))) {
		index += 1;
	}

	return index;
};

const resolveWordsPerFrame = (
	refreshRate: number,
	backlogChars: number,
	backlogThresholdChars: number,
	maxCatchUpMultiplier: number,
): number => {
	const baseWordsPerFrame = Math.max(
		1,
		Math.round(refreshRate / DEFAULT_REFRESH_RATE),
	);

	if (backlogChars <= backlogThresholdChars) {
		return baseWordsPerFrame;
	}

	const backlogRatio = backlogChars / backlogThresholdChars;
	const multiplier = Math.min(
		maxCatchUpMultiplier,
		Math.max(2, Math.ceil(backlogRatio)),
	);

	return baseWordsPerFrame * multiplier;
};

const waitForWork = (
	abortSignal: AbortSignal,
	hasPendingText: () => boolean,
	isComplete: () => boolean,
	setResolver: (resolver: (() => void) | null) => void,
): Promise<void> => {
	if (abortSignal.aborted) {
		return Promise.reject(createAbortError());
	}

	if (hasPendingText() || isComplete()) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve, reject) => {
		const onAbort = () => {
			setResolver(null);
			reject(createAbortError());
		};

		const resolveWork = () => {
			abortSignal.removeEventListener("abort", onAbort);
			resolve();
		};

		setResolver(resolveWork);
		abortSignal.addEventListener("abort", onAbort, { once: true });
	});
};

const requestAnimationFrameFallback = (
	callback: (timestamp: number) => void,
): number => {
	return window.setTimeout(
		() => {
			callback(performance.now());
		},
		Math.round(1000 / DEFAULT_REFRESH_RATE),
	);
};

const cancelAnimationFrameFallback = (id: number) => {
	window.clearTimeout(id);
};

export const nextFrame = (abortSignal: AbortSignal): Promise<void> => {
	if (abortSignal.aborted) {
		return Promise.reject(createAbortError());
	}

	return new Promise<void>((resolve, reject) => {
		const onAbort = () => {
			if (typeof window.requestAnimationFrame === "function") {
				window.cancelAnimationFrame(frameHandle);
			} else {
				cancelAnimationFrameFallback(frameHandle);
			}

			reject(createAbortError());
		};

		const onFrame = () => {
			abortSignal.removeEventListener("abort", onAbort);
			resolve();
		};

		abortSignal.addEventListener("abort", onAbort, { once: true });

		const frameHandle =
			typeof window.requestAnimationFrame === "function"
				? window.requestAnimationFrame(onFrame)
				: requestAnimationFrameFallback(onFrame);
	});
};

export const detectRefreshRate = async (): Promise<number> => {
	if (typeof window === "undefined") {
		return DEFAULT_REFRESH_RATE;
	}

	if (!refreshRatePromise) {
		refreshRatePromise = (async () => {
			if (typeof window.requestAnimationFrame !== "function") {
				return DEFAULT_REFRESH_RATE;
			}

			const timestamps: number[] = [];

			for (let index = 0; index < REFRESH_RATE_SAMPLE_SIZE; index += 1) {
				const timestamp = await new Promise<number>((resolve) => {
					window.requestAnimationFrame(resolve);
				});
				timestamps.push(timestamp);
			}

			const deltas: number[] = [];
			for (let index = 1; index < timestamps.length; index += 1) {
				deltas.push(timestamps[index] - timestamps[index - 1]);
			}

			if (deltas.length === 0) {
				return DEFAULT_REFRESH_RATE;
			}

			const averageDelta =
				deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
			if (averageDelta <= 0) {
				return DEFAULT_REFRESH_RATE;
			}

			return normalizeRefreshRate(1000 / averageDelta);
		})();
	}

	try {
		return await refreshRatePromise;
	} catch {
		refreshRatePromise = null;
		return DEFAULT_REFRESH_RATE;
	}
};

export const createTypewriterController = (
	options: TypewriterControllerOptions = {},
): TypewriterController => {
	const backlogThresholdChars = options.backlogThresholdChars ?? 100;
	const maxCatchUpMultiplier = options.maxCatchUpMultiplier ?? 8;

	let displayedLength = 0;
	let fullText = "";
	let isComplete = false;
	let refreshRate = normalizeRefreshRate(
		options.initialRefreshRate ?? DEFAULT_REFRESH_RATE,
	);
	let pendingResolver: (() => void) | null = null;

	const hasPendingText = () => displayedLength < fullText.length;

	const notifyWork = () => {
		if (!pendingResolver) {
			return;
		}

		const resolve = pendingResolver;
		pendingResolver = null;
		resolve();
	};

	const setResolver = (resolver: (() => void) | null) => {
		pendingResolver = resolver;
	};

	const drainFrame = async (
		abortSignal: AbortSignal,
	): Promise<string | null> => {
		for (;;) {
			while (!hasPendingText()) {
				if (isComplete) {
					return null;
				}

				await waitForWork(
					abortSignal,
					hasPendingText,
					() => isComplete,
					setResolver,
				);
			}

			await nextFrame(abortSignal);

			const backlogChars = fullText.length - displayedLength;
			const wordsToReveal = resolveWordsPerFrame(
				refreshRate,
				backlogChars,
				backlogThresholdChars,
				maxCatchUpMultiplier,
			);

			let nextLength = displayedLength;
			for (let count = 0; count < wordsToReveal; count += 1) {
				const boundary = findNextWordBoundary(fullText, nextLength, isComplete);
				if (boundary <= nextLength) {
					break;
				}
				nextLength = boundary;
			}

			if (nextLength === displayedLength) {
				if (isComplete) {
					displayedLength = fullText.length;
					return fullText;
				}

				await waitForWork(
					abortSignal,
					hasPendingText,
					() => isComplete,
					setResolver,
				);
				continue;
			}

			displayedLength = nextLength;
			return fullText.slice(0, displayedLength);
		}
	};

	return {
		complete: () => {
			isComplete = true;
			notifyWork();
		},
		drainFrame,
		getDisplayedText: () => fullText.slice(0, displayedLength),
		getFullText: () => fullText,
		hasPendingText,
		push: (text: string) => {
			if (!text) {
				return;
			}

			fullText += text;
			notifyWork();
		},
		setRefreshRate: (nextRefreshRate: number) => {
			refreshRate = normalizeRefreshRate(nextRefreshRate);
		},
	};
};
