# Tasks: Activities colors + Home care feedback polish

## Task 1: Activity color map + regular cue helpers

**Description:** Add pure helpers: activity family → accent token key; row + ageDays → border state (`below`/`near`/`above`/`none`). Reuse feed ml bands; add soft sleep duration min/max per sleep age band. Parse ml/duration from activity log row fields/payload.

**Acceptance:**

- [ ] Unit coverage for family map (feed/sleep/diaper/pump/growth/med)
- [ ] Unit coverage for ml + sleep duration banding; unknown age → `none`
- [ ] No medical claim strings in helpers

**Tests (TDD — what turns red first):**

- [ ] `lib/baby-activity-color.test.ts` — map families
- [ ] `lib/baby-activity-regular-cue.test.ts` — below/near/above/none cases

**Files likely touched:** `lib/baby-activity-color.ts`, `lib/baby-activity-regular-cue.ts`, `lib/baby-age-guide.ts` (+ tests)

**Scope:** M

**Dependencies:** none

---

## Task 2: Activities row chrome + skeleton parity

**Description:** Apply left accent bar + tinted icon chip border on mobile cards and desktop event cells using Task 1 helpers. Wire CSS variables. Update Activities skeletons to match chrome (zero CLS).

**Acceptance:**

- [ ] Mobile + desktop show type accent
- [ ] Time/ml rows show comparison border state when age known
- [ ] Skeleton mirrors bar/chip layout
- [ ] Light + dark readable

**Tests (TDD — what turns red first):**

- [ ] Markup/unit test on row chrome class/aria for sample feed+sleep rows
- [ ] Skeleton test asserts accent placeholders present

**Files likely touched:** `components/baby-activities-page.tsx`, `components/baby-page-skeleton.tsx` (+ tests), `app/globals.css`

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: Dual care-timer slots (breast vs pump)

**Description:** Widen care-timer storage to concurrent breast + pump slots; migrate legacy single-side JSON. Update read/write helpers and Home state.

**Acceptance:**

- [ ] Breast and pump timers can both be non-null
- [ ] Legacy single timer migrates into correct family slot
- [ ] Unit tests for serialize/parse/migrate

**Tests (TDD — what turns red first):**

- [ ] Extend `lib/baby-breast-timer-store.test.ts` for dual slots + migrate

**Files likely touched:** `lib/baby-breast-timer-store.ts`, `components/baby-home.tsx`

**Scope:** M

**Dependencies:** none (parallel with Task 1)

---

## Task 4: Plan/localAfter — Pump does not clear breast

**Description:** Update `localAfterFromQuickRequest` / `planBabyQuickCare` so pump family never clears breast slot and does not attach breast `breastRunning`. Breast L/R still preempt each other; pump L/R preempt each other only.

**Acceptance:**

- [ ] Pump L start with breast L running → breast stays; pump starts
- [ ] PUMP_AMOUNT with breast running → breast stays; no breastRunning on wire
- [ ] Breast L→R still switches breast slot

**Tests (TDD — what turns red first):**

- [ ] `lib/baby-quick-care-plan.test.ts` (or existing) cases for pump vs breast independence
- [ ] Pump L → Pump R preempts pump slot only (breast slot untouched)

**Files likely touched:** `lib/baby-quick-care-plan.ts` (+ tests)

**Scope:** M

**Dependencies:** Task 3

---

## Task 5: Server — Pump skips endNap / does not force saveBreast

**Description:** In `features/baby/server/quick-care.ts`, for pump family actions skip auto-ending open sleep; do not save breast unless `breastRunning` present (client should omit for independence).

**Acceptance:**

- [ ] Pump L / PUMP_AMOUNT with open nap → nap remains open
- [ ] Non-pump actions still end open nap as today
- [ ] Existing breast/nap fixtures still pass where unchanged
- [ ] Replay/idempotent pump with open nap still leaves nap open when fixture exists

**Tests (TDD — what turns red first):**

- [ ] Server/unit quick-care tests: pump + open sleep; pump + breastRunning omitted; replay pump + open nap when fixture exists

