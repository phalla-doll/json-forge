# JSON Forge — shadcn/ui Rebuild Plan

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Scaffold `v2/` | ✅ Complete | Next.js 16 + shadcn (preset `b6rtDj74a`) on `:3001`, all runtime deps installed, clean build |
| 1 — Theme parity | ✅ Complete | Vercel accents aliased to shadcn tokens, Inter + JetBrains Mono via `next/font/google`, ASCII loader, dark default |
| 2 — Shared infrastructure | ✅ Complete | `types.ts`, `lib/ai.ts`, `lib/utils.ts` (merged with `cn`), `next-themes`, `sonner` toast, layout shell |
| 3 — Toolbar + StatusBar | ✅ Complete | shadcn `Select`, `Tooltip`, `Input`, `ToggleGroup`, `Separator`; all toolbar actions + view switcher wired |
| 4 — Editor + Code view | ✅ Complete | Monaco via `next/dynamic` SSR-safe, Vercel dark/light themes, search highlighting, all toolbar actions functional |
| 5 — AI modal | ✅ Complete | shadcn `Dialog` + `Textarea`, generate + fix flows, `sonner` error surfacing, purple AI button |
| 6 — Alternate views | ✅ Complete | `JsonTreeView` (780 LOC), `JsonTableView`, `JsonMermaidView` ported with shadcn tokens |
| 7 — Polish + accessibility | ✅ Complete | All Blockers + Should-fixes from code review addressed; `pnpm build`, `pnpm typecheck`, `pnpm lint` all clean (0 errors, 0 warnings). Lighthouse + browser a11y audit still owed via manual QA. |
| 8 — Promotion to root | ✅ Complete | Vite app archived to `.archive/`, v2 promoted to root via `git mv` (history preserved), `pnpm build/typecheck/lint` clean, dev port → 3000. Vercel framework preset update + `.archive/` deletion are follow-up tasks. |

**Last updated:** Phase 8 complete. Rebuild finished.
- B1: Gemini moved behind `app/api/ai/{generate,fix}/route.ts`; client no longer holds the API key (renamed `NEXT_PUBLIC_GEMINI_API_KEY` → `GEMINI_API_KEY`).
- B2/B3: tree-view render-phase mutation replaced with parent-precomputed `initiallyExpandedPaths` set; random `graphKey` replaced with `key={value}`.
- B4: error state collapsed to derived `useMemo`; redundant `setError` calls removed.
- S1: dormant `json-mermaid-view.tsx` deleted; `mermaid` dep removed.
- S2: hard-coded `dark` class on `<html>` removed; `ThemeProvider` owns the class.
- S3: ~15 raw `<button>`s in tree/table views converted to shadcn `Button + Tooltip`.
- S4/S5: aria-labels added to ToggleGroup items, theme toggle, GitHub link; `rel="noopener noreferrer"` added.
- S6: tree-view `setTimeout(..., 100)` replaced with double-`requestAnimationFrame`.
- S7: `navigator.platform` → `navigator.userAgent` UA sniff.
- S8: local `Tooltip` renamed to `NodeTooltip` to free the name for shadcn.
- S9: Monaco `theme` prop now reflects the active theme.
- S10: `<Textarea autoFocus>` in AI modal removed (Radix owns focus).
- Nits: `dragCounter`/`isEditorReady` write-only state moved to `useRef` or removed; `getStats` wrapped in `useMemo`; setTimeout refs typed; table-view filter carries original index; `optimizePackageImports: ["lucide-react"]` added.

Phase 8 promotion is a destructive root swap and should run only on user go-ahead.

---

## Strategy

Build a parallel project at `./v2/` with a real Vite + Tailwind + shadcn toolchain. Port features phase-by-phase from the root app, keeping the current app fully functional throughout. When `v2/` reaches parity and is verified, promote it to the root in a single swap commit.

Why a subfolder (not a branch):
- Both apps runnable at once (`npm run dev` in root on `:3000`, in `v2/` on `:3001`) for visual diffing.
- No risk to the deployed app during the rebuild.
- The promotion step is one mechanical move + history-preserving rename, reviewable as a single PR.

