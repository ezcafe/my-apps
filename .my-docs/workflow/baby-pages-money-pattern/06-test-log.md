# Test log: baby-pages-money-pattern

**Result:** success
**Round:** 2
**Updated:** 2026-09-06 (Run suite round 2: build + unit + e2e all exit 0)

## Coverage

Map design success criteria / main flows → e2e.

**Stack:** Playwright (`@playwright/test`, `playwright.config.ts`, `e2e/`).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Home shows last-care status strip (or empty) above CTAs | `e2e/baby-care.spec.ts` → `home shows last-care status above CTAs` | covered |
| Feed save → land on `/baby` (+ status update) | `e2e/baby-care.spec.ts` → `feed save lands on home with status strip` | covered (needs `E2E_STORAGE_STATE`) |
| Sleep start save → land on `/baby` | `e2e/baby-care.spec.ts` → `sleep start lands on home` | covered (needs `E2E_STORAGE_STATE`) |
| Sleep end save → land on `/baby` | `e2e/baby-care.spec.ts` → `sleep end lands on home` | covered (needs `E2E_STORAGE_STATE`) |
| Diaper save → land on `/baby` | `e2e/baby-care.spec.ts` → `diaper save lands on home` | covered (needs `E2E_STORAGE_STATE`) |
| Growth reachable / usable (smoke) | `e2e/baby-care.spec.ts` → `growth page shows title and add form` | covered |
| Timeline reachable / usable (smoke) | `e2e/baby-care.spec.ts` → `home Timeline CTA opens day view` | covered |
| Settings reachable / usable (smoke) | `e2e/baby-care.spec.ts` → `EN ↔ VI toggles from settings` | covered |
| Shell still works after `shell-layout` rename | `e2e/baby-care.spec.ts` → `hamburger reaches Baby Care home` | covered |
| Home status error → CTAs still work | `e2e/baby-care.spec.ts` → `home status error keeps CTAs working` | covered (route intercept `babyTimeline`) |
| Money-aligned page structure / skeleton CLS / light+dark | — | n/a (manual / unit; not e2e) |

**Covered count:** 9  
**Missing:** none  

**E2E stack:** Playwright  
**E2E command:** `pnpm test:e2e` (alias: `playwright test`; optional UI: `pnpm test:e2e:ui`)  
**Note:** Capture write tests skip without `E2E_STORAGE_STATE` (see `e2e/helpers/auth.ts`, `playwright.config.ts`).

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 compile + TS + 69 static routes OK |
| Unit | `pnpm test` | 0 | 437 pass, 0 fail, 9 skip (446 tests, ~4s) |
| E2E | `pnpm test:e2e` | 0 | 9 passed, 4 skipped (auth capture) |

## Failures (if any)

None.

## Fix ask for my-code-workflow

n/a (success)

## Round notes

- Add missing e2e: `sleep end lands on home` (auth-gated); `home status error keeps CTAs working` (Playwright `page.route` forces `babyTimeline` GraphQL errors). No gaps left for this workflow.
- Round 1: build + unit green; e2e red on hamburger (`/help` auth-gated).
- **Code fix (round 1):** Hamburger test starts at `/baby/settings` then menu → Baby Care home.
- Round 2: build + unit + e2e all exit 0. Hamburger passed. Auth-gated capture→home skips OK (4 skipped).
