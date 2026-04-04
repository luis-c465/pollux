import {
	DEFAULT_SHORTCUT_BINDINGS,
	SHORTCUT_DEFINITIONS,
} from "#/lib/keyboard-shortcuts";
import { setShortcutBinding, useShortcutBindings } from "#/lib/settings";
import { cn } from "#/lib/utils";
import { HotkeyRecorder, ShortcutResetButton } from "./hotkey-recorder";

export function SettingsKeyboardShortcuts() {
	const [shortcuts] = useShortcutBindings();

	return (
		<section className="flex flex-col gap-4">
			<div className="space-y-1">
				<h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
				<p className="text-muted-foreground text-xs leading-relaxed">
					Customize shortcuts for common composer actions. Press Escape while
					recording to cancel, or Backspace/Delete to clear a binding.
				</p>
			</div>

			<div className="overflow-hidden rounded-lg border">
				{SHORTCUT_DEFINITIONS.map((definition, index) => {
					const value = shortcuts[definition.action];

					return (
						<div
							key={definition.action}
							className={cn(
								"flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
								index > 0 && "border-t",
							)}
						>
							<div className="min-w-0 space-y-1">
								<p className="font-medium text-sm">{definition.label}</p>
								<p className="text-muted-foreground text-xs leading-relaxed">
									{definition.description}
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-2 sm:justify-end">
								<HotkeyRecorder
									value={value}
									onChange={(hotkey) => {
										setShortcutBinding(definition.action, hotkey);
									}}
								/>
								<ShortcutResetButton
									onClick={() => {
										setShortcutBinding(
											definition.action,
											DEFAULT_SHORTCUT_BINDINGS[definition.action],
										);
									}}
									disabled={
										value === DEFAULT_SHORTCUT_BINDINGS[definition.action]
									}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
