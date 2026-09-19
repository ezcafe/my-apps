# Test log: baby-growth-health-logging

**Result:** success
**Mode last run:** full
**Round:** 1 (full suite)
**Updated:** 2026-09-19 06:50 +0700

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Compile + TypeScript ok; routes include `/baby/growth`, no `/baby/measure` |
| Unit | `npm test` | 0 | 983 pass, 0 fail, 16 skipped (999 tests) |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e.

**Verdict:** covered **13** · MISSING **0** · blocked **1**. Stack is Playwright (`pnpm test:e2e`).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Nav + `/baby/growth` capture (Growth title / Save; not Insights redirect) | `e2e/baby-care.spec.ts` · `growth page shows title and save form` | covered |
| `/baby/measure` permanently lands on Growth | `e2e/baby-care.spec.ts` · `old measure URL redirects to growth; timeline still goes to insights` | covered |
| Growth logs medicine + temperature with symptom + pump | `e2e/baby-care.spec.ts` · `Growth logs medicine, temperature with symptom, and pump` | covered |
| Vaccine create on Growth → Recent + Vaccines list; Vaccines has no create form | `e2e/baby-care.spec.ts` · `vaccine create via Growth shows in Growth Recent and Vaccines list` | covered |
| Vaccine edit + delete from Growth Recent | `e2e/baby-care.spec.ts` · `vaccine edit and delete from Growth Recent` | covered |
| Vaccines deep link opens Growth vaccine kind | `e2e/baby-care.spec.ts` · `Vaccines deep link opens Growth vaccine kind` | covered |
| Weight save on Growth stays on Growth + Recent | `e2e/baby-care.spec.ts` · `growth chips visible; save stays on Growth Recent` | covered |
| Insights: date Apply works; no care-type filter chrome | `e2e/baby-care.spec.ts` · `insights Apply date range refetches series and updates hydration chart`; `default Insights shows Hydration + Night Rest; More insights deferred; Activities owns lists` | covered |
| Vitamin add on Growth | `e2e/baby-care.spec.ts` · `Growth logs vitamin, height, and head` | covered |
| Height + head add on Growth | `e2e/baby-care.spec.ts` · `Growth logs vitamin, height, and head` | covered |
| Edit/delete non-vaccine Growth Recent rows (med / temp / pump / measures) | `e2e/baby-care.spec.ts` · `Growth Recent edit and delete medicine` | covered |
| Symptoms-only save (no temperature value) | `e2e/baby-care.spec.ts` · `Growth saves symptoms-only temperature without value` | covered |
| Insights empty copy: date range only (not care/kind filter advice) | `e2e/baby-care.spec.ts` · `Insights empty growth chart copy is date-range only` | covered |
| Light + dark + Growth / Insights skeleton parity | — | blocked (Task 5 unit + manual glance; no e2e required) |

**Covered count:** 13  
**Missing:** none (add-e2e round).  
**Blocked:** light/dark + skeleton parity (unit/manual).

**E2E stack:** Playwright (`@playwright/test`, `playwright.config.ts`, `e2e/`)  
**E2E command:** `pnpm test:e2e` (or `pnpm exec playwright test`)

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.2 compile + TypeScript ok; `/baby/growth` present, no `/baby/measure` |
| Unit | `npm test` | 0 | 998 pass, 0 fail, 16 skipped (1014 tests, ~7.4s) |
| E2E | `pnpm test:e2e e2e/baby-care.spec.ts` | 0 | Targeted Growth/Insights suite: 45 passed, 11 skipped (~1.9m) |

## Failures (if any)

None this round.

## Fix ask for my-code-workflow

None — full suite green.

## Fix notes (round 1)

- Removed `.next` (stale types still referenced deleted `/baby/measure`).
- Re-ran `npm run build` → exit **0** (TypeScript + static pages ok; routes show `/baby/growth`, no `/baby/measure`).
- No product code changes. Unit not re-run (unchanged; already green).

## Round notes

- Smoke round 1: unit green; build red from stale `.next` after measure → growth rename.
- Fix round 1: cleared `.next`; build green.
- Smoke round 2: build + unit both green after `.next` clear. No product code changed.
- Add e2e (full): filled 5 MISSING criteria with 4 Playwright tests in `e2e/baby-care.spec.ts` (vitamin+height+head; med edit/delete; symptoms-only; Insights empty chart copy). Coverage now 13 covered / 0 missing / 1 blocked.
- Full run suite: build + unit + baby-care e2e all exit 0. Coverage has no open MISSING/required gaps (blocked skeleton parity is unit/manual only).
