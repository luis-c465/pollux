# GChat Architecture Plan — Frontend-Only Gemini Chat Application

---

## Section 1: High-Level Overview

### 1.1 — Goal Statement

Transform the existing TanStack Start template project into a **frontend-only static site** that provides a full-featured chat interface for Google Gemini models. All chat data is persisted locally in the user's browser via IndexedDB — no server, no backend, no data ever leaves the client. Users bring their own Gemini API key, which is stored locally and used to call the Gemini API directly from the browser.

### 1.2 — Approach Summary

**Architecture:** Single-page application (SPA) using TanStack Start in SPA mode. The app has one primary route (`/`) that renders a full-screen chat layout with a collapsible sidebar for thread management and a main content area for the active conversation.

**AI Integration:** Uses `@google/genai` (Google's official GenAI JavaScript SDK) directly in the browser via a custom `ChatModelAdapter` wired into assistant-ui's `useLocalRuntime`. This avoids the Vercel AI SDK entirely since it requires a server endpoint. The adapter calls the Gemini API directly from the browser using the user's locally-stored API key.

**Chat UI:** Leverages the existing assistant-ui components already scaffolded in the project (`Thread`, `ThreadList`, `MarkdownText`, `Attachment`, etc.). These are pre-built, customizable components that handle message rendering, streaming indicators, composer input, branch picking, and attachment management.

**Persistence:** Implements a custom `RemoteThreadListAdapter` and `ThreadHistoryAdapter` backed by IndexedDB (via the `idb` library) to persist all threads and messages locally. The `useRemoteThreadListRuntime` hook composes thread list management with per-thread `useLocalRuntime` instances.

**Markdown & Code Highlighting:** Replaces the existing basic markdown renderer with Streamdown for streaming-aware markdown rendering, integrated with react-shiki for high-quality syntax highlighting using VS Code's TextMate grammars.

**Key Libraries:**
- `@google/genai` — Direct browser-to-Gemini API calls with streaming
- `@assistant-ui/react` — Chat runtime, primitives, and thread management
- `idb` — Lightweight IndexedDB wrapper (~1KB) for typed, promise-based IndexedDB access
- `streamdown` + `@streamdown/code` — Streaming markdown rendering with code highlighting
- `react-shiki` — Syntax highlighting (used via Streamdown's code plugin or standalone)
- shadcn/ui `Sidebar` component — Collapsible sidebar for thread list and settings

### 1.3 — Decisions Log

- **Decision:** Use `@google/genai` SDK directly in the browser instead of Vercel AI SDK (`ai` + `@ai-sdk/google`)
  - **Alternatives considered:** (a) Vercel AI SDK with `useChat` + server endpoint, (b) Vercel AI SDK `streamText` client-side, (c) Raw `fetch` to Gemini REST API
  - **Rationale:** The Vercel AI SDK's `useChat` requires a server transport endpoint — incompatible with a frontend-only app. The `@ai-sdk/google` provider is designed for server-side Node.js usage. The `@google/genai` SDK explicitly supports browser usage with streaming via `generateContentStream()` and has first-class TypeScript support. Raw `fetch` would work but requires manually handling SSE parsing and the Gemini protocol.

- **Decision:** Use `useLocalRuntime` + `useRemoteThreadListRuntime` from assistant-ui instead of building custom state management
  - **Alternatives considered:** (a) Custom Zustand store for all chat state, (b) assistant-ui's `useChatRuntime` with AI SDK, (c) `useExternalStoreRuntime`
  - **Rationale:** `useLocalRuntime` is designed exactly for this use case — client-side AI calls with a custom adapter. `useRemoteThreadListRuntime` provides multi-thread management with a pluggable persistence adapter, which we implement with IndexedDB. This gives us the full assistant-ui component ecosystem (Thread, ThreadList, Composer, ActionBar, etc.) for free.

- **Decision:** Use `idb` library for IndexedDB access instead of raw IndexedDB API or Dexie
  - **Alternatives considered:** (a) Raw IndexedDB API, (b) Dexie.js, (c) localForage
  - **Rationale:** `idb` is a tiny (~1KB) wrapper that provides a promise-based, typed API over IndexedDB without adding significant bundle weight. Dexie is more feature-rich but heavier (~16KB) and overkill for our simple schema. Raw IndexedDB is callback-based and error-prone. localForage is a key-value store that doesn't support indexed queries well.

- **Decision:** Use Streamdown for markdown rendering instead of the existing `@assistant-ui/react-markdown`
  - **Alternatives considered:** (a) Keep existing `@assistant-ui/react-markdown` + `remark-gfm`, (b) Use `react-markdown` directly, (c) Use Streamdown
  - **Rationale:** Streamdown is purpose-built for streaming AI chat markdown. It handles incomplete markdown during streaming (unclosed code fences, partial links, etc.) via its "remend" preprocessor, provides built-in streaming animations and caret indicators, and integrates code highlighting via `@streamdown/code`. The existing `@assistant-ui/react-markdown` setup works but lacks streaming-aware incomplete markdown handling and animation features.

- **Decision:** Use Streamdown's built-in `@streamdown/code` plugin (which uses Shiki internally) for code highlighting, with react-shiki available as a fallback/customization option
  - **Alternatives considered:** (a) react-shiki standalone with react-markdown, (b) Streamdown's `@streamdown/code` plugin, (c) Prism.js
  - **Rationale:** Streamdown's code plugin provides tight integration with the streaming markdown pipeline, including lazy-loaded languages, dual light/dark themes, and copy buttons. Since Streamdown already uses Shiki under the hood, adding react-shiki separately would be redundant. However, react-shiki can be used for any standalone code display outside of chat messages.

- **Decision:** Enable TanStack Start SPA mode for static deployment
  - **Alternatives considered:** (a) Keep SSR mode, (b) SPA mode, (c) Eject to plain Vite + React Router
  - **Rationale:** SPA mode prerenders a shell HTML and serves it for all routes, eliminating the need for a server. This is exactly what a frontend-only static site needs. The app can be deployed to any static hosting (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

- **Decision:** Store the Gemini API key in localStorage (not IndexedDB)
  - **Alternatives considered:** (a) IndexedDB, (b) localStorage, (c) sessionStorage, (d) In-memory only
  - **Rationale:** localStorage is synchronous and simpler for a single small value that needs to be read immediately on app startup (before any async IndexedDB operations). sessionStorage would require re-entering the key every session. In-memory only would lose the key on page refresh.

- **Decision:** Remove Paraglide i18n integration (simplify for initial implementation)
  - **Alternatives considered:** (a) Keep i18n, (b) Remove i18n
  - **Rationale:** i18n adds complexity to the initial implementation. The chat app is English-only for now. The Paraglide plugin, locale switcher, and message files can be removed to simplify the build pipeline and reduce bundle size. i18n can be re-added later if needed.

- **Decision:** Remove TanStack Query, TanStack Form, TanStack Table, and faker.js (unused dependencies)
  - **Alternatives considered:** (a) Keep all dependencies, (b) Remove unused ones
  - **Rationale:** These were part of the template starter and are not needed for the chat application. Removing them reduces bundle size and simplifies the dependency tree. TanStack Query could theoretically be used for data fetching, but all our data is local (IndexedDB) and doesn't benefit from query caching/invalidation patterns.

### 1.4 — Assumptions & Open Questions

**Assumptions:**
- The user is comfortable with the "bring your own API key" (BYOK) model where the Gemini API key is stored in the browser's localStorage and used directly from client-side JavaScript. This means the key is visible in browser DevTools.
- The app targets modern browsers (Chrome 80+, Firefox 80+, Safari 14+, Edge 80+) that support IndexedDB, async generators, and the Streams API.
- The initial set of supported Gemini models will be hardcoded (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`). Dynamic model listing from the API can be added later.
- Attachment support means uploading files that are converted to base64 and sent inline with the Gemini API request (images for vision, text files for context). Large file uploads (>20MB) are out of scope for the initial implementation.
- Title generation for threads will be done client-side by sending the first message to Gemini with a title-generation prompt, rather than using a separate API or heuristic.

**Open Questions:**
- Should there be a maximum number of threads stored in IndexedDB, or should it grow unbounded? (Assumption: unbounded for now, with a future "export/clear" feature)
- Should the app support importing/exporting chat history as JSON? (Assumption: out of scope for initial implementation, but the IndexedDB schema should be designed to make this easy)
- Should there be a "system prompt" configuration per-thread or global? (Assumption: global system prompt configurable in settings, with potential per-thread override later)

### 1.5 — Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Gemini API key exposed in browser DevTools** | High | Medium | This is inherent to the BYOK model. Add clear UI warnings that the key is stored locally. Users use their own keys, so exposure only affects them. Recommend using API key restrictions in Google Cloud Console. |
| **IndexedDB storage limits hit** | Low | High | Modern browsers allow 50-80% of available disk space. For text-based chat, this is effectively unlimited. Add a storage usage indicator in settings. Implement export functionality as a future enhancement. |
| **IndexedDB data loss on browser clear** | Medium | High | Add a prominent warning in the UI that clearing browser data will delete all chats. Consider adding an export/backup feature in a future iteration. |
| **Gemini API rate limiting or quota exceeded** | Medium | Medium | Display clear error messages from the API. The adapter should handle 429 responses gracefully and show user-friendly messages about rate limits. |
| **Streaming interruption (network loss mid-stream)** | Medium | Low | The `abortSignal` in the adapter handles cancellation. Partial messages are preserved in the thread. The user can retry by clicking "Regenerate". |
| **Large attachments causing memory issues** | Low | Medium | Limit attachment size to 20MB. Convert to base64 only at send time, not at attach time. Show file size in the attachment preview. |
| **Concurrent IndexedDB writes causing data corruption** | Low | Medium | IndexedDB transactions are atomic. The `idb` library handles transaction management. The `ThreadHistoryAdapter.append` method is called sequentially by assistant-ui. |
| **Breaking changes in assistant-ui or @google/genai** | Low | Medium | Pin dependency versions. The assistant-ui components are copied into the project (not imported from node_modules), so UI changes are isolated. |

### 1.6 — Step Sequence Overview

1. **Clean up the template project** — Remove unused template code, dependencies, and boilerplate (i18n, demo pages, TanStack Query/Form/Table, faker)
2. **Enable SPA mode and restructure the app shell** — Configure TanStack Start for SPA mode, create the chat layout with sidebar
3. **Install new dependencies** — Add `@google/genai`, `idb`, `streamdown`, `@streamdown/code`, `react-shiki`, and the shadcn `sidebar` component
4. **Implement the IndexedDB persistence layer** — Create the database schema, typed helpers, and the `RemoteThreadListAdapter` + `ThreadHistoryAdapter`
5. **Implement the Gemini chat model adapter** — Create the `ChatModelAdapter` that calls `@google/genai` directly from the browser with streaming
6. **Implement the settings/API key management** — Create the settings UI for API key entry, model selection, and system prompt configuration, persisted to localStorage
7. **Wire up the assistant-ui runtime** — Compose `useRemoteThreadListRuntime` + `useLocalRuntime` with the Gemini adapter, IndexedDB persistence, and attachment support
8. **Build the main chat page layout** — Create the root route with sidebar (ThreadList) + main area (Thread), using the shadcn Sidebar component
9. **Integrate Streamdown for markdown rendering** — Replace the existing `@assistant-ui/react-markdown` based renderer with Streamdown + `@streamdown/code` for streaming-aware markdown with syntax highlighting
10. **Implement attachment support** — Create a custom `AttachmentAdapter` for images and documents that converts files to base64 for the Gemini API
11. **Polish and finalize** — Add welcome screen, error handling, loading states, keyboard shortcuts, responsive design, and final styling

---

## Section 2: Step-by-Step Execution Plan

---

### Step 1: Clean Up the Template Project

**Objective:** Remove all unused template boilerplate, demo code, and unnecessary dependencies to create a clean foundation for the chat application.

**Context:**
- The project is a TanStack Start template with demo pages, i18n support, TanStack Query/Form/Table integrations, and sample data that are not needed for the chat app.
- This is the first step — the codebase is in its initial template state.

**Scope:**
- Files to delete:
  - `src/routes/about.tsx` (demo page)
  - `src/data/demo-table-data.ts` (demo data)
  - `src/hooks/demo.form-context.ts` (demo hook)
  - `src/hooks/demo.form.ts` (demo hook)
  - `src/integrations/tanstack-query/devtools.tsx` (TanStack Query devtools)
  - `src/integrations/tanstack-query/root-provider.tsx` (TanStack Query provider)
  - `src/integrations/` directory entirely
  - `src/components/LocaleSwitcher.tsx` (i18n locale switcher)
  - `messages/de.json` (i18n messages)
  - `messages/en.json` (i18n messages)
  - `messages/` directory entirely
  - `project.inlang/` directory entirely (i18n config)
- Files to modify:
  - `package.json` — Remove unused dependencies
  - `vite.config.ts` — Remove Paraglide plugin and devtools
  - `src/routes/__root.tsx` — Remove Header, Footer, TanStack Devtools, Paraglide imports, Query context
  - `src/router.tsx` — Remove TanStack Query integration and SSR query setup
  - `src/routes/index.tsx` — Replace template content with placeholder
  - `src/env.ts` — Simplify (remove server env vars)
  - `src/components/Header.tsx` — Will be heavily modified in Step 8, but for now simplify or keep as placeholder
  - `src/components/Footer.tsx` — Will be removed (chat apps don't have footers)

**Sub-tasks:**

1. **Remove unused dependencies from `package.json`:** Remove the following from `dependencies`: `@faker-js/faker`, `@t3-oss/env-core`, `@tanstack/match-sorter-utils`, `@tanstack/react-devtools`, `@tanstack/react-form`, `@tanstack/react-query`, `@tanstack/react-query-devtools`, `@tanstack/react-router-devtools`, `@tanstack/react-router-ssr-query`, `@tanstack/react-table`. Remove from `devDependencies`: `@inlang/paraglide-js`, `@tanstack/devtools-vite`. Keep all other dependencies (react, tanstack-router, tanstack-start, shadcn/ui deps, assistant-ui, tailwind, etc.).

2. **Delete all demo/unused files:** Delete the files and directories listed in the Scope section above.

3. **Simplify `vite.config.ts`:** Remove the `devtools()` plugin import and call, remove the `paraglideVitePlugin` import and configuration. The resulting plugins array should only contain: `tsconfigPaths`, `tailwindcss`, `tanstackStart`, and `viteReact` (with React Compiler).

4. **Simplify `src/router.tsx`:** Remove the `QueryClient` import, `setupRouterSsrQueryIntegration` import, `TanstackQueryProvider` import, and `getContext` import. The router should simply create a router with `routeTree`, `scrollRestoration: true`, and `defaultPreload: 'intent'`. Remove the `context` parameter. The `getRouter` function should not reference any query client.

5. **Simplify `src/routes/__root.tsx`:** Remove imports for `TanStackRouterDevtoolsPanel`, `TanStackDevtools`, `TanStackQueryDevtools`, `Footer`, `Header`, `getLocale`, and the `QueryClient` type. Remove the `MyRouterContext` interface. Change `createRootRouteWithContext<MyRouterContext>()` to `createRootRoute()` (from `@tanstack/react-router`). Remove the `beforeLoad` hook (Paraglide locale setting). Remove `<Header />`, `<Footer />`, and the entire `<TanStackDevtools>` block from the `RootDocument`. Keep the `THEME_INIT_SCRIPT`, `<HeadContent />`, `<Scripts />`, and the basic HTML structure. Update the `<html>` tag to remove `lang={getLocale()}` and just use `lang="en"`. Update the page title in `head()` from "TanStack Start Starter" to "GChat".

6. **Replace `src/routes/index.tsx` content:** Replace the entire template landing page with a simple placeholder component that just renders a `<div>` with text "GChat — Coming Soon" (this will be replaced in Step 8 with the actual chat layout).

7. **Delete `src/env.ts`:** This file uses `@t3-oss/env-core` which is being removed. Environment variables will not be needed since the app is frontend-only with no server secrets.

8. **Delete `src/components/Footer.tsx`:** Chat applications use full-height layouts without footers.

9. **Run `bun install`** (or the package manager) to update the lockfile after dependency changes.

**Edge Cases & Gotchas:**
- The `routeTree.gen.ts` file is auto-generated by TanStack Router. After deleting `about.tsx`, the route tree will be regenerated on the next dev server start. Do not manually edit `routeTree.gen.ts`.
- The `src/paraglide/` directory is auto-generated by the Paraglide plugin. After removing the plugin from vite config, this directory can be deleted if it exists, or it will simply be ignored.
- Ensure no remaining imports reference deleted files. Grep for `paraglide`, `tanstack-query`, `demo`, `LocaleSwitcher`, `Footer`, `getLocale`, `env.ts` across the `src/` directory after cleanup.

**Verification:**
- Run `bun run dev` — the dev server should start without errors
- Navigate to `http://localhost:3000` — should show the placeholder page
- Run `bun run build` — should build successfully with no errors
- Run `bun run check` — Biome should report no lint errors (or only pre-existing ones)

**Depends On:** None
**Blocks:** Step 2, Step 3

---

### Step 2: Enable SPA Mode and Restructure the App Shell

**Objective:** Configure TanStack Start for SPA mode (no SSR) and set up the foundational app shell layout that will host the sidebar and chat area.

**Context:**
- Step 1 has cleaned up the template. The app has a minimal root route and index page.
- SPA mode is required because this is a frontend-only static site with no server.
- The app needs a full-viewport layout (no scrolling body — the chat area scrolls internally).

**Scope:**
- Files to modify:
  - `vite.config.ts` — Enable SPA mode in `tanstackStart()` plugin
  - `src/routes/__root.tsx` — Set up full-height layout, add `<Outlet />` for child routes
  - `src/styles.css` — Clean up template-specific styles, ensure full-height layout
- Files to create:
  - `public/_redirects` — Netlify-style redirects for SPA (optional, for deployment)

**Sub-tasks:**

1. **Enable SPA mode in `vite.config.ts`:** Modify the `tanstackStart()` plugin call to include the SPA configuration:
   ```
   tanstackStart({
     spa: {
       enabled: true,
     },
   })
   ```

2. **Update `src/routes/__root.tsx` for full-height chat layout:** The `RootDocument` component should render a full-viewport layout. The `<body>` should have `class="h-dvh overflow-hidden"` to prevent body scrolling (the chat viewport handles its own scrolling). The children (which will be the `<Outlet />` rendering the index route) should fill the full height. Remove the template-specific body classes like `font-sans antialiased` etc. (these will be handled by Tailwind's base styles and the theme).

3. **Clean up `src/styles.css`:** Remove all template-specific styles that are no longer needed:
   - Remove the `body` background gradients (the chat app will use a solid `--background` color)
   - Remove `body::before` and `body::after` pseudo-elements (decorative gradients/grid)
   - Remove `.page-wrap`, `.display-title`, `.island-shell`, `.feature-card`, `.island-kicker`, `.nav-link`, `.rise-in`, `.site-footer` classes
   - Remove the template-specific link styles (`a` color overrides)
   - Remove the `code` and `pre code` styles (these will be handled by Streamdown/Shiki)
   - Keep: The `@import` for Tailwind, the `@custom-variant dark` rule, the `:root` and `.dark` CSS variable blocks (shadcn theme tokens), the `@theme inline` block, and the `@layer base` block
   - Remove the Google Fonts import for Fraunces (display font not needed for chat). Keep Manrope or switch to system fonts.
   - Ensure `html, body, #app` have `height: 100%` and `overflow: hidden` for the full-viewport layout

4. **Create `public/_redirects`** for static hosting SPA support:
   ```
   /* /index.html 200
   ```
   This ensures all routes are served by the SPA shell. (TanStack Start SPA mode handles this via `/_shell.html`, but a `_redirects` file provides a fallback for Netlify-style hosting.)

**Edge Cases & Gotchas:**
- TanStack Start SPA mode prerenders to `/_shell.html`. The redirect rules need to account for this. Check the TanStack Start SPA mode docs for the exact redirect pattern needed.
- The `#app` div is the mount point for TanStack Start. Ensure it has `height: 100%` or `min-height: 100dvh`.
- The `overflow: hidden` on body is critical — without it, the chat viewport's internal scrolling will fight with body scrolling.

**Verification:**
- Run `bun run dev` — the app should load as a SPA
- The page should take up the full viewport height with no body scrollbar
- Run `bun run build` — should produce a static build with `_shell.html`
- Verify the build output contains no server-side code

**Depends On:** Step 1
**Blocks:** Step 8

---

### Step 3: Install New Dependencies

**Objective:** Add all new npm packages required for the chat application.

**Context:**
- Step 1 has removed unused dependencies. The project has a clean dependency set.
- We need to add the Gemini SDK, IndexedDB wrapper, streaming markdown renderer, and the shadcn sidebar component.

**Scope:**
- Files to modify:
  - `package.json` — New dependencies added via install commands
- Components to add via CLI:
  - shadcn `sidebar` component
  - shadcn `scroll-area` component
  - shadcn `dropdown-menu` component
  - shadcn `sheet` component (dependency of sidebar for mobile)

**Sub-tasks:**

1. **Install runtime dependencies:**
   ```
   bun add @google/genai idb streamdown @streamdown/code react-shiki
   ```
   - `@google/genai` — Google Generative AI SDK for browser-side Gemini API calls
   - `idb` — Lightweight IndexedDB wrapper with TypeScript support
   - `streamdown` — Streaming markdown renderer for AI chat
   - `@streamdown/code` — Code highlighting plugin for Streamdown (uses Shiki)
   - `react-shiki` — React syntax highlighting component (for any standalone code display)

2. **Install the shadcn sidebar component and its dependencies:**
   ```
   npx shadcn@latest add sidebar scroll-area dropdown-menu sheet
   ```
   The sidebar component requires `scroll-area`, `sheet` (for mobile drawer), and we'll need `dropdown-menu` for thread actions and settings menus. This will create/update files in `src/components/ui/`.

3. **Verify all dependencies are installed correctly:** Run `bun install` to ensure the lockfile is consistent.

**Edge Cases & Gotchas:**
- The shadcn CLI may prompt for confirmation or overwrite existing files. Use the `-y` flag if running non-interactively.
- The `streamdown` package requires importing its CSS: `import "streamdown/styles.css"`. This will be done in Step 9 when integrating Streamdown.
- The `@streamdown/code` plugin is a separate package from `streamdown` — both must be installed.
- `react-shiki` has multiple bundle options (`react-shiki`, `react-shiki/web`, `react-shiki/core`). We'll use `react-shiki/web` for a smaller bundle focused on web languages.

**Verification:**
- Run `bun run dev` — the dev server should start without errors
- Run `bun run build` — should build successfully
- Verify `src/components/ui/sidebar.tsx` exists after shadcn CLI runs

**Depends On:** Step 1
**Blocks:** Step 4, Step 5, Step 6, Step 8, Step 9

---

### Step 4: Implement the IndexedDB Persistence Layer

**Objective:** Create the IndexedDB database schema and typed helper functions, then implement the `RemoteThreadListAdapter` and `ThreadHistoryAdapter` interfaces from assistant-ui for local persistence.

**Context:**
- Step 3 has installed the `idb` library.
- This layer is the foundation for all chat persistence — threads and messages are stored here.
- assistant-ui's `useRemoteThreadListRuntime` requires a `RemoteThreadListAdapter` for thread list management.
- assistant-ui's `ThreadHistoryAdapter` is used to load/save messages per thread.

**Scope:**
- Files to create:
  - `src/lib/db.ts` — IndexedDB database schema, initialization, and typed access helpers
  - `src/lib/thread-list-adapter.ts` — `RemoteThreadListAdapter` implementation backed by IndexedDB
  - `src/lib/thread-history-adapter.ts` — `ThreadHistoryAdapter` implementation backed by IndexedDB (as a React component/hook used via `unstable_Provider`)

**Sub-tasks:**

1. **Create `src/lib/db.ts` — IndexedDB schema and helpers:**

   Define the database schema with two object stores:
   - `threads` — Stores thread metadata (id, title, status, createdAt, updatedAt)
   - `messages` — Stores individual messages (id, threadId, role, content, createdAt, attachments)

   Use the `idb` library's `openDB` function with a typed schema:

   The schema shape should be:
   ```
   Database name: "gchat-db"
   Version: 1

   Object store "threads":
     keyPath: "id"
     indexes:
       - "status" (for filtering regular vs archived)
       - "updatedAt" (for sorting by most recent)

   Object store "messages":
     keyPath: "id"
     indexes:
       - "threadId" (for loading all messages in a thread)
       - "threadId_createdAt" (compound index for ordered message retrieval)
   ```

   Export typed helper functions:
   - `getDB()` — Returns the database instance (singleton, lazy-initialized)
   - `getAllThreads()` — Returns all threads sorted by updatedAt descending
   - `getThread(id)` — Returns a single thread by ID
   - `createThread(thread)` — Creates a new thread
   - `updateThread(id, updates)` — Partially updates a thread
   - `deleteThread(id)` — Deletes a thread and all its messages (in a transaction)
   - `getMessagesByThreadId(threadId)` — Returns all messages for a thread, ordered by createdAt
   - `addMessage(message)` — Adds a message and updates the thread's updatedAt timestamp
   - `deleteMessagesByThreadId(threadId)` — Deletes all messages for a thread

   Use `crypto.randomUUID()` for generating IDs.

2. **Create `src/lib/thread-list-adapter.ts` — RemoteThreadListAdapter:**

   Implement the `RemoteThreadListAdapter` interface from `@assistant-ui/react`:

   - `list()` — Calls `getAllThreads()` from db.ts, maps to `{ threads: RemoteThreadMetadata[] }` format with `remoteId`, `status` ("regular" | "archived"), and `title`
   - `initialize(localId)` — Creates a new thread in IndexedDB with the given localId as the remoteId, title "New Chat", status "regular", and current timestamp. Returns `{ remoteId: localId }`
   - `rename(remoteId, newTitle)` — Calls `updateThread(remoteId, { title: newTitle })`
   - `archive(remoteId)` — Calls `updateThread(remoteId, { status: "archived" })`
   - `unarchive(remoteId)` — Calls `updateThread(remoteId, { status: "regular" })`
   - `delete(remoteId)` — Calls `deleteThread(remoteId)` which also deletes all messages
   - `generateTitle(remoteId, messages)` — Generates a title from the first user message. For the initial implementation, use a simple heuristic: take the first 50 characters of the first user message's text content. In Step 5, we'll enhance this to optionally use Gemini for title generation.
   - `fetch(remoteId)` — Calls `getThread(remoteId)` and maps to `RemoteThreadMetadata`
   - `unstable_Provider` — A React component that provides the `ThreadHistoryAdapter` to child components (see sub-task 3)

3. **Create `src/lib/thread-history-adapter.ts` — ThreadHistoryAdapter via Provider:**

   The `ThreadHistoryAdapter` needs access to the current thread's `remoteId`, which is available via assistant-ui's `useAui()` hook. This is implemented as a React component that is set as the `unstable_Provider` on the `RemoteThreadListAdapter`.

   The provider component should:
   - Use `useAui()` to get the current thread list item context
   - Create a `ThreadHistoryAdapter` with `useMemo` that implements:
     - `load()` — Gets the `remoteId` from `aui.threadListItem().getState()`, calls `getMessagesByThreadId(remoteId)`, and maps the stored messages to `ThreadMessageLike[]` format (with `role`, `content`, `id`, `createdAt`)
     - `append(message)` — Awaits `aui.threadListItem().initialize()` to get the `remoteId`, then calls `addMessage()` to persist the message to IndexedDB. The message should be serialized with its `role`, `content` parts, `id`, `createdAt`, and any attachment data.
   - Wrap children with the appropriate adapter provider from assistant-ui (use `RuntimeAdapterProvider` or the equivalent mechanism to inject the `history` adapter)

   **Important:** The `content` field of messages in assistant-ui is an array of content parts (`TextContentPart`, `ImageContentPart`, `ToolCallContentPart`, etc.). When storing in IndexedDB, serialize the entire content array as JSON. When loading, deserialize it back.

**Edge Cases & Gotchas:**
- IndexedDB operations are asynchronous. The `getDB()` function should cache the database instance to avoid reopening on every call.
- When deleting a thread, both the thread record and all its messages must be deleted in a single transaction to maintain consistency.
- The `unstable_Provider` pattern is marked as unstable in assistant-ui. Monitor for API changes in future versions.
- The `append` method is called for both user messages and assistant messages. Ensure both are persisted.
- The `load` method may be called before the thread is initialized (for new threads). Handle the case where `remoteId` is undefined by returning an empty messages array.
- IndexedDB has no built-in migration system. The `idb` library's `upgrade` callback handles schema changes. Version the database and handle upgrades carefully.
- Content parts may contain large base64 image data from attachments. IndexedDB can handle this, but be aware of storage implications.

**Verification:**
- Write a simple test or console script that:
  1. Creates a thread
  2. Adds messages to it
  3. Retrieves the thread and its messages
  4. Deletes the thread and verifies messages are also deleted
- Open browser DevTools → Application → IndexedDB and verify the `gchat-db` database with `threads` and `messages` stores exists after the app loads
- Verify that the `RemoteThreadListAdapter` methods return data in the correct format expected by assistant-ui

**Depends On:** Step 3
**Blocks:** Step 7

---

### Step 5: Implement the Gemini Chat Model Adapter

**Objective:** Create a `ChatModelAdapter` that calls the Google Gemini API directly from the browser using `@google/genai`, with streaming support.

**Context:**
- Step 3 has installed `@google/genai`.
- The adapter will be used with `useLocalRuntime` from assistant-ui.
- The API key is stored in localStorage and read at call time (not at adapter creation time, so key changes take effect immediately).

**Scope:**
- Files to create:
  - `src/lib/gemini-adapter.ts` — The `ChatModelAdapter` implementation
  - `src/lib/gemini-models.ts` — Constants for available Gemini models and their metadata

**Sub-tasks:**

1. **Create `src/lib/gemini-models.ts` — Model definitions:**

   Export an array of available Gemini models with metadata:
   ```
   interface GeminiModel {
     id: string           // e.g., "gemini-2.5-flash"
     name: string         // e.g., "Gemini 2.5 Flash"
     description: string  // e.g., "Fast and efficient for most tasks"
     supportsVision: boolean
     supportsAttachments: boolean
     maxTokens: number    // Context window size
   }
   ```

   Include at minimum:
   - `gemini-2.5-flash` — Fast, efficient, good for most tasks
   - `gemini-2.5-pro` — Most capable, best for complex reasoning
   - `gemini-2.0-flash` — Previous generation, fast

   Export a `DEFAULT_MODEL` constant set to `"gemini-2.5-flash"`.

2. **Create `src/lib/gemini-adapter.ts` — ChatModelAdapter:**

   Implement the `ChatModelAdapter` interface:

   The `run` method should be an async generator that:

   a. **Reads the API key** from localStorage (`localStorage.getItem("gchat-api-key")`). If no key is found, throw an error with a user-friendly message like "Please set your Gemini API key in Settings".

   b. **Creates a `GoogleGenAI` instance** with the API key. Create a new instance on each call (not cached) so that API key changes take effect immediately.

   c. **Reads the selected model** from the `context` parameter or from localStorage (`localStorage.getItem("gchat-model")`) with a fallback to `DEFAULT_MODEL`.

   d. **Reads the system instruction** from localStorage (`localStorage.getItem("gchat-system-prompt")`).

   e. **Converts assistant-ui messages to Gemini format:**
      - Map `ThreadMessage[]` to Gemini's `Content[]` format
      - User messages → `{ role: "user", parts: [...] }`
      - Assistant messages → `{ role: "model", parts: [...] }`
      - For text content parts: `{ text: "..." }`
      - For image content parts: `{ inlineData: { mimeType: "...", data: "..." } }` (base64 without the data URL prefix)
      - Skip system messages (they're handled via the `systemInstruction` parameter)

   f. **Call `ai.models.generateContentStream()`** with:
      - `model`: The selected model ID
      - `contents`: The converted messages
      - `config.systemInstruction`: The system prompt (if set)
      - Pass the `abortSignal` for cancellation support

   g. **Stream the response:** Iterate over the async stream from `generateContentStream()`. For each chunk:
      - Extract the text content via `chunk.text` (or equivalent)
      - Accumulate the full text
      - Yield a `ChatModelRunResult` with `content: [{ type: "text", text: accumulatedFullText }]`
      - Note: assistant-ui expects **cumulative** content in each yield, not deltas

   h. **Handle errors gracefully:**
      - Catch API errors and yield a result with `status: { type: "incomplete", reason: "error" }`
      - Common errors: invalid API key (401), rate limit (429), model not found, content safety filters
      - Format error messages to be user-friendly

   i. **Handle cancellation:** The `abortSignal` should be passed to the `generateContentStream` call. If aborted, the async generator will naturally terminate.

**Edge Cases & Gotchas:**
- The `@google/genai` SDK's `generateContentStream` returns an async iterable. Each chunk may contain partial text. Accumulate text across chunks and yield the cumulative result each time.
- Gemini's content safety filters may block responses. The API returns a `finishReason` of `SAFETY` in this case. Handle this by yielding an error status with a message about content filtering.
- The API key might be invalid or expired. Catch 401/403 errors and provide a clear message directing the user to check their API key in Settings.
- Image attachments need to be converted from data URLs (`data:image/png;base64,...`) to the Gemini format (`{ inlineData: { mimeType: "image/png", data: "..." } }`) — strip the `data:...;base64,` prefix.
- The `GoogleGenAI` constructor should be called fresh each time `run` is invoked, not cached at module level, because the API key may change between calls.
- Some Gemini models may not support vision/multimodal inputs. The adapter should handle this gracefully (the model will return an error, which should be surfaced to the user).

**Verification:**
- After Step 7 wires everything together, test by:
  1. Setting a valid Gemini API key in the settings UI
  2. Sending a simple message like "Hello, what is 2+2?"
  3. Verifying the response streams in character by character
  4. Testing cancellation by clicking "Stop generating" mid-stream
  5. Testing with an invalid API key and verifying the error message
  6. Testing with an image attachment (after Step 10)

**Depends On:** Step 3
**Blocks:** Step 7

---

### Step 6: Implement Settings and API Key Management

**Objective:** Create the settings UI for managing the Gemini API key, selecting the AI model, and configuring the system prompt. All settings are persisted to localStorage.

**Context:**
- Steps 1-3 have set up the clean project with dependencies.
- The settings need to be accessible from the sidebar and/or a dialog.
- Settings values are read by the Gemini adapter (Step 5) from localStorage.

**Scope:**
- Files to create:
  - `src/lib/settings.ts` — Settings constants, types, and localStorage helpers
  - `src/components/settings-dialog.tsx` — Settings dialog component with API key, model selection, and system prompt fields
- Files to potentially modify:
  - May need to add shadcn `tabs` component if settings are organized in tabs

**Sub-tasks:**

1. **Create `src/lib/settings.ts` — Settings management:**

   Define the settings keys and helper functions:
   ```
   // localStorage keys
   SETTINGS_API_KEY = "gchat-api-key"
   SETTINGS_MODEL = "gchat-model"
   SETTINGS_SYSTEM_PROMPT = "gchat-system-prompt"
   ```

   Export helper functions:
   - `getApiKey(): string | null` — Reads the API key from localStorage
   - `setApiKey(key: string): void` — Saves the API key to localStorage
   - `removeApiKey(): void` — Removes the API key from localStorage
   - `getSelectedModel(): string` — Reads the selected model from localStorage, defaults to `DEFAULT_MODEL`
   - `setSelectedModel(modelId: string): void` — Saves the selected model
   - `getSystemPrompt(): string` — Reads the system prompt, defaults to empty string
   - `setSystemPrompt(prompt: string): void` — Saves the system prompt
   - `hasApiKey(): boolean` — Returns true if an API key is set

   Also export a custom React hook `useSettings()` that provides reactive access to settings using `useSyncExternalStore` or a simple `useState` + `useEffect` pattern that listens for `storage` events.

2. **Create `src/components/settings-dialog.tsx` — Settings UI:**

   Create a dialog component using shadcn's `Dialog` component that contains:

   a. **API Key Section:**
      - A password input field for the Gemini API key
      - A "Show/Hide" toggle button to reveal the key
      - A "Save" button that persists to localStorage
      - A "Remove" button to clear the stored key
      - A status indicator showing whether a key is currently set (green dot) or not (red dot)
      - A help text: "Your API key is stored locally in your browser and never sent to any server. Get a key at https://aistudio.google.com/apikey"
      - A link to Google AI Studio for getting an API key

   b. **Model Selection Section:**
      - A `Select` dropdown (shadcn) populated with the models from `gemini-models.ts`
      - Each option shows the model name and a brief description
      - The current selection is persisted to localStorage on change

   c. **System Prompt Section:**
      - A `Textarea` (shadcn) for entering a custom system prompt
      - Placeholder text: "You are a helpful assistant..."
      - Auto-saves on blur or after a debounce period
      - A "Reset" button to clear the system prompt

   The dialog should be triggered by a settings icon button (gear icon from lucide-react) that will be placed in the sidebar header (Step 8).

**Edge Cases & Gotchas:**
- The API key should never be logged to the console or included in error messages.
- The `useSyncExternalStore` approach for reactive settings is preferred over polling, but localStorage doesn't fire `storage` events for changes in the same tab. Use a custom event emitter or a simple state management approach (e.g., a tiny Zustand store) to notify components of settings changes within the same tab.
- The model selection should validate that the selected model ID exists in the known models list. If an unknown model is stored (e.g., from a previous version), fall back to the default.
- The system prompt textarea should handle large text gracefully (scrollable, not expanding the dialog).

**Verification:**
- Open the settings dialog
- Enter an API key, verify it's saved to localStorage (check DevTools → Application → Local Storage)
- Change the model selection, verify it's persisted
- Enter a system prompt, verify it's persisted
- Refresh the page, reopen settings, verify all values are restored
- Remove the API key, verify it's cleared from localStorage

**Depends On:** Step 3
**Blocks:** Step 7

---

### Step 7: Wire Up the Assistant-UI Runtime

**Objective:** Compose the Gemini adapter, IndexedDB persistence, and assistant-ui runtime into a unified runtime provider that powers the entire chat experience.

**Context:**
- Step 4 created the IndexedDB persistence layer with `RemoteThreadListAdapter` and `ThreadHistoryAdapter`
- Step 5 created the Gemini `ChatModelAdapter`
- Step 6 created the settings management
- This step connects everything together into a single `AssistantRuntimeProvider`

**Scope:**
- Files to create:
  - `src/components/runtime-provider.tsx` — The main runtime provider component that wraps the app
- Files to modify:
  - `src/routes/index.tsx` or `src/routes/__root.tsx` — Wrap the app with the runtime provider

**Sub-tasks:**

1. **Create `src/components/runtime-provider.tsx`:**

   This component should:

   a. Import the `geminiAdapter` from `src/lib/gemini-adapter.ts`
   b. Import the `threadListAdapter` from `src/lib/thread-list-adapter.ts`
   c. Use `useRemoteThreadListRuntime` from `@assistant-ui/react` to create the runtime:
      ```
      const runtime = useRemoteThreadListRuntime({
        runtimeHook: () => useLocalRuntime(geminiAdapter, {
          adapters: {
            attachments: compositeAttachmentAdapter, // from Step 10, use placeholder for now
          },
        }),
        adapter: threadListAdapter,
      });
      ```
   d. Wrap children with `<AssistantRuntimeProvider runtime={runtime}>`
   e. Export the provider as `GChatRuntimeProvider`

2. **Integrate the runtime provider into the app:**

   In the root route or index route, wrap the chat UI with `<GChatRuntimeProvider>`. The exact placement depends on the layout structure from Step 8, but the provider should wrap everything that uses assistant-ui components (Thread, ThreadList, etc.).

   The provider should be placed inside the route component (not in `__root.tsx`) because it uses browser-only APIs (localStorage, IndexedDB) and should only render on the client.

3. **Handle the "no API key" state:**

   The runtime provider should check if an API key is set. If not, the Thread component's welcome screen should prominently display a message directing the user to set their API key in Settings. This can be done by:
   - Using `useAssistantInstructions` to set a system message, OR
   - Conditionally rendering a setup prompt in the welcome area
   - The Gemini adapter already throws an error if no key is set, which will show as an error in the chat. But a proactive welcome message is better UX.

**Edge Cases & Gotchas:**
- The `useRemoteThreadListRuntime` hook must be called unconditionally (React hooks rules). Don't conditionally render based on API key presence — instead, let the adapter handle the missing key case.
- The `runtimeHook` parameter is a function that returns a runtime. It's called once per thread. The `useLocalRuntime` inside it creates a per-thread runtime instance.
- The `threadListAdapter` is a plain object (not a hook), so it can be defined outside the component. But if it needs reactive access to settings, it may need to be created inside the component or use a ref.
- The `unstable_Provider` on the thread list adapter is critical — it's what injects the `ThreadHistoryAdapter` into each thread's context. Without it, messages won't be persisted.

**Verification:**
- The app should load without errors
- Creating a new thread should create a record in IndexedDB
- Sending a message (if API key is set) should persist both the user message and assistant response to IndexedDB
- Refreshing the page should restore the thread list and message history
- Switching between threads should load the correct messages
- Deleting a thread should remove it from IndexedDB

**Depends On:** Step 4, Step 5, Step 6
**Blocks:** Step 8

---

### Step 8: Build the Main Chat Page Layout

**Objective:** Create the primary chat interface layout with a collapsible sidebar (thread list + settings) and a main content area (active thread), using the shadcn Sidebar component and assistant-ui's Thread/ThreadList components.

**Context:**
- Step 2 set up the SPA shell with full-height layout
- Step 3 installed the shadcn sidebar component
- Step 7 wired up the runtime provider
- The existing `Thread` and `ThreadList` components from assistant-ui are already in `src/components/assistant-ui/`

**Scope:**
- Files to create:
  - `src/components/chat-sidebar.tsx` — The sidebar component containing thread list and settings trigger
  - `src/components/chat-header.tsx` — The header bar above the chat area with sidebar toggle, model selector, and settings
- Files to modify:
  - `src/routes/index.tsx` — Replace placeholder with the full chat layout
  - `src/routes/__root.tsx` — May need to add `SidebarProvider` at the root level
  - `src/components/assistant-ui/thread.tsx` — Minor adjustments to fit the new layout
  - `src/components/assistant-ui/thread-list.tsx` — Minor adjustments for sidebar integration

**Sub-tasks:**

1. **Create `src/components/chat-sidebar.tsx`:**

   Build a sidebar component using shadcn's `Sidebar` primitives:

   ```
   <Sidebar collapsible="icon" className="border-r">
     <SidebarHeader>
       - App logo/name ("GChat")
       - "New Chat" button (using ThreadListPrimitive.New)
     </SidebarHeader>

     <SidebarContent>
       - ThreadList component (from assistant-ui)
       - Wrapped in a ScrollArea for overflow
     </SidebarContent>

     <SidebarFooter>
       - Settings button (gear icon) that opens the SettingsDialog
       - Theme toggle button
     </SidebarFooter>
   </Sidebar>
   ```

   The `ThreadList` component from `src/components/assistant-ui/thread-list.tsx` should be embedded directly in the sidebar content. It may need minor styling adjustments to fit within the sidebar's visual style.

2. **Create `src/components/chat-header.tsx`:**

   A thin header bar above the chat thread area:
   ```
   <header className="flex h-12 items-center gap-2 border-b px-4">
     <SidebarTrigger />  <!-- Hamburger menu to toggle sidebar -->
     <Separator orientation="vertical" className="h-4" />
     <ModelSelector />   <!-- Dropdown showing current model, allows switching -->
     <div className="ml-auto">
       <!-- Optional: any header actions -->
     </div>
   </header>
   ```

   The `ModelSelector` should be a `Select` dropdown (shadcn) that reads from and writes to localStorage, showing the currently selected Gemini model. Import the models list from `src/lib/gemini-models.ts`.

3. **Update `src/routes/index.tsx` — Main chat layout:**

   The index route should render the complete chat interface:
   ```
   <GChatRuntimeProvider>
     <SidebarProvider>
       <ChatSidebar />
       <SidebarInset>
         <ChatHeader />
         <Thread />
       </SidebarInset>
     </SidebarProvider>
   </GChatRuntimeProvider>
   ```

   The `SidebarInset` component (from shadcn sidebar) provides the main content area that adjusts when the sidebar is open/closed. The `Thread` component fills the remaining vertical space.

4. **Adjust `src/components/assistant-ui/thread-list.tsx` for sidebar integration:**

   The existing `ThreadList` component may need minor styling adjustments:
   - Ensure it fills the sidebar width
   - Adjust padding to match sidebar content spacing
   - The "New Thread" button should match the sidebar's visual style
   - Thread list items should use the sidebar's hover/active states

5. **Adjust `src/components/assistant-ui/thread.tsx` for layout integration:**

   The `Thread` component should:
   - Fill the available height within `SidebarInset` (below the header)
   - The welcome message should mention GChat and prompt the user to start chatting or set up their API key
   - Update the welcome suggestions to be relevant for a Gemini chat app (e.g., "Explain quantum computing", "Write a Python function to sort a list", "What are the benefits of TypeScript?")

6. **Update `src/routes/__root.tsx`:**

   The root document should ensure the body allows the full-height layout. The `<Outlet />` should be the only child in the body (no wrapper divs that might constrain height). Ensure the theme initialization script is still present.

7. **Move `ThemeToggle` to the sidebar footer:**

   The existing `ThemeToggle` component should be placed in the sidebar footer alongside the settings button. It may need minor styling adjustments to fit as an icon button rather than a text button.

**Edge Cases & Gotchas:**
- The shadcn `SidebarProvider` manages sidebar open/close state. It should wrap both the sidebar and the main content area.
- On mobile, the sidebar should render as a `Sheet` (slide-out drawer). The shadcn sidebar component handles this automatically via the `isMobile` detection.
- The `Thread` component from assistant-ui has its own viewport scrolling. Ensure there's no conflicting scroll container between the `SidebarInset` and the `Thread`.
- The `SidebarTrigger` component needs to be inside the `SidebarProvider` context to work.
- The model selector in the header should be a lightweight component that just reads/writes localStorage — it doesn't need to be connected to the runtime directly (the Gemini adapter reads the model from localStorage on each call).

**Verification:**
- The app should show a sidebar on the left with thread list and a main chat area on the right
- Clicking "New Chat" should create a new thread
- The sidebar should be collapsible (click the trigger or use Cmd+B)
- On mobile viewport, the sidebar should appear as a slide-out drawer
- The model selector should show available models and persist the selection
- The settings button should open the settings dialog
- The theme toggle should cycle through light/dark/auto modes
- The chat area should fill the remaining space and scroll independently

**Depends On:** Step 2, Step 3, Step 6, Step 7
**Blocks:** Step 9, Step 10, Step 11

---

### Step 9: Integrate Streamdown for Markdown Rendering

**Objective:** Replace the existing `@assistant-ui/react-markdown` based markdown renderer with Streamdown for streaming-aware markdown rendering with syntax highlighting via `@streamdown/code`.

**Context:**
- Step 3 installed `streamdown`, `@streamdown/code`, and `react-shiki`
- Step 8 has the chat layout working with the existing markdown renderer
- The existing `src/components/assistant-ui/markdown-text.tsx` uses `MarkdownTextPrimitive` from `@assistant-ui/react-markdown` with `remark-gfm`

**Scope:**
- Files to modify:
  - `src/components/assistant-ui/markdown-text.tsx` — Replace the implementation with Streamdown
  - `src/styles.css` — Import Streamdown's CSS
- Files to potentially modify:
  - `src/components/assistant-ui/thread.tsx` — If the markdown component API changes

**Sub-tasks:**

1. **Import Streamdown CSS in `src/styles.css`:**

   Add `@import "streamdown/styles.css";` near the top of the file, after the Tailwind import. This provides the base styles for Streamdown's markdown rendering.

2. **Rewrite `src/components/assistant-ui/markdown-text.tsx`:**

   Replace the current implementation that uses `MarkdownTextPrimitive` with a new implementation using Streamdown.

   The component needs to:
   a. Get the current message text content from assistant-ui's context (use `useAuiState` or the appropriate hook to access the current text part's content)
   b. Determine if the message is currently streaming (use `useAuiState` to check `s.message.isRunning` or similar)
   c. Render the `<Streamdown>` component with:
      - `children` = the text content
      - `isAnimating` = whether the message is currently streaming
      - `plugins={{ code: code }}` where `code` is imported from `@streamdown/code`
      - `shikiTheme={["github-light", "github-dark"]}` for light/dark mode code highlighting
      - `animated` = true for per-word animation during streaming
      - `caret="block"` to show a cursor during streaming (only for the last message)
      - `className` for styling consistency

   **Important integration note:** The existing `MarkdownText` component is used inside `MessagePrimitive.Parts` in `thread.tsx` where it's rendered for `part.type === "text"`. The Streamdown component needs access to the text content of the current part. In assistant-ui, the `MarkdownTextPrimitive` automatically reads from context. With Streamdown, you'll need to explicitly read the text content using `useAuiState((s) => s.message.part.text)` or the equivalent hook.

   Consult the assistant-ui primitives documentation to find the correct hook for accessing the current text part's content within a `MessagePrimitive.Parts` render function.

3. **Configure Streamdown code highlighting:**

   Import and configure the `@streamdown/code` plugin:
   ```
   import { code } from "@streamdown/code"
   ```

   The code plugin provides:
   - Lazy-loaded language grammars (only loads what's needed)
   - Copy button on code blocks
   - Language label display
   - Dual theme support (light/dark)

4. **Handle the transition from assistant-ui markdown to Streamdown:**

   The existing `markdown-text.tsx` defines custom components for headings, paragraphs, lists, tables, code blocks, etc. via `memoizeMarkdownComponents`. With Streamdown, these are handled internally by Streamdown's renderer. However, you may want to customize some elements to match the existing styling. Streamdown supports a `components` prop for custom element overrides.

   Keep the existing styling approach (Tailwind classes) but apply them through Streamdown's `components` prop or via CSS targeting Streamdown's class names.

5. **Remove the `@assistant-ui/react-markdown` dependency** from `package.json` if it's no longer used anywhere. Also remove the `remark-gfm` dependency if Streamdown handles GFM internally (Streamdown includes `remark-gfm` by default).

**Edge Cases & Gotchas:**
- Streamdown and `@assistant-ui/react-markdown` have different APIs. The `MarkdownTextPrimitive` automatically reads from assistant-ui's context, while `Streamdown` takes children as a string prop. You need to bridge this gap by reading the text content from context and passing it as children.
- The `isAnimating` prop should only be true for the currently streaming message, not for historical messages. Use the message's running state from assistant-ui context.
- Streamdown's CSS may conflict with existing Tailwind styles. Test thoroughly and adjust as needed.
- The `CodeHeader` component from the existing implementation (copy button, language label) is replaced by Streamdown's built-in code block controls. Remove the custom `CodeHeader`.
- The `useIsMarkdownCodeBlock` hook from `@assistant-ui/react-markdown` will no longer be available. Streamdown handles inline vs block code internally.
- Dark mode theme switching for code blocks: Streamdown's `shikiTheme` prop accepts a `[light, dark]` tuple. Ensure the app's dark mode class (`.dark`) is compatible with Streamdown's theme switching mechanism.

**Verification:**
- Send a message that includes markdown formatting (headings, bold, italic, lists, links)
- Verify the markdown renders correctly during streaming and after completion
- Send a message requesting a code block (e.g., "Write a Python hello world")
- Verify syntax highlighting works with the correct theme (light in light mode, dark in dark mode)
- Verify the copy button works on code blocks
- Verify that incomplete markdown during streaming is handled gracefully (no broken rendering)
- Verify that the streaming animation/caret appears during generation and disappears after completion
- Test with GFM features: tables, strikethrough, task lists

**Depends On:** Step 3, Step 8
**Blocks:** Step 11

---

### Step 10: Implement Attachment Support

**Objective:** Create a custom `AttachmentAdapter` that handles image and document uploads for the Gemini API, converting files to base64 for inline transmission.

**Context:**
- Step 8 has the chat layout working
- The existing `src/components/assistant-ui/attachment.tsx` already has UI components for displaying attachments
- The Gemini adapter (Step 5) needs to handle image content parts in the message conversion
- assistant-ui's `ComposerPrimitive.AddAttachment` and `ComposerPrimitive.Attachments` are already wired up in the Thread component

**Scope:**
- Files to create:
  - `src/lib/attachment-adapter.ts` — Custom `AttachmentAdapter` implementation
- Files to modify:
  - `src/components/runtime-provider.tsx` — Wire the attachment adapter into the runtime
  - `src/lib/gemini-adapter.ts` — Ensure the message converter handles image and file content parts

**Sub-tasks:**

1. **Create `src/lib/attachment-adapter.ts`:**

   Implement a `CompositeAttachmentAdapter` that handles both images and documents:

   a. **Image Attachment Adapter:**
      - `accept`: `"image/jpeg,image/png,image/webp,image/gif"`
      - `add({ file })`: Validate file size (max 20MB), create a `PendingAttachment` with type "image"
      - `send(attachment)`: Convert the file to a base64 data URL using `FileReader.readAsDataURL()`, return a `CompleteAttachment` with `content: [{ type: "image", image: dataUrl }]`
      - `remove(attachment)`: No-op (nothing to clean up)

   b. **Document/Text Attachment Adapter:**
      - `accept`: `"text/plain,text/markdown,text/csv,application/json,text/html,text/css,text/javascript,application/pdf"`
      - `add({ file })`: Validate file size (max 10MB), create a `PendingAttachment` with type "document"
      - `send(attachment)`: Read the file as text using `FileReader.readAsText()` (for text files) or as base64 (for PDFs), return a `CompleteAttachment` with appropriate content parts
      - `remove(attachment)`: No-op

   c. **Composite Adapter:**
      Use assistant-ui's `CompositeAttachmentAdapter` to combine both:
      ```
      new CompositeAttachmentAdapter([
        new ImageAttachmentAdapter(),
        new DocumentAttachmentAdapter(),
      ])
      ```

2. **Wire the adapter into the runtime provider (`src/components/runtime-provider.tsx`):**

   Update the `useLocalRuntime` call to include the attachment adapter:
   ```
   useLocalRuntime(geminiAdapter, {
     adapters: {
       attachments: compositeAttachmentAdapter,
     },
   })
   ```

3. **Update the Gemini adapter message converter (`src/lib/gemini-adapter.ts`):**

   Ensure the message-to-Gemini-format converter handles attachment content parts:
   - For `{ type: "image", image: "data:image/png;base64,..." }` → Convert to Gemini's `{ inlineData: { mimeType: "image/png", data: "<base64>" } }` format (strip the data URL prefix)
   - For `{ type: "file", data: "...", mimeType: "text/plain" }` → Convert to `{ text: "..." }` (include file content as text)
   - For `{ type: "text", text: "..." }` → Convert to `{ text: "..." }` (already handled)

   The converter should handle messages that have multiple content parts (e.g., text + image).

**Edge Cases & Gotchas:**
- Base64 encoding increases file size by ~33%. A 20MB image becomes ~27MB in base64. Ensure this doesn't exceed Gemini's request size limits.
- PDF files cannot be read as text. They should be sent as base64 inline data with `mimeType: "application/pdf"`. Gemini supports PDF understanding.
- The `FileReader` API is asynchronous. The `send` method returns a Promise, which is fine for the adapter interface.
- Large attachments stored in IndexedDB (via message persistence) can consume significant storage. Consider whether to store the full base64 data or just metadata.
- The existing attachment UI components (`src/components/assistant-ui/attachment.tsx`) should work without modification since they use assistant-ui's primitives which are adapter-agnostic.
- Drag-and-drop file upload is already handled by `ComposerPrimitive.AttachmentDropzone` in the Thread component.

**Verification:**
- Click the attachment button (+ icon) in the composer
- Upload an image file — verify it appears as a thumbnail in the composer
- Send the message with the image — verify the image appears in the user message
- Verify the Gemini response acknowledges the image content (e.g., "I can see an image of...")
- Upload a text file — verify it's sent as document content
- Test drag-and-drop file upload
- Test removing an attachment before sending
- Test with files exceeding the size limit — verify a clear error message

**Depends On:** Step 5, Step 7, Step 8
**Blocks:** Step 11

---

### Step 11: Polish and Finalize

**Objective:** Add final polish including error handling, loading states, welcome screen improvements, keyboard shortcuts, responsive design fixes, and overall UX refinements.

**Context:**
- Steps 1-10 have built the complete functional application
- This step focuses on UX polish, edge case handling, and production readiness

**Scope:**
- Files to modify:
  - `src/components/assistant-ui/thread.tsx` — Welcome screen, error states
  - `src/components/chat-sidebar.tsx` — Polish, empty states
  - `src/components/chat-header.tsx` — Polish
  - `src/components/settings-dialog.tsx` — Validation, error handling
  - `src/routes/__root.tsx` — Meta tags, favicon, PWA manifest
  - `src/styles.css` — Final styling adjustments
  - `public/manifest.json` — Update for GChat branding

**Sub-tasks:**

1. **Enhance the welcome screen (`thread.tsx`):**
   - Update the welcome message to "Welcome to GChat"
   - Add a subtitle: "Chat with Google Gemini models. Your conversations are stored locally and never leave your browser."
   - If no API key is set, show a prominent call-to-action: "To get started, set your Gemini API key in Settings" with a button that opens the settings dialog
   - Add relevant suggestion prompts (e.g., "Explain how React hooks work", "Write a TypeScript function to debounce", "What's the difference between TCP and UDP?", "Help me plan a weekend trip")

2. **Add error handling and user feedback:**
   - In the Gemini adapter, catch and format common errors:
     - No API key → "Please set your Gemini API key in Settings"
     - Invalid API key (401) → "Invalid API key. Please check your key in Settings"
     - Rate limited (429) → "Rate limit exceeded. Please wait a moment and try again"
     - Content filtered → "This response was blocked by Gemini's safety filters"
     - Network error → "Network error. Please check your internet connection"
   - These errors should appear as error messages in the chat thread (assistant-ui's `ErrorPrimitive` handles this)

3. **Update meta tags and branding (`__root.tsx`):**
   - Update the page title to "GChat"
   - Add meta description: "Chat with Google Gemini models. Privacy-first — all conversations stored locally."
   - Add Open Graph tags for social sharing
   - Update `public/manifest.json` with GChat name, description, and theme colors
   - Update favicon (or keep the default for now)

4. **Responsive design verification and fixes:**
   - Test the sidebar behavior on mobile (should be a sheet/drawer)
   - Ensure the composer input is usable on mobile (proper sizing, keyboard handling)
   - Ensure the thread viewport scrolls correctly on mobile
   - Test landscape orientation on mobile
   - Ensure the settings dialog is scrollable on small screens

5. **Keyboard shortcuts:**
   - `Cmd/Ctrl + B` — Toggle sidebar (already handled by shadcn sidebar)
   - `Cmd/Ctrl + Shift + N` — New thread (add this)
   - `Enter` — Send message (already handled by assistant-ui composer)
   - `Shift + Enter` — New line in composer (already handled)
   - `Escape` — Cancel streaming (already handled by assistant-ui)

6. **Loading states:**
   - Thread list loading skeleton (already in `thread-list.tsx`)
   - Initial app load — show a brief loading state while IndexedDB initializes
   - Model selector should show the current model name, not just the ID

7. **Final styling pass:**
   - Ensure consistent spacing and typography across all components
   - Verify dark mode works correctly for all components (sidebar, thread, settings, code blocks)
   - Ensure the shadcn theme tokens are applied consistently
   - Remove any remaining template-specific styles from `styles.css`

8. **Clean up unused files and imports:**
   - Remove `src/components/Header.tsx` if it's no longer used (replaced by `chat-header.tsx`)
   - Remove any unused imports across all files
   - Run `bun run check` (Biome) to catch any lint issues
   - Ensure no TypeScript errors with `tsc --noEmit` (or via the build process)

**Edge Cases & Gotchas:**
- The "no API key" state should be handled gracefully everywhere — the app should be fully navigable and explorable even without a key, just unable to send messages.
- The settings dialog should validate the API key format (Gemini keys start with "AI" and are ~39 characters, but don't enforce this strictly — just warn if the format looks wrong).
- On first visit, the thread list will be empty. The welcome screen should be inviting and guide the user to either start chatting or set up their API key.
- The `manifest.json` update enables PWA-like behavior (add to home screen). Ensure the `start_url` and `display` fields are correct for a SPA.

**Verification:**
- Complete end-to-end test:
  1. Open the app fresh (no data in IndexedDB or localStorage)
  2. See the welcome screen with setup instructions
  3. Open settings, enter a Gemini API key
  4. Select a model
  5. Send a message, verify streaming response
  6. Create multiple threads, switch between them
  7. Refresh the page, verify all threads and messages are preserved
  8. Test on mobile viewport
  9. Test dark mode
  10. Test with an invalid API key, verify error handling
  11. Upload an image, verify it's sent to Gemini
  12. Run `bun run build` — verify clean production build
  13. Run `bun run preview` — verify the production build works correctly

**Depends On:** Step 8, Step 9, Step 10
**Blocks:** None (final step)
