# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `pnpm dev` (Next.js + Turbopack)
- **Build / start:** `pnpm build` && `pnpm start`
- **Typecheck:** `pnpm typecheck` (runs `tsc --noEmit`)
- **Lint:** `pnpm lint`
- **Format:** `pnpm format` (Prettier with `prettier-plugin-tailwindcss`)
- **Apply D1 schema (remote):** `pnpm wrangler d1 execute json-forge-shares --remote --file=db/schema.sql`
- **Apply D1 schema (local):** add `--local` instead of `--remote`

There is no test runner in this project — do not invent one. Verify changes with `pnpm typecheck`, `pnpm lint`, and a manual smoke in the browser.

Package manager is **pnpm** (see `pnpm-lock.yaml`). Do not introduce npm/yarn lockfiles.

## High-level architecture

JSON Forge is a Next.js 16 App Router app deployed on Vercel. It is mostly a single-page client app for editing/visualizing JSON, plus a small server surface for AI calls and share-link snapshots.

### Two entry points share the same client app

Both routes render `components/json-forge-app.tsx`, passing different `initialJson`:

- `app/page.tsx` — the home editor, seeded with sample data.
- `app/s/[slug]/page.tsx` — server-rendered share viewer. Loads the snapshot from D1 in the server component, decides found/expired/not-found *outside* the React render path (no `Date.now()` during render), and either calls `notFound()`, renders `ExpiredShareView`, or hands the payload to `JsonForgeApp` with a `sharedSnapshot` prop. The banner inside `JsonForgeApp` uses `suppressHydrationWarning` because date formatting depends on the client locale.

When changing editor behavior, edit `JsonForgeApp` once — both routes pick it up.

### Client state model (`components/json-forge-app.tsx`)

All editor state lives in this one component with React hooks:

- `jsonInput` (immediate) drives the editor; `debouncedInput` (800ms) drives the expensive consumers: `stats`, `error` (validity), Graph view, Table view.
- `searchTerm` (immediate) drives the input; `debouncedSearchTerm` (300ms) drives match highlighting and the Tree/Table search.
- `viewMode` is `"code" | "graph" | "table"`. The Code view is kept mounted but hidden when inactive so Monaco's state survives view switches.

If you add a derived value, hang it off `debouncedInput`, not `jsonInput`, or you will re-trigger heavy work on every keystroke.

### Editor (`components/json-editor.tsx` + `json-editor-inner.tsx`)

`json-editor.tsx` is a `next/dynamic` wrapper with `ssr: false`. The inner file owns the Monaco instance, custom "Vercel Dark/Light" themes, and search-match highlighting. Never import Monaco from a server component or page module.

### Graph view (`components/json-tree-view.tsx`)

Pagination + budget-based expansion (~50 nodes initially, "Show More" for the rest) is the reason large files don't crash. When extending the Graph view, preserve the budget cap — do not render entire arrays/objects synchronously.

### Server surface

All server-only modules import `"server-only"` to crash the build if they leak into a client bundle. Keep that import when adding new server modules under `lib/`.

API routes:

