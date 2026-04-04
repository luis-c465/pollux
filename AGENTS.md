# AGENTS.md

## Project Overview

React 19 + TanStack Start chat application using the Vercel AI SDK with Google Gemini.
Built with Vite 7, Tailwind CSS v4, Shadcn UI, Zustand, and IndexedDB for storage.

## Build & Run Commands

Package manager: **bun**

```bash
bun install                  # Install dependencies
bun --bun run dev            # Dev server on port 3000
bun --bun run build          # Production build
bun --bun run preview        # Preview production build
```

## Test Commands

Test framework: **Vitest** with **@testing-library/react** and **jsdom**.

```bash
bun --bun run test           # Run all tests (vitest run)
bunx vitest run src/lib/utils.test.ts          # Run a single test file
bunx vitest run -t "test name"                 # Run a single test by name
bunx vitest run src/lib/                       # Run tests in a directory
```

## Lint, Format & Typecheck

Linter/formatter: **Biome**. Typechecker: **tsgo** (native TypeScript).

```bash
bun --bun run lint           # Lint with Biome (biome lint)
bun --bun run format         # Format with Biome (biome format)
bun --bun run check          # Lint + format + organize imports (biome check)
bun --bun run typecheck      # Type-check with tsgo --noEmit
```

Fix lint/format issues automatically:

```bash
bunx biome check --fix       # Auto-fix lint + format + imports
bunx biome check --fix src/components/chat-header.tsx  # Fix a single file
```

## Project Structure

```
src/
  components/
    assistant-ui/     # AI chat UI components (assistant-ui library)
    ui/               # Shadcn UI primitives (button, dialog, select, etc.)
    chat-header.tsx   # Chat header with model selector
    chat-sidebar.tsx  # Sidebar with thread list
    runtime-provider.tsx  # AI runtime setup
    settings-dialog.tsx   # Settings modal
  hooks/              # Custom React hooks
  lib/
    db.ts             # IndexedDB wrapper (idb library)
    gemini-adapter.ts # Google Gemini AI adapter
    gemini-models.ts  # Model definitions
    settings.ts       # Settings store (localStorage + useSyncExternalStore)
    typewriter.ts     # Typewriter streaming effect
    utils.ts          # cn() utility (clsx + tailwind-merge)
  routes/             # TanStack Router file-based routes
    __root.tsx        # Root layout
    index.tsx         # Home page
  router.tsx          # Router config
  routeTree.gen.ts    # Auto-generated route tree (DO NOT EDIT)
  styles.css          # Tailwind CSS entry point
```

## Code Style Guidelines

### Formatting (Biome)

- **Indentation:** Tabs (not spaces)
- **Quotes:** Double quotes for JS/TS strings
- **Semicolons:** Required (Biome default)
- **Import organization:** Biome auto-organizes imports on save; run `biome check` to sort

### Path Aliases

Use `#/*` for imports from `src/`:

```typescript
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { useSettings } from "#/lib/settings";
```

The `@/*` alias also resolves to `src/` but `#/` is the project convention (matches the
Node.js subpath imports in package.json).

### Naming Conventions

| Thing              | Convention    | Example                          |
|--------------------|---------------|----------------------------------|
| Components         | PascalCase    | `ChatHeader`, `ModelSelector`    |
| Component files    | kebab-case    | `chat-header.tsx`, `settings-dialog.tsx` |
| Hooks              | camelCase     | `useIsMobile`, `useSettings`     |
| Hook files         | kebab-case    | `use-mobile.ts`                  |
| Utility functions  | camelCase     | `cn()`, `getApiKey()`            |
| Types / Interfaces | PascalCase    | `StoredThread`, `Settings`       |
| Constants          | UPPER_SNAKE   | `GEMINI_MODELS`                  |
| Route files        | TanStack convention | `__root.tsx`, `index.tsx`  |

### TypeScript

- **Strict mode** is enabled (`strict: true` in tsconfig)
- `noUnusedLocals` and `noUnusedParameters` are enforced
- `verbatimModuleSyntax` is enabled: use `import { type Foo }` not `import type { Foo }`
- Target: ES2022. Use modern JS features (optional chaining, nullish coalescing, etc.)
- Prefer explicit return types on exported functions and complex utilities
- Use generic type parameters for reusable utilities (e.g., `jsonParse<T>`)

### React & Component Patterns

