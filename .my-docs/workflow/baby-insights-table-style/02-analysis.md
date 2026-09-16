# Analysis: Baby Insights table style + default today

## What exists today

Baby Insights (`/baby/insights`) is a client dashboard (`BabyInsightsDashboard`) that already reuses Money-style filter chrome (`InsightsDateRangeFiltersBar`, Care multi-select, growth chips, `AnalyticsPeriodChip`, Card KPIs, visx charts). Care timeline and growth history still render as plain `<ul className="fx-stagger-children divide-y …">` rows — not the shared `Table` shell. Date default is **this calendar month** via `babyInsightsDefaultRange()` → `defaultAnalyticsFilters()`; Apply/Reset both rebuild from that same helper. Filters live in React state only (no `from`/`to` URL query sync today). GraphQL already accepts `from`/`to` on timeline and growth; no new fields are required for a chrome restyle.

Key paths: `app/(shell)/baby/insights/page.tsx`, `components/baby-insights-dashboard.tsx`, `lib/baby-insights-default-range.ts`, `components/baby-page-skeleton.tsx` (`BabyInsightsPageSkeleton`).

## Dependencies

| Area | Must change / stay compatible |
|------|-------------------------------|
| Default range helper + its unit test | Change month → local today; Reset must follow (same `defaultFilterState()`) |
| Dashboard lists UI | Replace both (or scoped) `<ul>` blocks with Table + mobile cards |
| `BabyInsightsPageSkeleton` + route `loading.tsx` | Skeleton list chrome must mirror new table/card layout (zero CLS) |
| i18n | Period chip already formats the applied range; unused/legacy `insights.periodThisMonth` may need a today-friendly string only if still referenced |
| GraphQL / server | Stay compatible — reuse existing `babyTimeline` / `babyGrowthEntries` `from`/`to` |
| Money Transactions / Money Insights defaults | **Do not change** (explicit non-goal) |
| Show-more (DOM cap) + Load more (infinite query) | Keep wiring; only presentation of rows changes |
| E2E (`e2e/baby-care.spec.ts`) | May need asserts for today default + table chrome (not old `<ul>` list) |

No cross-repo dependency. Front-end only for this pass unless Design invents columns the API does not return.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `/Users/ptquang86/ws/my-apps/components/baby-insights-dashboard.tsx` | Live Insights page; list markup + filter/Apply/Reset live here |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-default-range.ts` | Default `fromDate`/`toDate`; change here drives whole page |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-default-range.test.ts` | Existing failing-test target for today default |
| `/Users/ptquang86/ws/my-apps/components/analytics-transactions-table.tsx` | Canonical Transactions table + `@md:hidden` mobile card pattern |
| `/Users/ptquang86/ws/my-apps/components/ui/table.tsx` | Shared Table primitives (shell, header, row hover/selected) |
| `/Users/ptquang86/ws/my-apps/components/money-analytics-skeleton.tsx` | `MoneyAnalyticsTransactionsTableSkeleton` / `MoneyLedgerMobileCardsSkeleton` for CLS parity pattern |
| `/Users/ptquang86/ws/my-apps/components/baby-page-skeleton.tsx` | Insights skeleton still mirrors divide-y lists — must update |
| `/Users/ptquang86/ws/my-apps/app/(shell)/baby/insights/loading.tsx` | Route loading entry |
| `/Users/ptquang86/ws/my-apps/components/loans-dashboard.tsx` | Simpler view-oriented Table + mobile cards **without** sort/bulk (closer to Baby scope) |
| `/Users/ptquang86/ws/my-apps/lib/baby-timeline-row-display.ts` | Existing timeline summary / duration / stop-clock helpers — keep for row cells |
| `/Users/ptquang86/ws/my-apps/lib/baby-query-options.ts` | Timeline/growth infinite queries already keyed by `from`/`to` |
| `/Users/ptquang86/ws/my-apps/lib/money-date-calendar.ts` | `toLocalDateString(now)` for YYYY-MM-DD today |
| `/Users/ptquang86/ws/my-apps/lib/baby-home-day-window.ts` | Existing “local today” window for Home (ISO bounds pattern; Insights uses inclusive end-of-day via `babyInsightsDateBoundsIso`) |
| `/Users/ptquang86/ws/my-apps/docs/DESIGN_GUIDE.md` | Flat table surface, sharp shell, mobile card lists, no Card-around-table |
| `/Users/ptquang86/ws/my-apps/components/analytics-period-chip.tsx` | Period label already reflects applied dates — works for today-only |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Shared `Table` chrome | `components/ui/table.tsx` | DESIGN_GUIDE source of truth; avoids a Baby-only list language |
| Desktop table + mobile cards (`@container` / `@md:`) | `components/analytics-transactions-table.tsx`, also `components/loans-dashboard.tsx` | Exact “Transactions-like” browse feel; no hardcoded breakpoints |
| Flat section (heading + table, no Card wrapper) | DESIGN_GUIDE + Transactions | Idea forbids Card-wrapped event tables |
| View-only table (no sort/bulk/edit) | Prefer `loans-dashboard` shape over full Transactions ledger | Matches non-goals; Baby stays browse |
| Single applied date range for whole page | `BabyInsightsDashboard` draft/applied state | One filter already drives KPIs, charts, lists — do not invent a second default |
| Reset = rebuild defaults | `handleReset` → `defaultFilterState()` | Changing the helper automatically fixes Reset → today |
| DOM show-more + GraphQL load-more | `lib/baby-insights-list-visible.ts` + infinite queries | Keep behavior; restyle rows only |
| Timeline display helpers | `lib/baby-timeline-row-display.ts` | Keep Baby field meanings; map into table cells/cards |
| Skeleton parity | Money table skeleton + `BabyInsightsPageSkeleton` | Mandatory CLS rule for UI changes |
| Local YYYY-MM-DD today | `toLocalDateString` in `lib/money-date-calendar.ts` | Same date string shape as filter inputs |

