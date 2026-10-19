# Tasks: Fix remaining baby + investments e2e

**Has API:** no · **Has DB:** no · **Has auth/PII/schema:** no

**Verify (confirm):**
- cwd `/Users/ptquang86/ws/my-apps`
- `npm run build`
- `npm test`
- `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/baby-care.spec.ts e2e/baby-home-option-b.spec.ts e2e/investments.spec.ts`

**TDD note:** Existing red e2e **are** the failing repro. Do not delete them. Add unit only when a pure helper/layout rule is extracted. Prefer focused e2e re-runs per cluster while fixing.

---

## Task 0: Investments isolate probe

**Description:** Run `e2e/investments.spec.ts` alone with auth storage. Record alone-green vs alone-red to choose flake harden vs product route fix (Grill Q2).

**Acceptance:**

- [ ] Probe result logged in Build notes / test-log
- [ ] Path chosen: harden goto **or** product `/investments/settings|new`

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: `investments` settings + new (may be flake-only)

**Files likely touched:** none for probe; later `e2e/investments.spec.ts` and/or investments settings/new pages

**Scope:** S

**Dependencies:** none

---

## Task 1: Restore Option B home row geometry + chips

**Description:** Put Nap|Diaper on one desktop band (`|Δy| < 48`), Kind height vs nap, Nap→Diaper above Pump; restore bottle ml chips + care hit targets (≥44/56 per asserts). Update skeletons for parity. Align bottle footer tip with chips/mock (120 vs 140).

**Acceptance:**

- [ ] Geometry tests 7–9, 14, 16 pass
- [ ] Birthday/settings bottle footer tip assert coherent (test 10 tip part)
- [ ] Skeleton mirrors live home order/radii

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: section order / row2 / Kind height / 3AM geometry / Nap→Diaper above Pump
- [ ] unit (optional): existing `baby-home.test.ts` / `baby-page-skeleton.test.ts` if layout helpers change

**Files likely touched:** `components/baby-home.tsx`, `components/baby-page-skeleton.tsx`, `components/baby-ml-chip-section.tsx`, related baby home tests

**Scope:** M

**Dependencies:** none

---

## Task 2: Locale EN↔VI settings H1 + VI home strings

**Description:** Selecting Tiếng Việt makes baby settings H1 exact `Cài đặt`; English → `Settings`; home/Custom/birth VI paths work.

**Acceptance:**

- [ ] baby-care EN↔VI toggle passes
- [ ] baby-home Vietnamese Custom/birth/home passes

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: EN↔VI toggles; Vietnamese Custom/birth/home

**Files likely touched:** baby settings locale UI / i18n wiring under baby settings

**Scope:** S

**Dependencies:** none

---

## Task 3: Custom time dismiss + scoped wet kind

**Description:** Custom Use closes dialog; `occurredAt` on create/quick-care; e2e (and product attrs if needed) avoid dual wet strict-mode.

**Acceptance:**

- [ ] diaper Custom occurredAt (baby-care) passes
- [ ] Diaper Custom wet quick-care body (option-b) passes

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: Custom time createBabyDiaper; Diaper Custom wet occurredAt

**Files likely touched:** Custom time modal / diaper sheet in baby home; `e2e/baby-home-option-b.spec.ts` locators; `e2e/baby-care.spec.ts` if needed

**Scope:** S

**Dependencies:** none

---

## Task 4: Growth symptoms / save enablement + Activities rows

**Description:** Temperature shows cough/ho (VI/EN); height/head/vitamin enable Save when valid; vaccine + medicine appear on Activities for edit/delete.

**Acceptance:**

- [ ] Growth medicine+temp; vitamin/height/head pass
- [ ] vaccine edit/delete; Activities delete medicine pass

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: Growth + Activities capture tests (failures 3–6)

**Files likely touched:** `components/baby-growth-page.tsx`, Activities list/cache invalidation client paths

**Scope:** M

**Dependencies:** none

---

## Task 5: Under-owner pending recovery + clear rules

**Description:** After ambiguous diaper chain fail and mid-save reload, show `baby-home-pending-recovery` under owner with Try again; clear-rules (definite clear / ambiguous keep / discard keeps timer) pass.

**Acceptance:**

- [ ] chain failure all-or-nothing passes
- [ ] reload mid-save under-owner passes (incl. after diaper)
- [ ] pending clear rules passes

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: chain / reload / pending clear (failures 11–13)

**Files likely touched:** `components/baby-home.tsx` pending recovery wiring; related client pending store helpers

**Scope:** M

**Dependencies:** Task 1 helpful (stable sections) but not hard-blocked

---

## Task 6: Investments settings/new green

**Description:** Per Task 0: if alone-green, harden goto/ready (retry, wait); if alone-red, fix investments settings/new route or workspace ready. Full Verify three-spec command must pass both tests.

**Acceptance:**

- [ ] settings entry + new form tests pass in focused Verify
- [ ] No Loans/Money regression required in this task (spot-check only if touched shared shell)

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: investments settings + new

**Files likely touched:** `e2e/investments.spec.ts` and/or investments settings/new pages / shell ready helpers

**Scope:** S

**Dependencies:** Task 0

---

## Task 7: Full Verify green

**Description:** Run confirmed Verify commands; all former 19 reds green; no new skips of those cases.

**Acceptance:**

- [ ] build + unit + focused e2e pass
- [ ] Former 19 failures listed in idea are green

**Tests (TDD — what turns red first):**

- [ ] e2e-already-exists: full focused three-file command

**Files likely touched:** none expected

**Scope:** S

**Dependencies:** Tasks 1–6

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused cluster e2e pass
- [ ] Skeleton parity if home layout changed
- [ ] Slice works end-to-end where applicable
