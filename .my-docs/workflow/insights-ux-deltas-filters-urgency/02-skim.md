# Light repo skim: insights-ux-deltas-filters-urgency

**Result:** done  
**Updated:** 2026-09-27

## Project shape (1–3 sentences)

Next.js shell with Money / Investments / Loans / Baby Insights dashboards sharing filter chrome, KPI cards, chart cards, and “More insights” progressive disclosure. DESIGN_GUIDE already encodes Pencil & Paper dashboard rules. Baby Insights has chip filter helpers and series filtering; toolbar multi-selects are not wired.

## Related existing UI / screens

| Surface | Path / component |
|---------|------------------|
| Money Insights | `app/(shell)/money/(tabs)/insights/page.tsx` → `AnalyticsDashboard` |
| Baby Insights | `app/(shell)/baby/insights/page.tsx` → `BabyInsightsDashboard` |
| Loans Insights | `app/(shell)/loans/insights/page.tsx` → `LoansInsightsDashboard` |
| KPI deltas helper | `components/analytics-stats.tsx` (`expenseMomTrend`) |
| Insights date bar | `components/analytics-filters.tsx` (`InsightsDateRangeFiltersBar`, `InsightsMultiSelectFilter`) |
| Loans home urgency | `components/loans-dashboard.tsx` (overdue / due_soon filters) |

## Related APIs / data

| Need | Existing |
|------|----------|
| Money MoM column | Overview / summary payloads include `column` months; ATF returns `summary` + `pieSpend` — may need overview column or ATF extension |
| Baby chips | Client filter state in `lib/baby-insights-filters.ts`; series already filtered by chips |
| Loans due dates | Loan summaries expose `nextDueDate`; home computes overdue / due_soon |

## Hard constraints (do not fight)

- Keep ATF + More insights pattern; do not add always-on charts.
- Deltas: direction + text + semantic color (never color alone).
- Skeleton parity; `SHELL_DASHBOARD_STACK`; no new chart library.
- Empty ≠ error; quiet zero for urgency.

## Risks if we ignore the repo

- Reinvent MoM instead of wiring `AnalyticsStats` `column`.
- Duplicate filter menus instead of `multiSelectFilters`.
- Ignore Loans home due helpers and fork urgency math.

## Enough for UI concept / Analyze?

**yes** — lean UI concept (three chrome deltas on existing shells).
