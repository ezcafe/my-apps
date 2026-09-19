# Review log: Baby home — quiet save, under-trigger recovery

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-home.test.ts` ~603–618 | **False green — timed-chip under-owner.** Orphaned `sending` case slices `indexOf(baby-care-chip-breast_l)+2500` and matches Try again / recovery testid in that window. It never asserts `data-pending-owner="breast_l"` or that recovery is nested inside the Left chip (e2e-style). Recovery wrongly on `breast_r` (sibling in the same 2500-char window) still passes. Bottle unknown correctly asserts `data-pending-owner="bottle"`; breast does not. | done |
| Major | `e2e/baby-home-option-b.spec.ts` `pendingTitle` ~123–127; hang in-flight ~1974–1975 | **False green — no page `pendingTitle`.** Helpers were re-scoped to `[data-testid=baby-home-pending-recovery]` only. Hang in-flight asserts `pendingRecoveryUnder(...).toHaveCount(0)` but **not** page-wide absence of “could not confirm” / VI equivalent. A revived page-level failure `<p>` **without** that testid would not fail this e2e (the original bug surface). Unit mid-flight does whole-markup text assert; e2e does not mirror it. | done |
| Major | `components/baby-home.test.ts` under-owner it; `e2e/...` hang+reload ~1945–2002 | **Missing under-owner matrix.** Decision 1 / Tasks 2–3 cover all owners. Unit markup only seeds breast_l (orphaned) + bottle (unknown/tooOld). No unit placement for nap, diaper, pump_l, pump_r, pump_amount. Hang+reload e2e covers bottle/diaper/nap/breast_l only — **pump L·R and pump amount never** assert hang → quiet → reload → under-owner recovery. Wiring can rot without a red. | done |
| Major | `e2e/baby-home-option-b.spec.ts` ambiguous keep loop ~2157–2184 | **Weak under-owner on live fail.** After BAD_REQUEST / 500 / abort, asserts only `pendingTitle(page)` (any recovery region). Does **not** assert `pendingRecoveryUnder(page, "diaper")`. Wrong-owner recovery still greens. Hang+reload is stronger; this path is the common fail surface. | done |
| Enhancement | `e2e/baby-home-option-b.spec.ts` (missing); unit `baby-home.test.ts` ~590–601 | **Retry mid-flight not exercised live.** Unit seeds `savingSeed: true` + `unknown` (good SSR contract). No e2e: seed unknown → click Try again with hang → recovery hidden while hung → after reload recovery returns. Live Retry keeps storage `unknown` by design; only `saving` quiets chrome — worth one e2e so a bypass of the helper on Retry cannot ship. | done |
| Enhancement | `components/baby-home.test.ts` ~253–262 | **chainFailed / no double-shout is source-scan only.** Allowed by Task 2 (“assert source or rendered status”), but does not render ambiguous fail and assert `role="status"` lacks `home.chainFailed` while under-owner recovery is present. Easy to regress with a second `setMessage`. | done |
| Enhancement | `components/baby-home.test.ts` ~624–630, ~648–650, ~675–678 | **Brittle “no page strip” asserts.** Relies on `border border-border p-3` class soup + comment string `Pending bar — below care controls`. Prefer durable contract: zero `baby-home-pending-recovery` outside owner regions, and/or page-wide failure-title count 0 while mid-flight. | done |
| Nit | `e2e/baby-home-option-b.spec.ts` successful breast start ~188+ | Happy-path start never asserts no failure-title flash; only hang case covers quiet in-flight. Low risk if Major #2 page-wide assert is added to hang. | done |

**Result:** needs fix (0 Critical, 4 Major, 3 Enhancement, 1 Nit) → **fixed this round**

**Round notes:**

- Profile **lite**; SPM **none**. Attack focus: missing tests, false greens, hang/reload, Retry mid-flight, no page pendingTitle, under-owner recovery.
- Helper units (`babyQuickPendingOwner` / `babyQuickPendingRecoveryVisible`) and chip slot unit look solid — not mock theater.
- 04a Fix asks (Retry mid-flight home unit; tooOld under-owner e2e) are present; remaining holes are false-green placement, page-bar e2e blind spot, and incomplete owner matrix (esp. pump).
- No production code in this stage.

**Fix ask (for Fix agent — adversarial-tests):**

1. Strengthen orphaned breast unit: assert `data-pending-owner="breast_l"` **inside** the Left chip markup (or nested containment); optionally assert Right chip has no recovery.
2. E2E hang in-flight: assert page-wide no “could not confirm” / VI (or `getByText` count 0) in addition to under-owner recovery count 0.
3. Add under-owner coverage for at least one pump timed side + pump_amount (unit seed and/or hang+reload e2e); add diaper/nap unit placement if not folding into e2e only.
4. Ambiguous fail e2e: assert `pendingRecoveryUnder(page, "diaper")` (not only `pendingTitle(page)`).
5. (Enhancement) E2E Retry mid-flight quiet; rendered no-`chainFailed` with inline recovery; harden page-strip absence asserts.

### Round 2 (re-verify after Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No new Critical / Major / Enhancement. Prior Majors + Enhancements verified closed against draft tests. | — |

**Result:** clean (0 Critical, 0 Major, 0 Enhancement)

**Round notes:**

- Profile **lite**; fresh context; **no production code** this pass.
- **Major 1 closed:** `assertRecoveryNestedInChip` + Right-chip exclusion + `countRecovery === 1` for orphaned `breast_l` (`baby-home.test.ts` ~665–678).
- **Major 2 closed:** Hang in-flight e2e asserts page-wide `getByText(/could not confirm|chưa xác nhận/i).toHaveCount(0)` plus under-owner count 0 (~1976–1980); Retry mid-flight e2e mirrors (~2043–2046).
- **Major 3 closed:** Unit seeds pump_l / pump_amount / diaper / nap (+ breast_l / bottle); hang+reload e2e adds `pump_l` + `pump_amount` (~2008–2013). Fix ask was “at least one pump timed side + pump_amount.”
- **Major 4 closed:** Ambiguous keep loop asserts `pendingRecoveryUnder(page, "diaper")` (~2232–2233).
- **Enhancements closed:** Retry mid-flight e2e (~2016–2052); rendered status lacks chainFailed copy with inline recovery (~795–812); strip asserts use `countRecovery` + status-region text (no class-soup).
- **Nit (non-blocking):** `breast_r` / `pump_r` still lack dedicated home markup / hang e2e; owner map is covered in `baby-quick-care-pending.test.ts` and L-side chip nesting is asserted — same chip path as L.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/baby-home.tsx` bottle / pump-amount selection (~345–365, ~917); design owner map | **Missing pending ml highlight.** Design owning-trigger map: FORMULA / PUMP_AMOUNT recovery under the group and “highlight matching ml if present.” Live tap sets `formulaOverride` / pump override so selection paints, but remount / orphaned pending only drives under-group recovery — `selectedMl` is not derived from `pending.request.action.amountMl`. Caregiver sees Try again under Bottle/Pump amount without the stored ml chip selected. | done |
| Nit | `components/baby-home.tsx` recovery Activities `Link` (~504–508) | `min-h-11` on a default-inline `Link` often does not grow the hit box to 44px (same pattern as birth-prompt links). Prefer `inline-flex items-center min-h-11` on recovery actions if tightening hit targets. | done |
| Nit | `components/baby-timed-care-chip.tsx` ~83–85 + `renderPendingRecovery` | Recovery is wrapped twice (`data-slot="timed-care-recovery"` around an already-rooted recovery `<div>`). Harmless; optional flatten. | done |

