import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart({
			spa: {
				enabled: true,
			},
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		VitePWA({
			outDir: "dist/client",
			registerType: "autoUpdate",
			injectRegister: "auto",
			manifest: false,
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
				maximumFileSizeToCacheInBytes: 5_000_000,
				navigateFallback: "/_shell.html",
				navigateFallbackDenylist: [/^\/api\//],
			},
			devOptions: {
				enabled: false,
			},
		}),
	],
});

export default config;
