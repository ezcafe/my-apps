# Analysis: Whole-app reusable code extract

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

## Deep dive (required)

### Overall

#### What is this?
A whole-app pass to find duplicated UI/lib patterns and extract the highest-value shared pieces into clear homes, without changing product look or public API/DB contracts.

#### Why do we need this?
Copy-paste chrome (headers, route shells, API context) drifts and multiplies fix cost. Skipping leaves every new feature inventing another twin of Investment/Loan route layout and `require*Context`.

#### How to do this?
Inventory clusters → pick wave 1 with lowest behavior risk and ≥2 call sites → extract behind existing look (Gate A2 refs) → leave remaining clusters listed.
- **Other ways:** docs-only inventory (no extract); big-bang merge of all headers/skeletons (high regression risk).
- **Best practices:** Prefer extend `components/ui/` + thin shared shells; keep feature resolvers local; ARCHITECTURE feature isolation; skeleton parity; do not unify pagination dialects.

##### Decision 1 (analysis) — Wave 1 focus

###### Option 1 — Route chrome + header helpers first
- **What it is:** Extract shared Investment/Loan heading shell; small shared path/header helpers; keep feature resolvers.
- **Example:** `InvestmentRouteChrome` / `LoanRouteChrome` → one `FeatureMoneyRouteChrome` (or similar) fed by `resolve*AppHeader`.
- **Pros:** Near-duplicate files today; clear parity tests; visible win.
- **Cons:** Does not touch API context or Baby-specific chrome yet.

###### Option 2 — API `require*Context` factory first
- **What it is:** Shared factory for auth → write scope → resolve workspace → verify → cookie.
- **Example:** `createRequireWorkspaceContext({ resolve, verify, appKey })` used by Money/Baby/Investment/Loans.
- **Pros:** Four nearly identical functions; hardening fixes land once.
- **Cons:** Baby session-only + Money API-token rules differ; higher subtle regression risk; less UI parity proof for Gate A2.

###### Recommendation
**Pick Option 1** for wave 1. List Option 2 as wave 2 candidate. Small header path helper extract can ride along with Option 1.

### Solution pieces

#### 1. Feature route chrome (Investment / Loans)

##### What is this?
Near-duplicate `*SectionHeading` + `*RouteChrome` wrappers around `PageHeading` + `MoneyAppMenu` + CTA link.

##### Why do we need this?
Two files already diverge only on resolver + optional `useAppHeaderActions` (Loans). Third feature would copy again.

##### How to do this?
- Approach: One shared chrome component: props = `resolveHeader(pathname)`, optional actions slot, same grid shell.
- Other ways: Leave as-is; generate with codegen.
- Best practices: Match live Investment/Loans look; keep Money/Baby layouts separate until proven same shape.

#### 2. App header resolvers

##### What is this?
`resolve{Money,Baby,Investment,Loan,Core}AppHeader` — same “pathname → title/crumbs/cta” idea; Baby uses i18n keys.

##### Why do we need this?
Shared path-matching (`isTabActive`) is duplicated vs `lib/app-section-nav.ts`; full merge of resolvers is wrong (Baby i18n, Money CTAs).

##### How to do this?
- Approach: Export shared path helpers + optional common `AppHeaderResolved` base type; keep per-feature resolve functions.
- Other ways: One mega resolver table (hard to read; mixes apps).
- Best practices: Data-driven tables per feature; shared pure helpers only.

#### 3. API workspace context helpers

##### What is this?
`requireMoneyContext` / `requireBabyContext` / `requireInvestmentContext` / `requireLoansContext` share a pipeline; already use `lib/api-http`.

##### Why do we need this?
Auth/error path fixes repeat four times (see sibling hardening).

##### How to do this?
- Approach: Wave 2 — factory with injected resolve/verify; keep public exports stable.
- Other ways: Leave four copies; only document the pattern.
- Best practices: No public HTTP contract change → **Has API = no**; preserve Baby API-key denial.

#### 4. Skeletons / filter chrome

