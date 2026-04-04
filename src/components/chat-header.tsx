import { Separator } from "#/components/ui/separator";
import { SidebarTrigger } from "#/components/ui/sidebar";

export function ChatHeader() {
	return (
		<header className="flex h-12 items-center gap-2 border-b px-4">
			<SidebarTrigger />
			<Separator orientation="vertical" className="h-4" />
			<div className="ml-auto" />
		</header>
	);
}
