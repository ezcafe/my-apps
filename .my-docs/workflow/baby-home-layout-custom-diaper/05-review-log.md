# Review log: baby-home-layout-custom-diaper

## Adversarial test review

**Result:** clean  
**Round:** 2 (verify after Fix)  
**Profile:** lite  
**Updated:** 2026-09-20

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | Task 7 / log e2e | Log Custom time path missing in `baby-care.spec.ts`. | fixed (r1) — verified: `diaper Custom time → createBabyDiaper sends occurredAt` fills `datetime-local`, asserts `occurredAt` truthy + no `endedAt` |
| Major | Log form wiring | Source-grep theater; no sleep-form tests; no pending→field map asserts. | fixed (r1) — verified: helpers `babyLogDiaper*` / `babyLogSleep*` unit-tested; forms call them; source chrome matches builders |
| Major | Custom height token | Height suite omitted `BabyCustomTimeChip`. | fixed (r1) — verified: chip rendered; asserts `2*2.75rem+3px` / `BABY_HOME_BIG_CONTROL_MIN_H` |
| Enhancement | BREAST IGNORE | Task 1 checklist gap vs FORMULA/PUMP only. | fixed (r1) — verified: loop includes BREAST + `breastRunning` + times → insert at server now |
| Enhancement | Clear pending after success | Helper only; no form/home integration assert. | demoted Nit — Task 2 optional; helper covered; prod clears on success (home + log forms) |
| Enhancement | Kind tiles beside Custom | No explicit selectable-beside-Custom test. | closed — new log e2e sets Custom then taps Wet; kind 2×2 + Custom are sibling sections (not a kind replacement) |
| Enhancement | `babyHomeCustomMlEditAction` tautology | Both branches return `"edit"`. | demoted Nit — intentional always-edit; Task 6 adjacent; not Custom-time adversarial gap |
| Nit | Yoga “reaches handler” / bad-datetime mock | Weak edge vs Zod unit truth. | open (FYI) |
| Nit | Clear-pending after success (integration) | Optional Task 2; no home/form clear-after-save assert. | open (FYI) |
| Nit | `babyHomeCustomMlEditAction` always `"edit"` | Dead branch / always-edit helper. | open (FYI) |
| Nit / FYI | `baby-custom-time-modal.test.ts` | Static markup only. | open (FYI) |

**Covered well (do not re-litigate):**

- Task 1 truth table units (incl. BREAST IGNORE after Fix).
- Zod ISO; pending clock field map; log mutation input builders.
- Home e2e Custom time body fields; log e2e diaper Custom → `occurredAt`.
- Height token on `BabyCustomTimeChip`; merged stop / ml Edit / row markers as in round 1.

**Round 2 notes (verifier):**

- Re-checked Fix artifacts only — did not change code.
- All three round-1 Majors hold with real asserts (e2e body, builder field map + form wire, chip height render).
- Remaining former Enhancements closed or demoted to Nit/FYI — zero Critical / Major / Enhancement open → **clean**.

### Fix ask (adversarial-tests)

_(none — clean)_

### Prior round (kept for history)

**Round 1 Result:** needs fix · **Updated:** 2026-09-20

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | Task 7 / `e2e/baby-home-option-b.spec.ts` vs `e2e/baby-care.spec.ts` | Missing log Custom time e2e. | fixed |
| Major | `baby-diaper-form.test.ts`; no `baby-sleep-form.test.*` | Source-grep theater; no pending→field map. | fixed |
| Major | `baby-home-control-height.test.ts` | No `BabyCustomTimeChip` height assert. | fixed |
| Enhancement | BREAST IGNORE | Checklist gap. | fixed |
| Enhancement | Clear pending after success | Optional integration gap. | open → later demoted Nit (r2) |
| Enhancement | Kind beside Custom | Optional gap. | open → closed (r2) |
| Enhancement | `babyHomeCustomMlEditAction` tautology | Dead branch. | open → demoted Nit (r2) |
| Nit | Yoga / modal | FYI. | open |

### Fix notes (adversarial round 1)

**Fixed by:** Fix agent (Senior Developer) · **Date:** 2026-09-20

| Finding | What changed |
|---------|----------------|
| Major Task 7 log e2e | Added `e2e/baby-care.spec.ts` test: diaper Custom time → `createBabyDiaper` body has `occurredAt`, no `endedAt`. |
| Major form wiring | Added `babyLogDiaperMutationInput` / `babyLogSleepStartMutationInput` / `babyLogSleepEndMutationInput`; diaper + sleep forms call them; unit asserts pending → field map; new `baby-sleep-form.test.ts`. |
| Major height token | `lib/baby-home-control-height.test.ts` renders `BabyCustomTimeChip` and asserts Nap-sized `2*2.75rem+3px` floor / `BABY_HOME_BIG_CONTROL_MIN_H`. |
| Enhancement BREAST IGNORE | Extended optional-time suite: BREAST via `breastRunning` + times still inserts at server now (with FORMULA/PUMP_AMOUNT). |

**Left open after Fix (resolved in r2 verify):** clear-pending / kind-beside / tautological Edit → Nit or closed; Yoga/modal Nits remain FYI.

**Tests run (unit, Fix):** custom-time, control-height, diaper-form, sleep-form, quick-care — pass. E2E added only (not run in Fix).

**Self-approve:** no — verifiers re-check (this round).

---

## Quality