| Route | Notes |
|---|---|
| `POST /api/ai/generate` | NVIDIA chat completion via `lib/nvidia.ts`. Rate-limited (5/hour/IP). |
| `POST /api/ai/fix` | Same, with broken-JSON + error as input. |
| `POST /api/share` | Streams body with a hard byte cap (don't trust Content-Length), validates JSON, inserts into D1. 10/hour/IP. |
| `GET /api/share/[slug]` | Returns `410` once `expires_at < now`. |
| `GET /api/cron/cleanup-shares` | Vercel Cron (daily 04:00 UTC, see `vercel.json`). Requires `Authorization: Bearer $CRON_SECRET`. |

Shared cross-cutting guards every POST route uses:

1. `enforceSameOrigin(request)` (`lib/origin.ts`) — production-only Origin/Referer check against `VERCEL_URL` / `VERCEL_BRANCH_URL` / `VERCEL_PROJECT_PRODUCTION_URL` / `ALLOWED_ORIGIN` / `NEXT_PUBLIC_SITE_URL`. Skipped in dev.
2. `enforceAiRateLimit` / `enforceShareRateLimit` (`lib/ratelimit.ts`) — Upstash fixed-window. **Fails closed in production** if Upstash is missing or times out (returns 503 with `Retry-After`). Set `ALLOW_UNLIMITED_AI=1` to bypass for local prod-mode testing.
3. `getClientIp(request)` only trusts `x-vercel-forwarded-for` on Vercel. Off-Vercel, set `TRUSTED_PROXY=1` to honor `x-forwarded-for` / `x-real-ip`.

Always run new POST routes through the same three guards in the same order.

### NVIDIA AI calls (`lib/nvidia.ts`)

- User text is wrapped in `<USER_INPUT>…</USER_INPUT>` and `sanitizeForPrompt` strips the delimiter tokens from input so users can't break out of the data block.
- The model is forced to `response_format: { type: "json_object" }`, then `validateOutput` parses, checks size (256 KiB) and depth (64), and **re-serializes** to normalize. Any new AI endpoint should keep this validation pipeline — clients trust the output is JSON.
- Default model is `openai/gpt-oss-120b`; override with `NVIDIA_MODEL`.

### Cloudflare D1 (`lib/d1.ts`, `db/schema.sql`)

Vercel-hosted Next.js talks to D1 via REST (not the Workers binding). `lib/d1.ts` exposes `query` / `execute` with a 5s timeout and a typed `D1Error`. The schema is a single `shares` table keyed by a 10-char URL-safe slug from `lib/slug.ts` (64^10 space — no collision-retry loop). `ip_hash` is `sha256("ip:CRON_SECRET").slice(0,16)` for abuse triage; in production we refuse to fall back to a hardcoded salt (returns `null` instead).

If you change the schema, ship a new SQL file *and* run it with `wrangler d1 execute … --remote`. There is no migration framework.

### Path alias

`@/*` resolves to the repo root (`tsconfig.json`). Use `@/components/...`, `@/lib/...` — never relative climbs across top-level dirs.

### Security headers

`next.config.mjs` sets CSP `frame-ancestors 'none'`, `X-Frame-Options: DENY`, and a tight Permissions-Policy on every route. Don't loosen these without a specific reason.

## Conventions worth knowing

- **Telemetry:** `trackEvent(action, params?)` in `lib/utils.ts` calls `window.gtag` when present. Add a `trackEvent` call for any new user-visible action; keep names snake_case (`click_prettify`, `ai_fix`, `share_create_success`).
- **Toasts:** use `sonner`'s `toast.success/info/warning/error`. Don't introduce a second toast library.
- **Icons:** `@hugeicons/react` with named icons from `@hugeicons/core-free-icons`. Pass `className="size-3.5"` etc. — don't import lucide or heroicons.
- **shadcn/ui:** primitives live under `components/ui/`. The project uses the `radix-nova` style with `olive` base color (`components.json`). Run `pnpm dlx shadcn@latest add <component>` to add new ones rather than hand-writing them.
- **Theme:** `next-themes` + a `D` hotkey toggle in `theme-provider.tsx`. Anything that renders differently per theme needs `mounted` gating or `suppressHydrationWarning` to avoid hydration mismatches (see `JsonForgeApp` header).
- **Large-payload routes:** when accepting user JSON over HTTP, replicate the streaming `readBodyCapped` pattern from `app/api/share/route.ts` — do not call `request.text()` directly.

## Environment variables

See `.env.example` for the full list. Key behaviors:

- AI features need `NVIDIA_API_KEY`. Without it, AI endpoints throw at request time.
- Rate limiting needs Upstash creds (either `UPSTASH_REDIS_REST_URL/TOKEN` or `KV_REST_API_URL/TOKEN`). Missing in dev → limits disabled with a warning. Missing in prod → routes fail closed (503).
- Share feature needs all three Cloudflare vars (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_D1_API_TOKEN`).
- Cron cleanup and the `ip_hash` salt both use `CRON_SECRET`.
