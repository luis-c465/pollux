import {
	formatForDisplay,
	type Hotkey,
	useHotkeyRecorder,
} from "@tanstack/react-hotkeys";
import { KeyboardIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface HotkeyRecorderProps {
	value: Hotkey | "";
	onChange: (hotkey: Hotkey | "") => void;
	className?: string;
	disabled?: boolean;
}

export function HotkeyRecorder({
	value,
	onChange,
	className,
	disabled = false,
}: HotkeyRecorderProps) {
	const recorder = useHotkeyRecorder({
		onRecord: (hotkey) => {
			onChange(hotkey);
		},
		onClear: () => {
			onChange("");
		},
		ignoreInputs: false,
	});

	const previewValue = recorder.recordedHotkey ?? value;

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Button
				type="button"
				variant="outline"
				className={cn(
					"min-w-36 justify-start gap-2 font-normal tabular-nums",
					recorder.isRecording && "border-primary text-foreground",
				)}
				onClick={() => {
					if (disabled) {
						return;
					}

					if (recorder.isRecording) {
						recorder.cancelRecording();
						return;
					}

					recorder.startRecording();
				}}
				disabled={disabled}
			>
				<KeyboardIcon className="size-3.5 text-muted-foreground" />
				<span className="truncate">
					{recorder.isRecording
						? "Press keys..."
						: previewValue
							? formatForDisplay(previewValue)
							: "Not set"}
				</span>
			</Button>

			{value ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={() => onChange("")}
					disabled={disabled}
					aria-label="Clear shortcut"
				>
					<XIcon className="size-3.5" />
				</Button>
			) : null}

			{recorder.isRecording ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={recorder.cancelRecording}
					aria-label="Cancel shortcut recording"
				>
					<XIcon className="size-3.5" />
				</Button>
			) : null}
		</div>
	);
}

interface ShortcutResetButtonProps {
	onClick: () => void;
	disabled?: boolean;
}

export function ShortcutResetButton({
	onClick,
	disabled = false,
}: ShortcutResetButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="gap-1.5 text-muted-foreground"
			onClick={onClick}
			disabled={disabled}
		>
			<RotateCcwIcon className="size-3.5" />
			Reset
		</Button>
	);
}
