import { BrainIcon, ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";
import { Label } from "#/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Slider } from "#/components/ui/slider";
import { getGeminiModel } from "#/lib/gemini-models";
import {
	MAX_THINKING_BUDGET,
	MIN_THINKING_BUDGET,
	setThinkingBudget,
	setThinkingLevel,
	type ThinkingLevel,
	useSettings,
} from "#/lib/settings";

function formatBudget(value: number): string {
	if (value >= 1000) {
		const compact = value / 1000;
		if (Number.isInteger(compact)) {
			return `${compact}K`;
		}

		return `${compact.toFixed(1)}K`;
	}

	return String(value);
}

export function ComposerThinkingSelector() {
	const [open, setOpen] = useState(false);
	const settings = useSettings();
	const selectedModel = getGeminiModel(settings.selectedModel);

	if (!selectedModel?.supportsThinking || !settings.thinkingEnabled) {
		return null;
	}

	if (selectedModel.thinkingType === "level") {
		return (
			<Select
				value={settings.thinkingLevel}
				onValueChange={(value) => setThinkingLevel(value as ThinkingLevel)}
			>
				<SelectTrigger className="h-8 min-w-32 gap-2 px-3 text-sm">
					<BrainIcon className="size-3.5 text-muted-foreground" />
					<SelectValue placeholder="Thinking level" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="minimal">Minimal</SelectItem>
					<SelectItem value="low">Low</SelectItem>
					<SelectItem value="medium">Medium</SelectItem>
					<SelectItem value="high">High</SelectItem>
				</SelectContent>
			</Select>
		);
	}

	if (selectedModel.thinkingType !== "budget") {
		return null;
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground"
				>
					<BrainIcon className="size-3.5 text-muted-foreground" />
					<span>{formatBudget(settings.thinkingBudget)}</span>
					<ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent side="top" align="start" className="w-72 space-y-3 p-3">
				<div className="flex items-center justify-between gap-2">
					<Label htmlFor="composer-thinking-budget">Thinking Budget</Label>
					<span className="font-medium text-sm tabular-nums">
						{settings.thinkingBudget.toLocaleString()}
					</span>
				</div>
				<Slider
					id="composer-thinking-budget"
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
			</PopoverContent>
		</Popover>
	);
}