- React 19 with the React Compiler (babel-plugin-react-compiler) -- no need for
  manual `useMemo`/`useCallback` in most cases
- Shadcn UI components live in `src/components/ui/` -- these are copy-pasted from shadcn,
  not imported from a package. Edit them directly when needed.
- Use `cva` (class-variance-authority) for component variants
- Use `cn()` from `#/lib/utils` to merge Tailwind classes
- Prefer function declarations for components (not arrow functions assigned to const)
- Props: use intersection types with `React.ComponentProps<"element">` for HTML extensions

```typescript
function Button({ className, variant, ...props }: React.ComponentProps<"button"> & {
  variant?: "default" | "outline";
}) {
  return <button className={cn(buttonVariants({ variant, className }))} {...props} />;
}
```

### State Management

- **Zustand** for global client state
- **useSyncExternalStore** pattern for localStorage-backed settings (`lib/settings.ts`)
- **IndexedDB** (via `idb` library) for persistent chat thread storage (`lib/db.ts`)
- **TanStack Router** loaders for route-level data fetching

### Error Handling

- Use try/catch with typed fallbacks for parsing operations
- Throw descriptive `Error` messages for not-found cases: `throw new Error(\`Thread not found: \${id}\`)`
- Prefer returning fallback values over throwing in utility functions

### Styling

- **Tailwind CSS v4** -- config is in `src/styles.css`, not `tailwind.config.js`
- Shadcn UI uses CSS variables for theming (base color: zinc)
- Use `tw-animate-css` for animations

### Adding Shadcn UI Components

```bash
bunx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/`.

## Files to Never Edit

- `src/routeTree.gen.ts` -- auto-generated by TanStack Router plugin
- `bun.lock` -- auto-managed by bun

## Cursor Rules

When using Shadcn, install components via:

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Library Documentation

### React
- Docs: https://react.dev
- Key topics: hooks, context, concurrent features, React 19 actions
- This project uses React 19 with the React Compiler; avoid manual memoization

### TypeScript
- Docs: https://www.typescriptlang.org/docs/

### TanStack Start (framework + routing)
- Local docs: `/home/luis/dev/tanstack-router/docs/start/framework/react/`
  - `overview.md` — what TanStack Start is
  - `getting-started.md` — project setup
  - `quick-start.md` — minimal example
  - `guide/` — server functions, data loading, middleware, etc.
- Key concepts: file-based routing under `src/routes/`, `__root.tsx` for root
  layout, loaders for data fetching, `routeTree.gen.ts` is auto-generated (never edit)

### Shadcn UI
- Docs index: https://ui.shadcn.com/llms.txt
  - When crawling docs append .md to URLs to get cleaner markdown versions (e.g. https://ui.shadcn.com/docs/installation/tanstack.md)
- Components are copied into `src/components/ui/` via CLI — edit them directly
- Install a new component: `bunx shadcn@latest add <name>`
- TanStack Start install guide: https://ui.shadcn.com/docs/installation/tanstack

### Assistant UI
- Full docs (LLM-friendly): https://www.assistant-ui.com/llms-full.txt
- Overview: https://www.assistant-ui.com/docs
- Components live in `src/components/assistant-ui/` — added via CLI and edited locally
- Install/add components: `npx assistant-ui@latest add <component>`
- Key primitives: `AssistantRuntimeProvider`, `Thread`, `ThreadList`, `useChatRuntime`
- Runtimes doc: https://www.assistant-ui.com/docs/runtimes/pick-a-runtime

### Streamdown (streaming Markdown renderer)
- Site: https://streamdown.ai/llms.txt
- A Vercel library for rendering streaming Markdown from AI models
- Key package: `streamdown` (core) + optional plugins `@streamdown/code`,
  `@streamdown/mermaid`, `@streamdown/math`, `@streamdown/cjk`
- Usage: `<Streamdown plugins={{ code }} isAnimating={status === "streaming"}>{text}</Streamdown>`

### React Shiki (syntax highlighting)
- README: https://raw.githubusercontent.com/AVGVSTVS96/react-shiki/refs/heads/main/package/README.md
- Wraps Shiki for client-side syntax highlighting in React
- Use `ShikiHighlighter` component or `useShikiHighlighter` hook
- Bundle options: `react-shiki` (full), `react-shiki/web` (web-focused), `react-shiki/core` (minimal)
- Integrates with `react-markdown` via the `code` component override
- Use `isInlineCode(node)` helper to detect inline vs block code