---

## Target stack

- **Next.js** (App Router) — scaffolded via shadcn preset `b6rtDj74a`
- **Tailwind CSS** + **shadcn/ui** (configured by the preset)
- **Radix UI** primitives (transitively, via shadcn)
- **lucide-react**, **@monaco-editor/react**, **@google/genai**, **mermaid** — installed as real npm deps (no import map)
- **sonner** for toasts
- **pnpm** as the package manager
- **clsx**, **tailwind-merge**, **class-variance-authority** (shadcn deps, included by preset)

Note: switching from Vite to Next.js means the app is now a Next project. The JSON Forge UI is fully client-side (Monaco, Mermaid, local state) so everything lives under `"use client"` components. No SSR or server routes are required for parity; we keep the option open for future server-side features (e.g., a server-routed Gemini call to hide the API key).

---

## Skills to leverage

This rebuild **must** lean on the project's installed Claude Code skills rather than hand-rolling solutions. Three skills cover the entire surface area of this plan:

### `shadcn` (component discovery + installation)
**Use first, before writing any UI code.** For every UI need (button, dialog, toast, select, tabs, tooltip, table, etc.), invoke this skill to:
- search the shadcn registry for an existing component,
- install it via the canonical CLI command,
- look up composition examples and prop APIs.

**Rule:** if shadcn ships a component for the job, use it. Do **not** write a custom Radix wrapper, a custom modal, a custom toggle group, or a custom form input. The only acceptable customs are domain components that have no shadcn equivalent (Monaco editor wrapper, Mermaid renderer, the JSON tree/table views).

### `vercel:shadcn` (shadcn architecture, theming, registry expertise)
Use alongside `shadcn` for the harder calls:
- theming + CSS-variable aliasing (Phase 1),
- composition patterns when stacking primitives (Toolbar dropdowns, AI modal),
- troubleshooting installation, Tailwind, or `components.json` issues,
- deciding when to extend a component via `cva` variants vs. wrapping it.

### `vercel:nextjs` (App Router patterns)
Use for every Next-specific decision:
- where `"use client"` belongs and where it doesn't,
- `next/dynamic` with `ssr: false` for Monaco/Mermaid (Phase 4, 6),
- `next/font/google` for Inter + JetBrains Mono (Phase 1),
- route handlers for the optional server-side Gemini call (Phase 5),
- `loading.tsx` conventions for the ASCII loader (Phase 1),
- `app/layout.tsx` structure (theme provider, Toaster placement).

### `vercel:react-best-practices` (review pass)
Triggered automatically by the harness after multiple TSX edits, and invoked explicitly in Phase 7. Run it across every ported file before promotion.

### Operating discipline

At the start of every phase below, the first action is to consult `shadcn` (and `vercel:shadcn` if architectural) for the components that phase needs. **No UI code is written before that lookup.** This avoids drift toward custom solutions when a registry component already exists.

---

## Phase 0 — Scaffold `v2/`

**Goal:** empty-but-working Next.js + Tailwind + shadcn project that renders a placeholder page.

**Skills:** `shadcn` (to confirm the init command and preset behavior), `vercel:nextjs` (for App Router scaffold conventions).

1. From the repo root, scaffold into `v2/`:
   ```
   mkdir v2 && cd v2
   pnpm dlx shadcn@latest init --preset b6rtDj74a --template next
   ```
   The preset configures Tailwind, the shadcn registry, `components.json`, `lib/utils.ts` (`cn`), and the New York / neutral / CSS-variables defaults. The `--template next` flag scaffolds a Next.js App Router project.
2. Install runtime deps that the current app uses:
   ```
   pnpm add lucide-react @monaco-editor/react @google/genai mermaid sonner
   ```
3. Configure `next.config.ts`:
   - Mark `mermaid` and `@monaco-editor/react` as client-only (they touch `window`); no transpile config typically needed in recent Next versions, but verify.
