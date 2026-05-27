# JSON Forge — Audit: What to Add / Improve

A read-only audit of the current codebase, calibrated against what is already implemented. Use this as a backlog to triage; the "Top 10 quick wins" at the bottom is the recommended ordering for value-per-effort.

---

## A. Editor (Monaco) — `components/json-editor-inner.tsx`, `components/toolbar.tsx`

- **JSON Schema validation + autocomplete** — Monaco ships `monaco.languages.json.jsonDefaults.setDiagnosticsOptions({ schemas: [...] })`. Let users paste a schema URL or `$schema` and get squiggles + intellisense. Highest-leverage editor feature this app is missing.
- **Diff view between two JSONs** — Add a fourth view ("Compare") backed by `monaco-diff-editor`. The "did the API response change?" use case is huge and free given Monaco.
- **JSONPath / jq query bar** — A small input above the editor: `$.users[?(@.active)].email`. Returns matches, optionally pipes the result back into the editor. Library: `jsonpath-plus` (small) or `jq-web` (heavier).
- **Sort keys (alphabetical, deep)** — Single toolbar action; deterministic JSON is great for diffing/version control. ~20 lines.
- **Fold-all / unfold-all + collapse-to-depth-N** — Monaco exposes `editor.trigger('', 'editor.foldAll')`. The depth-N variant is one extra Monaco call. Cheap, very useful for 1k+ line files.
- **"Convert from JSON5 / JSONC / unquoted"** — Many users paste JS object literals or commented JSON and hit "invalid". A lenient parser (`json5`) + repair button beats AI Fix for the common case (no rate limit, instant).
- **Word wrap toggle** — Monaco's `wordWrap` option; one keybinding (`Alt+Z`). Long single-line minified JSON is currently a horizontal-scroll nightmare.
- **Find-and-replace** — Monaco has `Ctrl+H` built in; verify it's not being swallowed and surface a hint in the toolbar tooltip.
- **JSON path breadcrumb in status bar** — When cursor moves, show `$.users[3].address.city`. `json-source-map` makes this trivial. Combine with "Copy path" button.

## B. Graph view — `components/json-tree-view.tsx` (1022 LOC)

- **Right-click context menu on a node**: Copy path, copy value, copy subtree as JSON, "scroll Code view to this line". Missing today; the value is enormous because the graph view is otherwise read-only.
- **Collapse-to-depth selector** — Toolbar already has expand-all/collapse-all (lines 826, 837). Add a depth dropdown (1–5). Removes the constant "Show More" clicking on wide arrays.
- **Breadcrumb above the canvas** showing the focused node's path. Click a segment to pan there.
- **Minimap / overview** — A 200×150 thumbnail in the corner with a viewport rectangle. For large graphs the current pan+zoom alone is hard to orient.
- **Export current view as SVG/PNG** — `dom-to-image` or canvas. Often the reason people open a JSON visualizer is to screenshot it for a slide.
- **Type filter** — Toggle pills: "hide nulls", "hide empty arrays/objects". Strong noise reduction for API dumps.

## C. Table view — `components/json-table-view.tsx` (480 LOC)

- **Sortable columns** — Click header for asc/desc. Standard table affordance, currently absent.
- **Column visibility + reorder** — Popover with checkboxes. Big API responses have 30+ columns; users want 5.
- **Export current table as CSV/TSV** — One button. The "JSON → CSV" tool category is a Google search staple; we'd own it for free here.
- **Pagination / virtualization for large arrays** — A 10k-row array currently mounts in one go. `@tanstack/react-virtual` or simple pagination chip.
- **Inline drill-in for nested cells** — Cell containing an object shows a "{…}" chip that expands to a sub-table in place.
- **Column type inference badge** — Tiny "string | number | date" pill in the header makes mixed columns obvious.

## D. Import / export / interop — `components/json-forge-app.tsx:192-223`

