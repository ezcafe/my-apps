# Test log: baby-log-ux-vaccine-charts

**Result:** success
**Round:** 4
**Updated:** 2026-09-07 06:05 +07

## Coverage

Map design success criteria / main flows → e2e.
(Gate 2 flows: Start stay / End home; timeline labels; vaccine; chips both surfaces; charts; dedicated icons.)

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Feed: Start stays; End/method save → home | `e2e/baby-care.spec.ts` — `feed Start stays; method save lands on home` | covered (passed) |
| Sleep: Start stays; End → home | `e2e/baby-care.spec.ts` — `sleep Start stays; End lands on home` | covered (passed) |
| Diaper save still → home | `e2e/baby-care.spec.ts` — `diaper save lands on home` | covered (passed) |
| Insights timeline: Feed (Breast L/R), stop time, duration `12m` / `1h 5m` | `e2e/baby-care.spec.ts` — `insights timeline shows Breast L/R, stop time, and compact duration` | covered (passed) |
| Vaccine create + list (name + dose) | `e2e/baby-care.spec.ts` — `vaccine create shows in list` | covered (passed) |
| Vaccine in hamburger | `e2e/baby-care.spec.ts` — `hamburger includes Vaccines` | covered (passed) |
| Growth chips on Insights | `e2e/baby-care.spec.ts` — `insights shared chips apply to growth and timeline` | covered (passed) |
| Growth chips on Measure | `e2e/baby-care.spec.ts` — `measure chips visible; save lands on home` | covered (passed) |
| Insights Money-style charts (growth cards + care-count) | `e2e/baby-care.spec.ts` — `Insights shows chart region, care-count, and growth chart cards` | covered (passed) |
| Dedicated Baby hamburger SVGs (job-matching icons) | `e2e/baby-care.spec.ts` — `hamburger Baby items use dedicated SVGs not Money bills/import/spending` | covered (passed) |
| 3AM eye flow on feed/sleep capture (primary first, layout) | `e2e/baby-care.spec.ts` — `feed page: timer + methods above optional amount/duration`; `sleep page: Start/End primary row first and large` | covered (passed) |
| Non-goals / DESIGN_GUIDE / CLS | — | N/A (not an e2e user flow) |

**Summary:** 11 covered · 0 MISSING · 0 blocked · 1 N/A

**E2E stack:** Playwright (`@playwright/test`, `playwright.config.ts`)
**E2E command:** `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm test:e2e`

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js compile + TypeScript OK |
| Unit | `pnpm test` | 0 | 583 pass · 0 fail · 9 skipped · 592 total |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm test:e2e` | 0 | 22 passed · 0 failed · 0 skipped (~2.6m) |

## Failures (if any)

None.

## Fix ask for my-code-workflow

None — suite green.

## Round notes

- Round 4 after Test↔Code round 3 (sleep e2e open-check wait + End cleanup; vaccine null cursor + migration 0038).
- Auth storage present; all write flows ran and passed (feed, diaper, sleep, vaccine, measure).
- Previously red in round 3: `sleep Start stays; End lands on home` and `vaccine create shows in list` — both green this run.
- Coverage: 0 MISSING · 0 blocked. Result = success (build + unit + e2e all exit 0).
- No product code changed in this Run suite stage.
