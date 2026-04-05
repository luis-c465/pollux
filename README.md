# Pollux

A frontend-only chat application for Google Gemini. All conversations and settings are stored locally in your browser — no backend, no account required.

**[Live Demo](https://example.com)**

<!-- screenshot -->

## Features

- **Multiple Gemini models** — Gemini 2.0 Flash, 2.5 Flash, 2.5 Pro, and the 3.x preview series
- **Streaming responses** with an adaptive typewriter effect
- **Thinking / reasoning traces** — configurable budget and verbosity for supported models
- **Google Search grounding** — give the model access to up-to-date web results
- **File & image attachments** — upload documents and images directly in the composer
- **Markdown rendering** — streaming-aware with syntax highlighting via Shiki
- **Thread management** — multiple conversations persisted in IndexedDB
- **Customizable keyboard shortcuts** — rebind common actions from the settings dialog
- **PWA support** — installable as a standalone app
- **Light / dark theme**
- **Privacy-first** — API key and chat history never leave your device

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.x
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### Install & run

```bash
git clone https://github.com/your-username/pollux.git
cd pollux
bun install
bun --bun run dev        # dev server on http://localhost:3000
```

### Set your API key

Open the app, click the **Settings** button in the sidebar, and paste your Gemini API key into the API Key field. The key is saved to `localStorage` and never sent anywhere except directly to the Gemini API.

## Tech Stack

- [React 19](https://react.dev) + [TanStack Start](https://tanstack.com/start) (SPA mode)
- [Vite 7](https://vitejs.dev) with the React Compiler
- [Tailwind CSS v4](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com)
- [Assistant UI](https://www.assistant-ui.com) — chat primitives and runtime
- [Vercel AI SDK](https://sdk.vercel.ai) + [`@ai-sdk/google`](https://www.npmjs.com/package/@ai-sdk/google)
- [Zustand](https://zustand-demo.pmnd.rs) — global state
- [idb](https://github.com/jakearchibald/idb) — IndexedDB thread/message storage
- [Streamdown](https://streamdown.ai) — streaming Markdown renderer
- [Biome](https://biomejs.dev) — linter & formatter

## Project Structure

```
src/
  components/
    assistant-ui/     # Chat thread, thread list, markdown, reasoning, sources
    ui/               # Shadcn UI primitives
    chat-header.tsx   # Header with sidebar toggle
    chat-sidebar.tsx  # Sidebar with thread list and settings
    runtime-provider.tsx  # Assistant UI runtime wiring
    settings-dialog.tsx   # Settings modal (API key, model, shortcuts, …)
  hooks/
    use-app-hotkeys.ts    # Keyboard shortcut bindings
    use-mobile.ts         # Responsive breakpoint hook
  lib/
    db.ts                 # IndexedDB schema and operations
    gemini-adapter.ts     # Gemini API adapter (streaming, thinking, grounding)
    gemini-models.ts      # Model definitions and capabilities
    settings.ts           # localStorage-backed settings store
    typewriter.ts         # Adaptive typewriter streaming effect
  routes/
    __root.tsx            # Root layout
    index.tsx             # Main chat page
  styles.css              # Tailwind CSS entry point
```

## Development

```bash
bun --bun run dev          # Dev server (port 3000)
bun --bun run build        # Production build
bun --bun run preview      # Preview production build
bun --bun run test         # Run tests (Vitest)
bun --bun run typecheck    # Type-check with tsgo
bun --bun run check        # Lint + format + organize imports (Biome)
bunx biome check --fix     # Auto-fix lint and formatting issues
```

## Settings

All configuration lives in the in-app **Settings** dialog:

| Setting | Description |
|---|---|
| API Key | Your Google Gemini API key (stored in `localStorage`) |
| Model | Active Gemini model |
| System Prompt | Custom instructions prepended to every conversation |
| Thinking | Enable reasoning traces and set the thinking budget |
| Google Search | Toggle grounding to allow the model to search the web |
| Title Generation | Model used to auto-generate thread titles |
| Keyboard Shortcuts | Rebind actions like new chat, model picker, and sidebar toggle |

## Privacy

All data — chat history, attachments, and your API key — is stored entirely in your browser (`localStorage` and `IndexedDB`). Nothing is sent to any server other than the Gemini API itself.