**Result:** clean  
**Round:** 2 (verify after Fix)  
**Profile:** lite  
**Updated:** 2026-09-20  
**Verifier:** Senior Verifier (did not author draft; did not change code)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `BabyDiaperSkeleton` / `BabySleepSkeleton` log Custom sibling parity | Log live forms use 12rem auto-fit + Nap-sized Custom beside kind/timer; skeletons lagged. | fixed (r1) — verified: both skeletons use `minmax(…12rem…)`, Custom sibling (`diaper-custom-time` / `sleep-custom-time`) with `BABY_HOME_BIG_CONTROL_MIN_H`; tests lock grid + height |
| Enhancement | `home.customTime` vs `home.formulaCustom` face labels | Task 2 wanted time Custom ≠ ml Custom at a glance. | fixed (r1) — verified: EN “Custom time” / “Custom ml”; VI “Tùy chọn giờ” / “Tùy chọn ml”; idle open “Choose time” / “Chọn giờ”; `baby-i18n.test.ts` asserts ≠ |
| Enhancement | `BabyHomeSkeleton` empty footers (`nap-custom-time` / `diaper-custom-time` / `pump-amount`) | Live empty footer slots vs skeleton `h-4` stubs. | fixed (r1) — verified: empty `data-skeleton-footer="empty"` (no `h-4`); matches live empty `data-section-footer`; test covers all three |
| Nit / FYI | `components/baby-home.tsx` (~1962 lines) | Layout + Custom clock + Edit wiring grew home; modal/helpers extracted, orchestration still inline. Explicitly deferred this Fix round (large refactor). | deferred (FYI) — not blocking Quality |
| Nit | `babyHomeCustomMlEditAction` tautology | Both branches `"edit"`. | open (FYI) |
| Nit | `babyHomeLocalInputToIso` comment | Says “ISO with offset”; emits `…Z`. | open (FYI) |

**Axes checked (r2):** Skeleton parity (log + home footers) · i18n face distinction · Architecture size (deferred FYI only) · Correctness/patterns from r1 not re-litigated · API deferred to API lens · Security light only.

**Honored well (do not re-litigate):**

- Pattern 1–3 layout/copy; pending clock field map; home Custom sections; log forms Custom sibling.
- Anti-patterns avoided (no 3-col Pump+ml; kinds on 2×2; no second ml modal for Nap).

**API / DB:** not deep-reviewed here (SPM api lens; Has DB no).

### Fix ask (quality)

_(none — clean)_

### Fix notes (quality round 1)

**Fixed by:** Fix agent (Senior Developer) · **Date:** 2026-09-20 · **Mode:** quality

| Finding | What changed |
|---------|----------------|
| Major log skeleton parity | `BabyDiaperSkeleton` / `BabySleepSkeleton`: 12rem auto-fit row + Nap-sized Custom sibling; tests assert grid + height. |
| Enhancement Custom face labels | EN/VI: `home.customTime` = “Custom time” / “Tùy chọn giờ”; `home.formulaCustom` = “Custom ml” / “Tùy chọn ml”; idle open = “Choose time” / “Chọn giờ”. i18n asserts ≠. |
| Enhancement empty footers | Home skeleton: `nap-custom-time` / `diaper-custom-time` / `pump-amount` use empty `data-skeleton-footer="empty"` (no `h-4`). |
| Enhancement baby-home.tsx size | **Skipped** this Fix (per ask) → demoted Nit/FYI deferred in r2. |

**Left open after Fix (resolved in r2 verify):** baby-home.tsx size → Nit/FYI deferred; Edit tautology + ISO comment remain FYI.

**Tests run (unit, Fix):** `baby-page-skeleton.test.ts`, `baby-i18n.test.ts` — pass.

**Self-approve:** no — verifiers re-check (this round).

### Round 2 notes (verifier)

- Re-checked Fix artifacts only — did not change code.
- All three Fix targets hold (log skeleton Custom sibling, time≠ml labels, empty home footers).
- `baby-home.tsx` extraction Enhancement demoted to Nit/FYI deferred (explicit skip this round) so Result can be clean.
- Zero Critical / Major / Enhancement open → **clean**.

### Prior round (kept for history)

**Round 1 Result:** needs fix · **Updated:** 2026-09-20

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | Log `BabyDiaperSkeleton` / `BabySleepSkeleton` lag | Kind-only / single-chip vs live Custom sibling. | fixed |
| Enhancement | `baby-home.tsx` size | Decomposition deferred. | open → Nit/FYI deferred (r2) |
| Enhancement | Custom time vs ml labels | Weak face distinction. | fixed |
| Enhancement | Home skeleton empty footers | `h-4` stubs vs live empty. | fixed |
| Nit | Edit tautology / ISO comment | FYI. | open |

---

## Merged SPM (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

Filled by parent from single **api** lens (SPM plan: api; no Merge Task for 1 lens).

**Round:** 1
**Result:** clean

### Winners (Fix these)

| Severity | Sources (api/db/security/perf/memory) | Finding | Decision |
|----------|---------------------------------------|---------|----------|
| — | api | None — `05-lens-api.md` Result clean | — |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| — | — | Only one lens launched |

### Fix ask (for Fix agent)

_(empty — clean)_

**Round notes:**

- Parent copied API lens Result **clean** into Merged SPM (1 lens; no Merge Task).
- Adversarial clean · Quality clean · API lens clean → proceed to lite test.

