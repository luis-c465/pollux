import { type Hotkey, validateHotkey } from "@tanstack/react-hotkeys";

export const FOCUS_CHAT_INPUT_EVENT = "pollux-focus-chat-input";
export const NEW_CHAT_EVENT = "pollux-new-chat";
export const OPEN_MODEL_PICKER_EVENT = "pollux-open-model-picker";
export const OPEN_THINKING_SELECTOR_EVENT = "pollux-open-thinking-selector";
export const TOGGLE_GROUNDING_EVENT = "pollux-toggle-grounding";

export type ShortcutBinding = Hotkey | "";

export interface ShortcutBindings {
	newChat: ShortcutBinding;
	focusInput: ShortcutBinding;
	openModelPicker: ShortcutBinding;
	openThinking: ShortcutBinding;
	toggleGrounding: ShortcutBinding;
}

export type ShortcutAction = keyof ShortcutBindings;

export interface ShortcutDefinition {
	action: ShortcutAction;
	label: string;
	description: string;
	eventName: string;
	defaultHotkey: ShortcutBinding;
}

export const SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
	{
		action: "newChat",
		label: "New chat",
		description: "Create a new chat and move focus to the main chat input.",
		eventName: NEW_CHAT_EVENT,
		defaultHotkey: "Alt+N",
	},
	{
		action: "openModelPicker",
		label: "Select model",
		description:
			"Open the composer model picker, then return focus to the chat input after choosing a model.",
		eventName: OPEN_MODEL_PICKER_EVENT,
		defaultHotkey: "Alt+M",
	},
	{
		action: "openThinking",
		label: "Select thinking amount",
		description:
			"Open the current model's thinking selector and focus the chat input after committing a value.",
		eventName: OPEN_THINKING_SELECTOR_EVENT,
		defaultHotkey: "Alt+T",
	},
	{
		action: "toggleGrounding",
		label: "Toggle Search grounding",
		description: "Turn Google Search grounding on or off from the composer.",
		eventName: TOGGLE_GROUNDING_EVENT,
		defaultHotkey: "Alt+G",
	},
	{
		action: "focusInput",
		label: "Focus chat input",
		description: "Move focus to the main chat input.",
		eventName: FOCUS_CHAT_INPUT_EVENT,
		defaultHotkey: "Alt+L",
	},
];

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings =
	SHORTCUT_DEFINITIONS.reduce<ShortcutBindings>(
		(accumulator, definition) => {
			accumulator[definition.action] = definition.defaultHotkey;
			return accumulator;
		},
		{
			newChat: "",
			focusInput: "",
			openModelPicker: "",
			openThinking: "",
			toggleGrounding: "",
		},
	);

export function isShortcutBinding(value: unknown): value is ShortcutBinding {
	return (
		typeof value === "string" && (value === "" || validateHotkey(value).valid)
	);
}

export function normalizeShortcutBindings(value: unknown): ShortcutBindings {
	const rawBindings =
		typeof value === "object" && value !== null
			? (value as Partial<Record<ShortcutAction, unknown>>)
			: {};

	return dedupeShortcutBindings({
		newChat: normalizeShortcutBinding(
			rawBindings.newChat,
			DEFAULT_SHORTCUT_BINDINGS.newChat,
		),
		focusInput: normalizeShortcutBinding(
			rawBindings.focusInput,
			DEFAULT_SHORTCUT_BINDINGS.focusInput,
		),
		openModelPicker: normalizeShortcutBinding(
			rawBindings.openModelPicker,
			DEFAULT_SHORTCUT_BINDINGS.openModelPicker,
		),
		openThinking: normalizeShortcutBinding(
			rawBindings.openThinking,
			DEFAULT_SHORTCUT_BINDINGS.openThinking,
		),
		toggleGrounding: normalizeShortcutBinding(
			rawBindings.toggleGrounding,
			DEFAULT_SHORTCUT_BINDINGS.toggleGrounding,
		),
	});
}

export function dedupeShortcutBindings(
	bindings: ShortcutBindings,
): ShortcutBindings {
	const seen = new Set<string>();
	const nextBindings = { ...bindings };

	for (const definition of SHORTCUT_DEFINITIONS) {
		const hotkey = nextBindings[definition.action];
		if (!hotkey) {
			continue;
		}

		if (seen.has(hotkey)) {
			nextBindings[definition.action] = "";
			continue;
		}

		seen.add(hotkey);
	}

	return nextBindings;
}

export function dispatchShortcutEvent(eventName: string): void {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(new CustomEvent(eventName));
}

export function dispatchShortcutAction(action: ShortcutAction): void {
	const definition = SHORTCUT_DEFINITIONS.find(
		(candidate) => candidate.action === action,
	);

	if (!definition) {
		return;
	}

	dispatchShortcutEvent(definition.eventName);
}

export function focusChatInput(): void {
	dispatchShortcutEvent(FOCUS_CHAT_INPUT_EVENT);
}

function normalizeShortcutBinding(
	value: unknown,
	fallback: ShortcutBinding,
): ShortcutBinding {
	if (!isShortcutBinding(value)) {
		return fallback;
	}

	return value;
}
