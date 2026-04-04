import { GlobeIcon } from "lucide-react";
import { useEffect } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { TOGGLE_GROUNDING_EVENT } from "#/lib/keyboard-shortcuts";
import { setGroundingEnabled, useSettings } from "#/lib/settings";
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
	);
}
