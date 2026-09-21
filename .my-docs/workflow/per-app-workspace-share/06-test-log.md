# Test log: per-app-workspace-share

**Result:** success
**Mode last run:** full
**Round:** 1
**Updated:** 2026-09-21

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | OK |
| Unit (feature) | shareable/access/validators/baby-yoga | 0 | 36 pass |
| Unit (full suite) | `pnpm test` | 1 | 1195 pass / 1 pre-existing fail (`baby-care-one-tap`) |

**Smoke result:** smoke-pass

## Coverage (full mode only)

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Add member + grants + access block | `e2e/workspace-member-app-grants.spec.ts` | blocked — dual auth |
| Grant matrix / validators | unit tests | covered |

**E2E stack:** playwright  
**E2E command:** `pnpm test:e2e`

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | after review |
| Unit (feature) | as above | 0 | |
| E2E | workspace-member-app-grants | skipped | dual auth blocked by design |

## Failures (if any)

- Pre-existing `baby-care-one-tap` — out of scope

## Fix ask for my-code-workflow

None.

## Round notes

- Review clean; full test treated e2e blocked as acceptable with unit coverage (tasks + 04a).
