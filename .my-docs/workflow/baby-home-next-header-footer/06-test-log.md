# Test log: baby-home-next-header-footer

**Result:** success
**Mode last run:** lite
**Round:** 4
**Updated:** 2026-09-20

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 Turbopack; compiled + TypeScript + 71 static routes OK |
| Unit (focused) | `pnpm exec tsx --import ./scripts/test-env.mjs --test components/baby-home.test.ts components/baby-page-skeleton.test.ts lib/baby-age-guide.test.ts lib/baby-home-section-pending.test.ts lib/baby-i18n.test.ts` | 0 | 84 pass / 0 fail / 0 skipped (~648ms) |
| Unit (full) | `pnpm test` | 0 | 1144 tests · 1128 pass · 0 fail · 16 skipped (~7.7s) |

**Smoke result:** smoke-pass

## Lite Round 1 (targeted e2e after lite review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit (focused, re-run) | `pnpm exec tsx --import ./scripts/test-env.mjs --test components/baby-home.test.ts components/baby-page-skeleton.test.ts lib/baby-age-guide.test.ts lib/baby-home-section-pending.test.ts lib/baby-i18n.test.ts lib/baby-birth-date-modal.test.ts lib/baby-app-header.test.ts lib/baby-home-control-height.test.ts` | 0 | 95 pass / 0 fail (~753ms) |
| E2E (targeted) | `pnpm test:e2e e2e/baby-home-option-b.spec.ts` | 1 | 43 passed · 10 failed (~8.2m) |

**Lite Round 1 result:** failure (birthday-modal intercept + geometry null boxes + DST midnight)

## Round 2 — Fix from tests (2026-09-20)

**Result:** fix applied for Round 1 failures (parent re-ran lite)

### What changed

1. **Birthday modal blocks clicks** — helpers `seedBirthDateModalVisitDismissed` / `dismissBabyBirthDateModalIfOpen` / `gotoBabyHomeReadyForCare`; seeded dismiss on bottle/custom/pending-retry with `birthDate: null`
2. **boundingBox null** — geometry specs use `gotoBabyHomeReadyForCare` + poll until boxes exist; 3AM row assert updated
3. **DST midnight** — after `clock.fastForward`, fire `visibilitychange` + `focus` + longer poll

### Tests run (Fix round)

- Targeted grep of Round 1 failures → **10 passed**
- Full suite re-run → Round 2 lite below

## Lite Round 2 (re-run after Fix)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit (focused) | `pnpm exec tsx --import ./scripts/test-env.mjs --test components/baby-home.test.ts components/baby-page-skeleton.test.ts lib/baby-age-guide.test.ts lib/baby-home-section-pending.test.ts lib/baby-i18n.test.ts lib/baby-birth-date-modal.test.ts lib/baby-app-header.test.ts lib/baby-home-control-height.test.ts` | 0 | 95 pass / 0 fail (~864ms) |
| E2E (targeted) | `pnpm test:e2e e2e/baby-home-option-b.spec.ts` | 1 | **51 passed · 2 failed** (~2.7m) |

**Coverage / add-e2e:** skipped (Review profile lite)

**Lite Round 2 result:** failure

### Round 1 failures — status

All 10 Round 1 failures are **green** in this full suite run (modal dismiss, Row 4 / section order / row 2 / 3AM geometry, DST midnight, bottle/custom/pending-retry).

### Failures (new residual)

1. **Kind flush 2×2 + primary selected on Done flash** (`e2e/baby-home-option-b.spec.ts:1134`)
   - Symptom: `wetBox && dirtyBox && mixedBox && dryBox` → null (`boundingBox()` null)
   - Snapshot shows Wet / Poop / Mixed / Dry visible; birthDate set (no birthday modal)
   - Likely: same hydration remount race as Round 1 geometry — this spec still uses immediate `boundingBox()` after `gotoBabyHomeReady` (+ `page.clock.install()`), unlike `3AM geometry` which polls

