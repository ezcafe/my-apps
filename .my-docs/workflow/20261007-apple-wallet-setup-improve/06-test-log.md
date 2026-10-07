# Test log: 20261007-apple-wallet-setup-improve

**Result:** success
**Mode last run:** full
**Round:** 2
**Updated:** 2026-10-08T06:19:00Z

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Typecheck | `pnpm typecheck` | 0 | tsc --noEmit green |
| Build | `pnpm build` | 0 | Next.js 16.3.7 production build |
| Unit | focused Apple Wallet suites | 0 | 23 pass / 0 fail |

**Smoke result:** smoke-pass

## Coverage (full mode only)

| Criterion / flow | E2E file / test | Status |
|------------------|-----------------|--------|
| Settings off: readiness + setup link `/help#apple-wallet` | Apple off test | **covered — passed** |
| Settings off: no `APPLE_SIGNER` / PEM in DOM | same | **covered — passed** |
| Settings on + healthy: Add visible | Apple on test | covered (skipped — Apple gate off in this env) |
| Pending / Unlink extras | same suite | covered (skipped — Apple off) |
| Real iPhone / APNs Metric | — | blocked (manual) |

**E2E command:** `E2E_STORAGE_STATE=e2e/.auth/user.json E2E_SKIP_WEBSERVER=1 PLAYWRIGHT_BROWSERS_PATH=0 pnpm test:e2e e2e/apple-wallet-settings.spec.ts`

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Round 1 E2E | stale jar | 1 | `/login` — jar mtime 2026-09-07 |
| Round 2 E2E | refreshed jar 2026-10-08 | 0 | **1 passed · 3 skipped** (Apple off) |

**E2E Round 2 detail:** Auth jar rewritten with `authjs.session-token`. Post-login landing on `/money/new` is expected (`signIn` redirectTo). Task 4 off-path readiness + setup link + no secrets: **pass**. On-path tests skip when `APPLE_*` unset — documented blocked, not failure.

## Failures

_(none Round 2)_

## Fix ask

_(none)_

## Round notes

- `/money/new` after Pocket ID sign-in is by design (`actions/auth.ts` → `redirectTo: "/money/new"`). Codegen start URL can be `/money/new` or `/settings`; cookies matter, not final path.
- Full bar met for this env (Apple off): required off-path e2e green + prior typecheck/build/unit green.
