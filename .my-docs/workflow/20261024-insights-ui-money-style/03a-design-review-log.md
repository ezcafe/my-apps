# Design verify (Mode simple)

**Result:** clean

**Stage:** design-verify-phase  
**Mode / profile:** simple · lite  
**Has UI / API / DB / auth:** yes | no | no | no

## Isolated surfaces

| Surface | Duty | Result |
|---------|------|--------|
| API (`03a-api-contract-review.md`) | Has API = **no** → Notes-skip only; do not invent file | **skipped** |
| DB (`03a-db-design-review.md`) | Has DB = **no** → Notes-skip only; do not invent file | **skipped** |

## FIRST (gates)

| Check | Outcome |
|-------|---------|
| Design present (`03` Result `done`) | pass |
| Grill closed (`02b` Result `frontier-empty`) | pass |
| Notes `design-stale` | absent |
| design-update unpaid | absent (no prior `03a*` `needs update`) | pass |

## Scope checked

- `01-idea`, `02-analysis`, `02b-grill`, `03-design`, `04-tasks`
- Spot-check vs live: `analytics-chart-layout.ts`, `money-analytics-skeleton.tsx`, investments/loans/baby Insights dashboards, loans `loading.tsx` / Suspense fallbacks
- DESIGN_GUIDE Insights “one job” + More disclosure; workspace skeleton-parity rule

## Findings

### Critical

None.

### Major

None.

### Minor (Build notes — do not block clean)

1. **Adapted duo empty side cell** — `ANALYTICS_HERO_ROW_GRID` keeps `lg:grid-rows-[280px_280px]`; one side chart at `lg:row-start-1` leaves the bottom-right cell empty (no fake third chart). Live + duo skeleton must both omit that slot so CLS stays zero. Do not fill with a blank card.
2. **Baby KPI bundle** — Design moves **count KPIs + insight metric cards** above the hero; More keeps pattern / growth / extra **charts**. Preserve existing `data-testid`s (`baby-count-kpis`, `baby-insights-default-charts`) and update aria-label on the ATF charts section (today still hydration-titled).
3. **Loans urgency** — Dashboard already passes `showUrgencyStrip`; route `loading.tsx` and page Suspense fallback still omit it — Task 3 correctly covers both.
4. **In-dashboard chart loading** — Investments/loans use `MoneyAnalyticsChartsSkeleton` while ATF loads; after Task 1, those paths must use **duo**, not triad (same as route skeleton).

## Consistency verdict

| Axis | Verdict |
|------|---------|
| Idea ↔ Grill ↔ Design | Aligned: adapted duo; investments Results / loans Remaining / baby Night rest; baby KPIs above hero |
| Design ↔ Tasks | Tasks 1–5 cover duo skeleton, three dashboards, loans urgency, baby order + skeleton, parity spot-check; TDD red-first listed |
| Non-goals | Held: no API/DB/auth; money Insights not redesigned; no shared mega-dashboard |
| Skeleton parity | Explicit duo variant; money default stays triad; baby skeleton reordered |
| Contracts | API/DB N/A — correctly skipped |

## Overall

Zero Critical/Major. Required Isolated = **skipped** (Has API/DB = no). Overall Result **`clean`** — Design clean / Verify clean for Mode simple.