**Files likely touched:** `features/baby/server/quick-care.ts`, `features/baby/server/quick-care.test.ts` (or graphql yoga tests)

**Scope:** M

**Dependencies:** Task 4 (wire contract)

---

## Task 6: Quiet success — remove Saved banners for all care actions

**Description:** Stop setting Home success `message` from step message keys / `home.savedFeed` after quick-care success. Keep error/blocked/recovery messages. Keep chip done-flash.

**Acceptance:**

- [ ] No “Saved breast feed” / “Started nap” / sibling success banners after save
- [ ] Done-flash still appears on chips
- [ ] Fail-closed / chainFailed still show message

**Tests (TDD — what turns red first):**

- [ ] Update `components/baby-home.test.ts` — success path has no success message
- [ ] Adjust e2e that assert Saved toast if any

**Files likely touched:** `components/baby-home.tsx`, tests, possibly e2e

**Scope:** S

**Dependencies:** none (parallel)

---

## Task 7: Selective timer re-render + stable Nap height

**Description:** Drive Nap (and pump) elapsed via isolated tick children; reserve Nap subtitle/helper space so idle↔running height is unchanged.

**Acceptance:**

- [ ] Starting/stopping a timer does not remount unrelated chips (assert stable test ids / no full grid remount in unit where feasible)
- [ ] Nap chip height equal idle vs running in unit/layout fixture or e2e box assert
- [ ] Unrelated chips do not flash/remount on timer tick

**Tests (TDD — what turns red first):**

- [ ] Nap height fixture test (markup min-height / reserved subtitle)
- [ ] Elapsed child isolation test (existing breast pattern extended)

**Files likely touched:** `components/baby-home.tsx`, `components/baby-timed-care-chip.tsx` (+ tests)

**Scope:** M

**Dependencies:** Task 3

---

## Task 8: E2E coverage for Pump independence + quiet save + Activities cue

**Description:** Add/adjust Playwright coverage: Pump does not end nap / stop breast; no Saved banner; Activities row exposes accent/cue attributes for a sample row; status shows recent pump when fixture provides `lastPump`.

**Acceptance:**

- [ ] E2E: open nap → Pump L → nap still running; breast timer unaffected when applicable
- [ ] E2E: save care → no Saved toast text
- [ ] E2E or UI assert: Activities feed/sleep row has cue/accent hook
- [ ] E2E or Home unit: pump status line visible when `lastPump` present

**Tests (TDD — what turns red first):**

- [ ] Extend `e2e/baby-home-option-b.spec.ts` / `e2e/baby-care.spec.ts` as needed
- [ ] Activities e2e or focused UI test for `data-activity-accent` / cue

**Files likely touched:** `e2e/*`, possibly Activities page test hooks

**Scope:** M

**Dependencies:** Tasks 2, 5, 6, 7

---

## Task 9: Recent pump status line (Home info block)

**Description:** Add `lastPump` to home quick status (newest pump-family feed). Show fourth status line after diaper with empty/item copy. Update GraphQL/query fixtures, Home `statusLine("pump")`, and Home skeleton (4 lines).

**Acceptance:**

- [ ] Status block shows recent pump detail + when, or empty copy
- [ ] `lastPump` independent of `lastFeed` when last feed is breast/formula
- [ ] Skeleton has 4 status placeholders (zero CLS)
- [ ] EN + VI strings present

**Tests (TDD — what turns red first):**

- [ ] `features/baby/server/home-quick-status.test.ts` — lastPump from pump / pump_l / legs; null when only breast/formula
- [ ] `components/baby-home.test.ts` — pump status empty + item markup
- [ ] Skeleton test asserts 4 status rows

**Files likely touched:** `features/baby/server/home-quick-status.ts`, GraphQL/query options, `components/baby-home.tsx`, `components/baby-page-skeleton.tsx`, `messages/baby/en.ts`, `messages/baby/vi.ts`, e2e helpers

**Scope:** M

**Dependencies:** none (parallel with Task 6)

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused tests pass
- [ ] Slice works end-to-end where applicable
