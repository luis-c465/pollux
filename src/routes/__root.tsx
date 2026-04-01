import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "GChat",
			},
			{
				name: "description",
				content:
					"Chat with Google Gemini models. Privacy-first — all conversations stored locally.",
			},
			{
				name: "theme-color",
				content: "#111827",
			},
			{
				property: "og:title",
				content: "GChat",
			},
			{
				property: "og:description",
				content:
					"Chat with Google Gemini models. Privacy-first — all conversations stored locally.",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:image",
				content: "/logo512.png",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
	shellComponent: RootDocument,
	component: Outlet,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script>{THEME_INIT_SCRIPT}</script>
				<HeadContent />
			</head>
			<body className="h-dvh overflow-hidden">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
