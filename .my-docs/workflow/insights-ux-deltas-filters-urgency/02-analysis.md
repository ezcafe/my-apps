# Analysis: Insights UX deltas, Baby filters, Loans urgency

**Size:** Three solution pieces. Has API **no**. Has DB **no**. Gate A2 HTML locked.

## Deep dive (required)

### Overall

#### What is this?
Chrome-only improvements on three Insights pages: Money expense MoM delta, Baby Care/Growth toolbar filters, Loans overdue/due-this-week urgency strip. Matches approved `ui-refs/_proposed-insights-chrome.html`.

#### Why do we need this?
Without baselines, filters, and urgency, Insights fails day-to-day “at a glance” jobs (Pencil & Paper + DESIGN_GUIDE). Skip → users still see absolute numbers, dead Baby chip state, and loan payoff charts without “act now.”

#### How to do this?
Wire existing helpers and queries — no new GraphQL contracts required.
- **Other ways:** Extend ATF payloads with delta/urgency fields (more server work) — discard for this pass.
- **Best practices:** DESIGN_GUIDE deltas (arrow + % + semantic color); reuse `InsightsDateRangeFiltersBar.multiSelectFilters`; extract shared loan due helpers from home; keep ATF + More pattern.

### Solution pieces

#### Money KPI delta

##### What is this?
Show Expenses MoM under the Expenses KPI on `/money/insights` via existing `AnalyticsStats.expenseMomTrend(column)`.

##### Why do we need this?
Primary Money glance question: up or down vs prior month.

##### How to do this?
- Approach: Lift/reuse `moneyAnalyticsOverview` (already used for net-flow chart) at dashboard level; pass `column` into `AnalyticsStats`. Hide delta when trend helper returns null.
- Other ways: Add `column` to ATF GraphQL — unnecessary duplicate; or compute prior-range on client — worse.
- Best practices: Never color alone; existing MoM helper already encodes direction.

#### Baby Care / Growth filters

##### What is this?
Expose care + growth multi-selects on Baby Insights date toolbar; Apply/Reset update applied chips.

##### Why do we need this?
Chip filtering already runs client-side; without toolbar controls users cannot use it.

##### How to do this?
- Approach: Pass `multiSelectFilters` into `InsightsDateRangeFiltersBar` from draft chip state; map Care/Growth ids via existing `baby-insights-filters` + chrome labels.
- Other ways: Care-only filter — weaker; invent new filter UI — fight skim.
- Best practices: Empty chips = all (current semantics); dirty/Apply like Money.

#### Loans urgency strip

##### What is this?
Default Insights strip: overdue count + due-this-week count + link to `/loans`.

##### Why do we need this?
Loans Insights is monitoring-lite; next-due date alone is not urgency.

##### How to do this?
- Approach: Extract `daysUntilDue` / `isOverdue` / `isDueSoon` from `loans-dashboard.tsx` into shared lib; on Insights, `useQuery(loansListQueryOptions())` and count; render strip above KPIs per HTML (warning tint when overdue &gt; 0; quiet when both zero).
- Other ways: Add counts to `loansInsightsAtf` GraphQL — Has API yes; defer.
- Best practices: Same ≤7 day window as home; empty ≠ error.

## What exists today

Insights stacks share filters → period → KPIs → ATF charts → More. `AnalyticsStats` MoM is dark (no `column`). Baby chips filter series but toolbar never passes `multiSelectFilters`. Loans home already computes overdue/due_soon; Insights ATF has summary only.

## Dependencies

- Money overview query available when workspace ready (same as net-flow card).
- Baby filter labels in `lib/baby-insights-chrome-labels.ts` / messages.
- Loans list query workspace-ready same as Insights ATF.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/analytics-stats.tsx` | MoM delta UI |
| `components/analytics-dashboard.tsx` | Wire `column` into stats |
| `components/baby-insights-dashboard.tsx` | Wire multiSelectFilters |
| `components/analytics-filters.tsx` | InsightsDateRangeFiltersBar API |
| `components/loans-insights-dashboard.tsx` | Urgency strip UI |
| `components/loans-dashboard.tsx` | Due helpers to extract |
| `lib/loans-query-options.ts` | `loansListQueryOptions` |
| `ui-refs/_proposed-insights-chrome.html` | Visual SoT |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| KPI MoM delta line | `analytics-stats.tsx` | Already matches DESIGN_GUIDE |
| Insights multi-select filters | `analytics-filters.tsx` | Same as Money Accounts |
| Loans due math | `loans-dashboard.tsx` (extract) | One definition for home + Insights |
| Quiet empty / status strip | DESIGN_GUIDE + loans home | Urgency without error styling when zero |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Client composition of existing queries | Money overview + loans list | No new server boundary |
| Progressive disclosure ATF | DESIGN_GUIDE Insights | Do not break More insights |

## Constraints and risks

- Fake MoM on non-monthly ranges — trust `expenseMomTrend` null path.
- Extracting due helpers must not change home filter behavior.
- Skeleton parity for urgency strip.

## Settled decisions (do not relitigate)

- Gate A2 HTML approved.
- Expenses-only delta (Open Q1).
- Care + Growth both (Open Q3).
- Overdue + due-this-week (Open Q4).
- Out of scope: CSV, Investments deltas, baby list-chart polish.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| ATF vs overview for column | Need month series for MoM | Overview already has `column`; ATF does not | Keep overview wire; discard ATF extend |

## Blocking questions

None — clear to design.

## Has API / Has DB (for parent)

- **Has API:** no — no new/changed public GraphQL fields this pass.
- **Has DB:** no — no schema/migration/query ownership change.