2. **idle breast start empty steps; replay does not double-start** (`e2e/baby-home-option-b.spec.ts:2433`)
   - Symptom: after Try again, `getByRole('status')` expected count `1`, got `0` (15s timeout)
   - Snapshot: breast timer running (`0:15`); no pending-recovery / no `role="status"`
   - Likely: quiet success clears pending on replayed Try again; assert still expects a lingering status (toast or recovery). Intent was “no duplicate timer / duplicate toast” — count `1` is now wrong for quiet clear

## Coverage (full mode only)

_(not run — lite mode)_

## Runs (full mode)

_(not run — lite mode)_

## Round 3 — Fix from tests (2026-09-20)

**Result:** fix applied for Round 2 residual e2e (2 fails) — e2e harden only; no product change

### What changed

1. **Kind flush geometry** (`Kind flush 2×2 + primary selected on Done flash`) — `gotoBabyHomeReadyForCare` + poll wet tile `boundingBox().height > 0` before measuring flush adjacency; kept `page.clock.install()` before ready (Done flash timer must be mocked at mount, same as other diaper Done specs). Flush ≤2px / Done-flash asserts unchanged.
2. **Breast idle replay status** (`idle breast start empty steps; replay does not double-start`) — after Try again with `replayed: true`, assert quiet clear: L timer still `/\d+:\d{2}/`, pending recovery gone, no Saved/Saving toast, R has no timer. Dropped `getByRole('status')` count `1` (quiet success clears pending with no announcement — matches Design / `baby-home` quiet success).

### Tests run (Fix round)

- `pnpm test:e2e e2e/baby-home-option-b.spec.ts -g "Kind flush 2×2|idle breast start empty steps"` → **2 passed** (~24s)

## Lite Round 3 (re-run after Fix)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| E2E (targeted) | `pnpm test:e2e e2e/baby-home-option-b.spec.ts` | 1 | **52 passed · 1 failed** (~2.4m) |

**Coverage / add-e2e:** skipped (Review profile lite)

**Lite Round 3 result:** failure

### Round 2 residuals — status

Both Round 2 failures are **green** in this suite run:

- `Kind flush 2×2 + primary selected on Done flash` — pass
- `idle breast start empty steps; replay does not double-start` — pass

### Failures (new residual)

1. **row 2 Kind outer height matches nap** (`e2e/baby-home-option-b.spec.ts:1193`)
   - Symptom: `napBox && kindBox` → null (`boundingBox()` null on `[data-section="nap"]` and/or `[data-section="diaper"]`)
   - Spec still uses `gotoBabyHomeReady` + immediate `boundingBox()` (no poll / no `gotoBabyHomeReadyForCare`)
   - Same hydration remount race as earlier geometry specs; Kind flush was hardened in Round 3 Fix but this sibling geometry assert was not

## Fix ask for my-code-workflow

_(none — Lite Round 4 success)_

## Round 4 — Fix from tests (2026-09-20)

**Result:** fix applied for Round 3 residual e2e (1 fail) — e2e harden only; no product change  
**Decision 9:** Option 1 approved (one more Fix past soft 3-round limit)

### What changed

1. **row 2 Kind outer height matches nap** (`e2e/baby-home-option-b.spec.ts`) — `gotoBabyHomeReadyForCare` + poll until `min(nap, diaper) boundingBox().height > 0` before measuring; kept contracts |Δy| < 48, nap.x < diaper.x, |Δheight| < 48 at 1280×800.

### Tests run (Fix round)

- `pnpm test:e2e e2e/baby-home-option-b.spec.ts -g "row 2 Kind outer height matches nap"` → **1 passed** (~10.8s)

## Lite Round 4 (re-run after Decision 9 Fix)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| E2E (targeted) | `pnpm test:e2e e2e/baby-home-option-b.spec.ts` | 0 | **53 passed · 0 failed** (~2.2m) |

**Coverage / add-e2e:** skipped (Review profile lite)

**Lite Round 4 result:** success

### Round 3 residual — status

- `row 2 Kind outer height matches nap` — **pass** (hardened with `gotoBabyHomeReadyForCare` + height poll)
