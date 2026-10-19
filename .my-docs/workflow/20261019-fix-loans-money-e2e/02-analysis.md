# Analysis: Fix Loans / Money e2e

**Size:** Prefer bullets. Mode simple.

## Deep dive (required)

### Overall

#### What is this?
Stabilize failing Playwright Depth C for Loans + Money under `E2E_STORAGE_STATE`. Evidence (terminal `299731`): `/loans` `goto` 60s `load` timeout while heading already visible; insights `ERR_ABORTED`; Pay toast missing; Money add-tx long timeout then `CONNECTION_RESET`/`REFUSED`. Investments green in same run.

#### Why do we need this?
Cannot trust Loans/Money smoke before merge. Server die cascades kill later Money cases.

#### How to do this?
Reproduce → keep failing e2e as red bar → fix nav waits / product hang / toast contract → green Verify.
- **Other ways:** raise timeouts only (masks hang); skip Pay/add-tx (weakens Depth C).
- **Best practices:** reuse `gotoAppPath` (`domcontentloaded` + retry) already used by Money; product fix when write/toast truly broken; DESIGN_GUIDE if UI toast roles change.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Align Loans `page.goto` → `gotoAppPath`; longer timeouts only as last resort | S / low | yes |
| **2. Systemic fixes** | Fix Pay/Money write success feedback or mutation hang that kills webServer | M / med | yes |
| **3. Creative / lateral** | Assert ledger note instead of toast; split mutating specs to isolate server die | S / med (weaker signal) | later |

- **★ Priority branch:** Quick wins (Loans nav) then Systemic (Pay + Money write).
- **Map to Design:** one recommended path — nav harden + diagnose writes with product-first toast/mutation fix.

### Solution pieces

#### Loans navigation under e2e

##### What is this?
`e2e/loans.spec.ts` still uses bare `page.goto(..., load)`. Error snapshot shows Loans heading + “Loading loans” while `load` never finishes.

##### Why do we need this?
Home + insights + Pay open-flow all start at `/loans` / insights; false red blocks the suite.

##### How to do this?
- Approach: switch Loans cold navigations to `gotoAppPath`; keep `expectMoneyWorkspaceReady`.
- Other ways: bump test timeout only.
- Best practices: match Money/investments helper pattern in `e2e/helpers/shell.ts`.

#### Pay + Money write feedback

##### What is this?
Pay expects `role=status` “Payment recorded in Money”; Money add-tx expects “Transaction added”. Product calls `notify.success(...)`. Failures may be mutation hang, toast a11y mismatch, or cascade after prior OOM/crash.

##### Why do we need this?
Mutating Depth C is the real confidence signal; cascade hides true cause on later routes.

##### How to do this?
- Approach: after stable nav, reproduce write alone; if mutation fails → product fix; if toast missing but data OK → align toast `role=status` / test selector; stop cascade by fixing the write hang first.
- Other ways: assert unique note in ledger only.
- Best practices: debug-repro-then-fix; keep soft fail-fast on error alerts already in specs.

## What exists today

Playwright specs `e2e/loans.spec.ts`, `e2e/money.spec.ts`; shared `gotoAppPath` / `expectMoneyWorkspaceReady` in `e2e/helpers/shell.ts`. Pay UI: `components/loan-pay-modal.tsx` → GraphQL pay + `notify.success`. Money add: `components/money-transaction-form.tsx`.

## Dependencies

- Local e2e webServer + auth jar `e2e/.auth/user.json`.
- Disposable workspace seed (payable installment / Money accounts) — out of scope unless missing seed is proven.
- Do not break Investments / apple-wallet / workspace-member greens.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `e2e/loans.spec.ts` | Bare `goto` + Pay toast assert |
| `e2e/money.spec.ts` | add-tx + post-cascade routes |
| `e2e/helpers/shell.ts` | `gotoAppPath` pattern |
| `components/loan-pay-modal.tsx` | Pay success notify + mutation |
| `components/money-transaction-form.tsx` | Add-tx save + toast |
| `useNotify` / toast UI | `role=status` contract for asserts |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Cold goto + compile retry | `gotoAppPath` in `e2e/helpers/shell.ts` | Fixes `load` hang without product change |
| Soft error then success toast | loans/money specs | Fail-fast on alert; assert success status |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| N/A — e2e + local UI fix | — | No new trust boundary |

## Constraints and risks

- Prefer product fix if write hangs/crashes server; e2e-only when flake/`load` proven.
- No new schema/API/feature; no baby-care e2e in scope.
- UI toast role changes → skeleton/parity N/A; still DESIGN_GUIDE tokens if markup changes.

## Settled decisions (do not relitigate)

- Scope = `e2e/loans.spec.ts` + `e2e/money.spec.ts` only (unless shared helper causes both).
- Verify commands from `00-run.md` stand.
- Has API/DB/auth-schema = no for this run (no new contracts).
- Loans nav: adopt `gotoAppPath` first (evidence: page rendered under `load` timeout).

## Design tree (frontier)

### Settled
- Mode simple; Has UI yes; no new API/DB.
- ★ Stabilize Loans nav via shared goto helper; then write-path diagnose.
- Grill: toast = success signal; writes = product-first after nav green.

### Open frontier
- (empty — Grill frontier-empty)

### Blocked
- none

**Grill recommended?** yes → done (`02b-grill.md` frontier-empty).

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| (Build) single-test Loans home | Confirm `gotoAppPath` greens home | pending | keep if green |

## Blocking questions

- none for Design after Grill auto-settle

## Clear to grill / design?

yes