- **Fetch-from-URL import** — A button "Load from URL", proxied through a small server route to dodge CORS. Top user request for tools like this.
- **JSONL / NDJSON** — Detect `\n`-delimited JSON on paste/upload and offer "treat each line as a row". Critical for log/data-science users.
- **YAML / TOML / CSV ↔ JSON** — `js-yaml`, `@iarna/toml`, `papaparse` are tiny. Adds a wide audience without changing the core editor.
- **Accept more upload types** — `toolbar.tsx:172` limits `accept=".json,application/json"`. Allow `.txt`, `.jsonl`, `.yaml`, `.toml`, `.csv` (with conversion).
- **Streaming parser for large files** — Current `FileReader.readAsText` + warn at 5MB / hard cap at 25MB. For 100MB+ logs, integrate `stream-json` and present an "indexed view" instead of in-memory parse.
- **"Open shared snapshot in editor" button** on `/s/<slug>` to fork into a fresh `/` session with the snapshot prefilled. Currently you can only view/edit-locally.

## E. AI features — `lib/nvidia.ts`, `lib/ai.ts`, `app/api/ai/*`

Wired today: generate, fix, with `(N/5)` quota visible (`json-forge-app.tsx:443`). Worth adding:

- **AI → TypeScript types / Zod schema / Python dataclass / Go struct** — Take current JSON, return a typed schema. Highest-value AI feature this app is missing; aligns with the existing `response_format: json_object` pattern (just constrain to a "code" string field).
- **AI → JSON Schema** — Infer a schema from sample data. Pairs naturally with (A)'s schema-validation feature.
- **AI Explain / Summarize** — "What is this JSON?" returning a short prose summary. Cheap to add, popular with API-debug users.
- **AI Redact PII** — One-shot mask of emails/SSNs/tokens before sharing. Excellent pre-share button.
- **AI Mock-data expander** — "Give me 50 more rows like this." Targets the exact prompt people currently use Generate for.
- **Multi-turn refinement** — Today each AI call is one-shot. A small chat-style affordance in the AI modal (3–4 turns max, capped) would let users iterate ("now add a `createdAt` field").

## F. Sharing — `app/api/share/route.ts`, `lib/share.ts`, `components/share-modal.tsx`

Today: D1-backed, 30-day expiry, 10/hr/IP, QR code. Worth adding:

- **Expiry selector** in the share modal (1h / 1d / 7d / 30d). Schema already has `expires_at`; just take a TTL parameter in the POST body.
- **Read-only vs editable flag** — Today shared viewers can edit (banner says "edits stay local"). For sensitive payloads, creators may want the viewer to literally not be able to mutate. One bool column.
- **Password-protect shares** — Store a bcrypt hash; gate `/s/[slug]` behind a password form server-side. Same D1 table.
- **"Reveal raw JSON" endpoint at `/s/[slug]/raw`** returning `application/json` so the share link is `curl`-able. Cheap, hugely valuable for API mocking.
- **Share management for the creator** — Sign a creator cookie on POST, list & delete from `/shares`. Avoids needing auth.
- **Custom slug (premium-feeling)** — Optional pretty-slug field, check uniqueness, fall back to random.

## G. Persistence / local library — there's none today

- **Auto-save current editor to IndexedDB** — Reload-safety. The single most common "lost my work" complaint for client-only tools. Indicate "saved" in the status bar.
- **Recent snapshots dropdown** — Keep the last 10 distinct documents (by hash) in IndexedDB; show titles inferred from the JSON. Lets users flip between API responses without manual re-paste.
- **Named local "documents" / "scratchpads"** — Save with a title, list in a left rail, delete. Treat it as an offline-first equivalent of `/s/[slug]` without server round-trips.
- **Cross-tab sync via `BroadcastChannel`** — Editing in tab A reflects in tab B. Tiny code, very polished UX.

## H. Keyboard shortcuts

Today: `Cmd/Ctrl+K` (search focus, `toolbar.tsx:73`), `D` (theme toggle, `theme-provider.tsx:37`). Tree view has arrow-key handler at `json-tree-view.tsx:698`. Missing:

