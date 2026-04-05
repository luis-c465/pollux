import {
	ExternalLinkIcon,
	EyeIcon,
	EyeOffIcon,
	InfoIcon,
	SettingsIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SettingsKeyboardShortcuts } from "#/components/settings-keyboard-shortcuts";
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
import { Switch } from "#/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Textarea } from "#/components/ui/textarea";
import { GEMINI_MODELS, getGeminiModel } from "#/lib/gemini-models";
import {
	DEFAULT_TITLE_SYSTEM_PROMPT,
	getApiKey,
	removeApiKey,
	setApiKey,
	setSelectedModel,
	setSystemPrompt,
	setThinkingEnabled,
	setTitleModel,
	setTitleSystemPrompt,
	useSettings,
} from "#/lib/settings";
import { cn } from "#/lib/utils";

const SETTINGS_OPEN_EVENT = "pollux-open-settings-dialog";

export function openSettingsDialog() {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(SETTINGS_OPEN_EVENT));
}

export function SettingsDialog({
	showTrigger = true,
}: {
	showTrigger?: boolean;
} = {}) {
	const settings = useSettings();
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("general");

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
	const [titleSystemPromptInput, setTitleSystemPromptInput] = useState(
		settings.titleSystemPrompt,
	);
	const titleSystemPromptDebounceRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);

	// Re-sync local fields when dialog opens
	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen) {
				setApiKeyInput(getApiKey() ?? "");
				setShowApiKey(false);
				setApiKeySaved(false);
				setSystemPromptInput(settings.systemPrompt);
				setTitleSystemPromptInput(settings.titleSystemPrompt);
				setActiveTab("general");
			}
			setOpen(isOpen);
		},
		[settings.systemPrompt, settings.titleSystemPrompt],
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

	function handleTitleSystemPromptChange(value: string) {
		setTitleSystemPromptInput(value);
		if (titleSystemPromptDebounceRef.current)
			clearTimeout(titleSystemPromptDebounceRef.current);
		titleSystemPromptDebounceRef.current = setTimeout(() => {
			setTitleSystemPrompt(value);
		}, 500);
	}

	function handleTitleSystemPromptBlur() {
		if (titleSystemPromptDebounceRef.current)
			clearTimeout(titleSystemPromptDebounceRef.current);
		setTitleSystemPrompt(titleSystemPromptInput);
	}

	function handleResetTitleSystemPrompt() {
		setTitleSystemPromptInput(DEFAULT_TITLE_SYSTEM_PROMPT);
		setTitleSystemPrompt(DEFAULT_TITLE_SYSTEM_PROMPT);
	}

	const apiKeyLooksUnusual =
		apiKeyInput.trim().length > 0 &&
		(!apiKeyInput.trim().startsWith("AI") || apiKeyInput.trim().length < 30);

	const selectedModel = getGeminiModel(settings.selectedModel);
	const supportsThinking = selectedModel?.supportsThinking === true;

	useEffect(() => {
		const handleOpenRequest = () => handleOpenChange(true);
		window.addEventListener(SETTINGS_OPEN_EVENT, handleOpenRequest);
		return () => {
			window.removeEventListener(SETTINGS_OPEN_EVENT, handleOpenRequest);
		};
	}, [handleOpenChange]);

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{showTrigger && (
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
			)}

			<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>
						Configure your Gemini API key, model, and preferences.
					</DialogDescription>
				</DialogHeader>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
					<TabsList className="w-full justify-start">
						<TabsTrigger value="general">General</TabsTrigger>
						<TabsTrigger value="title-generation">Title Generation</TabsTrigger>
						<TabsTrigger value="shortcuts">Keyboard Shortcuts</TabsTrigger>
					</TabsList>

					<TabsContent value="general" className="mt-6">
						<div className="flex flex-col gap-6">
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
										title={
											settings.hasApiKey ? "API key is set" : "No API key set"
										}
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
									Your API key is stored locally in your browser and never sent
									to any server.{" "}
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
								{apiKeyLooksUnusual ? (
									<p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-amber-700 text-xs dark:text-amber-300">
										<InfoIcon className="mt-0.5 size-3.5 shrink-0" />
										<span>
											This key format looks unusual. Gemini keys usually start
											with "AI...".
										</span>
									</p>
								) : null}
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
									This prompt is sent at the start of every conversation to set
									the assistant's behaviour.
								</p>
							</section>

							<section className="flex flex-col gap-3">
								<div className="flex items-start justify-between gap-4">
									<div className="space-y-1">
										<h3 className="text-sm font-semibold">Reasoning Traces</h3>
										<p className="text-xs text-muted-foreground leading-relaxed">
											Show Gemini thinking steps in the chat when the selected
											model supports it.
										</p>
									</div>
									<Switch
										checked={settings.thinkingEnabled}
										disabled={!supportsThinking}
										onCheckedChange={(checked) => setThinkingEnabled(checked)}
										aria-label="Toggle reasoning traces"
									/>
								</div>

								{!supportsThinking ? (
									<p className="text-xs text-muted-foreground">
										This model does not support configurable thinking.
									</p>
								) : null}
							</section>
						</div>
					</TabsContent>

					<TabsContent value="title-generation" className="mt-6">
						<div className="flex flex-col gap-6">
							<section className="flex flex-col gap-3">
								<h3 className="text-sm font-semibold">Title Model</h3>
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="title-model-select" className="sr-only">
										Select title model
									</Label>
									<Select
										value={settings.titleModel}
										onValueChange={(value) => setTitleModel(value)}
									>
										<SelectTrigger id="title-model-select" className="w-full">
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

							<section className="flex flex-col gap-3">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-semibold">Title System Prompt</h3>
									{titleSystemPromptInput !== DEFAULT_TITLE_SYSTEM_PROMPT && (
										<Button
											variant="ghost"
											size="sm"
											className="h-7 px-2 text-xs text-muted-foreground"
											onClick={handleResetTitleSystemPrompt}
										>
											Reset
										</Button>
									)}
								</div>
								<Textarea
									value={titleSystemPromptInput}
									onChange={(e) =>
										handleTitleSystemPromptChange(e.target.value)
									}
									onBlur={handleTitleSystemPromptBlur}
									className="min-h-28 resize-none text-sm"
									spellCheck={false}
								/>
								<p className="text-xs text-muted-foreground">
									This prompt is used to generate short titles from the first
									user message in each chat.
								</p>
							</section>
						</div>
					</TabsContent>

					<TabsContent value="shortcuts" className="mt-6">
						<SettingsKeyboardShortcuts />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
