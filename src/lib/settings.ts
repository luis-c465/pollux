import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_MODEL, isGeminiModel } from "#/lib/gemini-models";

// localStorage keys
export const SETTINGS_API_KEY = "gchat-api-key";
export const SETTINGS_MODEL = "gchat-model";
export const SETTINGS_SYSTEM_PROMPT = "gchat-system-prompt";
export const SETTINGS_GROUNDING = "gchat-grounding";

// ---------------------------------------------------------------------------
// Custom event for same-tab storage notifications
// ---------------------------------------------------------------------------

const SETTINGS_CHANGE_EVENT = "gchat-settings-change";

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
// Google Search grounding helpers
// ---------------------------------------------------------------------------

export function getGroundingEnabled(): boolean {
	return localStorage.getItem(SETTINGS_GROUNDING) === "true";
}

export function setGroundingEnabled(enabled: boolean): void {
	localStorage.setItem(SETTINGS_GROUNDING, String(enabled));
	emitSettingsChange(SETTINGS_GROUNDING);
}

// ---------------------------------------------------------------------------
// useSettings hook — reactive access via useSyncExternalStore
// ---------------------------------------------------------------------------

export interface Settings {
	apiKey: string | null;
	hasApiKey: boolean;
	selectedModel: string;
	systemPrompt: string;
	groundingEnabled: boolean;
}

function readSettings(): Settings {
	return {
		apiKey: getApiKey(),
		hasApiKey: hasApiKey(),
		selectedModel: getSelectedModel(),
		systemPrompt: getSystemPrompt(),
		groundingEnabled: getGroundingEnabled(),
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
			e.key === SETTINGS_GROUNDING
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
		groundingEnabled: false,
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

export function useGroundingEnabled(): [boolean, (enabled: boolean) => void] {
	const settings = useSettings();
	return [settings.groundingEnabled, useCallback(setGroundingEnabled, [])];
}
