# TDD test-case review: baby-care-pump-lr-timer

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-19

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real / edge | Zod accepts `pump_l`/`pump_r` + duration; rejects unknown method | partial |
| 1 | real | `pump` + amountMl ok; timed side without inventing amount | yes |
| 1 | real / edge | `feedSessionSummaryParts` / `rollUpFeedPayload` — `pump`+ml; `pump_l` duration; multi-leg mix | yes |
| 1 | real | friendlyFeedMethod / Insights / timeline labels for `pump_l`/`pump_r` + ml `pump` | yes |
| 2 | real | Store start/stop for `pump_l`; migrate from `baby.breastTimer.v1` | yes |
| 2 | real | Zod + `planBabyQuickCare` `BREAST` + `side: pump_l` → duration `createFeed` | yes |
| 2 | edge | Zod rejects `PUMP_AMOUNT` without `amountMl` | yes |
| 2 | real | Idle `PUMP_AMOUNT` → `createPumpAmount` / `method: "pump"` (not formula) | yes |
| 2 | real / edge | Auto-finalize fixtures: idle; + running timed side; nap-open; `writesFeed` like FORMULA | yes |
| 2 | edge | Stale clear still applies | yes |
| 2 | edge | One running side at a time (switch breast ↔ pump) | no |
| 2 | edge | Corrupt store / unknown side ignored safely | partial |
| 3 | real | TimedCareChip running → `tapToStop` (not Done / tapToSave) | yes |
| 3 | real | Done-flash only after stop | yes |
| 3 | real | Home Pump amount → `PUMP_AMOUNT` / pump+ml | partial |
| 3 | real | Icon slots on home care controls | yes |
| 3 | real | Home skeleton Rows 1–3 (Row 4 with Task 4) | yes |
| 3 | real | E2E note: Pump L start → Tap to stop → Done → idle; amount picks ml | yes |
| 3 | real / edge | Home amount while timed side running sends `breastRunning` + clear (Bottle parity) | no |
| 3 / 5 | real | Adapter (2): Nap/Sleep use SLEEP open-session — **not** care-timer store | no |
| 4 | real | Guidelines default collapsed; exclusive open | yes |
| 4 | real | i18n keys for four sections + Pump table rows | yes |
| 4 | real | Home skeleton four guideline header placeholders | yes |
| 5 | real | `BABY_GROWTH_PAGE_CHIPS` excludes `pump` | yes |
| 5 | real | Extend `baby-care-one-tap.test.ts` feed/sleep/diaper chrome | yes |
| 5 | real | Feed `pump_l` stop → duration payload | yes |
| 5 | real | E2E notes: feed Pump L; growth no Pump; sleep Done flash | partial |
| 5 | real | Feed / sleep / growth skeleton parity when chip order changes | no |
| 6 | real | Remaining EN/VI keys; e2e smoke from Task 3/5 notes | yes |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 1 | Timed pump **requires** duration; amount `pump` **requires** `amountMl` — plan only covers accept + unknown method | Unit `createBabyFeedSchema`: `method: "pump_l"` without `durationSec` → fail; `method: "pump"` without `amountMl` → fail. Keep accept cases already planned. |
| Major | 2 | Acceptance: **one running side at a time** — not in TDD list | Unit on widened store: start `pump_l` while `breast_r` running → only `pump_l` active (same switch spirit as today’s breast L↔R). |
| Major | 3 | Home Pump amount while a timed side is running must mirror Bottle (`breastRunning` + clear) — Task 2 fixtures cover planner only | Unit (home / quick-care press helper): with care-timer `pump_r` (or `breast_*`) running + amount ml → action `PUMP_AMOUNT`, `breastRunning.side/durationSec` set, `localAfter` clear/stop like FORMULA. Idle path stays amount-only. |
| Major | 3 + 5 | Adapter (2) lock: Nap/Sleep must **not** use care-timer store | Unit: home Nap / sleep Start→End mutate `SLEEP` (or sleep form Start/End) only; assert no care-timer `start(side)` / no `BREAST` timed-side write for Nap/Sleep. Pair with TimedCareChip chrome shared. |
| Major | 5 | Log/growth skeleton parity required in acceptance; no red-first bullet | Unit: feed/sleep (and growth if chips change) skeleton markers match live chip order — extend `baby-page-skeleton.test.ts` patterns. |
| Enhancement | 2 | Corrupt / unknown side after widen | Extend parse: bad JSON or `side: "nope"` → null (keep existing breast corrupt cases). |
| Enhancement | 5 / 6 | Existing e2e `Growth logs … and pump` must be **rewritten**, not dropped | Growth e2e: no Pump capture control; Insights/history still OK for legacy growth pump rows if asserted elsewhere. |