4. Configure dev port: add `"dev": "next dev -p 3001"` to `v2/package.json` so the root Vite app keeps `:3000`.
5. Wire the Gemini key: add `GEMINI_API_KEY=…` to `v2/.env.local`. Since the current app calls Gemini from the browser, expose it as `NEXT_PUBLIC_GEMINI_API_KEY` for now — flag this for Phase 5 to optionally move behind a Next route handler so the key isn't shipped to the client.
6. Verify: `pnpm dev` shows the shadcn starter on `:3001`.

**Exit criteria:** clean Next.js build, shadcn `button` component installs and renders, no CDN scripts anywhere in `v2/`.

---

## Phase 1 — Theme parity

**Goal:** shadcn tokens map to the existing Vercel "accents" scale so ported components look identical to today.

**Skills:** `vercel:shadcn` (theming + CSS-variable strategy — the canonical token names and which ones must be defined), `vercel:nextjs` (`next/font/google`, `app/loading.tsx`, `app/layout.tsx` structure).

1. Copy the `--accents-1`..`--accents-8`, `--color-success`, `--color-error`, `--color-warning` CSS variables from root `index.html` into `v2/app/globals.css` under `:root` and `.dark`.
2. In the same file, alias shadcn's semantic tokens (already defined by the preset) to the accents scale:
   ```css
   :root {
     --background: var(--bg-background);
     --foreground: var(--accents-8);
     --muted: var(--accents-1);
     --muted-foreground: var(--accents-5);
     --border: var(--accents-2);
     --input: var(--accents-2);
     --ring: var(--accents-5);
     --primary: var(--accents-8);
     --primary-foreground: var(--bg-background);
     --destructive: var(--color-error);
     /* ... etc */
   }
   ```
