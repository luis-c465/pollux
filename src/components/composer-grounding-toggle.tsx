import { ChevronsUpDownIcon, GlobeIcon } from "lucide-react";
import { useEffect } from "react";
import { Label } from "#/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { Slider } from "#/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { TOGGLE_GROUNDING_EVENT } from "#/lib/keyboard-shortcuts";
import {
	MAX_GROUNDING_THRESHOLD,
	MIN_GROUNDING_THRESHOLD,
	setGroundingEnabled,
	setGroundingThreshold,
	useSettings,
} from "#/lib/settings";
import { cn } from "#/lib/utils";

export function ComposerGroundingToggle() {
	const settings = useSettings();
	const tooltipText = settings.groundingEnabled
		? "Google Search grounding: enabled"
		: "Google Search grounding: disabled";

	useEffect(() => {
		const handleToggleGrounding = () => {
			setGroundingEnabled(!settings.groundingEnabled);
		};

		window.addEventListener(TOGGLE_GROUNDING_EVENT, handleToggleGrounding);
		return () => {
			window.removeEventListener(TOGGLE_GROUNDING_EVENT, handleToggleGrounding);
		};
	}, [settings.groundingEnabled]);

	return (
		<div className="inline-flex items-center gap-1">
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={() => setGroundingEnabled(!settings.groundingEnabled)}
						aria-label="Toggle Google Search grounding"
						aria-pressed={settings.groundingEnabled}
						className={cn(
							"inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
							settings.groundingEnabled
								? "bg-accent text-accent-foreground"
								: "bg-background hover:bg-accent hover:text-accent-foreground",
						)}
					>
						<GlobeIcon
							className={cn(
								"size-3.5",
								settings.groundingEnabled
									? "text-foreground"
									: "text-muted-foreground",
							)}
						/>
					</button>
				</TooltipTrigger>
				<TooltipContent side="top">{tooltipText}</TooltipContent>
			</Tooltip>

			{settings.groundingEnabled ? (
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label="Open grounding threshold settings"
							className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-sm hover:bg-accent hover:text-accent-foreground"
						>
							<span className="font-medium tabular-nums">
								{settings.groundingThreshold.toFixed(2)}
							</span>
							<ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
						</button>
					</PopoverTrigger>
					<PopoverContent
						side="top"
						align="start"
						className="w-72 space-y-3 p-3"
					>
						<div className="space-y-1">
							<div className="flex items-center justify-between gap-2">
								<Label htmlFor="composer-grounding-threshold">
									Dynamic threshold
								</Label>
								<span className="font-medium text-sm tabular-nums">
									{settings.groundingThreshold.toFixed(2)}
								</span>
							</div>
							<p className="text-muted-foreground text-xs">
								Lower values trigger Google Search more aggressively.
							</p>
						</div>
						<Slider
							id="composer-grounding-threshold"
							value={[settings.groundingThreshold]}
							min={MIN_GROUNDING_THRESHOLD}
							max={MAX_GROUNDING_THRESHOLD}
							step={0.05}
							onValueChange={(values) => {
								const [value] = values;
								if (value === undefined) {
									return;
								}

								setGroundingThreshold(value);
							}}
						/>
					</PopoverContent>
				</Popover>
			) : null}
		</div>
	);
}
