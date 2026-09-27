# Analysis: Chart interaction parity (hover, toggle, Option A drill)

**Size:** Five solution pieces. Has API **yes** (thin Loans installment list for multi-loan Insights drills). Has DB **no**. Gate A2 HTML locked (`_proposed-chart-interactions.html`).

## Deep dive (required)

### Overall

#### What is this?
Make every in-scope visx chart match Money Insights: shared hover tooltip, legend series toggle, click → in-page filtered list modal (Option A). Scope = Insights (Money/Loans/Investments/Baby) + loan detail payoff + other visx chart cards. CSS progress bars out.

#### Why do we need this?
Users learn Money’s interaction language, then hit dead or navigate-away charts elsewhere. Skip → inconsistent UX and abandoned “what is this bar?” moments.

#### How to do this?
Reuse `ChartShell` / `ChartLegendList` / Money modal pattern; add domain drill modals; extend Loans GraphQL only where multi-loan date-filtered rows cannot be loaded safely from existing detail queries. Wire Baby charts onto shared chrome. Add `onItemClick` to `LoanProgressChart`.
- **Other ways:** URL-only drill (rejected — Option A locked); mega unified drill API for all domains first (slower).
- **Best practices:** Repo already has the Money reference; DESIGN_GUIDE + approved HTML; never invent one-off tooltips.

### Solution pieces

#### 1. Shared chrome on Baby (+ remaining gaps)

##### What is this?
Wrap Baby visx charts with `ChartShell` tooltips and `ChartLegendList` where multi-series; same for Loans Insights combined payoff legend.

##### Why do we need this?
Baby has zero hover/toggle today; Insights payoff chart has `hiddenSeries` but no legend wired.

##### How to do this?
- Approach: Refactor `baby-*-chart.tsx` to use `ChartShell` like Money cards; wire legend + `toggleSetKey` on hydration dual series and loan Insights combined chart (detail already has legend).
- Other ways: Custom Baby tooltips — fight skim.
- Best practices: Match Money card structure; skeleton height for legend.

#### 2. Domain Option A drill modals

##### What is this?
In-page modals listing filtered rows: Loans installments/payments; Investments activities; Baby care/growth events. Money keeps `AnalyticsChartDrilldownModal`.

##### Why do we need this?
Click without rows is a dead end; navigate-only breaks Option A.

##### How to do this?
- Approach: Clone Money modal chrome (Modal + table + pagination) per domain with typed filter payloads; parent dashboards hold drill state like `chartDrilldown`.
- Other ways: One mega-generic modal — harder typing, same UI.
- Best practices: Quiet empty; inherit Insights date range + click keys; optional “Open detail” footer.

#### 3. Loans drill data (API thin)

##### What is this?
Rows for Remaining pie, paid principal/interest, combined payoff, loan detail progress clicks.

##### Why do we need this?
`loan(id)` has full schedule (good for single-loan / detail). Multi-loan Insights paid charts need date-filtered installments without N+1 detail fetches.

##### How to do this?
- Approach: **Has API yes** — add thin `loansInstallments` (or equivalent) query: `loanId?`, `from?`, `to?`, `status?`, cursor. Single-loan Remaining pie may use `loanDetailQueryOptions` client filter. Replace pie `router.push` with modal first.
- Other ways: Client-only N× detail — reject for Insights More charts.
- Best practices: Workspace-scoped; same auth as loans GQL; bigint-safe amounts.

#### 4. Investments + Money wiring

##### What is this?
Pass `onItemClick` on allocation / results / P&L / diverging cards; resolve symbol→instrumentId; query `investmentActivitiesQueryOptions`. Money already complete — verify no regressions.

##### Why do we need this?
API exists unused; hover/toggle partial; drill missing.

##### How to do this?
- Approach: Card click → merge date + instrumentId/kind → investments drill modal.
- Other ways: New activities page — out of Option A.
- Best practices: Reuse open-activities table columns if present.

#### 5. LoanProgressChart click + Baby pattern-finder scope

##### What is this?
Add `onItemClick` payload (label/index/series) to `LoanProgressChart`. Pattern-finder: hover (+ toggle if meaningful) this pass; **defer drill** if keys weak.

##### Why do we need this?
Detail + Insights combined chart need click for Option A; matrix drill is high risk / low 80/20.

##### How to do this?
- Approach: Mirror `LineChart` click hit targets; document pattern-finder exception in Design Non-goals.
- Other ways: Force matrix drill now — defer per Gate A open question.

## What exists today

| Surface | Hover | Toggle | Drill |
|---------|-------|--------|-------|
| Money Insights | yes | yes | modal transactions |
| Loans Remaining pie | yes | yes | **navigate** `/loans/[id]` |
| Loans paid / combined | yes | partial | no |
| Loan detail payoff | yes | yes | no |
| Investments | yes | allocation only | no |
| Baby charts | **no** | static legend only | no |

## Dependencies

- Shared charts under `components/charts/*`
- Money: `analytics-chart-drilldown-modal.tsx`, `lib/analytics-build-query.ts`
- Investments activities GQL already live
- Loans GQL resolvers / `lib/loans-services/loans.ts`
- Baby timeline + growth query options

## Reference files (for Build)

| Path | Why |
|------|-----|
| `components/charts/chart-shell.tsx` | Hover SoT |
| `components/charts/chart-legend-list.tsx` | Toggle SoT |
| `components/analytics-chart-drilldown-modal.tsx` | Modal SoT |
| `components/baby-*-chart.tsx` | Need ChartShell |
| `components/charts/loan-progress-chart.tsx` | Add onItemClick |
| `lib/investment-query-options.ts` | Activities query |
| `ui-refs/_proposed-chart-interactions.html` | Visual SoT |

## Reusable patterns

| Pattern | Where | Reuse |
|---------|-------|-------|
| ChartShell + tooltip | `charts/` | All Baby + any gap |
| ChartLegendList + toggleSetKey | `charts/` + `lib/chart-legend-toggle.ts` | Multi-series |
| Drill state + merge filter | Money analytics | Domain modals |
| FeatureInsightsPageSkeleton | money-analytics-skeleton | Legend CLS if height changes |

## System shape candidates

| Shape | Why |
|-------|-----|
| Shared UI chrome + domain list adapters | Money already proves it |
| Thin Loans list query only where needed | Avoid N+1; Has API yes / Has DB no |
| Progressive disclosure unchanged | ATF + More stay |

## Constraints and risks

- N+1 loan detail fetches if we skip installment list API
- Baby timeline size if client-filter only on huge ranges
- Hit-target overlap legend vs chart
- Replacing Loans pie navigation may surprise users who liked deep-link — keep “Open loan” in modal

## Has API / Has DB (for `00-run.md`)

| Flag | Rec | Why |
|------|-----|-----|
| **Has API** | **yes** | New/extended Loans installment list query input/output for multi-loan date filters; Investments/Baby reuse existing (client filter OK for Baby care kind this pass) |
| **Has DB** | **no** | Read existing installment / activity / care tables; no schema/migration |

## Settled from evidence

- Pattern-finder: **hover this pass; defer drill** (Open Q2)
- Investments P&L: resolve **symbol → instrumentId** via instruments map in card
- Loans Remaining: **modal first**; footer link to detail
- Loans paid charts: use **new thin installment list** when multi-loan

## Open for Design Decision options

- How thick the Loans list API (dedicated query vs field on insights More) — see Design Option 1 vs 2
