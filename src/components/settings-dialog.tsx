import {
	ExternalLinkIcon,
	EyeIcon,
	EyeOffIcon,
	SettingsIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { GEMINI_MODELS } from "#/lib/gemini-models";
import {
	getApiKey,
	removeApiKey,
	setApiKey,
	setSelectedModel,
	setSystemPrompt,
	useSettings,
} from "#/lib/settings";
import { cn } from "#/lib/utils";

export function SettingsDialog() {
	const settings = useSettings();
	const [open, setOpen] = useState(false);

	// Local state for the dialog's form fields
	const [apiKeyInput, setApiKeyInput] = useState(() => getApiKey() ?? "");
	const [showApiKey, setShowApiKey] = useState(false);
	const [apiKeySaved, setApiKeySaved] = useState(false);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [systemPromptInput, setSystemPromptInput] = useState(
		settings.systemPrompt,
	);
	const systemPromptDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	// Re-sync local fields when dialog opens
	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen) {
				setApiKeyInput(getApiKey() ?? "");
				setShowApiKey(false);
				setApiKeySaved(false);
				setSystemPromptInput(settings.systemPrompt);
			}
			setOpen(isOpen);
		},
		[settings.systemPrompt],
	);

	// -------------------------------------------------------------------------
	// API Key handlers
	// -------------------------------------------------------------------------

	function handleSaveApiKey() {
		const trimmed = apiKeyInput.trim();
		if (trimmed) {
			setApiKey(trimmed);
		} else {
			removeApiKey();
		}
		setApiKeySaved(true);
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
		saveTimeoutRef.current = setTimeout(() => setApiKeySaved(false), 2000);
	}

	function handleRemoveApiKey() {
		removeApiKey();
		setApiKeyInput("");
		setApiKeySaved(false);
	}

	// -------------------------------------------------------------------------
	// System prompt handlers
	// -------------------------------------------------------------------------

	function handleSystemPromptChange(value: string) {
		setSystemPromptInput(value);
		if (systemPromptDebounceRef.current)
			clearTimeout(systemPromptDebounceRef.current);
		systemPromptDebounceRef.current = setTimeout(() => {
			setSystemPrompt(value);
		}, 500);
	}

	function handleSystemPromptBlur() {
		if (systemPromptDebounceRef.current)
			clearTimeout(systemPromptDebounceRef.current);
		setSystemPrompt(systemPromptInput);
	}

	function handleResetSystemPrompt() {
		setSystemPromptInput("");
		setSystemPrompt("");
	}

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
					aria-label="Open settings"
				>
					<SettingsIcon className="size-4" />
				</Button>
			</DialogTrigger>

			<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>
						Configure your Gemini API key, model, and preferences.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-6 py-2">
					{/* ------------------------------------------------------------------ */}
					{/* API Key Section                                                      */}
					{/* ------------------------------------------------------------------ */}
					<section className="flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold">Gemini API Key</h3>
							<span
								className={cn(
									"size-2 rounded-full",
									settings.hasApiKey ? "bg-green-500" : "bg-red-500",
								)}
								title={settings.hasApiKey ? "API key is set" : "No API key set"}
							/>
						</div>

						<div className="flex gap-2">
							<div className="relative flex-1">
								<Input
									type={showApiKey ? "text" : "password"}
									placeholder="AI..."
									value={apiKeyInput}
									onChange={(e) => setApiKeyInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleSaveApiKey();
									}}
									className="pr-10"
									autoComplete="off"
									spellCheck={false}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
									onClick={() => setShowApiKey((v) => !v)}
									aria-label={showApiKey ? "Hide API key" : "Show API key"}
								>
									{showApiKey ? (
										<EyeOffIcon className="size-3.5" />
									) : (
										<EyeIcon className="size-3.5" />
									)}
								</Button>
							</div>

							<Button
								variant="default"
								size="sm"
								onClick={handleSaveApiKey}
								className="shrink-0"
							>
								{apiKeySaved ? "Saved!" : "Save"}
							</Button>

							{settings.hasApiKey && (
								<Button
									variant="outline"
									size="icon"
									onClick={handleRemoveApiKey}
									className="shrink-0"
									aria-label="Remove API key"
								>
									<Trash2Icon className="size-4" />
								</Button>
							)}
						</div>

						<p className="text-xs text-muted-foreground leading-relaxed">
							Your API key is stored locally in your browser and never sent to
							any server.{" "}
							<a
								href="https://aistudio.google.com/apikey"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
							>
								Get a key at Google AI Studio
								<ExternalLinkIcon className="size-3 ml-0.5" />
							</a>
						</p>
					</section>

					{/* ------------------------------------------------------------------ */}
					{/* Model Selection Section                                              */}
					{/* ------------------------------------------------------------------ */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold">Model</h3>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="model-select" className="sr-only">
								Select model
							</Label>
							<Select
								value={settings.selectedModel}
								onValueChange={(value) => setSelectedModel(value)}
							>
								<SelectTrigger id="model-select" className="w-full">
									<SelectValue placeholder="Select a model" />
								</SelectTrigger>
								<SelectContent>
									{GEMINI_MODELS.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											<div className="flex flex-col items-start">
												<span className="font-medium">{model.name}</span>
												<span className="text-xs text-muted-foreground">
													{model.description}
												</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</section>

					{/* ------------------------------------------------------------------ */}
					{/* System Prompt Section                                                */}
					{/* ------------------------------------------------------------------ */}
					<section className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold">System Prompt</h3>
							{systemPromptInput && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-xs text-muted-foreground"
									onClick={handleResetSystemPrompt}
								>
									Reset
								</Button>
							)}
						</div>
						<Textarea
							placeholder="You are a helpful assistant..."
							value={systemPromptInput}
							onChange={(e) => handleSystemPromptChange(e.target.value)}
							onBlur={handleSystemPromptBlur}
							className="min-h-28 resize-none text-sm"
							spellCheck={false}
						/>
						<p className="text-xs text-muted-foreground">
							This prompt is sent at the start of every conversation to set the
							assistant's behaviour.
						</p>
					</section>
				</div>
			</DialogContent>
		</Dialog>
	);
}