##### What is this?
Large feature skeletons; Baby already imports `MoneyAnalyticsFiltersBarSkeleton` / `AnalyticsPeriodChipSkeleton`.

##### Why do we need this?
More shared filter/period pieces reduce drift; merging Baby home skeleton is unsafe.

##### How to do this?
- Approach: Inventory only in wave 1; extract more shared filter skeletons only if a second call site appears without Money naming.
- Other ways: Force all skeletons through one mega component (CLS risk).
- Best practices: Skeleton parity mandatory; feature-specific layout stays local.

#### 5. Inventory backlog (no extract this wave)

##### What is this?
GQL clients, selection bars (Baby-only today), pagination dialects, Baby home controls.

##### Why do we need this?
So “whole-app” promise is kept without over-scoping wave 1.

##### How to do this?
- Approach: Ranked backlog table in Design; do not build.
- Other ways: Expand wave 1 (reject — risk).
- Best practices: One wave, measure, next PR.

## What exists today

Shell + features with shared `components/ui/` and `lib/api-http`. Duplication is strongest in Investment/Loan route chrome and four `require*Context` clones. Headers are parallel but intentionally feature-owned. Skeletons are mostly feature-specific; analytics filter skeletons already cross Baby/Money.

## Dependencies

- Must stay compatible with `PageHeading`, `app-header-override`, `MoneyAppMenu`, DESIGN_GUIDE.
- Do not block on `app-api-db-hardening` Gate C.
- Call sites: `investment-route-layout.tsx`, `loan-route-layout.tsx`, header unit tests.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/investment-route-layout.tsx` | Extract source A |
| `components/loan-route-layout.tsx` | Extract source B (+ actions) |
| `components/page-heading.tsx` | Shared heading primitive |
| `lib/investment-app-header.ts` / `lib/loan-app-header.ts` | Resolvers stay |
| `lib/app-section-nav.ts` | Existing path-active helper to reuse |
| `lib/api-money.ts` (+ baby/investment/loans) | Wave 2 context factory |
| `components/money-analytics-skeleton.tsx` | Already-shared filter skeletons |
| `docs/ARCHITECTURE.md` / `docs/DESIGN_GUIDE.md` | Isolation + look constraints |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| PageHeading + override provider | `page-heading`, `app-header-override` | Chrome composition already exists |
| Path → header resolve | `lib/*-app-header.ts` | Keep feature tables; share helpers |
| Shared HTTP errors | `lib/api-http.ts` | Context factory builds on this |
| Shell layout tokens | `lib/shell-layout.ts` | Grid/stack classes shared |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Shell vs feature vs shared | ARCHITECTURE | Extract must land in shared without leaking feature rules |
| Injected context factory | planned wave 2 | Auth pipeline without one mega Money module |

## Constraints and risks

- Gate A2: no visual redesign.
- Baby i18n headers ≠ string headers — do not force one type.
- Over-abstract CTAs/actions (Loans has `useAppHeaderActions`).
- Touching public API shapes → would flip Has API (avoid in wave 1).

## Settled decisions (do not relitigate)

- Mode full; Gate A / A2 approved; lean parity UI.
- Whole-app inventory + extract wave (not inventory-only).
- Pagination dialects stay separate.

## Has API / Has DB (for parent)

| Flag | Recommendation | Why |
|------|----------------|-----|
| **Has API** | **no** | Wave 1 is internal component/lib extract; no new/changed public HTTP/GraphQL contracts |
| **Has DB** | **no** | No schema/migrations/persistence query changes |

## Spike notes (optional)

| Spike | Finding |
|-------|---------|
| Diff Investment vs Loan chrome | Same structure; Loans adds `useAppHeaderActions` branch |
| Header file sizes | Baby 166 / Investment 134 / Loan 103 / Money 92 / Core 38 lines — parallel, not identical |
| Skeleton sizes | Baby page skeleton ~735 lines — do not merge in wave 1 |

## Clarity check

Instructions and refs are enough to design wave 1 (route chrome + small helpers) and backlog. Open for Design options only: shared component name/location; whether to include `isTabActive` helper extract in the same PR.
