# Adding a workspace-backed feature

Use this checklist when introducing a new product area (e.g. Tasks) so it stays consistent with Money and does not break the shell.

## 1. Database and workspace key

1. Add a new key to `WORKSPACE_APP_KEYS` in [`db/schema/workspace.ts`](../db/schema/workspace.ts).
2. Generate and apply a Drizzle migration if schema changes are required for the new domain.

## 2. Shell navigation

1. Open [`lib/features/registry.ts`](../lib/features/registry.ts).
2. Append a **`kind: "feature"`** entry with:
   - `id`, `label`, `href`, `matchPrefix`, `order`
   - **`workspaceAppKey`** (must match the DB key)
   - `icon` — add a new `ShellNavIconId` and wire the SVG in [`components/app-shell.tsx`](../components/app-shell.tsx) (`shellNavIcons` map).

Removing a feature: delete its registry row and its route/API folders; avoid editing unrelated features.

## 3. Routes and layout

1. Add `app/(shell)/<feature>/**` pages (and nested layouts as needed).
2. Add a **client** feature provider under that segment’s `layout.tsx` (same pattern as [`MoneyRouteChrome`](../components/money-route-layout.tsx) + [`MoneyWorkspaceProvider`](../components/money-workspace-provider.tsx)) for:
   - optional first-time setup modals
   - client context (active workspace id, feature-specific defaults)
3. Do **not** mount feature-specific init in [`shell-layout.tsx`](../components/shell-layout.tsx); keep the global shell free of per-feature API calls.

## 4. HTTP API

1. Add `app/api/<feature>/**/route.ts` entrypoints (Next.js requirement).
2. Keep each `route.ts` **thin** — delegate to `features/<feature>/server/...` or `lib/<feature>-...` (see [`features/money/README.md`](../features/money/README.md)).
3. Resolve workspace + membership using the same helpers as existing feature routes (for Money: [`requireMoneyContext`](../lib/api-money.ts); general patterns in [`lib/workspace-context.ts`](../lib/workspace-context.ts)).

## 5. UI and design system

**Read [DESIGN_GUIDE.md](./DESIGN_GUIDE.md) first.** It is the source of truth for tokens, primitives, motion, and layout rules.

- Use semantic tokens from [`app/globals.css`](../app/globals.css) (`bg-surface`, `border-border`, `rounded-[var(--radius-md)]`, `shadow-[var(--shadow-sm)]`, `font-display`, etc.). No hard-coded colors/fonts/radii/shadows.
- Compose UI from [`components/ui/`](../components/ui/) primitives (`Button`, `Field`/`Input`/`Select`/`Textarea`, `Card`, `Modal`, `Popover`, `Tabs`, `Badge`, `Skeleton`, `Alert`). Add a new primitive only if the guide already lacks one — and document it in the design guide.
- Microinteractions: CSS-only utilities (`fx-press`, `fx-fade-in`, `fx-shimmer`, `fx-field`) plus [`withViewTransition`](../lib/microinteractions.ts) for state-driven transitions. No JS animation libs.
- Layout: `shell-main` wrapper + `grid-template-columns: repeat(auto-fit, minmax(min(100%, …), 1fr))` and container queries; do not hardcode breakpoints.
- Charts: visx only (Lightweight Charts allowed for price charts), and always color via `colorByIndex(resolved, i, style)` from [`lib/theme-chart-palette.ts`](../lib/theme-chart-palette.ts) so it tracks the active style preset.
- Verify the feature in light and dark modes via `/settings` before merging.

## 6. Documentation

- Link any feature-specific invariants back to [ARCHITECTURE.md](./ARCHITECTURE.md).
- If you introduce a shared client fetch helper (parallel to `moneyApiJson`), document it in `features/<feature>/README.md` or a central CONVENTIONS doc.

## Verification

- With session: new routes behave with correct active workspace cookie for the new `workspaceAppKey`.
- Without session: public routes still work; no feature init on unrelated pages.
- `npm run lint` passes.
