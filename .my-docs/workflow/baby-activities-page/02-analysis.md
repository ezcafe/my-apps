# Analysis: Dedicated Baby Activities page

## What exists today

Baby Care already has an **Activity log** inside `BabyInsightsDashboard` on `/baby/insights`: Money-like selectable ledger (checkbox, ghost Edit, fixed `BabyActivitySelectionBar`, `BabyInsightsEditModal`), merged care + growth via helpers, and `InsightsDateRangeFiltersBar` → `AnalyticsPeriodChip` → charts. Timeline and growth **list** queries only run after the log expands (`activityOpen`). Money Spending (`/money` → `MoneyTransactionsPage`) is the page-chrome reference: filters → period chip → (optional stats) → ledger — Activities must copy that stack **without** the stats strip. Baby section nav has no Activities item yet; `/baby/timeline` and `/baby/growth` permanently redirect to Insights.

## Dependencies

What else must change or stay compatible?

- **Same Baby workspace** — new page under existing `app/(shell)/baby/` + `BabyWorkspaceProvider`; no new `WorkspaceAppKey` / shell registry feature (`docs/ADDING_A_FEATURE.md` / `docs/ARCHITECTURE.md`).
- **Nav / chrome wiring** — `APP_SECTION_NAV.baby` (Activities next to Insights, `group: "review"`), `AppSectionTabIconId` + icon map in `money-section-tabs.tsx`, `resolveBabyAppHeader` + i18n EN/VI, `loading.tsx` + skeleton.
- **Move, don’t duplicate** — remove Activity log panel from Insights; add one-line Activities cue; keep Insights charts / KPIs / More insights.
- **Insights growth charts coupling (critical)** — More insights weight/height/head/temp charts read points from the **growth infinite query**, which today is `enabled: activityOpen`. Removing the log without re-enabling growth fetch on Insights would leave those charts empty. Design must decouple chart data load from the old expand gate (prefer keep/always-enable growth on Insights for charts; Activities loads timeline+growth for the ledger). Same React Query keys can share cache when ranges match.
- **Independent filter state** — Insights keeps its own date + Care filters for charts; Activities gets its own draft/applied filters defaulting to **last 7 days** (`babyInsightsDefaultRange`). Do not share one filter store across pages.
- **Home “too old” pending link** — `baby-home.tsx` links to `/baby/timeline` (→ Insights today). Design should point caregivers at Activities after the move.
- **E2E** — large `e2e/baby-care.spec.ts` suite expands `baby-activity-log` on Insights; must retarget to `/baby/activities` and assert Insights has no log panel + cue present.
- **No Money / GraphQL schema / new bulk APIs** — reuse `POST /api/graphql/baby` timeline, growth, and existing update/delete mutations; multi-delete stays client loop.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-insights-dashboard.tsx` | Host of Activity log + shared Insights filters/charts; extract/move log; drop expand gate; keep series + growth for charts |
| `components/baby-activity-selection-bar.tsx` | Floating Edit / Delete / Clear bar — move with ledger |
| `components/baby-insights-edit-modal.tsx` | Single-row care/growth edit/delete |
| `lib/baby-insights-activity-log.ts` (+ `.test.ts`) | Merge rows, selection keys, prune, delete settle helpers |
| `lib/baby-insights-activity-edit.ts` | Mutation routing for care vs growth |
| `lib/baby-insights-list-visible.ts` | Show-more window cap |
| `lib/baby-insights-default-range.ts` | Last-7-days default for Activities |
| `lib/baby-insights-filters.ts` | Care/growth chip merge/split for Care menu |
| `components/analytics-filters.tsx` (`InsightsDateRangeFiltersBar`) | Locked filter chrome (Date + Care menus + Apply/Reset) — not pill chips |
| `components/analytics-period-chip.tsx` | Always-visible period (#1) under toolbar |
| `components/money-transactions-page.tsx` | Spending stack order + skeleton pattern (no `showSummaryStats` on Activities) |
| `lib/app-section-nav.ts` | Add Activities nav item |
| `lib/baby-app-header.ts` (+ `.test.ts`) | Title / breadcrumbs for `/baby/activities` |
| `components/money-section-tabs.tsx` + `components/icons/icon-baby-nav.tsx` | Nav icon id map |
| `components/baby-page-skeleton.tsx` | Drop Insights collapsed-log skeletons; add Activities skeleton |
| `lib/baby-query-options.ts` | Timeline/growth/series keys, page limits, invalidate helpers |
| `app/(shell)/baby/insights/page.tsx` + `loading.tsx` | Thin Insights route; cue + skeleton update |
| `app/(shell)/baby/` (new `activities/page.tsx` + `loading.tsx`) | New route under existing Baby layout |
| `messages/baby/en.ts` / `vi.ts` | Activities title/nav/cue/empty; keep or alias log strings |
| `next.config.ts` | Existing `/baby/timeline` → Insights redirects — Design pick target |
| `components/baby-home.tsx` | Pending-too-old link currently `/baby/timeline` |
| `e2e/baby-care.spec.ts` | Retarget Activity log flows |
| `docs/DESIGN_GUIDE.md` | Tokens, sharp tables, skeleton parity, light/dark |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Spending page stack | `money-transactions-page.tsx` | Filters → period chip → content; Activities omits summary strip |
| Insights date + Care filter bar | `InsightsDateRangeFiltersBar` | Gate A2 lock — FilterMenu chrome, not solid care-type pills |
| Activity log ledger + selection | Dashboard slice + `BabyActivitySelectionBar` + edit modal | Already Money-parity; move rather than rebuild |
| Merge / selection / list helpers | `lib/baby-insights-activity-log.ts`, `list-visible`, filters, default-range | Unit-tested; keep behavior |
| Baby thin route + client dashboard | `app/(shell)/baby/insights/page.tsx` | Same shape for `/baby/activities` |
| Baby section nav + header | `app-section-nav.ts`, `baby-app-header.ts`, section tabs icons | Required for findability |
| GraphQL via `babyGraphQLRequest` | `lib/baby-query-options.ts` | No new HTTP surface |
| Skeleton parity | `baby-page-skeleton.tsx`, Money analytics skeletons | Zero CLS; Insights drops log block |

**Front-end note:** `dev-decision-routing` wants context-mode MCP for qan `Work/Dev/*`; that namespace is not available in this session — analysis used repo patterns + project docs only.

## Constraints and risks

- Honor skim hard constraints 1–11 (same Baby feature; move not duplicate; reuse log behavior; 7-day default; no summary strip; nav/i18n/icon; Spending stack = filters → period → ledger; fetch without expand gate on Activities; skeleton parity; design tokens; retarget e2e).
- Honor `01b` chrome locks: FilterMenu toolbar, ghost Edit, floating selection bar, cue copy shape under Insights heading.
- **Risk:** Strip timeline/growth from Insights entirely → More insights growth charts break (today tied to `activityOpen`).
- **Risk:** Leave e2e / Home `/baby/timeline` habits on Insights → “missing log” reports.
- **Risk:** Rebuild select/edit instead of move → regressions and scope blow-up.
- **Risk:** Copy Money summary stats or care-type pill row → violates Gate A / A2.
- No new DB tables or GraphQL types expected for this pass.

## Settled decisions (do not relitigate)

- Route `/baby/activities`, nav label **Activities**, `group: "review"` next to Insights.
- Layout IA from Gate A2: **filters toolbar → period chip → selectable ledger** (no KPI/trend strip).
- Filter chrome = `InsightsDateRangeFiltersBar` / Money `FilterMenu` style — **not** solid All/Feed/Sleep pills.
- Table + row Edit + floating bar = Money / existing Baby activity parity (ghost Edit).
- Default range = **last 7 days** (`babyInsightsDefaultRange`); Spending period default out of scope.
- Activity log leaves Insights; Insights gets a quiet one-line cue to Activities (not silent removal).
- Reuse selection bar, edit modal, and activity-log helpers; no Money product changes; no new shell feature.
- UI concept / `ui-refs/` are layout truth for Design — implement wiring around them.

## Blocking questions

**None for Analyze clarity** — idea, skim, Gate A2 UI concept, and repo paths are enough to design.

Design should still pick (not Analyze blockers):

1. **Component shape** — extract a dedicated `BabyActivitiesPage` (move ledger + selection/edit out of the dashboard) vs thin route that mounts a large extracted slice; either way Insights must stop hosting the panel.
2. **Insights list queries after move** — how growth (and optional timeline fallbacks) stay available for More insights charts once `activityOpen` is gone (always-on growth on Insights vs enable when More insights opens; do not leave charts data-dead).
3. **Old URLs / Home link** — keep `/baby/timeline` → Insights, or retarget to Activities; update Home pending “Open the timeline” to Activities.
4. **Activities breadcrumbs** — `01b` says top-level / no crumbs; Insights today uses Home → Insights. Prefer empty crumbs (Home-like) or match Insights pattern.

---

**Clarity check for parent / human:** Are the instructions and reference files clear enough to design?
