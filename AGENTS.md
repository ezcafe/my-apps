<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Communication, writing & decision standards

### Plain and simple language
- **Everyday words**: Always use simple, plain words for comments, documents, plans, logs, and chat/console interactions. Avoid dense jargon, buzzwords, or convoluted phrasing.
- **Direct & clear**: Keep sentences short and clear. Write so any developer can understand immediately without rereading.

### Developer eye flow & visual hierarchy
- **Scannable layout**: Organize content following natural reading eye flow (top-to-bottom, left-to-right).
- **Lead with key points**: Put conclusions, core takeaways, and action items first.
- **Clear structure**: Use concise section headers (`##`, `###`), short paragraphs (1–3 sentences), and bullet points with leading **bold labels** to guide the eye.

### Decision options format
Whenever presenting options for decisions or architectural choices:
- **Explanation**: Provide a clear, plain-language explanation for each option (what it does and why).
- **Concrete examples**: Always include a concrete example for every option (code snippet, config, data structure, or command).
- **Pros & cons**: List explicit pros and cons for each option.
- **Recommendation**: Clearly indicate the recommended choice and the reason behind it.

## Workspace features

Before adding routes, API handlers, or shell navigation for a **product feature** (anything with its own workspace and data):

1. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — shell vs feature layers, workspace cookies, where Money bootstrap runs.
2. Follow [`docs/ADDING_A_FEATURE.md`](docs/ADDING_A_FEATURE.md) — every shipped module uses a `WorkspaceAppKey`, registry entry, scoped layout provider, and thin `app/api` routes.

Money client bootstrap: [`components/money-workspace-provider.tsx`](components/money-workspace-provider.tsx) (only under `app/(shell)/money/`). Shell nav source of truth: [`lib/features/registry.ts`](lib/features/registry.ts).

## UI / design system (mandatory)

Any user-facing change — new pages, components, micro-tweaks — must follow [`docs/DESIGN_GUIDE.md`](docs/DESIGN_GUIDE.md). The shell uses the **clean-minimal** preset (`data-style="quiet"`) with a **teal accent** light palette and **neutral dark** + teal; if your change does not survive switching light/dark in `/settings`, it is wrong.

Hard rules:

- Use semantic tokens from [`app/globals.css`](app/globals.css) and primitives from [`components/ui/`](components/ui/). No hard-coded hex, font stacks, `rounded-md`, or `shadow-lg`.
- **Concentric radii**: outer surfaces use `rounded-[var(--radius-md)]`; nested chips/rows/checkbox markers use `rounded-[var(--radius-sm)]`. Never use `rounded-[calc(var(--radius-md)-Xpx)]` — that's a legacy pattern, replaced by `--radius-sm`. Tables stay sharp (no radius).
- Microinteractions are CSS-only (`fx-press`, `fx-fade-in`, `fx-stagger-children`, `fx-overlay`, `fx-icon-swap`, `fx-hit-40`, `fx-shimmer`, View Transitions via [`withViewTransition`](lib/microinteractions.ts)). No motion libs.
- **Transition specificity**: list the exact properties (`transition-[opacity,transform]`, `transition-colors`, `transition-transform`). Never `transition` shorthand or `transition-property: all`.
- **Hit area**: icon-only `Button` callers pass `iconOnly`; raw `<button>`/`<a>` icon-only controls add `fx-hit-40` (≥44×44). Don't let two extended hit areas overlap.
- **Stateful icon swaps**: use the [`IconSwap`](components/ui/icon-swap.tsx) primitive; never toggle visibility for play/pause, copy/check, etc.
- **Globally provided** by `globals.css` (don't repeat per element): `tabular-nums` on body, `text-wrap: balance` on `h1-h3`, `text-wrap: pretty` on body copy, `outline` on `<img>`, `-webkit-font-smoothing: antialiased` on `<html>`.
- Layout uses `repeat(auto-fit, minmax(...))` and container queries; no hardcoded breakpoints for content.
- Charts read `colorByIndex(resolved, i, style)` from [`lib/theme-chart-palette.ts`](lib/theme-chart-palette.ts).
- **Skeleton parity (mandatory)**: Whenever making any UI change (layout structure, filters, KPIs, charts, tables, cards, or forms), you MUST update the corresponding loading skeletons (`components/*skeleton*.tsx`, `app/**/loading.tsx`, Suspense fallbacks) in the same change so element order, layout grid, and radii mirror the live UI with zero CLS.
- Verify in light and dark modes before merging.

Polish principles applied automatically by tokens/primitives are documented in DESIGN_GUIDE → "Interface-polish principles" (concentric, optical, shadows-over-borders, interruptible, stagger, exits, icons, tabular, text-wrap, image outlines, scale on press, hit area, transition specificity, will-change). Read that table before adding any new interactive element.

Interaction patterns (error, success, empty, loading, search, breadcrumbs, dashboards) are also in DESIGN_GUIDE. Match feedback scale to stakes; every action needs a visible reaction; empty is not an error; crumbs are location-based from the section origin.

## Database / Drizzle (postgres.js)

This app uses **postgres.js** via Drizzle (`db/index.ts`, `prepare: false`). Do **not** bind JavaScript arrays as PostgreSQL array parameters in raw `sql` templates:

```ts
// BAD — single-element arrays bind as a plain string; PG error 22P02
sql`WHERE id = ANY(${ids}::uuid[])`

// GOOD — Drizzle query builder
.where(inArray(table.id, ids))

// GOOD — raw SQL when no schema: expand scalars
sql`WHERE id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`
```

ESLint flags `sql` templates whose quasi immediately after an interpolation starts with `::type[]` (e.g. `${ids}::uuid[]`). Prefer `inArray()` or `sql.join` over `ANY(${array}::…[])`.

Money amounts (`*_minor` columns) are **`bigint` in Postgres**. Never cast `SUM` / `COALESCE(SUM(…), 0)` of those columns to `::int` — large loans or VND totals exceed int4 (~2.1B) and fail with PG error `22003`:

```ts
// BAD
sql<number>`COALESCE(SUM(${loanScheduleInstallment.principalMinor}), 0)::int`

// GOOD — keep bigint (or omit cast; PG preserves bigint)
sql<number>`COALESCE(SUM(${loanScheduleInstallment.principalMinor}), 0)::bigint`

// GOOD — counts are fine as int
sql<number>`count(*)::int`
```

ESLint flags `sql` templates that contain both `SUM` and `)::int`.
