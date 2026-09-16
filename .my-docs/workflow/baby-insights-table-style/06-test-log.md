# Test log: baby-insights-table-style

**Result:** success  
**Round:** 1  
**Updated:** 2026-09-14

## Coverage

Map design success criteria / main flows → e2e.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Both lists use table + mobile-card chrome (flat, Baby fields) | `e2e/baby-care.spec.ts` · `insights growth and timeline use table chrome` (also asserted in `insights shared chips apply to growth and timeline`) | covered |
| Default date range is local today on first open | `e2e/baby-care.spec.ts` · `insights defaults to today, empty is non-error, Reset restores today` | covered |
| Reset restores today after a changed range | same test | covered |
| User can change from/to and Apply; lists refetch with new bounds | same test (yesterday Apply + GraphQL bounds) | covered |
| Shared care/growth chips filter both lists | `e2e/baby-care.spec.ts` · `insights shared chips apply to growth and timeline` | covered |
| Empty today is not a hard error; recovery copy points to widen + Apply | `e2e/baby-care.spec.ts` · `insights defaults to today, empty is non-error, Reset restores today` | covered |
| Filters + Growth then Timeline section order; view-only Insights | `e2e/baby-care.spec.ts` · `insights page shows filters and growth then timeline` | covered |
| Show more / Load more still work after restyle | `e2e/baby-care.spec.ts` · `insights show more and load more still work after restyle` | covered |
| Loading skeleton / zero CLS for restyled lists | `e2e/baby-care.spec.ts` · `insights loading skeleton shows table and card chrome` (structure proxy: table shells + card placeholders, no divide-y; not a numeric CLS score) | covered |
| Error state UI stays clear (section error path) | `e2e/baby-care.spec.ts` · `insights section error UI stays clear` | covered |
| Light + dark look OK for both tables | `e2e/baby-care.spec.ts` · `insights tables stay usable in light and dark` (theme class + table/card chrome; not a visual polish review) | covered |
| No change to Money defaults or Baby capture flows | Existing `Baby Care capture navigate` + Money suites; Baby Insights e2e correctly does not assert Money defaults | covered |

**E2E stack:** playwright (`@playwright/test`)  
**E2E command:** `pnpm test:e2e` (focused: `pnpm exec playwright test e2e/baby-care.spec.ts -g insights`)

**Covered:** 12  
**Missing:** none  
**Blocked:** none

## Notes from Add missing e2e

Focused new tests (4 passed):

- `insights show more and load more still work after restyle`
- `insights loading skeleton shows table and card chrome`
- `insights section error UI stays clear`
- `insights tables stay usable in light and dark`

## Notes from Build (draft only)

Focused checks already run during Build (not a substitute for my-test-workflow):

- Unit: `lib/baby-insights-default-range.test.ts` — today default + same-day bounds
- Unit: `lib/baby-i18n.test.ts` — empty recovery copy
- E2E: `pnpm exec playwright test e2e/baby-care.spec.ts -g insights` — 9 passed (before Add missing e2e)

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 compile + TypeScript + static pages OK (~8s) |
| Unit | `pnpm test` | 0 | 869 tests · 853 pass · 0 fail · 16 skip (~9s) |
| E2E (full, attempt) | `pnpm test:e2e` | 1 | 60 passed · 9 failed · 19 skipped (~4.3m). Failures are Baby home / Option B / EN↔VI — **not** Insights table-style tests. See Round notes. |
| E2E (judged for this slug) | `pnpm exec playwright test e2e/baby-care.spec.ts -g insights` | 0 | 13 passed (~33s). Matches Coverage E2E command; all Insights criteria green. |

## Failures (if any)

None for the judged Insights e2e command.

**Ambient (full suite, out of Insights scope for this slug):**

- **What:** Full `pnpm test:e2e` exit 1 with 9 fails
- **Where:**
  - `e2e/baby-care.spec.ts` · `home shows last-care status below quick cards`
  - `e2e/baby-care.spec.ts` · `EN ↔ VI toggles from settings`
  - `e2e/baby-home-option-b.spec.ts` · session / row-order / height / pending / last-ml cases (7 tests)
- **Excerpt:** e.g. `expect(homeStatus(page).getByText(/Feed \(Formula 120 ml\)/i)).toBeVisible()` timed out; Option B pending/status assertions failed
- **Tied to requirement:** Not in Insights table-style success criteria (03-design / Coverage). Flag for Gate 3 as branch ambient risk.

## Fix ask for my-code-workflow

None — Result is success for this slug. Coverage has no MISSING/blocked gaps; build, unit, and Insights e2e are green.

## Round notes

- First full e2e attempts failed because Chromium was missing under `PLAYWRIGHT_BROWSERS_PATH` (sandbox cache). Ran `pnpm exec playwright install chromium`, then re-ran.
- Preferred full suite when feasible (~4.3m). It stayed red on unrelated Baby home / Option B specs, so the **judged** e2e for Result is the Coverage-focused Insights command (13/13 pass).
- Gate 3 / merge: humans should know full suite still has 9 ambient fails on this branch; not introduced by Insights criteria coverage.
