# Idea: Insights UX — KPI deltas, Baby filters, Loans urgency

**Project shape:** Next.js multi-app shell (Money, Investments, Loans, Baby). Insights pages already follow DESIGN_GUIDE dashboard rules (filters → period → KPIs → ATF charts → More insights) and cite Pencil & Paper patterns. Gaps from a UX review: missing KPI baselines, Baby chip filters not in the toolbar, Loans Insights underplays “act now.”

## Problem

Insights pages look complete but fail three day-to-day jobs:

1. **Money Insights** — KPI cards show absolute totals with no vs-prior baseline. `AnalyticsStats` already has MoM expense trend logic when given a `column`, but Insights never passes it. Numbers feel random (Pencil & Paper “comparisons lacking”).
2. **Baby Insights** — care/growth chip filter state and series filtering exist, and `InsightsDateRangeFiltersBar` supports `multiSelectFilters`, but the dashboard never wires them. Parents cannot narrow charts by Feed/Sleep/Diaper or growth kinds from the toolbar.
3. **Loans Insights** — default KPIs are Remaining / obligation / APR / next due. Next due is a date, not urgency. Overdue / due-soon filters exist on the Loans home, but Insights does not surface “what needs attention now.”

## User / audience

- **Primary:** Busy parents using Money Insights to sense spend change; caregivers using Baby Insights to scan care patterns; households using Loans Insights to avoid missed payments.
- **Secondary:** Partners who open Insights once a week and need baselines / urgency without learning every chart.
- **Not this pass:** Power analysts, CSV export workflows, Investments P&L deep-dive, Baby chart rebuild for awake/diaper lists.

## Outcome

What “done” looks like:

1. **Money Insights** — at least one KPI (Expenses, preferably) shows a relative delta vs prior month (or prior comparable period) with direction + semantic color + text (never color alone), using existing `AnalyticsStats` patterns.
2. **Baby Insights** — Care and Growth multi-selects appear on the Insights date toolbar (same pattern as Money Accounts filters). Applying filters updates charts/KPIs that already honor chips; Reset restores empty chip selection + default range.
3. **Loans Insights** — default view shows an urgency strip (overdue count and/or due-this-week) above or as part of the KPI band, with a clear path to the loan list/detail. Payoff charts stay secondary; More insights unchanged in spirit.
4. Skeletons and loading stay in stack parity; light + dark remain correct. No new default charts; no dashboard builders.

## Metric

**Primary signal:** On each of the three pages, a user can answer one question in one glance without expanding More insights:

- Money: “Did expenses go up or down vs last month?”
- Baby: “Can I filter to sleep-only (or feeds) without leaving the page?”
- Loans: “Do I have anything overdue or due this week?”

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — three small chrome deltas on existing Insights shells (not a redesign). Prefer one HTML with three panels (Money / Baby / Loans) matching real chrome size/positions/texts.
- **Copy/token-only?** no

## 80/20 UI (day-to-day)

### Main user goals

- Sense spend change on Money Insights without digging into More charts.
- Narrow Baby Insights to the care type they care about today.
- Spot loan payment urgency before reading payoff charts.

### Vital few (high-impact ~20%)

1. Expense MoM (or equivalent) delta on Money KPI strip.
2. Working Care (+ Growth) filters on Baby Insights toolbar.
3. Overdue / due-soon strip on Loans Insights default view.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Money — KPI delta on Expenses (or Net if Design proves better). Loans — overdue / due-soon urgency. Baby — Care filter control on the filter bar (when relevant types exist).
- **Important info / action #2 (always visible):** Money — existing ATF charts stay. Loans — Remaining (or next due) still visible beside urgency. Baby — default Hydration + Night Rest charts still primary content after filters.
- **Core action placement:** Deltas inline under KPI values (existing MoM pattern). Filters in existing Insights date toolbar. Urgency in KPI band top-left (F-pattern).
- **Secondary actions:** More insights teasers; Baby growth filters if Care is the vital few; CSV export; Investments deltas; awake/diaper chart polish — deferred.

### Top user journey to optimize

Open Insights → see baseline/urgency/filter chrome → optionally Apply date/chips → optional More insights.

### Sensible defaults

- Money: default date range unchanged; delta appears when prior-month data exists, else hide (no fake 0%).
- Baby: empty care/growth selection = all types (current behavior); default date range last 7 days unchanged.
- Loans: urgency strip shows 0 / empty quietly when nothing is due (not an error).

### Biggest usability risks to fix first

- Fake or confusing deltas when range is not monthly.
- Wiring Baby filters that wipe charts unexpectedly.
- Urgency that looks like an error empty state.
- Crowding KPI band so ATF charts lose scan priority.

## Non-goals

- CSV / raw export from Insights.
- Investments Insights KPI deltas this pass.
- Baby awake-trend / diaper-output chart rebuild.
- New chart types, dashboard rearrange, rainbow status palettes.
- Changing Money/Baby/Loans home pages beyond shared components reused by Insights.
- Medical advice copy changes on Baby alerts.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Money ATF (or nearby query) can supply month column / prior period for MoM | Likely | Payload lacks column | Add thin prior-range field in Analyze or compute from overview line |
| Empty Baby chips = “all” is already correct | Yes for continuity | Product wants explicit “all selected” | Change chip semantics in Design |
| Overdue / due-soon can be derived from existing loan summaries | Likely (home already does) | Insights ATF lacks per-loan nextDue | Extend ATF or reuse list query |
| Three surfaces in one pass is still one product idea | Yes for 80/20 | Scope too wide | Split Loans urgency to a follow-up |

## What we should not build

- Deltas on every KPI card if one clear Expenses delta is enough.
- Extra Baby filter chrome outside the shared Insights toolbar.
- Stoplight-only urgency without text counts.

## Success criteria

- [ ] Money Insights Expenses (or chosen KPI) shows relative delta with arrow + % + semantic text color when prior data exists; otherwise no fake delta.
- [ ] Baby Insights toolbar exposes Care multi-select (and Growth if Design keeps both); Apply/Reset update applied chips; charts honor chips.
- [ ] Loans Insights default view shows overdue and/or due-this-week with plain counts and a link/path to act; zero state is quiet.
- [ ] Unit tests for delta helper / chip wiring / urgency counts; e2e covers Money delta visibility, Baby filter apply, Loans urgency strip.
- [ ] Skeleton parity on touched stacks; light + dark OK.
- [ ] No new always-on charts; More insights pattern preserved.

## Open questions

1. **Money delta target** — Expenses MoM only, or also Net / Income? Prefer Expenses only for 80/20.
2. **Money delta period** — vs prior calendar month vs prior equal-length window when custom range is selected?
3. **Baby Growth filter** — ship Care only this pass, or Care + Growth together (toolbar already supports multi filters)?
4. **Loans urgency** — overdue count only, or overdue + due-within-7-days? Prefer both if cheap from existing data.
5. **Has API** — may stay no if MoM uses existing overview/ATF fields; refine in Analyze.
