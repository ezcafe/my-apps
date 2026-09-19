# Test log: baby-activities-page

**Result:** success
**Mode last run:** full
**Round:** 2
**Updated:** 2026-09-18

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 compile + TypeScript + static pages OK; `/baby/activities` present |
| Unit | `pnpm test` | 0 | 965 tests, 949 pass, 0 fail, 16 skipped (~8.5s) |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e.

**Verdict:** covered **13** · MISSING **0** · blocked **0**. Stack is Playwright (`pnpm test:e2e`).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Nav: Activities opens `/baby/activities` | `e2e/baby-care.spec.ts` · `hamburger Activities opens /baby/activities` | covered |
| Open Activities loads merged ledger on mount (no expand gate) | `e2e/baby-care.spec.ts` · `activities defaults to last 7 days, empty is non-error, Reset restores default`; `default Insights shows Hydration + Night Rest; More insights deferred; Activities owns lists` | covered |
| Filters → period chip → ledger chrome (FilterMenu, table/cards, ghost Edit) | `e2e/baby-care.spec.ts` · `activities shared chips apply to ledger`; `activities ledger uses table chrome`; `activities page skeleton then empty ledger while loading` | covered |
| Default last 7 days + Apply/Reset restores range | `e2e/baby-care.spec.ts` · `activities defaults to last 7 days, empty is non-error, Reset restores default` | covered |
| Empty ledger quiet (muted copy, not load Alert) | `e2e/baby-care.spec.ts` · `activities defaults to last 7 days, empty is non-error, Reset restores default` | covered |
| Load error Alert + retry | `e2e/baby-care.spec.ts` · `activities load error shows alert and retry` | covered |
| Select → Edit care save + list refresh | `e2e/baby-care.spec.ts` · `Activities care edit save hits updateBabyEvent and refreshes row` | covered |
| Select → Edit growth save + list refresh | `e2e/baby-care.spec.ts` · `Activities growth edit save hits updateBabyGrowth and refreshes row` | covered |
| Select → Delete / partial multi-delete honesty | `e2e/baby-care.spec.ts` · `Activities multi-delete: cancel confirm, mixed mutations, partial fail Alert` | covered |
| Insights: no Activity log + cue link → `/baby/activities` | `e2e/baby-care.spec.ts` · `insights page shows filters and growth then timeline` | covered |
| Insights growth follows `moreOpen`; timeline lists off Insights; Activities owns lists | `e2e/baby-care.spec.ts` · `default Insights shows Hydration + Night Rest; More insights deferred; Activities owns lists` | covered |
| Home pending too-old link → `/baby/activities` | `e2e/baby-home-option-b.spec.ts` · `home pending too-old Open Activities goes to /baby/activities`; `pending clear rules` asserts Activities href | covered |
| `/baby/timeline` + `/baby/growth` still redirect to Insights | `e2e/baby-care.spec.ts` · `old growth and timeline URLs redirect to insights` | covered |

**E2E stack:** playwright
**E2E command:** `pnpm test:e2e`

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2; `/baby/activities` present (~7s) |
| Unit | `pnpm test` | 0 | 970 tests, 954 pass, 0 fail, 16 skipped (~6.6s) |
| E2E | `pnpm test:e2e` | 0 | 110 tests: **91 passed**, 0 failed, 19 skipped (~3.2m) |

## Failures (if any)

None this round.

## Fix ask for my-code-workflow

None — full suite green.

## Round notes

- Full round 1: coverage already MISSING 0; ran build → unit → full Playwright. E2E exit 1 (12 failed).
- **Fix round 2 (my-code-workflow):** e2e-only repairs (no product design changes). Filtered re-check of prior 12 fails: 12 passed.
- Full round 2: build → unit → full Playwright all green; Coverage still MISSING 0 → **success**.
- Commands from `package.json`: `build` → `next build`; `test` → node test runner; `test:e2e` → `nice -n 15 playwright test`.
