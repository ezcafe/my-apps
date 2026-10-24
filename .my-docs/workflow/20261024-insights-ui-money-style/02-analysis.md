# Analysis

**Result:** done

## Context

### Intent (from `01-idea`)

Align **baby / investments / loans** Insights pages with **money/insights** visual hierarchy: filters → period → KPIs → **one large primary chart** for the most important insight, then secondary / “more insights” — with skeleton parity (zero CLS). Primary chart chosen by **domain best practice per app** (confirmed), not one shared metric.

### Reference (money)

- Live: `components/analytics-dashboard.tsx` — `ANALYTICS_HERO_ROW_GRID` with Spend (~2/3, tall/fill) + two stacked side charts (`ANALYTICS_HERO_SPEND_CLASS` / `ANALYTICS_HERO_SIDE_CLASS` in `components/analytics-chart-layout.ts`).
- Skeleton: `MoneyAnalyticsPageSkeleton` → `AnalyticsCollapsedGridContent` (same hero + teaser slots).
- Grammar in `docs/DESIGN_GUIDE.md`: one job per Insights surface; extras behind **More insights**.

### Targets today

| Feature | Live ATF charts | Skeleton | Gap |
|---------|-----------------|----------|-----|
| **Investments** | Equal 2-up: `InvestmentResultsOverTimeCard` + `InvestmentAllocationCard` | `FeatureInsightsPageSkeleton` → `MoneyAnalyticsChartsSkeleton` (**hero triad** already) | Live ≠ skeleton (CLS); no visual weight on primary |
| **Loans** | Equal 2-up: `LoansRemainingByLoanCard` + `LoansPaidPrincipalInterestCard`; urgency strip before KPIs | `FeatureInsightsPageSkeleton` (route `loading.tsx` **omits** `showUrgencyStrip`; dashboard loading uses strip) | Live ≠ money hero; route loading may miss urgency strip |
| **Baby** | Equal 2-up hydration + night rest; KPIs / care / growth behind More; custom `BabyInsightsPageSkeleton` (2 equal chart slots) | Matches current equal ATF, not money hero | Hierarchy + money grammar (KPIs above charts) not applied |

No new APIs/DB. Reuse existing cards, drilldowns, empty/error, teasers.

### Domain best-practice hero candidates (agent recommendation — Grill locks)

| App | Recommended hero | Why | Natural side / secondary |
|-----|------------------|-----|---------------------------|
| **Investments** | Results over time | Portfolio apps lead with performance trajectory | Allocation (composition) |
| **Loans** | Remaining by loan | Debt apps lead with “what you still owe” | Paid principal vs interest |
| **Baby** | Night rest (sleep) | Care apps lead with sleep / overnight rest as the daily health signal | Hydration (wet + feeds) as side; or reverse if Grill picks hydration |

### Layout grammar options (see Grill)

1. **Clone money triad** — one tall primary (8/12, 2 rows) + two stacked sides (4/12). Features with only two ATF charts need a third slot (teaser, KPI strip, or demote a “more” chart into ATF side).
2. **Adapted duo** — same tokens/heights: primary uses `ANALYTICS_HERO_SPEND_CLASS` + tall/fill; second chart uses one `ANALYTICS_HERO_SIDE_CLASS` half-height; optional empty side or teaser fills the money skeleton shape for CLS.

## Risks

- **CLS:** `FeatureInsightsPageSkeleton` already paints money hero while investments/loans live UI is 2-up — fixing live without syncing baby skeleton / loans `loading.tsx` urgency will leave jumps.
- **Over-cloning money:** forcing a third ATF chart that is not “one job” for that feature (DESIGN_GUIDE anti-goal).
- **Baby structure drift:** moving KPIs above charts and changing ATF chart set touches more than grid classes; filter chip visibility rules must still hide irrelevant series.
- **Scope creep:** redesigning money, new metrics, or a shared mega-dashboard component (explicit non-goals).

## Open questions

Settled by ideation: primary = per-app best practice (not one shared metric).

**Frontier for Grill (product decisions):**

1. Hero **composition**: full money triad vs adapted duo that still uses hero tokens.
2. **Baby** primary chart: night rest vs hydration (both exist ATF today).
3. **Baby** page order: move summary KPIs above hero to match money, or keep KPIs inside More for this change.
