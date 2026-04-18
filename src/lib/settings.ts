import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_MODEL, isGeminiModel } from "#/lib/gemini-models";
import {
	DEFAULT_SHORTCUT_BINDINGS,
	dedupeShortcutBindings,
	normalizeShortcutBindings,
	type ShortcutAction,
	type ShortcutBinding,
	type ShortcutBindings,
} from "#/lib/keyboard-shortcuts";

// localStorage keys
export const SETTINGS_API_KEY = "pollux-api-key";
export const SETTINGS_MODEL = "pollux-model";
export const SETTINGS_SYSTEM_PROMPT = "pollux-system-prompt";
export const SETTINGS_TITLE_MODEL = "pollux-title-model";
export const SETTINGS_TITLE_SYSTEM_PROMPT = "pollux-title-system-prompt";
export const SETTINGS_GROUNDING = "pollux-grounding";
export const SETTINGS_GROUNDING_THRESHOLD = "pollux-grounding-threshold";
export const SETTINGS_THINKING_ENABLED = "pollux-thinking-enabled";
export const SETTINGS_THINKING_BUDGET = "pollux-thinking-budget";
export const SETTINGS_THINKING_LEVEL = "pollux-thinking-level";
export const SETTINGS_SHORTCUTS = "pollux-shortcuts";
export const SETTINGS_PRIORITY_QUEUE = "pollux-priority-queue";

export const DEFAULT_THINKING_BUDGET = 8192;
export const MIN_THINKING_BUDGET = 0;
export const MAX_THINKING_BUDGET = 32768;
export const DEFAULT_GROUNDING_THRESHOLD = 0.3;
export const MIN_GROUNDING_THRESHOLD = 0;
export const MAX_GROUNDING_THRESHOLD = 1;
export const DEFAULT_THINKING_LEVEL = "medium" as const;
export const DEFAULT_TITLE_MODEL = "gemini-3.1-flash-lite-preview";
export const DEFAULT_TITLE_SYSTEM_PROMPT =
	"Generate a short, descriptive title for this conversation. Use 2-6 words that capture the main topic. Reply with only the title.";

export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

// ---------------------------------------------------------------------------
// Custom event for same-tab storage notifications
// ---------------------------------------------------------------------------

const SETTINGS_CHANGE_EVENT = "pollux-settings-change";

function emitSettingsChange(key: string) {
	window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: key }));
}

// ---------------------------------------------------------------------------
// API Key helpers
// ---------------------------------------------------------------------------

export function getApiKey(): string | null {
	return localStorage.getItem(SETTINGS_API_KEY);
}

export function setApiKey(key: string): void {
	localStorage.setItem(SETTINGS_API_KEY, key);
	emitSettingsChange(SETTINGS_API_KEY);
}

export function removeApiKey(): void {
	localStorage.removeItem(SETTINGS_API_KEY);
	emitSettingsChange(SETTINGS_API_KEY);
}

