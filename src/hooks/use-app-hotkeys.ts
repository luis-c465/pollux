import { useHotkeys } from "@tanstack/react-hotkeys";
import {
	dispatchShortcutAction,
	SHORTCUT_DEFINITIONS,
} from "#/lib/keyboard-shortcuts";
import { useSettings } from "#/lib/settings";

export function useAppHotkeys(): void {
	const settings = useSettings();

	useHotkeys(
		SHORTCUT_DEFINITIONS.flatMap((definition) => {
			const hotkey = settings.shortcuts[definition.action];
			if (!hotkey) {
				return [];
			}

			return [
				{
					hotkey,
					callback: () => {
						dispatchShortcutAction(definition.action);
					},
					options: {
						target: typeof window === "undefined" ? null : window,
						meta: {
							name: definition.label,
							description: definition.description,
						},
						ignoreInputs: false,
					},
				},
			];
		}),
	);
}
