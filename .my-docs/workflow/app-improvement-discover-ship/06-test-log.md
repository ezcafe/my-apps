# Test log: app-improvement-discover-ship

## Smoke

**Result:** smoke-pass  
**Updated:** 2026-10-10

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit (default pool) | `corepack pnpm exec tsx --import ./scripts/test-env.mjs --test <205 files>` | 0 | 1429 pass · 0 fail · 28 skipped |
| Unit (module mocks) | `corepack pnpm run test:module-mocks` | 0 | 22 pass |
| Build | `corepack pnpm run build` | 0 | ok |
| New | `lib/money-cold-path-copy.test.ts` | 0 | 6 pass (copy + wiring + #2/#4 verify) |

**Note:** `pnpm test` may ENOENT for bare `pnpm` in some shells — Corepack path used.

## Full

**Result:** success  
**Updated:** 2026-10-10

Reuse smoke unit+build. e2e N/A — copy-only; optional manual empty Spending/Insights (auth-blocked OK).

## Failures (if any)

None.