- **`?` opens a shortcut cheatsheet modal** — Discoverability for everything below.
- **`Cmd+1/2/3`** — Switch Code / Graph / Table.
- **`Cmd+Shift+F`** — Prettify. **`Cmd+Shift+M`** — Minify.
- **`Cmd+S`** — Copy share link (creates one if missing).
- **`Cmd+E`** — Export download. **`Cmd+O`** — Open file picker.
- **`Cmd+/`** — Open AI modal (or AI Fix if invalid). Today the AI button has no shortcut.
- **`Esc`** — Already closes Radix dialogs; verify it also blurs/clears search.

## I. Accessibility & mobile

- **Mobile-first layout** — The toolbar is `overflow-x-auto` and ToggleGroup labels are hidden under `sm` (`json-forge-app.tsx:403,411,419`). The graph and table views are _unusable_ on phones because of pan + tiny cells. Either offer a collapsed "compact mobile" mode or surface a banner: "Open on desktop for full features".
- **`aria-live` for the validation error** — Today `StatusBar` shows it visually; assistive tech doesn't hear "Invalid JSON" without polite announcement.
- **Tree view keyboard focus ring** — `handleKeyDown` exists at `json-tree-view.tsx:698` but verify focus visibility on Tab and that Space/Enter expand nodes.
- **`prefers-reduced-motion`** — The drag overlay (`animate-in fade-in duration-200`) and graph transitions should respect it.

## J. Telemetry — already strong; small gaps

Tracked today (24 call sites): `change_indentation`, `click_prettify`, `click_minify`, `click_copy`, `click_clear_attempt/cancel/confirm`, `click_export`, `click_export_invalid`, `click_import`, `ai_generate`, `ai_fix`, `share_create_attempt/success/failure`, `share_link_copy`, `switch_view`, `graph_zoom_in/out`, `graph_reset_scale`, `graph_fit_screen`, `graph_expand_all`, `graph_collapse_all`.

Missing:

- `theme_toggle` (D key + button click, `theme-provider.tsx` + `json-forge-app.tsx:451`).
- `search_used` (debounced search firing with non-empty term — currently invisible whether anyone uses search).
- `table_*` events — no table interactions are tracked at all; you'll have a blind spot on whether table view is ever used after switch.
- `drag_drop_import` separate from `click_import` (currently both flow through one event, `json-forge-app.tsx:193`).
- `invalid_json_observed` (debounced) — how often users have invalid input is a leading indicator for AI Fix demand.
- `ai_quota_exhausted` — currently you can't tell if users are bouncing off the 5/hour cap.
- `share_view` on `/s/[slug]` server-render — you have zero data on whether shared links are ever opened.

## K. REBUILD_PLAN status

`REBUILD_PLAN.md:17` — "Phase 8 complete. Rebuild finished." Everything in that doc is done. **Recommend renaming or archiving it** (e.g., `docs/ARCHIVE_REBUILD.md`) to avoid future confusion; the table of phases reads like in-flight work but is actually a completed retrospective.

---

## Top 10 quick wins (high value, low effort)

1. **AI → TypeScript / Zod / JSON Schema generator** — biggest "wow, I'll bookmark this" feature; reuses existing AI pipeline. (E)
2. **Diff view (Monaco diff-editor) as 4th view mode** — near-zero code, opens a major new use case. (A)
3. **Sort keys + word-wrap toolbar buttons** — both ~20 LOC, both daily-driver utilities. (A)
4. **Collapse-to-depth-N control in Graph view** — fixes the #1 friction with deep JSONs. (B)
5. **Sortable column headers + CSV export in Table view** — table view becomes 3× more useful. (C)
6. **JSONL/NDJSON + YAML import** — small libraries, huge audience expansion. (D)
7. **Auto-save to IndexedDB + recent documents dropdown** — eliminates the worst-case "lost my work" experience. (G)
8. **Keyboard cheatsheet on `?` + `Cmd+1/2/3` view switching** — discoverability and power-user feel for ~50 LOC. (H)
9. **Share expiry selector + read-only flag** — purely additive on existing D1 schema, big perceived-trust upgrade. (F)
10. **Track `search_used`, `theme_toggle`, table interactions, `share_view`** — fixes existing observability blind spots in 30 minutes. (J)
