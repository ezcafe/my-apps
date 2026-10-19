# Analysis: Fix remaining full-suite e2e (baby + investments)

**Size:** Prefer bullets. Mode simple. Evidence: terminal `919566.txt` (19 failed / 117 passed / 4 skipped).

## Deep dive (required)

### Overall

#### What is this?
Full Playwright with `E2E_STORAGE_STATE` still red on **6** `baby-care`, **11** `baby-home-option-b`, **2** `investments`. Loans/Money green. Failures cluster into layout/geometry, locale VI, Custom diaper/time, Growth/Activities capture, pending recovery, and late-suite investments `page.goto` abort.

#### Why do we need this?
Gate C and full-suite trust stay blocked while these specs red. Checking only Loans/Money hides baby/investments regressions.

#### How to do this?
Diagnose each cluster from stack traces; restore **Option B / capture contracts** in product when UI drifted; tighten e2e selectors only when the product is correct and assertions are stale or flaky. No new API/DB/auth unless a cluster proves a server contract break (none proven from this log).

- **Other ways:** Mass-skip/soften geometry+locale asserts — rejects locked Option B and VI coverage.
- **Best practices:** Workspace debug order (reproduce → keep existing red e2e → fix → green); DESIGN_GUIDE + skeleton parity on any baby home layout change; scope locators to section/dialog.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Scope dual `data-diaper-kind`; close Custom dialog; investments goto retry/isolation | S / low | yes |
| **2. Systemic fixes** | Restore home row2 Nap\|Diaper + chip hit targets; locale settings; pending under-owner; Growth save/symptoms; Activities list refresh | M / medium | yes |
| **3. Creative / lateral** | Rewrite Option B geometry to stacked rows; drop VI settings asserts | M / high product drift | no |

- **★ Priority branch for this pass:** Systemic (layout + recovery + capture) with quick wins first where stack traces are clear.
- **Map to Design:** Mode simple → one recommended design (cluster fix plan).

### Solution pieces

#### A — Baby home Option B layout / geometry

##### What is this?
Tests expect row1 breast+bottle, row2 nap+diaper same band (`|Δy| < 48`), Kind height vs nap, Nap→Diaper above Pump, care controls ≥56px / bottle ml chips `60|90|120`. Log shows `Δy ≈ 179`, null `boundingBox` on nap row, missing ml chips.

##### Why do we need this?
Home is the primary care surface; geometry locks 3AM usability and Option B composition.

##### How to do this?
- Approach: Restore shared `home-row-nap-diaper` (or equivalent) so Nap|Diaper share a row on desktop; ensure bottle ml chips + ≥44/56 hit targets; keep skeleton parity.
- Other ways: Rewrite e2e for stacked rows — only if product intentionally abandoned Option B (not claimed in idea).
- Best practices: `repeat(auto-fit, minmax…)` + subgrid; match `baby-page-skeleton` / unit layout tests.

#### B — Locale EN↔VI + Vietnamese home copy

##### What is this?
Settings radio → heading never becomes exact `"Cài đặt"` within `toPass` (60s timeout) in baby-care + baby-home-option-b.

##### Why do we need this?
VI is a shipped locale; home/Custom/birth strings depend on it.

##### How to do this?
- Approach: Fix baby settings locale apply so H1 updates to `Cài đặt` / `Settings`; verify home strings after switch.
- Other ways: Soften e2e to regex — weaker signal.
- Best practices: Same i18n path as other workspace settings.

#### C — Custom diaper / Custom time / dual wet

##### What is this?
Capture dialog stays open after Use (`toHaveCount(0)` fails); home Custom path hits **strict mode** on two `[data-diaper-kind="wet"]` (home grid + sheet).

##### Why do we need this?
Custom time must close and send `occurredAt`; wet kind must be unambiguous.

##### How to do this?
- Approach: Product: dismiss Custom dialog on Use; e2e: scope wet to section or dialog. Prefer both if dual nodes are intentional.
- Other ways: Rename attr on sheet only — also fine.
- Best practices: Scope Playwright to `data-section` / `getByRole('dialog')`.

#### D — Growth / vaccine / Activities capture

##### What is this?
Temperature symptoms click never finds cough/ho; height Save stays disabled; vaccine/medicine rows never appear on Activities after save.

##### Why do we need this?
Capture → list → edit/delete is core growth/vaccine UX.

##### How to do this?
- Approach: Restore symptom chips when kind=temperature; enable Save when height/head/vitamin valid; ensure Activities shows new vaccine/medicine after mutation (cache/nav).
- Other ways: Only change e2e fill order — if saveDisabled rules are correct, align tests; if UI missing, product first.
- Best practices: Existing `baby-growth-page` + query invalidation patterns (mirror Money invalidate lessons, client-only).

#### E — Pending recovery / chain / clear rules

