# Test log: baby-care-pump-lr-timer

**Result:** success
**Mode last run:** full
**Round:** 3 (suite after Fix)
**Updated:** 2026-09-19 14:39 +0700

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Compiled OK; TypeScript OK; 70 pages |
| Unit | `npm test` | 0 | 1041 pass, 0 fail, 16 skipped (~6.8s) |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e.
Sources: `01-idea.md` success criteria; Task 3/5/6 e2e notes in `04-tasks.md`.
Scanned: `e2e/baby-home-option-b.spec.ts`, `e2e/baby-care.spec.ts`, `e2e/helpers/baby-home-graphql.ts`.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Home **Pump L** start → Tap to stop → Done → idle (duration-only) | `e2e/baby-home-option-b.spec.ts` → `Pump L start → Tap to stop → Done → idle` | covered |
| Home **Pump amount** (Bottle-like, `PUMP_AMOUNT` + ml) | `e2e/baby-home-option-b.spec.ts` → `Pump amount chip posts PUMP_AMOUNT with ml` | covered |
| `/baby/feed` **Pump L** duration-only stop | `e2e/baby-care.spec.ts` → `feed Pump L stop posts createBabyFeed duration` | covered (skipped this run — needs `E2E_STORAGE_STATE`) |
| Feed TimedCareChip primary (Pump L visible; timers above amount) | `e2e/baby-care.spec.ts` → `feed page: TimedCareChip methods above optional amount` | covered |
| `/baby/growth` has **no** Pump / Pumping chip | `e2e/baby-care.spec.ts` → `Growth logs medicine and temperature; no Pump capture chip` | covered (skipped this run — needs `E2E_STORAGE_STATE`) |
| Home timer: Tap to stop while running; Done only after stop (breast / nap) | `e2e/baby-home-option-b.spec.ts` → `breast second click shows Done ~2s then idle`; `nap Start stays running (no Done); End shows Done then idle` | covered |
| Log sleep: Start stays on page; End shows Tap to stop then home | `e2e/baby-care.spec.ts` → `sleep Start stays; End lands on home` | covered (skipped this run — needs `E2E_STORAGE_STATE`) |
| Log diaper one-tap Wet → home | `e2e/baby-care.spec.ts` → `diaper save lands on home` | covered (skipped this run — needs `E2E_STORAGE_STATE`) |
| Success: log **Pump L and Pump R** on home **and** `/baby/feed` | Home: `Pump L` + `Pump R start → Tap to stop → Done → idle`; feed: `feed Pump L` + `feed Pump R stop posts createBabyFeed duration` | covered (home green; feed skipped — auth) |
| Success: locked home rows (R1 Breast·Bottle; R2 Nap·Diaper; R3 Pump L·R + Pump amount; R4 guidelines + short helpers) | Row 3–4 presence in `Row 4 guidelines collapsed…` (pump L/R + amount + guidelines); R1/R2 still covered by older home Option B tests | covered |
| Success: Row 4 exclusive guidelines (collapsed default; Pump table / stubs) | `e2e/baby-home-option-b.spec.ts` → `Row 4 guidelines collapsed by default; exclusive Feed/Pump open` | covered |
| Success: `/baby/feed` Pump amount secondary path | `e2e/baby-care.spec.ts` → `feed Pump amount posts createBabyFeed pump + ml` | covered (skipped this run — needs `E2E_STORAGE_STATE`) |
| Task 5 note: sleep start/stop **Done flash** on `/baby/sleep` | Same sleep e2e: asserts `data-done-flash` + Done\|Xong before home navigate | covered (skipped this run — auth) |
| Success: light + dark + EN/VI clear for Pump L/R, Pump amount, Tap to stop / Done | **Skipped e2e** — unit `lib/baby-i18n.test.ts` (`pump timer + Tap to stop + guideline keys exist in EN and VI`) covers keys; no theme/locale e2e added | skipped (unit) |

**Coverage summary:** **13 covered** · **0 MISSING** · **1 skipped (unit i18n)** (Pump / Tap-to-stop locale+theme e2e skipped — keys covered in unit).

**E2E stack:** Playwright (`@playwright/test`, `playwright.config.ts`, `e2e/`)
**E2E command:** `npm run test:e2e` (or scoped: `npx playwright test e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts`)

**E2E added (round 2 — add missing):**
- `e2e/baby-home-option-b.spec.ts` — `Pump R start → Tap to stop → Done → idle`
- `e2e/baby-home-option-b.spec.ts` — `Row 4 guidelines collapsed by default; exclusive Feed/Pump open`
- `e2e/baby-care.spec.ts` — `feed Pump R stop posts createBabyFeed duration`
- `e2e/baby-care.spec.ts` — `feed Pump amount posts createBabyFeed pump + ml`
- `e2e/baby-care.spec.ts` — sleep End Done-flash assert (extended existing sleep test)

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Compiled OK; TypeScript OK; 70 pages |
| Unit | `npm test` | 0 | 1052 pass, 0 fail, 16 skipped (~7.5s); 1068 total |
| E2E | `npm run test:e2e` | 0 | **96 passed**, 0 failed, 28 skipped (~3.5m). Prior round-2 diaper status fail **green**. Capture-navigate still skipped (auth). |