3. Verify the preset's `tailwind.config.ts` has `darkMode: 'class'` (preset default). Extend `fontFamily` with Inter + JetBrains Mono.
4. Load Inter + JetBrains Mono via `next/font/google` in `v2/app/layout.tsx` (preferred over `<link>` for Next).
5. Port the custom scrollbar CSS and `editor-match-highlight` rules from root `index.html` into `v2/app/globals.css`.
6. Port the ASCII pre-React loader into `v2/app/loading.tsx` (Next's built-in suspense fallback). Alternatively, inline it into the `<body>` of `layout.tsx` wrapped in a "removed once React mounts" pattern — pick whichever produces the same visual as the current pre-React loader.
7. Set the `<html>` element's `className="dark"` default in `layout.tsx` to match today's behavior.

**Exit criteria:** `v2/` renders a sample shadcn `<Button>` that visually matches the current `components/Button.tsx` in both light and dark mode.

---

## Phase 2 — Shared infrastructure

**Goal:** non-UI code lifted over so feature ports are pure UI work.

**Skills:** `shadcn` (install `sonner` component via the registry rather than ad-hoc), `vercel:nextjs` (where the `<Toaster />` and `<ThemeProvider>` belong in `layout.tsx`).

1. Copy `types.ts` → `v2/types.ts` (or `v2/lib/types.ts`).
2. Copy `lib/ai.ts` and `lib/utils.ts` → `v2/lib/` — rename the existing files if they collide with shadcn's `lib/utils.ts`. Merge the `cn()` helper into the existing shadcn-provided file rather than overwriting it.
3. Use **`next-themes`** for dark/light toggling (idiomatic in Next; replaces the manual `class` toggle in root `App.tsx:122`). Wrap `layout.tsx` body in `<ThemeProvider>`.
4. Set up toast: add `<Toaster />` from `sonner` in `layout.tsx`.
5. Create `v2/app/page.tsx` as a `"use client"` component containing the three-region layout shell (header / toolbar / main / status bar) using shadcn token classes — no functionality yet.

**Exit criteria:** layout shell renders on `:3001`, dark/light toggle works via `next-themes`, `toast("hello")` shows a toast styled with the accents palette.

---

## Phase 3 — Toolbar + StatusBar

**Goal:** port the chrome that wraps the editor.

**Skills:** `shadcn` is the primary driver here — every primitive in this phase comes from the registry. For each component below, invoke `shadcn` to install it and to fetch composition examples. Use `vercel:shadcn` for the AI button's custom `cva` variant (purple gradient extending the standard `button`).

Components to install via the `shadcn` skill: `button`, `input`, `select`, `tooltip`, `separator`, `toggle-group`. Do not write custom equivalents.

1. **Button** — replace the four `Button.tsx` variants with shadcn `button` variants. Add a custom `ai` variant (purple) via `cva` for the AI generate button.
2. **Toolbar** (`components/Toolbar.tsx` → `v2/components/toolbar.tsx`, marked `"use client"`):
   - Indent dropdown → shadcn `Select`.
   - Search input → shadcn `Input` with `lucide` Search icon prefix; keep the Cmd/Ctrl+K handler and the `hasMatches === false` red-border styling.
   - Wrap every icon-only or label-hidden button in `Tooltip`.
   - Group separators → shadcn `Separator`.
3. **View mode switcher** (currently in `App.tsx:416`) → `ToggleGroup` (single-select) for Code/Graph/Table.
4. **StatusBar** — stays as a plain styled `<div>`, just swap class names to use `bg-muted`, `border-border`, `text-muted-foreground`.

**Exit criteria:** Toolbar + StatusBar render with no functionality wired to the editor yet, but every button/select/tooltip behaves correctly in isolation.

---

## Phase 4 — Editor + Code view

**Goal:** Monaco-based code editing fully working.

**Skills:** `vercel:nextjs` (`next/dynamic` with `ssr: false` for the Monaco import is non-obvious — get this right the first time).

1. Port `components/Editor.tsx` → `v2/components/editor.tsx`, marked `"use client"`. Wrap the Monaco import with `dynamic(() => import(...), { ssr: false })` to avoid SSR issues.
2. Wire `jsonInput` / `debouncedInput` / `error` / search highlighting state into the new `app/page.tsx` client component.
3. Verify the `editor-match-highlight` Monaco decoration still works after the move to `globals.css`.
4. Wire all Toolbar actions: Prettify, Minify, Copy, Clear, Import, Export, indentation change.
5. Wire drag-and-drop file upload (currently in root `App.tsx`).

**Exit criteria:** every Toolbar button works against the Monaco editor. Open both apps side-by-side and confirm identical behavior with a sample JSON.

---

## Phase 5 — AI modal

**Goal:** Gemini-powered generation flow.

**Skills:** `shadcn` (install `dialog`, `textarea`, `label`, `form` if used), `vercel:nextjs` (route handler structure for the optional server-side Gemini call).

1. Replace the hand-rolled modal in `components/AiModal.tsx` with shadcn `Dialog` (install via the `shadcn` skill).
2. Use shadcn `Textarea` for the prompt input.
3. Reuse the purple `ai` button variant from Phase 3.
4. Wire `lib/ai.ts` calls; surface errors via `sonner` instead of inline state.
5. Verify `NEXT_PUBLIC_GEMINI_API_KEY` env injection works in Next.
6. **Optional hardening:** move the Gemini call behind a Next route handler (`app/api/generate/route.ts`) so the key stays server-side. The client component just `fetch`es the route. This is a real benefit the Next migration unlocks — worth doing here unless it adds scope.

**Exit criteria:** AI generate + AI fix flows produce identical results to the root app.

---

## Phase 6 — Alternate views

**Goal:** Graph (Mermaid) and Table views at parity.

**Skills:** `shadcn` (install `table`, `scroll-area`, `collapsible` as needed for the table and tree views — check the registry before reinventing virtualization/expansion chrome), `vercel:nextjs` (`"use client"` boundaries for window-touching libs).

1. Port `JsonMermaidView.tsx` → `v2/components/json-mermaid-view.tsx`, marked `"use client"` (mermaid touches `window`). Mostly className updates to use shadcn tokens.
2. Port `JsonTreeView.tsx` (780 lines — the heaviest file) → same treatment. Audit for any inline color literals that should become `bg-muted` / `text-muted-foreground` / etc.
3. Port `JsonTableView.tsx` → consider using shadcn `table` primitives for the header/row styling, but keep the existing virtualization/expansion logic.
4. Verify view switching via the `ToggleGroup` from Phase 3.

**Exit criteria:** all three view modes render correctly for a representative set of JSON fixtures (flat object, deeply nested, arrays of objects, mixed).

---

## Phase 7 — Polish + accessibility pass

**Skills:** `vercel:react-best-practices` (mandatory review pass), `vercel:shadcn` (final theming + composition audit), `shadcn` (any last-mile component additions discovered during polish).

1. Audit focus rings: shadcn's `--ring` should produce visible focus outlines everywhere. Tab through the whole UI.
2. Run `vercel:react-best-practices` skill across every ported TSX file — this is non-optional.
3. Lighthouse pass — confirm no regression vs. the root app.
4. Verify keyboard shortcuts: Cmd/Ctrl+K (search focus), Esc (close dialog), Enter (submit AI prompt).
5. Replace remaining `title=` attributes with `Tooltip` where it improves UX.
6. Re-test on mobile widths — the existing `hidden sm:inline` / `hidden lg:inline` patterns should keep working with shadcn buttons.

**Exit criteria:** v2 matches or beats v1 on every interaction; no console warnings; visual diff is intentional only.

---

## Phase 8 — Promotion to root

**Goal:** atomic swap with reviewable history.

**Skills:** `vercel:nextjs` (verify Vercel project config — framework preset, build command, env vars).

1. Final side-by-side QA pass (both servers running). Document any intentional visual deltas.
2. Move root files out of the way:
   ```
   git mv App.tsx components lib types.ts index.tsx index.html package.json tsconfig.json vite.config.ts .archive/
   ```
   (`.archive/` kept in-tree for one release cycle as a safety net; deleted in a follow-up PR.)
3. Move `v2/` contents to root with `git mv` so blame history follows the files. This includes the Next.js project structure (`app/`, `components/`, `lib/`, `next.config.ts`, `package.json`, `pnpm-lock.yaml`, `.env.local.example`, etc.).
4. Update root `README.md` with new dev instructions (`pnpm install && pnpm dev`).
5. Update Vercel project settings: framework preset changes from **Vite** to **Next.js**. Verify the build command, output directory, and env var names (`GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY` depending on Phase 5 outcome).
6. Update `metadata.json` if it ships any Vite-specific paths.
7. Single PR titled `chore: promote shadcn rebuild to root`. Reviewer compares against the `.archive/` directory in the same diff.

**Exit criteria:** `npm install && npm run dev` from a fresh clone runs the shadcn version. Vercel preview deploy looks identical to production.

**Rollback plan:** if a regression is found post-merge, revert the single promotion commit — root returns to the pre-promotion state untouched.

---

## Out of scope for this rebuild

- Feature additions. Anything that isn't in the current app stays out; ship them in follow-up PRs against the new stack.
- Editor engine swap (Monaco stays).
- Routing/state-management libraries (none needed at this size).
- Tests — the current app has none; adding them is a separate initiative.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Monaco / Mermaid SSR errors (they touch `window`) | All view components marked `"use client"`; Monaco loaded via `next/dynamic` with `ssr: false` in Phase 4. |
| Gemini API key wiring breaks | Phase 0 step 5 mirrors the existing env var; Phase 5 step 6 optionally moves it server-side. |
| ASCII pre-React loader lost during root swap | Phase 1 step 6 ports it into `v2/app/loading.tsx` (or inlined in `layout.tsx`) early. |
| `JsonTreeView.tsx` (780 LOC) hides subtle Tailwind class assumptions | Treat Phase 6 as the longest phase; budget extra time for tree view. |
| Visual drift the user dislikes | Phase 1 aliases shadcn tokens to existing accents — drift is opt-in, not default. |
| Vercel framework preset mismatch causes failed deploys | Phase 8 step 5 explicitly flips the preset to Next.js before merge. |

---

## Estimated effort

- Phases 0–2: ~2 hours (scaffolding + theming)
- Phases 3–5: ~4 hours (Toolbar, Editor wiring, AI modal)
- Phase 6: ~3 hours (the three view components)
- Phases 7–8: ~2 hours (polish + promotion)

**Total: ~1.5 focused days.**
