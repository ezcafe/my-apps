# Light repo skim: chart-interaction-parity

**Result:** done  
**Updated:** 2026-09-27

## Project shape (1–3 sentences)

Next.js shell with Money / Investments / Loans / Baby Insights. Shared visx primitives + `ChartShell` / `ChartLegendList` live under `components/charts/`. Money Insights is the full hover + toggle + Option A modal pattern; other domains reuse charts unevenly.

## Related existing UI / screens

| Surface | Path / component |
|---------|------------------|
| Money Insights + modal | `analytics-dashboard.tsx`, `analytics-chart-drilldown-modal.tsx`, `analytics-chart-cards/*` |
| Chart chrome | `charts/chart-shell.tsx`, `chart-tooltip.tsx`, `chart-legend-list.tsx` |
| Loans Insights / detail | `loans-insights-dashboard.tsx`, `loan-chart-cards/*`, `loan-detail-page.tsx`, `loan-progress-chart.tsx` |
| Investments Insights | `investment-insights-dashboard.tsx`, `investment-chart-cards/*` |
| Baby Insights charts | `baby-*-chart.tsx` (no ChartShell today) |

## Related APIs / data

| Need | Existing |
|------|----------|
| Money drill | `moneyTransactionsQueryOptions` + `mergeDrilldownQuery` |
| Loans list | `loanDetailQueryOptions` installments; **no** date-filtered installment list API |
| Investments | `investmentActivitiesQueryOptions` (unused in UI; `instrumentId` / kind / dates) |
| Baby | timeline + growth queries; care kind filter **client-only** |

## Hard constraints (do not fight)

- Reuse `ChartShell` / `ChartLegendList` — no one-off tooltips.
- Option A = in-page modal (not URL-only primary drill).
- Skeleton parity; DESIGN_GUIDE tokens; no new chart library.
- Visx charts in scope; CSS progress bars out of parity unless already links.

## Risks if we ignore the repo

- Fork tooltip UIs on Baby instead of `ChartShell`.
- Keep Loans pie `router.push` as primary drill vs modal.
- Ignore unused investments activities query and invent a parallel API.

## Enough for UI concept / Analyze?

**yes** — lean UI concept: chart card + legend + drill modal shell matching Money.
