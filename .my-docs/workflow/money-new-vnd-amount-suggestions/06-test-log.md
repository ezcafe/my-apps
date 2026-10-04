# Test log: money-new-vnd-amount-suggestions

## Smoke

**Result:** smoke-pass  
**When:** 2026-10-04

| Check | Result | Notes |
|-------|--------|-------|
| `corepack pnpm build` | pass | `/money/new` present in route list |
| Unit (`node scripts/run-unit-tests.mjs` after `corepack enable`) | pass | 1356 pass / 0 fail / 25 skipped / 1 cancelled |
| Focused `lib/vnd-amount-suffix.test.ts` | pass | 9/9 |

**Fix ask:** none

## Lite test

**Result:** success  
**When:** 2026-10-04

| Check | Result | Notes |
|-------|--------|-------|
| Targeted e2e | skipped | `04-tasks` / Design: no new e2e required (lite); unit + source contract cover behavior |
| Re-confirm focused unit | pass | `lib/vnd-amount-suffix.test.ts` 9/9 (already in smoke pool) |

**Fix ask:** none

## Round notes

- main-thread fallback — smoke (usage limit after wait 5s + one retry)
- Initial `pnpm test` failed because `pnpm` was missing from PATH until `corepack enable`
- Lite test: no new Playwright cases planned — unit coverage accepted