**Result:** needs fix (0 Critical, 0 Major, 1 Enhancement, 2 Nit) → **fixed this round**

**Round notes:**

- Profile **lite**; SPM **none**. Axes: correctness vs 03-design Feedback contract, readability, DESIGN_GUIDE tokens/hit targets, overbuild.
- **Matches design well:** page retryable + tooOld strips removed; `babyQuickPendingRecoveryVisible(!saving)` quiets live start and Retry mid-flight; orphaned `sending` recovers when `!saving`; under-owner wiring for breast/pump timed, nap, bottle, diaper, pump_amount; dedicated recovery `<div>` (not inside muted helper `<p>`); `text-sm text-destructive` + `min-h-11` + `rounded-[var(--radius-sm)]`; ambiguous catch skips `home.chainFailed` status shout; confirm-then-start (`localAfter` / `writeBreast` only after confirmed mutate); helpers lean (no storage/API change); no always-on error band → skeleton unchanged OK.
- **Not overbuilt:** small pure helpers + optional chip slot; no new Alert/page chrome.
- Adversarial Majors are **test** holes; Quality Enhancement is **product** polish vs owner-map highlight. Combined pipeline still **needs fix**.

**Fix ask (for Fix agent — quality):**

1. When recovery-visible for `bottle` / `pump_amount`, drive chip selection (and `ensureMlInBottleChips` if needed) from stored `pending.request.action.amountMl` so remount / orphaned pending highlights the matching ml when that chip exists.
2. (Nit, optional) `inline-flex items-center` on recovery Activities link; flatten double recovery wrapper on timed chips.

