import { BrainIcon, GlobeIcon, WrenchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { TooltipIconButton } from "#/components/assistant-ui/tooltip-icon-button";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet";
import { Slider } from "#/components/ui/slider";
import { getGeminiModel } from "#/lib/gemini-models";
import {
	OPEN_THINKING_SELECTOR_EVENT,
	TOGGLE_GROUNDING_EVENT,
} from "#/lib/keyboard-shortcuts";
import {
	MAX_GROUNDING_THRESHOLD,
	MAX_THINKING_BUDGET,
	MIN_GROUNDING_THRESHOLD,
	MIN_THINKING_BUDGET,
	setGroundingEnabled,
	setGroundingThreshold,
	setThinkingBudget,
	setThinkingLevel,
	type ThinkingLevel,
	useSettings,
} from "#/lib/settings";
import { cn } from "#/lib/utils";

export function ComposerModelConfigSheet() {
	const [open, setOpen] = useState(false);
	const settings = useSettings();
	const selectedModel = getGeminiModel(settings.selectedModel);
	const showThinking =
		selectedModel?.supportsThinking && settings.thinkingEnabled === true;

	useEffect(() => {
		const handleOpenThinking = () => {
			if (!showThinking) {
				return;
			}

			setOpen(true);
		};

		const handleToggleGrounding = () => {
			setGroundingEnabled(!settings.groundingEnabled);
		};

		window.addEventListener(OPEN_THINKING_SELECTOR_EVENT, handleOpenThinking);
		window.addEventListener(TOGGLE_GROUNDING_EVENT, handleToggleGrounding);

		return () => {
			window.removeEventListener(
				OPEN_THINKING_SELECTOR_EVENT,
				handleOpenThinking,
			);
			window.removeEventListener(TOGGLE_GROUNDING_EVENT, handleToggleGrounding);
		};
	}, [settings.groundingEnabled, showThinking]);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<TooltipIconButton
					type="button"
					size="icon"
					className="size-8 rounded-full"
					tooltip="Advanced model settings"
					aria-label="Open advanced model settings"
				>
					<WrenchIcon className="size-4" />
				</TooltipIconButton>
			</SheetTrigger>
			<SheetContent side="bottom" className="max-h-[85dvh] gap-0 p-0">
				<SheetHeader className="border-b">
					<SheetTitle>Advanced model settings</SheetTitle>
					<SheetDescription>
						Configure thinking and Google Search grounding.
					</SheetDescription>
				</SheetHeader>
				<div className="space-y-6 overflow-y-auto p-4 pb-6">
					{showThinking ? (
						<div className="space-y-3">
							<div className="flex items-center gap-2 font-medium text-sm">
								<BrainIcon className="size-4 text-muted-foreground" />
								<span>Thinking</span>
							</div>

							{selectedModel?.thinkingType === "level" ? (
								<Select
									value={settings.thinkingLevel}
									onValueChange={(value) => {
										setThinkingLevel(value as ThinkingLevel);
									}}
								>
									<SelectTrigger className="h-9 w-full px-3 text-sm">
										<SelectValue placeholder="Thinking level" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="minimal">Minimal</SelectItem>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="high">High</SelectItem>
									</SelectContent>
								</Select>
							) : null}

							{selectedModel?.thinkingType === "budget" ? (
								<div className="space-y-3">
									<div className="flex items-center justify-between gap-2">
										<Label htmlFor="mobile-thinking-budget">
											Thinking budget
										</Label>
										<span className="font-medium text-sm tabular-nums">
											{settings.thinkingBudget.toLocaleString()}
										</span>
									</div>
									<Slider
										id="mobile-thinking-budget"
										value={[settings.thinkingBudget]}
										min={MIN_THINKING_BUDGET}
										max={MAX_THINKING_BUDGET}
										step={256}
										onValueChange={(values) => {
											const [value] = values;
											if (value === undefined) {
												return;
											}

											setThinkingBudget(value);
										}}
									/>
								</div>
							) : null}
						</div>
					) : null}

					<div className="space-y-3">
						<div className="flex items-center gap-2 font-medium text-sm">
							<GlobeIcon className="size-4 text-muted-foreground" />
							<span>Google Search grounding</span>
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={() => setGroundingEnabled(!settings.groundingEnabled)}
							aria-pressed={settings.groundingEnabled}
							className={cn(
								"w-full justify-start",
								settings.groundingEnabled && "bg-accent text-accent-foreground",
							)}
						>
							{settings.groundingEnabled ? "Enabled" : "Disabled"}
						</Button>

						{settings.groundingEnabled ? (
							<div className="space-y-3">
								<div className="space-y-1">
									<div className="flex items-center justify-between gap-2">
										<Label htmlFor="mobile-grounding-threshold">
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
									id="mobile-grounding-threshold"
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
							</div>
						) : null}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