**Full suite result:** success (build + unit + e2e green; coverage 0 MISSING)

## Failures (if any)

None this round.

## Fix ask for my-code-workflow

None — suite green.

## Round notes

- Smoke round 1: unit green; build red on TS (Growth `"pump"` + `createPumpAmount` step type).
- Fix-from-tests round 1: Growth pump branches removed; `createPumpAmount` added to stored result step union.
- Smoke round 2: build green; unit green. No e2e run (smoke mode). No product fixes in this stage.
- Full coverage round 2: filled MISSING e2e (Pump R home/feed, Row 4 guidelines, feed Pump amount, sleep Done flash). Skipped light/dark EN/VI Pump e2e — unit i18n already covers keys.
- Full suite round 2 (before Fix): build + unit green; e2e **failure** (20). New Pump home e2e green. No product fixes in that stage.
- Full suite round 2 (after Fix): build + unit green; e2e **failure** (1). Prior 20 fixed. Left: `chain failure… double-tap once; replay once` — missing diaper saved `role=status`. No product fixes in this stage.
- Fix-from-tests round 3: confirmation status wins over Saving; `setSaving(false)` before soft-invalidate; e2e hydrate wait before double-tap.
- Full suite round 3 (after Fix): build + unit + e2e **success**. `chain failure…` green. Pump L/R, Pump amount, Row 4 guidelines green. No product fixes in this stage.

## Fix notes (fix-tests, round 1)

**Updated:** 2026-09-19

- **Growth:** Removed dead `"pump"` branches from `components/baby-growth-page.tsx` (save block, amount label, required flags). Capture stays Care-only; chips already exclude pump.
- **Quick-care types:** Added `"createPumpAmount"` to `BabyQuickCareStoredResult.step` in `db/schema/baby.ts` so `toStoredResult` assigns. Extended `db/schema/baby.test.ts` sample with a pump-amount step.
- **Verify locally:** `npx tsc --noEmit` green; related unit suite green. Re-smoke: `npm run build` then `npm test`.

## Fix notes (fix-tests, round 2 — e2e full failure)

**Updated:** 2026-09-19

**Product**

- **Section headers:** Restored `BabyHomeSectionHeading` + next-due / bottle progress / nap blend tip bodies with `data-testid="baby-home-header-{breast,bottle,nap,diaper}"` on the locked 4-row layout (icons beside bottle/diaper headers).
- **TimedCareChip `data-running`:** Emit `data-running="true"` on wrapper **and** press button so nap/breast/pump e2e (and sleepCard) see running state.
- **Home skeleton:** Row 1 breast section = header + nested L/R chips; nap/diaper headers mirrored (zero CLS).

**E2E (design-aligned only)**

- **Bottle vs Pump amount:** `bottleMlChip` / call sites scoped to `[data-section="bottle"]` so ml chips are unique.
- **Layout:** Replaced stale “bottle|nap|diaper one wide row” asserts with Row1 breast+bottle / Row2 nap+diaper geometry.
- **Nap subtitle:** While running, expect Tap to stop (not empty `.text-xs`); next-due stays off the card.
- **Feed capture:** `data-running` assert updated to `"true"` (auth-skipped paths).

**Verify**

- Unit: `npm test` (focused home / TimedCareChip / skeleton) green.
- E2E sample (prior 20 failers + Pump/nap): green after Chromium install.

**Re-test command (parent full):**

```bash
npm run build && npm test && npm run test:e2e
```

Scoped smoke for this fix:

```bash
npx playwright test e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts
```

## Fix notes (fix-tests, round 3 — diaper status announcement)

**Updated:** 2026-09-19

**Root cause:** After a confirmed quick-care, `role="status"` preferred `Saving…` over the confirmation while `saving` stayed true through `softInvalidateAfterQuickCare`. A slow/failing care refetch kept the success copy (`Saved diaper` / `Đã lưu tã`) hidden — e2e timed out on the double-tap status assert.

**Product**

- **`babyHomeSaveAnnouncement`:** Confirmation message wins over `Saving…` (`lib/baby-quick-care-outcome.ts`). Home uses it for the status line.
- **`runQuick`:** `setSaving(false)` right after `setMessage(…)` and before soft-invalidate so the flash paints immediately.

**E2E**

- After remock reload in `chain failure…`, wait for breast `data-running="true"` (client hydrate) before sync double-tap so the click hits a live handler.

**Verify**

- Unit: `lib/baby-quick-care-outcome.test.ts` + `components/baby-home.test.ts` green.
- E2E: `npx playwright test e2e/baby-home-option-b.spec.ts -g "chain failure"` green.

**Re-test command (parent full):**

```bash
npm run build && npm test && npm run test:e2e
```

Scoped:

```bash
npx playwright test e2e/baby-home-option-b.spec.ts -g "chain failure"
```
