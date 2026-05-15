<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Workspace features

Before adding routes, API handlers, or shell navigation for a **product feature** (anything with its own workspace and data):

1. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — shell vs feature layers, workspace cookies, where Money bootstrap runs.
2. Follow [`docs/ADDING_A_FEATURE.md`](docs/ADDING_A_FEATURE.md) — every shipped module uses a `WorkspaceAppKey`, registry entry, scoped layout provider, and thin `app/api` routes.

Money client bootstrap: [`components/money-workspace-provider.tsx`](components/money-workspace-provider.tsx) (only under `app/(shell)/money/`). Shell nav source of truth: [`lib/features/registry.ts`](lib/features/registry.ts).

## UI / design system (mandatory)

Any user-facing change — new pages, components, micro-tweaks — must follow [`docs/DESIGN_GUIDE.md`](docs/DESIGN_GUIDE.md). The shell renders 4 visual presets × light/dark via CSS tokens; if your change does not survive switching presets in `/settings`, it is wrong.

Hard rules:

- Use semantic tokens from [`app/globals.css`](app/globals.css) and primitives from [`components/ui/`](components/ui/). No hard-coded hex, font stacks, `rounded-md`, or `shadow-lg`.
- **Concentric radii**: outer surfaces use `rounded-[var(--radius-md)]`; nested chips/rows/checkbox markers use `rounded-[var(--radius-sm)]`. Never use `rounded-[calc(var(--radius-md)-Xpx)]` — that's a legacy pattern, replaced by `--radius-sm`.
- Microinteractions are CSS-only (`fx-press`, `fx-fade-in`, `fx-stagger-children`, `fx-overlay`, `fx-icon-swap`, `fx-hit-40`, `fx-shimmer`, `fx-field`, View Transitions via [`withViewTransition`](lib/microinteractions.ts)). No motion libs.
- **Transition specificity**: list the exact properties (`transition-[opacity,transform]`, `transition-colors`, `transition-transform`). Never `transition` shorthand or `transition-property: all`.
- **Hit area**: icon-only `Button` callers pass `iconOnly`; raw `<button>`/`<a>` icon-only controls add `fx-hit-40`. Don't let two extended hit areas overlap.
- **Stateful icon swaps**: use the [`IconSwap`](components/ui/icon-swap.tsx) primitive; never toggle visibility for play/pause, copy/check, etc.
- **Globally provided** by `globals.css` (don't repeat per element): `tabular-nums` on body, `text-wrap: balance` on `h1-h3`, `text-wrap: pretty` on body copy, `outline` on `<img>`, `-webkit-font-smoothing: antialiased` on `<html>`.
- Layout uses `repeat(auto-fit, minmax(...))` and container queries; no hardcoded breakpoints for content.
- Charts read `colorByIndex(resolved, i, style)` from [`lib/theme-chart-palette.ts`](lib/theme-chart-palette.ts).
- Verify in all 4 presets × light/dark before merging.

Polish principles applied automatically by tokens/primitives are documented in DESIGN_GUIDE → "Interface-polish principles" (concentric, optical, shadows-over-borders, interruptible, stagger, exits, icons, tabular, text-wrap, image outlines, scale on press, hit area, transition specificity, will-change). Read that table before adding any new interactive element.
