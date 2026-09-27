# Tasks: insights-ux-deltas-filters-urgency

**TDD:** Red first per task. Match approved `ui-refs/_proposed-insights-chrome.html`.

## Task 1 — Money Expenses MoM wiring (M)

**Acceptance:**
- `/money/insights` `AnalyticsStats` receives overview `column` (or equivalent month series)
- Expenses card shows MoM line when `expenseMomTrend` non-null: arrow + `% vs prior month` + semantic color (not color alone)
- When null, no fake 0% line
- Skeleton parity unchanged for KPI strip

**TDD (red first):**
- [x] Unit: `expenseMomTrend` still covers up/down/flat (existing tests stay green)
- [x] Unit or component: Insights path passes non-empty `column` into stats when overview has ≥2 expense months
- [x] E2E (Money insights): when fixture/mock supports MoM, Expenses region matches `/vs prior month/i` (or skip-documented if no e2e fixture — then unit must cover wire)

## Task 2 — Extract loans due helpers (S)

**Acceptance:**
- Pure helpers `daysUntilDue`, `isOverdue`, `isDueSoon` (≤7 days, not overdue) live under `lib/` (e.g. `lib/loans-due.ts`)
- `loans-dashboard.tsx` imports them (behavior unchanged)
- `getLoansTodayIso` remains single today source

**TDD:**
- [x] Unit: overdue when nextDue &lt; today and not paid_off
- [x] Unit: due soon when 0…7 days inclusive and not overdue
- [x] Unit: paid_off never overdue/due-soon
- [x] Unit: due-soon bucket excludes overdue rows (mixed fixture)

## Task 3 — Loans Insights urgency strip (M)

**Acceptance:**
- Default `/loans/insights` shows strip above KPI grid: Overdue count, Due this week count, link **View loans** → `/loans`
- Warning tint when overdue &gt; 0; quiet surface when both counts 0 (empty ≠ error)
- Uses `loansListQueryOptions` + Task 2 helpers
- Matches HTML stack order; skeleton includes strip placeholder when list loading (or strip appears with KPIs without CLS jump)

**TDD:**
- [x] Unit: count overdue / due-soon from sample loan rows
- [x] Unit: mixed fixture → `{ overdue: 1, dueSoon: 1 }` (due-soon excludes overdue)
- [x] Component/e2e: Insights shows Overdue / Due this week labels; link href `/loans`
- [x] E2E or unit: zero counts still render quiet strip (not Alert error)

## Task 4 — Baby Care + Growth toolbar filters (M)

**Acceptance:**
- `BabyInsightsDashboard` passes Care + Growth `multiSelectFilters` into `InsightsDateRangeFiltersBar`
- Draft chip changes mark dirty; Apply commits; Reset restores empty chips + default range
- Period chip lists active care/growth labels
- Series charts continue to honor applied chips (empty = all)
- Labels from existing baby messages / chrome labels
- Match HTML: Care/Growth beside date on toolbar

**TDD:**
- [x] Unit: dirty detection when careTypes differ (existing `babyInsightsFiltersDirty`)
- [x] Unit/integration: building `InsightsMultiSelectFilter` value/onChange maps ids ↔ chips
- [x] E2E: open Baby Insights → open Care → select Sleep → Apply → period chip includes Sleep (or equivalent); charts/filter still work

## Task 5 — Skeleton / a11y / light-dark spot-check (S)

**Acceptance:**
- Touched skeletons mirror new urgency strip / filter trigger count
- Delta and urgency not color-only (text present)
- Manual or e2e light+dark: no broken contrast on delta/urgency

**TDD:**
- [x] Source/contract or snapshot: Loans Insights skeleton includes urgency placeholder if live strip exists before KPIs
- [x] Baby filter bar skeleton `triggerCount` accounts for date + Care + Growth (± Apply)

## Task order

2 → 1 → 3 → 4 → 5  
(Extract due helpers before Loans strip; Money and Baby can parallel after 2 if needed — prefer 1 then 3 then 4.)
