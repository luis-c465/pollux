import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { SidebarTrigger } from "#/components/ui/sidebar";
import { GEMINI_MODELS } from "#/lib/gemini-models";
import { setSelectedModel, useSettings } from "#/lib/settings";

function ModelSelector() {
	const settings = useSettings();

	return (
		<Select
			value={settings.selectedModel}
			onValueChange={(value) => setSelectedModel(value)}
		>
			<SelectTrigger className="h-8 w-[220px]">
				<SelectValue placeholder="Select model" />
			</SelectTrigger>
			<SelectContent>
				{GEMINI_MODELS.map((model) => (
					<SelectItem key={model.id} value={model.id}>
						{model.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function ChatHeader() {
	return (
		<header className="flex h-12 items-center gap-2 border-b px-4">
			<SidebarTrigger />
			<Separator orientation="vertical" className="h-4" />
			<ModelSelector />
			<div className="ml-auto" />
		</header>
	);
}
