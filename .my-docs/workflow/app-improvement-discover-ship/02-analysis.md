# Analysis: app-improvement-discover-ship

**Updated:** 2026-10-04  
**Mode:** full  
**Has API (discovery phase):** no — backlog docs only until ship pick  
**Has DB (discovery phase):** no — refine after pick  
**Grill recommended?** yes — ranking / exclude / ship-size frontier open

## Deep dive — overall

### What is this?

A discovery pass that ranks the next high-value improvements across my-apps, then (after Design + human pick) ships **one** slice in this run.

### Why do we need this?

Without a ranked list, work repeats Baby polish or leaves finished drafts at Gate C while cross-app gaps stay unranked. Skipping means another ad-hoc change without shared pick criteria.

### How to do this?

1. Diff prior workflow claims against **current `main` code** (many “Gate C” items already shipped).
2. Rank remaining gaps by daily job impact (capture → scan → act).
3. Design publishes a short backlog + ship criteria; human picks one; then narrow Has UI/API/DB and implement.

**Other ways:** (a) only finish one paused Gate C run without ranking; (b) pure tech-debt sprint. **Best practice:** user-job ranking first (Gate A); verify vs code before ranking “finish draft”.

## Deep dive — piece 1: Gap inventory vs main

### What is this?

Separate “docs say unfinished” from “code still missing”.

### Why do we need this?

Avoid re-building drawer groups, Insights urgency, ChartShell wiring, or Settings `activeCategory` that already exist on `main`.

### How to do this?

Spot-check registry, validators, Insights components, Settings layout, `API_TOKEN_PREFIX_BY_APP`. Treat Gate C runs as **candidates only after a remaining-gap check**.

## Deep dive — piece 2: Ranking model

### What is this?

Score candidates for caregiver/spender day-to-day value, ship size, and trust/speed.

### Why do we need this?

Gate A #1/#2 require job impact and safe one-PR size to stay visible.

### How to do this?

Score columns: daily frequency, pain if wrong, reuse of existing patterns, S/M/L size, API/DB blast radius. Drop L/XXL unless human overrides at pick time.

## Candidate backlog (provisional — verify in Design)

| Rank | Candidate | Evidence on main | Day-to-day job | Size | Notes |
|------|-----------|------------------|----------------|------|-------|
| 1 | **Baby personal API token prefix + Settings UX** | Money/Sav/Inv prefixes in `lib/api-auth.ts`; Baby grant helpers exist; no `bby_` in `API_TOKEN_PREFIX_BY_APP`; `baby-external-apis` at Gate C | Automate / share Baby logging from external clients | M | Has API + likely Has DB; high for power users |
| 2 | **Finish Settings single-pane polish + smoke/tests** | `activeCategory` exists; `settings-page-optimize` stuck at smoke | Change theme/date without long scroll | S | Confirm remaining gaps vs design before picking |
| 3 | **Expand Idempotency-Key to more hot mutations** | Only three REST paths in ARCHITECTURE | Safe retry on flaky mobile | M | Trust; Has API contract docs |
| 4 | **Unify list pagination dialect (scoped slice)** | Money `page/pageSize` vs Inv/Sav/Loans `limit/cursor` vs Baby `limit` | Client/API consistency for lists | L→need scoped S | Do **not** unify all at once; pick one dialect migration |
| 5 | **Baby quick-care request prune / retention** | Documented follow-up in baby-home-redesign review | Keep home logging trustworthy at scale | S–M | Has DB; low UI |
| 6 | **Kiosk first-load perf verify + slim widgets** | PERFORMANCE.md marks `/kiosk` measure-after-change | Fast household glance board | S | Mostly measure + trim if regressed |
| 7 | **Help / empty-state copy pass on cold paths** | Progressive disclosure SPEC; empty ≠ error | New user orientation | S | Copy/UI only |
| 8 | **Close Gate C process debt** (merge already-green runs) | Many `00-run.md` at gate-c with code on main | Maintainer clarity | S | Process; little user-facing if already shipped |

**Already shipped (do not re-rank as new):** grouped drawer + Other apps; Loans Insights urgency strip; Baby ChartShell on at least hydration; Settings category filter plumbing; Insights UX deltas workflow largely on main.

## Reusable patterns

- Feature registry + workspace cookies (`lib/features/registry.ts`, `lib/workspace-context.ts`)
- Money Insights ATF + More progressive disclosure
- Shared Settings layout (`SettingsPageLayout`)
- API token prefixes + app grants (`lib/api-auth.ts`)
- DESIGN_GUIDE tokens + skeleton parity

## System shape candidates

- **Discovery docs only** until pick (no runtime change).
- **Ship slice** becomes one of: UI-only / API contract / DB retention / scoped pagination — set flags after pick.

## Design tree (frontier)

### Settled

- Decision 1 Option 2: discover → pick one → ship in this run.
- Prefer day-to-day user value over pure tech debt.
- No UI concept / Gate A2.
- Do not auto-merge Gate C runs.
- **Grill Q1:** Tie-break → spender (Money / Loans) first (Decision 2 Option 2).
- **Grill Q2:** Baby API tokens demoted below daily UI / spender trust jobs (Decision 3 Option 2).
- **Grill Q3:** Max ship size S/M only (Decision 4 Option 1).
- **Grill Q4:** Gate C-only process items excluded from product backlog (Decision 5 Option 2).

### Open frontier

- (empty after Grill Round 1)

### Blocked

- Exact ship tasks / Has API / Has DB — blocked on human pick after Design (Decision 6).

## Blocking questions

None for Design of the **backlog** — Grill must settle ranking rules; ship pick comes after Design.

## Clarity check

Instructions and primary sources are clear enough to Design a ranked backlog + pick criteria. Gaps in What/Why/How for the **chosen** ship item will be filled after the pick (narrow Analyze addendum if needed).
