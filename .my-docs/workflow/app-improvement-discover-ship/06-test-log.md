# Test log: app-improvement-discover-ship

## Smoke

**Result:** smoke-pass  
**Updated:** 2026-10-04

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit (default pool) | `corepack pnpm exec tsx --import ./scripts/test-env.mjs --test <192 files>` | 0 | 1335 pass · 0 fail · 25 skipped |
| Unit (module mocks) | `corepack pnpm run test:module-mocks` | 0 | 18 pass incl. Money `[kind]` idempotency |
| Build | `corepack pnpm run build` | 0 | Client bundle fixed via `idempotency-constants` (no db in client) |

**Note:** `pnpm test` fails in this environment because `scripts/run-unit-tests.mjs` spawns bare `pnpm` (ENOENT); Corepack path used for smoke.

## Full test (profile full)

**Result:** success  
**Updated:** 2026-10-04

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit | default pool + module mocks | 0 | reused smoke |
| Build | `corepack pnpm run build` | 0 | reused smoke |
| E2E | — | skipped | No new chrome; auth-blocked optional double-submit check documented in Task 5 |

## Failures (if any)

None.

## Fix ask for my-code-subflow

None — suite green for this slice.
