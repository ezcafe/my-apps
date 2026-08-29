# SPEC — Clean-minimal Design System + progressive disclosure

## Objective

Replace Quiet Ink (blue accent, IBM Plex, Catppuccin Mocha) with a cohesive **clean-minimal** identity (teal accent, Inter, off-white / neutral-dark), bring every UI surface into compliance, and keep **progressive disclosure** (primary chrome only; secondary under More / About) with faster first paint via code-splitting and **load-on-demand** data fetching matched to the day-to-day spender Money IA.

## Users / Audience

All product UI: Money, Loans, Investments, Savings, Settings, Help, Login, Analytics. Money defaults target a **busy parent** (fast capture + “where did it go?” on mobile); household-CFO surfaces stay optional / disclosed.

## Success criteria

- Clean-minimal tokens (teal light / neutral-dark) and Inter type load in both modes; 8px spacing rhythm with readable density and airy section gaps.
- [`DESIGN_GUIDE.md`](DESIGN_GUIDE.md) is the single source of truth, including distilled minimal-UI rules, default spender IA, progressive disclosure, and interaction patterns (error/success/empty/loading/search/breadcrumbs/dashboards).
- Every route under `app/**/page.tsx` and shared components use semantic tokens + `components/ui/*` only — no raw hex, Tailwind radius/shadow presets, or non-token status colors in feature JSX.
- Money tabs: **Spending** (home `/money`), **Add**, **Insights**, **Settings**; optional Bills / Savings / Import stay off by default. Investments (`/investments`) and Loans (`/loans`) are shell features, not Money tabs.
- Money filter toolbars show Direction, Accounts, Categories, Apply/Reset (plus Workspace/View when present); Date, Merchants, Tags, Recurrence live under **More**. Investments and Loans Insights use the same toolbar chrome with **date range only** (Apply/Reset).
- Primary CTAs stay visible; secondary actions use [`MoreMenu`](../components/ui/more-menu.tsx); help copy uses [`AboutDisclosure`](../components/ui/about-disclosure.tsx) (info icon + tooltip).
- Unified [`PageHeading`](../components/page-heading.tsx) (Tailwind Plus page heading) on all shell routes: hamburger + title + responsive primary CTA (icon-only on mobile, icon + text on `sm+`); breadcrumbs above title when nested; primary CTA in the header on all breakpoints (no sticky mobile Add bar).
- Default Insights shows KPIs + spend-by-category + income vs expense; remaining charts behind **More insights** (unmounted until expanded).
- Investments Insights (`/investments/insights`) shows results + allocation on first paint; extra journal charts and holdings tables behind **More insights**.
- Loans Insights (`/loans/insights`) shows remaining + paid principal vs interest on first paint; combined payoff and LTV behind **More insights**.
- **Default Insights first paint:** summary + distribution only — not full overview, budgets, sankey, or leaders until More insights.
- Heavy chart/modal modules load via `next/dynamic` (chart cards, DivergingBar, LoanProgressChart, bulk-edit modal).
- Data tables use [`components/ui/table.tsx`](../components/ui/table.tsx): sticky headers, frozen identity columns where useful, matched header/cell alignment (no center), hairline rows (no zebra), hover/focus row actions with touch fallback; settings entity editors remain divide-y lists.
- Feedback uses the channel that matches stakes: field errors inline, blocking issues in `Alert`, routine mutations via `useNotify()`, destructive confirms in `Modal`. Copy goes through `toUserFacingMessage`; success names the object. Empty states use `AnalyticsEmptyState` (not error chrome). Nested pages use location breadcrumbs from the section origin.
- `npm run lint` and `npm run build` pass; light + dark verified via `/settings`.

## Test plan

- **Static:** grep for forbidden `#hex` (except token sources), `rounded-md|lg|xl|2xl`, `shadow-sm|md|lg` Tailwind presets outside token sources, `#356089`, `IBM Plex Sans` in UI.
- **Visual:** light + dark on login, Spending (money home), Insights, Add, loan detail, investments, settings.
- **Disclosure:** Analytics/Spending desktop strip = Direction/Accounts/Categories/More/Apply; More opens date + merchants + tags + recurrence; Investments/Loans Insights strip = Date/Apply/Reset; page help is an info-icon tooltip; Insights More insights reveals advanced charts.
- **Network:** Default Insights omit formLookups / full overview / leaders until Add or More insights. Investments Insights omit `investmentInsightsMore` / holdings / open activities until More insights. Loans Insights omit `loansInsightsMore` until More insights.
- **Loan:** primary “Add payment to Money”; mark-paid via More; delete via header More.
- **Investments settings:** Kind / Currency / Account / Profit / Loss use money/new chip pickers; instruments are identified by Symbol (no Name); kinds are Stocks, Fx, Coins, Commodities. Refresh quotes stays on the instruments form.
- **A11y:** focus rings on teal accent; contrast of accent text; `prefers-reduced-motion` disables `fx-*`; touch targets ≥44×44.
- **Feedback:** Add transaction shows a named success toast (not “Success”); invalid amount is inline, not only a toast; empty Insights is `AnalyticsEmptyState` with an Add CTA; loan detail has location crumbs `Loans / {name}`.
- **Regression:** charts recolor via `colorByIndex(resolved, i, style)` with `style === "quiet"`.
- **Perf smoke:** analytics chart-cards chunk loads after shell; secondary filter fields mount when More opens; deferred analytics queries stay idle until More insights.
- **Tables:** Spending ledger sort/select/bulk + hover Edit; loans freeze + hover Pay/View; installments sticky scrollport; holdings not Card-wrapped; horizontal freeze on identity columns.

## Out of scope

- Figma / Storybook
- Extracting a separate `@repo/ui` package
- Installing Lightweight Charts (visx remains; LC later if needed)
- Marketing landing beyond existing login
- Shrinking money bootstrap payload (accounts/categories stay primary)
- Table column manager, density toggle, inline cell edit, expandable rows, view-pref persistence
- Adding 768/1024 content breakpoint grids (keep auto-fit / container queries)

## Tech stack

- Next.js App Router, React 19, Tailwind CSS v4 (CSS-first tokens)
- Inter + IBM Plex Mono via `next/font/google`
- CSS-only microinteractions; visx for charts

## Boundaries

- **Always:** tokens + primitives; CSS-only motion; update DESIGN_GUIDE when adding tokens; verify light/dark; keep Apply and primary CTAs visible.
- **Ask first:** new npm UI deps, Storybook, nav IA changes, shrinking money bootstrap, restoring Mocha, dropping Inter for system-only fonts.
- **Never:** hard-coded brand hex in feature JSX; Framer Motion; one-off overlays; DropdownMenu parallel to Popover/MoreMenu; hiding Workspace, View, or Apply; `transition: all`; purple/rainbow gradients.