**Dev-decision-routing note:** context-mode MCP was not available in this session. Local qan `Work/Dev/HTML` is empty; CSS/JS notes are general and do not override this repo’s DESIGN_GUIDE / `components/ui/table.tsx`. Prefer repo patterns above.

## Constraints and risks

- **Visual parity ≠ feature parity:** Do not pull checkbox bulk select, column sort, or Edit row actions from Money unless the user expands scope.
- **Today-only KPIs/charts:** Sparse or empty metrics for a quiet day are expected; empty list must stay “empty,” not a hard error (`babyInsightsSectionState` already separates error vs empty).
- **Skeleton CLS:** Updating lists without updating `BabyInsightsPageSkeleton` (and loading route) will fail the design-system rule.
- **Do not change** `defaultAnalyticsFilters` / Money month default — only Baby’s wrapper `babyInsightsDefaultRange`.
- **Inclusive day bounds:** Insights uses start-of-day → end-of-day ISO (`babyInsightsDateBoundsIso`). Home’s `babyLocalDayWindow` is half-open next-midnight — do not mix them blindly.
- **URL deep links:** There is **no** current `from`/`to` query-param sync on Insights. Open question #5 is either “out of scope / N/A” or a **new** URL feature — Design must not assume bookmarks already work.
- **Mixed chrome risk:** Restyling timeline only leaves growth as `<ul>` on the same page (Gate 2-UI enhancement prefers both).
- **i18n:** Keep Baby VI strings via existing chrome label helpers; do not hard-code Money English.

## Settled decisions (do not relitigate)

- Gate 1 + Gate 2-UI **ok** — idea approved for day-to-day use.
- Goal is **shared Table + mobile card chrome**, not cloning Money columns/actions.
- Baby stays **view** browse (no capture/edit-from-row / bulk tools in this pass).
- Money Transactions and Money Insights defaults are **out of scope**.
- No new care types, Telegram, or capture route work.
- Prefer existing show-more / load-more over inventing Money-style pagination unless the user asks.
- Idea recommendations (unless user overrides): restyle **both** lists; today-only for the **entire** Insights page; Reset → today; deep links override only if URL sync exists/is built.

## Blocking questions

1. **Which lists?** Restyle **timeline only**, **growth only**, or **both**?  
   - Analysis recommendation: **both** (one consistent page; matches Gate 2-UI enhancement).

2. **Parity depth?** Visual chrome only (headers + rows + mobile cards + existing show-more/load-more), or also Money-like **sort / pagination**?  
   - Analysis recommendation: **chrome + existing show-more/load-more** only.

3. **Default today scope?** Apply today-only to **entire Insights** (KPIs + charts + lists), or lists only?  
   - Analysis recommendation: **entire Insights** (one applied range already; split defaults add product complexity). Confirm empty/sparse today KPIs/charts are acceptable.

4. **Row content?** Keep today’s Baby fields (timeline: summary, duration, stop clock, telegram source; growth: kind, value+unit, recorded time), or reshape columns toward Money’s Date / Category / Amount?  
   - Analysis recommendation: **keep Baby fields**, map into Table cells/cards — no fake Money columns.

5. **URL / bookmark?** Today there is **no** `from`/`to` query sync. For this pass:  
   - **Option A:** Client-only default today (no URL work).  
   - **Option B:** Add URL `from`/`to` with override when present.  
   - Analysis recommendation: **Option A** unless you want bookmarkable ranges now (extra scope).

6. **Are the instructions and reference files clear enough to design?**