##### What is this?
Under-owner `baby-home-pending-recovery` missing after diaper chain fail / mid-save reload; Try again never appears for clear-rules test.

##### Why do we need this?
Ambiguous errors must keep pending under the owner; definite codes clear; discard keeps timer.

##### How to do this?
- Approach: Client pending owner chrome for diaper (and peers) after failed/aborted quick-care; no new server API.
- Other ways: Weaken e2e — loses recovery contract.
- Best practices: Existing `data-testid="baby-home-pending-recovery"` under `data-section`.

#### F — Investments settings/new goto

##### What is this?
After long baby run: `page.goto` timeout on `/investments/settings`; `ERR_ABORTED` on `/investments/new`. Earlier investments tests in same file may have passed before stress.

##### Why do we need this?
Investments smoke must stay green under auth Verify.

##### How to do this?
- Approach: First isolate investments file alone; if green → suite flake hardening (retry goto, wait for webServer idle). If red alone → route/workspace product fix.
- Other ways: Move investments earlier in suite — band-aid.
- Best practices: Playwright retry / `expectMoneyWorkspaceReady` already used.

## What exists today

Baby home Option B in `components/baby-home.tsx` (separate nap/diaper row wrappers + auto-fit). Growth capture in `components/baby-growth-page.tsx`. Specs already encode expected behavior in `e2e/baby-care.spec.ts`, `e2e/baby-home-option-b.spec.ts`, `e2e/investments.spec.ts`.

## Dependencies

- Keep Loans/Money green (do not regress invalidate/nav).
- Auth storage required for Verify e2e.
- Sibling workflows paused at Gate C — do not invent their Gate C.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | Row order, chips, pending recovery, Custom time |
| `components/baby-page-skeleton.tsx` | Skeleton parity on layout change |
| `components/baby-growth-page.tsx` | Symptoms, saveDisabled, kinds |
| `components/baby-ml-chip-section.tsx` | Bottle ml chips / hit area |
| Baby settings locale UI (under `app/(shell)/baby/` / settings components) | EN↔VI H1 |
| `e2e/baby-care.spec.ts` | Capture + locale failures |
| `e2e/baby-home-option-b.spec.ts` | Geometry, recovery, VI, Custom diaper |
| `e2e/investments.spec.ts` | settings/new goto |
| `e2e/helpers/shell.ts` | `expectMoneyWorkspaceReady` |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Option B data-layout / data-section | `baby-home.tsx` | Geometry + recovery locators |
| Under-owner pending recovery | `baby-home-pending-recovery` | Chain/reload/clear tests |
| Scoped Playwright section locators | e2e helpers in baby specs | Dual wet / dialog |
| Money workspace ready gate | `e2e/helpers/shell.ts` | Investments nav |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| N/A — client/UI + e2e only | — | No new trust boundary |

## Constraints and risks

- **Has UI yes** — layout/chip changes need skeleton parity + light/dark check.
- Hydration mismatch noise in webServer log may worsen flaky locale/geometry — note but do not expand scope unless it blocks a cluster.
- Bottle footer expected `120 ml` vs received `About 140 ml` — tip/chip source of truth must match product or mock.
- Do not flip Has API/DB/auth without proven server contract change.

## Settled decisions (do not relitigate)

- Mode simple; Has UI yes; Review lite; Lens none.
- Prefer product fix for Option B drift; e2e fix for stale/strict selectors.
- Existing red e2e are the repro — no new feature e2e required before fix.
- Verify command set in `00-run.md` (focused three specs + build + unit).

## Design tree (frontier)

### Settled
- Outcome: all 19 red tests green under auth Verify; Loans/Money stay green.
- No broad baby redesign; no Loans/Money rework.
- Debug order: reproduce → keep failing e2e → fix → green.

### Open frontier
- Layout: restore Nap\|Diaper shared row vs rewrite geometry e2e for stacked rows?
- Investments: flake hardening first vs assume product route bug?
- Growth Save disabled / missing symptoms: product validation vs test steps?
- Bottle tip `120` vs `140`: restore tip from chips/mock vs update assert?

### Blocked
- (none — can settle user-first under HITL Grill auto)

**Grill recommended?** yes — open frontier above (Has API/DB remain no).

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Investments alone | Run `e2e/investments.spec.ts` only | Distinguishes flake vs product | Keep as Build Task 0 |

## Blocking questions

- None after Grill auto-settle (see `02b-grill.md`).

## Clear to grill / design?

yes

## Has flags (Analyze)

- **Has API:** no
- **Has DB:** no
- **Has auth/PII/schema:** no

## Verify commands (confirm)

- **cwd:** `/Users/ptquang86/ws/my-apps`
- **build:** `npm run build`
- **unit:** `npm test`
- **e2e:** `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/baby-care.spec.ts e2e/baby-home-option-b.spec.ts e2e/investments.spec.ts`