export function hasApiKey(): boolean {
	const key = getApiKey();
	return key !== null && key.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Model selection helpers
// ---------------------------------------------------------------------------

export function getSelectedModel(): string {
	const stored = localStorage.getItem(SETTINGS_MODEL);
	if (stored && isGeminiModel(stored)) {
		return stored;
	}
	return DEFAULT_MODEL;
}

export function setSelectedModel(modelId: string): void {
	localStorage.setItem(SETTINGS_MODEL, modelId);
	emitSettingsChange(SETTINGS_MODEL);
}

// ---------------------------------------------------------------------------
// System prompt helpers
// ---------------------------------------------------------------------------

export function getSystemPrompt(): string {
	return localStorage.getItem(SETTINGS_SYSTEM_PROMPT) ?? "";
}

export function setSystemPrompt(prompt: string): void {
	localStorage.setItem(SETTINGS_SYSTEM_PROMPT, prompt);
	emitSettingsChange(SETTINGS_SYSTEM_PROMPT);
}

// ---------------------------------------------------------------------------
// Title generation helpers
// ---------------------------------------------------------------------------

export function getTitleModel(): string {
	const stored = localStorage.getItem(SETTINGS_TITLE_MODEL);
	if (stored && isGeminiModel(stored)) {
		return stored;
	}

	return DEFAULT_TITLE_MODEL;
}

export function setTitleModel(modelId: string): void {
	localStorage.setItem(SETTINGS_TITLE_MODEL, modelId);
	emitSettingsChange(SETTINGS_TITLE_MODEL);
}

export function getTitleSystemPrompt(): string {
	return (
		localStorage.getItem(SETTINGS_TITLE_SYSTEM_PROMPT) ??
		DEFAULT_TITLE_SYSTEM_PROMPT
	);
}

export function setTitleSystemPrompt(prompt: string): void {
	localStorage.setItem(SETTINGS_TITLE_SYSTEM_PROMPT, prompt);
	emitSettingsChange(SETTINGS_TITLE_SYSTEM_PROMPT);
}

// ---------------------------------------------------------------------------
// Google Search grounding helpers
// ---------------------------------------------------------------------------

export function getGroundingEnabled(): boolean {
	return localStorage.getItem(SETTINGS_GROUNDING) === "true";
}

export function setGroundingEnabled(enabled: boolean): void {
	localStorage.setItem(SETTINGS_GROUNDING, String(enabled));
	emitSettingsChange(SETTINGS_GROUNDING);
}

const clampGroundingThreshold = (value: number): number => {
	if (!Number.isFinite(value)) {
		return DEFAULT_GROUNDING_THRESHOLD;
	}

	const clamped = Math.min(
		MAX_GROUNDING_THRESHOLD,
		Math.max(MIN_GROUNDING_THRESHOLD, value),
	);
	return Number(clamped.toFixed(2));
};

export function getGroundingThreshold(): number {
	const stored = localStorage.getItem(SETTINGS_GROUNDING_THRESHOLD);
	if (!stored) {
		return DEFAULT_GROUNDING_THRESHOLD;
	}

	const parsed = Number.parseFloat(stored);
	return clampGroundingThreshold(parsed);
}

export function setGroundingThreshold(value: number): void {
	localStorage.setItem(
		SETTINGS_GROUNDING_THRESHOLD,
		String(clampGroundingThreshold(value)),
	);
	emitSettingsChange(SETTINGS_GROUNDING_THRESHOLD);
}

// ---------------------------------------------------------------------------
// Gemini thinking / reasoning helpers
// ---------------------------------------------------------------------------

const isThinkingLevel = (value: string): value is ThinkingLevel => {
	return (
		value === "minimal" ||
		value === "low" ||
		value === "medium" ||
		value === "high"
	);
};

const clampThinkingBudget = (value: number): number => {
	if (!Number.isFinite(value)) {
		return DEFAULT_THINKING_BUDGET;
	}

	const normalized = Math.round(value);
	if (normalized < MIN_THINKING_BUDGET) {
		return MIN_THINKING_BUDGET;
	}

	if (normalized > MAX_THINKING_BUDGET) {
		return MAX_THINKING_BUDGET;
	}

	return normalized;
};

export function getThinkingEnabled(): boolean {
	return localStorage.getItem(SETTINGS_THINKING_ENABLED) === "true";
}

export function setThinkingEnabled(enabled: boolean): void {
	localStorage.setItem(SETTINGS_THINKING_ENABLED, String(enabled));
	emitSettingsChange(SETTINGS_THINKING_ENABLED);
}

export function getThinkingBudget(): number {
	const stored = localStorage.getItem(SETTINGS_THINKING_BUDGET);
	if (!stored) {
		return DEFAULT_THINKING_BUDGET;
	}

	const parsed = Number.parseInt(stored, 10);
	return clampThinkingBudget(parsed);
}

export function setThinkingBudget(budget: number): void {
	localStorage.setItem(
		SETTINGS_THINKING_BUDGET,
		String(clampThinkingBudget(budget)),
	);
	emitSettingsChange(SETTINGS_THINKING_BUDGET);
}

export function getThinkingLevel(): ThinkingLevel {
	const stored = localStorage.getItem(SETTINGS_THINKING_LEVEL);
	if (!stored || !isThinkingLevel(stored)) {
		return DEFAULT_THINKING_LEVEL;
	}

	return stored;
}

export function setThinkingLevel(level: ThinkingLevel): void {
	localStorage.setItem(SETTINGS_THINKING_LEVEL, level);
	emitSettingsChange(SETTINGS_THINKING_LEVEL);
}

export interface ThinkingSettings {
	enabled: boolean;
	budget: number;
	level: ThinkingLevel;
}

export function getThinkingSettings(): ThinkingSettings {
	return {
		enabled: getThinkingEnabled(),
		budget: getThinkingBudget(),
		level: getThinkingLevel(),
	};
}

// ---------------------------------------------------------------------------
// Keyboard shortcut helpers
// ---------------------------------------------------------------------------

export function getShortcutBindings(): ShortcutBindings {
	const stored = localStorage.getItem(SETTINGS_SHORTCUTS);
	if (!stored) {
		return DEFAULT_SHORTCUT_BINDINGS;
	}

	try {
		const parsed = JSON.parse(stored) as unknown;
		return normalizeShortcutBindings(parsed);
	} catch {
		return DEFAULT_SHORTCUT_BINDINGS;
	}
}

export function setShortcutBindings(bindings: ShortcutBindings): void {
	localStorage.setItem(
		SETTINGS_SHORTCUTS,
		JSON.stringify(dedupeShortcutBindings(bindings)),
	);
	emitSettingsChange(SETTINGS_SHORTCUTS);
}

export function setShortcutBinding(
	action: ShortcutAction,
	hotkey: ShortcutBinding,
): void {
	setShortcutBindings({
		...getShortcutBindings(),
		[action]: hotkey,
	});
}

export function resetShortcutBindings(): void {
	setShortcutBindings(DEFAULT_SHORTCUT_BINDINGS);
}

// ---------------------------------------------------------------------------
// Priority queue helpers
// ---------------------------------------------------------------------------

export function getPriorityQueueEnabled(): boolean {
	return localStorage.getItem(SETTINGS_PRIORITY_QUEUE) === "true";
}

export function setPriorityQueueEnabled(enabled: boolean): void {
	localStorage.setItem(SETTINGS_PRIORITY_QUEUE, String(enabled));
	emitSettingsChange(SETTINGS_PRIORITY_QUEUE);
}

// ---------------------------------------------------------------------------
// useSettings hook — reactive access via useSyncExternalStore
// ---------------------------------------------------------------------------

export interface Settings {
	apiKey: string | null;
	hasApiKey: boolean;
	selectedModel: string;
	systemPrompt: string;
	titleModel: string;
	titleSystemPrompt: string;
	groundingEnabled: boolean;
	groundingThreshold: number;
	thinkingEnabled: boolean;
	thinkingBudget: number;
	thinkingLevel: ThinkingLevel;
	shortcuts: ShortcutBindings;
	priorityQueueEnabled: boolean;
}

function readSettings(): Settings {
	return {
		apiKey: getApiKey(),
		hasApiKey: hasApiKey(),
		selectedModel: getSelectedModel(),
		systemPrompt: getSystemPrompt(),
		titleModel: getTitleModel(),
		titleSystemPrompt: getTitleSystemPrompt(),
		groundingEnabled: getGroundingEnabled(),
		groundingThreshold: getGroundingThreshold(),
		thinkingEnabled: getThinkingEnabled(),
		thinkingBudget: getThinkingBudget(),
		thinkingLevel: getThinkingLevel(),
		shortcuts: getShortcutBindings(),
		priorityQueueEnabled: getPriorityQueueEnabled(),
	};
}

let cachedSettings = readSettings();

function subscribe(callback: () => void): () => void {
	// Listen for same-tab custom events
	const handleCustom = () => {
		cachedSettings = readSettings();
		callback();
	};
	// Listen for cross-tab native storage events
	const handleStorage = (e: StorageEvent) => {
		if (
			e.key === SETTINGS_API_KEY ||
			e.key === SETTINGS_MODEL ||
			e.key === SETTINGS_SYSTEM_PROMPT ||
			e.key === SETTINGS_TITLE_MODEL ||
			e.key === SETTINGS_TITLE_SYSTEM_PROMPT ||
			e.key === SETTINGS_GROUNDING ||
			e.key === SETTINGS_GROUNDING_THRESHOLD ||
			e.key === SETTINGS_THINKING_ENABLED ||
			e.key === SETTINGS_THINKING_BUDGET ||
			e.key === SETTINGS_THINKING_LEVEL ||
			e.key === SETTINGS_SHORTCUTS ||
			e.key === SETTINGS_PRIORITY_QUEUE
		) {
			cachedSettings = readSettings();
			callback();
		}
	};

	window.addEventListener(SETTINGS_CHANGE_EVENT, handleCustom);
	window.addEventListener("storage", handleStorage);
	return () => {
		window.removeEventListener(SETTINGS_CHANGE_EVENT, handleCustom);
		window.removeEventListener("storage", handleStorage);
	};
}

function getSnapshot(): Settings {
	return cachedSettings;
}

function getServerSnapshot(): Settings {
	return {
		apiKey: null,
		hasApiKey: false,
		selectedModel: DEFAULT_MODEL,
		systemPrompt: "",
		titleModel: DEFAULT_TITLE_MODEL,
		titleSystemPrompt: DEFAULT_TITLE_SYSTEM_PROMPT,
		groundingEnabled: false,
		groundingThreshold: DEFAULT_GROUNDING_THRESHOLD,
		thinkingEnabled: false,
		thinkingBudget: DEFAULT_THINKING_BUDGET,
		thinkingLevel: DEFAULT_THINKING_LEVEL,
		shortcuts: DEFAULT_SHORTCUT_BINDINGS,
		priorityQueueEnabled: false,
	};
}

export function useSettings(): Settings {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------------------------------------------------------------------------
// Individual setting hooks for convenience
// ---------------------------------------------------------------------------

export function useApiKey(): [
	string | null,
	(key: string) => void,
	() => void,
] {
	const settings = useSettings();
	return [
		settings.apiKey,
		useCallback(setApiKey, []),
		useCallback(removeApiKey, []),
	];
}

export function useSelectedModel(): [string, (modelId: string) => void] {
	const settings = useSettings();
	return [settings.selectedModel, useCallback(setSelectedModel, [])];
}

export function useSystemPrompt(): [string, (prompt: string) => void] {
	const settings = useSettings();
	return [settings.systemPrompt, useCallback(setSystemPrompt, [])];
}

export function useTitleModel(): [string, (modelId: string) => void] {
	const settings = useSettings();
	return [settings.titleModel, useCallback(setTitleModel, [])];
}

export function useTitleSystemPrompt(): [string, (prompt: string) => void] {
	const settings = useSettings();
	return [settings.titleSystemPrompt, useCallback(setTitleSystemPrompt, [])];
}

export function useGroundingEnabled(): [boolean, (enabled: boolean) => void] {
	const settings = useSettings();
	return [settings.groundingEnabled, useCallback(setGroundingEnabled, [])];
}

export function useGroundingThreshold(): [number, (value: number) => void] {
	const settings = useSettings();
	return [settings.groundingThreshold, useCallback(setGroundingThreshold, [])];
}

export function useThinkingEnabled(): [boolean, (enabled: boolean) => void] {
	const settings = useSettings();
	return [settings.thinkingEnabled, useCallback(setThinkingEnabled, [])];
}

export function useThinkingBudget(): [number, (budget: number) => void] {
	const settings = useSettings();
	return [settings.thinkingBudget, useCallback(setThinkingBudget, [])];
}

export function useThinkingLevel(): [
	ThinkingLevel,
	(level: ThinkingLevel) => void,
] {
	const settings = useSettings();
	return [settings.thinkingLevel, useCallback(setThinkingLevel, [])];
}

export function useShortcutBindings(): [
	ShortcutBindings,
	(bindings: ShortcutBindings) => void,
] {
	const settings = useSettings();
	return [settings.shortcuts, useCallback(setShortcutBindings, [])];
}

export function useShortcutBinding(
	action: ShortcutAction,
): [ShortcutBinding, (hotkey: ShortcutBinding) => void] {
	const settings = useSettings();
	return [
		settings.shortcuts[action],
		useCallback(
			(hotkey: ShortcutBinding) => setShortcutBinding(action, hotkey),
			[action],
		),
	];
}

export function usePriorityQueueEnabled(): [
	boolean,
	(enabled: boolean) => void,
] {
	const settings = useSettings();
	return [
		settings.priorityQueueEnabled,
		useCallback(setPriorityQueueEnabled, []),
	];
}
