# Test log: baby-home-logging-detail

**Result:** success
**Round:** 3
**Updated:** 2026-09-12

## Coverage

Map design success criteria / main flows → e2e (Option B + B1 + D-A focus from `03-design.md` e2e strategy + Task 13).

**Verdict:** covered **11** · MISSING **0** · blocked **0**. Stack is Playwright. Logging-detail flows live in `e2e/baby-home-option-b.spec.ts` (+ helpers).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Wet / Dry instant save (kind only, S1) | `e2e/baby-home-option-b.spec.ts` → `diaper 2×2 Kind: Wet/Dry instant; Poop opens sheet then one save` | covered |
| Wet / Dry brief Done then ready again (S1) | `…` → `diaper Wet/Dry Done flash then short labels again (S1)` (Wet Done path; Dry instant in Kind test) | covered |
| Poop → Step 2 sheet → **one** save (W1) | `…` → `diaper 2×2 Kind: Wet/Dry instant; Poop opens sheet then one save` | covered |
| Mixed → Step 2 sheet → **one** save (W1) | same test | covered |
| Sheet cancel discards draft; no `babyQuickCare` (W1) | `…` → `diaper Step 2: red-flag warn, texture caution, cancel discards (W1)` | covered |
| Color red-flag + watery/hard texture caution in sheet | same Step 2 test | covered |
| **D-A** 2×2 Kind tiles (four tiles; not 1×4) | Kind test (`data-layout="diaper-kind-2x2"` + wet/dirty/mixed/dry tiles) | covered |
| No diaper ↑↓ / side steppers | Kind rewrite only; old diaper ± helpers gone from e2e | covered |
| Last ml on row 3 when last feed has `amountMl` | `…` → `last ml on row 3 when last feed has amountMl` | covered |
| VI next-due substring (`lần tiếp theo trong` + `phút`) | `…` → `Vietnamese: Custom modal, birth prompt, and home controls` | covered |
| Bottle **B1** soft smoke: log height vs nap / stacked right ± / Done~2s | `…` → `bottle B1 soft smoke: layout, stacked ±, Custom under, Done~2s` (`data-layout="b1-bottle"`, `data-stepper` more/less stacked right, Custom in `data-under-card`, loose log↔nap height ≤24px, Logged flash via `page.clock.install()` **before** ready + `fastForward(2100)`) | covered |

**E2E stack:** Playwright (`@playwright/test`)
**E2E command:** `npx playwright test e2e/baby-home-option-b.spec.ts` (also `npm run test:e2e`; related care: `e2e/baby-care.spec.ts`)

**Note:** Coverage unchanged from Round 1–2 (still 11/0 MISSING). No new e2e this round.

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.2 compile + TypeScript OK (~7.4s). Round 2 TS7006 on Done-flash host wrappers is gone. |
| Unit | `npm test` | 0 | 762 pass · 16 skipped · 0 fail (~5.7s) |
| E2E | `npx playwright test e2e/baby-home-option-b.spec.ts` | 0 | **31 passed** · 0 failed (~1.5m). Hydration mismatch warnings on `/baby` (`data-day-key`) still appear; did not fail tests. First attempt timed out under sandbox (`uv_interface_addresses`); re-run outside sandbox succeeded. |

## Failures (if any)

None. Build, unit, and e2e all green.

## Fix ask for my-code-workflow

None — suite green. Next is Gate 3 + `my-merge-workflow` when the parent pipeline is ready.

## Round notes

- **Round 1:** failure — 11 e2e red (post-success chainFailed/pending, S1 clock order, B1 face, VI seed, birth 110).
- **Round 2:** failure — unit + e2e green; build red on TS7006 in `lib/baby-home-done-flash.ts` default host wrappers.
- **Round 3:** **success** — typed Done-flash wrappers from Round 2 Fix ask cleared the build. Build 0 · unit 762 · e2e 31/31. Coverage still **11 / 0 MISSING**.
- Cap note: this is test-workflow round **3** of the parent loop; no further re-run needed unless merge gate finds new issues.
