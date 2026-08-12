# SPEC — Quiet Ink Design System + progressive disclosure

## Objective

Replace the previous Apple × Atom One / Nord look with a cohesive **Quiet Ink** minimal identity, codify minimal-UI principles into the design system, bring every UI surface into compliance, and apply **progressive disclosure** (primary chrome only; secondary under More / About) with faster first paint via code-splitting and **load-on-demand** data fetching matched to the day-to-day spender Money IA.

## Users / Audience

All product UI: Money, Loans, Investments, Savings, Settings, Help, Login, Analytics. Money defaults target a **busy parent** (fast capture + “where did it go?” on mobile); household-CFO surfaces stay optional / disclosed.

## Success criteria

- Quiet Ink tokens (subdued neutral light / Catppuccin Mocha dark) and IBM Plex type load in both modes; restrained dense density (`sm` controls, compact tables/forms) with airy section rhythm.
- [`DESIGN_GUIDE.md`](DESIGN_GUIDE.md) is the single source of truth, including distilled minimal-UI rules, default spender IA, and progressive disclosure.
- Every route under `app/**/page.tsx` and shared components use semantic tokens + `components/ui/*` only — no raw hex, Tailwind radius/shadow presets, or non-token status colors in feature JSX.
- Money tabs: **Spending** (home / `/money` → `/money/spending`), **Add**, **Insights**, **Settings**; optional tabs remain off by default.
- Money filter toolbars show Direction, Accounts, Categories, Apply/Reset (plus Workspace/View when present); Date, Merchants, Tags, Recurrence live under **More**.
- Primary CTAs stay visible; secondary actions use [`MoreMenu`](../components/ui/more-menu.tsx); help copy uses [`AboutDisclosure`](../components/ui/about-disclosure.tsx) (info icon + tooltip).
- Default Insights shows KPIs + spend-by-category + income vs expense; remaining charts behind **More insights** (unmounted until expanded).
- **Default Insights first paint:** summary + distribution only — not full overview, budgets, sankey, or leaders until More insights.
- Heavy chart/modal modules load via `next/dynamic` (chart cards, DivergingBar, LoanProgressChart, bulk-edit modal).
- `npm run lint` and `npm run build` pass; light + dark verified via `/settings`.

## Test plan

- **Static:** grep for forbidden `#hex`, `rounded-md|lg|xl|2xl`, `shadow-sm|md|lg` Tailwind presets outside token sources.
- **Visual:** light + dark on login, Spending (money home), Insights, Add, loan detail, investments, settings.
- **Disclosure:** Analytics/Spending desktop strip = Direction/Accounts/Categories/More/Apply; More opens date + merchants + tags + recurrence; page help is an info-icon tooltip; Insights More insights reveals advanced charts.
- **Network:** Default Insights omit formLookups / full overview / leaders until Add or More insights.
- **Loan:** primary “Add payment to Money”; mark-paid via More; delete via header More.
- **Investments settings:** Refresh quotes in More; create instrument behind “Add instrument”.
- **A11y:** focus rings on new accent; contrast of accent text; `prefers-reduced-motion` disables `fx-*`.
- **Regression:** charts recolor via `colorByIndex(resolved, i, style)` with `style === "quiet"`.
- **Perf smoke:** analytics chart-cards chunk loads after shell; secondary filter fields mount when More opens; deferred analytics queries stay idle until More insights.

## Out of scope

- Figma / Storybook
- Extracting a separate `@repo/ui` package
- Installing Lightweight Charts (visx remains; LC later if needed)
- Marketing landing beyond existing login
- Shrinking money bootstrap payload (accounts/categories stay primary)

## Tech stack

- Next.js App Router, React 19, Tailwind CSS v4 (CSS-first tokens)
- IBM Plex Sans + IBM Plex Mono via `next/font/google`
- CSS-only microinteractions; visx for charts

## Boundaries

- **Always:** tokens + primitives; CSS-only motion; update DESIGN_GUIDE when adding tokens; verify light/dark; keep Apply and primary CTAs visible.
- **Ask first:** new npm UI deps, Storybook, nav IA changes, shrinking money bootstrap.
- **Never:** hard-coded brand hex in feature JSX; Framer Motion; one-off overlays; DropdownMenu parallel to Popover/MoreMenu; hiding Workspace, View, or Apply.