### Round 2 (re-verify after Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No new Critical / Major / Enhancement. Prior Enhancement + Nits verified closed. | — |

**Result:** clean (0 Critical, 0 Major, 0 Enhancement)

**Round notes:**

- Profile **lite**; fresh context; **no production code** this pass.
- **Enhancement closed — pending ml highlight:** When `recoveryVisible` and owner is `bottle` / `pump_amount`, `recoveryAmountMl` comes from `pending.request.action.amountMl`; drives `selectedBottleMl` / `selectedPumpMl` and `ensureMlInBottleChips` (`baby-home.tsx` ~485–502, ~943–954). Wired into `BabyBottleMlChips` `selectedMl`. Mid-flight (`!recoveryVisible`) does not force highlight.
- **Unit coverage:** Unknown FORMULA 120 → `data-bottle-ml="120"` selected under bottle; PUMP_AMOUNT 90 → selected under pump-amount (`baby-home.test.ts` ~687–738).
- **Nit closed — recovery Activities Link:** `inline-flex min-h-11 items-center` (~518–521).
- **Nit closed — timed-chip wrapper:** `BabyTimedCareChip` mounts `recovery` once (~84); no extra `data-slot` wrap.
- Design owner-map “highlight matching ml if present” satisfied for remount / orphaned pending.

---

## Merged SPM (Security ‖ Performance ‖ Memory)

**Round:** —
**Result:** skipped — SPM plan none

---

## Fix notes (fix-review · lite)

**TDD:** Red unit first (ml highlight + nested breast owner + pump/diaper/nap placement) → green after home selection + chip flatten; then e2e asserts.

### Adversarial

1. **Breast nested owner (Major):** Unit uses `assertRecoveryNestedInChip` — `data-pending-owner="breast_l"` between Left chip open and Right chip; Right slice has no recovery.
2. **Hang page-wide title (Major):** E2E hang in-flight asserts `getByText(/could not confirm|chưa xác nhận/i).toHaveCount(0)` plus under-owner count 0.
3. **Owner matrix (Major):** Unit seeds pump_l, pump_amount, diaper, nap; hang+reload e2e adds `pump_l` + `pump_amount`.
4. **Ambiguous fail under diaper (Major):** Keep-unknown loop asserts `pendingRecoveryUnder(page, "diaper")`.
5. **Enhancements:** E2E Retry mid-flight quiet; rendered no `chainFailed` copy with inline recovery; strip asserts use recovery count + status-region text (no class-soup).

### Quality

1. **Pending ml highlight (Enhancement):** When recovery-visible for bottle / pump_amount, `selectedMl` + `ensureMlInBottleChips` use `pending.request.action.amountMl`.
2. **Nits:** Activities `Link` → `inline-flex items-center min-h-11`; timed-chip drops extra `data-slot` wrapper (recovery rooted once).

### Tests run

- `npx tsx --import ./scripts/test-env.mjs --test components/baby-home.test.ts components/baby-timed-care-chip.test.ts` → **26 pass**