## Real scenarios checked

- Happy path: Timed `pump_l`/`pump_r` create; idle Pump amount; home layout + Tap to stop; guidelines exclusive; feed/sleep mount; Growth capture drops pump — **mostly planned and strong** (Tasks 1–2 fixtures especially).
- User-visible failures: Zod `BAD_USER_INPUT` for missing amount / unknown method — **partial** (need explicit reject duration/amount). UI pending/retry — reuse existing home coverage; no new Fix ask.
- Empty / loading / permission: Home skeleton Rows 1–4 — **planned**. Feed/sleep/growth skeletons — **gap**. Auth/workspace — reuse Baby gate; no new permission cases.

## Edge scenarios checked

- Boundaries / invalid input: Unknown method; `PUMP_AMOUNT` without ml; stale timer; rollup multi-leg — **planned**. Missing duration on timed pump / missing ml on `pump` — **gap**. One-running-side switch — **gap**.
- Concurrency / double-submit / idempotency: Existing home `inFlightRef` + sticky `clientRequestId` suites stay; no new Fix ask this pass.
- Offline / partial data / race: Migrate in-flight breast → careTimer key — **planned**. Amount-while-running finalize — planner **planned**, home wire **gap**. Adapter mix-up (Nap in careTimer) — **gap**.

## Fix ask for Build

Concrete tests to add or strengthen (few strong ones):

1. **Task 1 — `createBabyFeedSchema` timed pump needs duration; amount pump needs ml:** `pump_l`/`pump_r` without `durationSec` fail; `pump` without `amountMl` fail.
2. **Task 2 — care-timer one running side:** Start `pump_l` while `breast_r` (or other side) running → only the new side is active.
3. **Task 3 — home `PUMP_AMOUNT` with running timed side:** Press amount while timer running → `breastRunning` present + clear/stop localAfter (FORMULA parity); idle → amount only.
4. **Task 3 / 5 — adapter (2) Nap/Sleep not care-timer:** Nap/Sleep paths use SLEEP / sleep Start–End only; no care-timer start for those chips.
5. **Task 5 — feed/sleep/(growth) skeleton order:** Skeleton markers match live chip order when Task 5 changes UI (same PR).

Fold items 1–5 into `04-tasks.md` TDD bullets (Tasks 1, 2, 3, 5) before Gate B when practical. Enhancements optional.

## Round notes

- `03a-design-review-log.md` Result **clean** (round 3). Locks held for this review: D7 TimedCareChip + adapters; D6 `pump_l`/`pump_r` + `pump`+ml; `PUMP_AMOUNT` ≠ FORMULA but ≡ FORMULA auto-finalize; D5 sleep≈Nap via adapter (2); D3 exclusive guidelines; Growth capture no pump; skeleton with layout.
- Skimmed: `lib/baby-breast-timer-store.test.ts` (migrate/corrupt/stale patterns exist for breast-only), `lib/baby-quick-care-plan.test.ts` + `lib/baby-quick-care-order-fixture.ts` (FORMULA/BREAST rows — ready to extend for `PUMP_AMOUNT`), `lib/baby-feed-session.test.ts` (rollup/summary), `lib/baby-home-done-flash.test.ts`, `components/baby-home.test.ts` (Done flash / section order — will need Tap-to-stop + Row 3–4 updates), `components/baby-care-one-tap.test.ts`, `components/baby-page-skeleton.test.ts`, `e2e/baby-home-option-b.spec.ts` (Bottle-while-running + breast Done), `e2e/baby-care.spec.ts` (Growth still logs pump).
- Planned Task 2 auto-finalize + TimedCareChip tapToStop + Growth chip exclude are the right core. Gaps are **Zod rejects**, **one-side store**, **home amount+running wire**, **adapter-2 isolation**, and **log/growth skeleton** — not a long weak list.
- Result **needs more tests** until Fix ask 1–5 are in tasks (or equivalent red-first cases).
- Fix ask 1–5 (+ Enhancement corrupt parse) folded into `04-tasks.md` TDD checkboxes (Tasks 1, 2, 3, 5).
