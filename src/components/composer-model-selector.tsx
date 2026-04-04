import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "#/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { GEMINI_MODELS } from "#/lib/gemini-models";
import { setSelectedModel, useSettings } from "#/lib/settings";
import { cn } from "#/lib/utils";

function groupModels() {
	const groups = new Map<string, (typeof GEMINI_MODELS)[number][]>();

	for (const model of GEMINI_MODELS) {
		const existing = groups.get(model.group);
		if (existing) {
			existing.push(model);
			continue;
		}

		groups.set(model.group, [model]);
	}

	return Array.from(groups.entries());
}

export function ComposerModelSelector() {
	const [open, setOpen] = useState(false);
	const settings = useSettings();
	const selectedModel =
		GEMINI_MODELS.find((model) => model.id === settings.selectedModel) ??
		GEMINI_MODELS[0];
	const groupedModels = useMemo(() => groupModels(), []);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex h-8 max-w-[220px] items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground"
				>
					<span className="truncate">{selectedModel.name}</span>
					<ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent side="top" align="start" className="w-[360px] p-0">
				<Command>
					<CommandInput placeholder="Search models..." />
					<CommandList>
						<CommandEmpty>No models found.</CommandEmpty>
						{groupedModels.map(([group, models], index) => (
							<div key={group}>
								{index > 0 ? <CommandSeparator /> : null}
								<CommandGroup heading={group}>
									{models.map((model) => {
										const isSelected = model.id === settings.selectedModel;

										return (
											<CommandItem
												key={model.id}
												value={`${model.name} ${model.id} ${model.provider} ${model.description}`}
												onSelect={() => {
													setSelectedModel(model.id);
													setOpen(false);
												}}
												className="flex items-start justify-between gap-3 px-3 py-2"
											>
												<div className="min-w-0">
													<p className="truncate font-medium text-sm">
														{model.name}
													</p>
													<p className="truncate text-muted-foreground text-xs">
														{model.provider} - {model.description}
													</p>
												</div>
												<CheckIcon
													className={cn(
														"mt-0.5 size-4 shrink-0 text-primary",
														isSelected ? "opacity-100" : "opacity-0",
													)}
												/>
											</CommandItem>
										);
									})}
								</CommandGroup>
							</div>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
