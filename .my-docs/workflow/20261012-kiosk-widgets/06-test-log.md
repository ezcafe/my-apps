# Test log: 20261012-kiosk-widgets

**Result:** success
**Mode last run:** test-full
**Round:** 3 (migrate + local Terminal e2e)
**Updated:** 2026-10-13T13:43Z
**Smoke source:** Build-verify

## Smoke

**Smoke result:** smoke-pass

| Step | Command | Result |
|------|---------|--------|
| cwd | `/Users/ptquang86/ws/my-apps` | ok |
| build | `npm run build` | pass (attempt 2; attempt 1 TS: `monthlyObligationMinor` nested under `.summary`) |
| unit | `npm test` | pass (1507 pass, 0 fail) |
| e2e | deferred — full test stage (`npm run test:e2e`) | not run in Verify |

**Round notes**

- Verify gate (Build Option B): build + unit green → **verify-pass**.
- Attempt budget: 2 of 3 (TS fix for loans SoT path, then re-build + unit).
- Shipped draft: Option 1 cell board, `kioskLayout` prefs, `money.month_board`, default-only skeleton, Settings layout + focus, e2e spec added (not executed here).
- Remaining risks: migrate `0048_kiosk_layout` before layout PATCH against real DB; users with stored widget prefs keep old set (null-prefs-only defaults); CLS when prefs ≠ default skeleton; e2e needs `E2E_STORAGE_STATE`.

## Coverage (full mode only)

**E2E stack:** Playwright  
**E2E command:** `npm run test:e2e` (Verify) · this run used targeted `e2e/kiosk-layout.spec.ts` with `E2E_STORAGE_STATE=e2e/.auth/user.json`  
**MISSING (required):** 0 — Task 8 e2e already present; no new specs added.

| Criterion / flow | E2E file / test | Status |
|------------------|-----------------|--------|
| Settings → save grid cols=2 → `/kiosk` matches mode/cols | `e2e/kiosk-layout.spec.ts` · `settings kiosk layout persists on /kiosk` | **covered** (hardened; **env-blocked** this Fix — see Fix Round) |
| Month board glance (Expenses/Income + empty chart or progress) | same test · `kiosk-month-board` labels / budget empty\|progressbar | **covered** (spec; not reached until DB up) |
| Fullscreen + focus cell (Task 8 acceptance alt path) | — | **blocked** — Task 8 TDD lists grid cols=2 **or** fullscreen; grid path is the automated happy path; fullscreen not required as second e2e |
| CSS column-cap readable on narrow viewport | — | **blocked** — optional if viewport helpers; not required when missing |
| Prefs/API/layout resolve / month-board loader / board engine | unit suites (`user-preferences*`, `kiosk-layout`, `month-board`, `kiosk-dashboard*`, settings focus matrix) | **covered** (unit) |

## Runs (full mode — Round 1)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.7 · `/kiosk` + `/settings` · 73 routes |
| Unit | `npm test` | 1* | **1511 pass · 0 fail · 31 skipped · 1 cancelled** — known Telegram `AbortSignal` cancel (pre-existing; fail=0 bar) |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts` | 1 | **1 failed** — soft-assert on cols while DB unavailable (see Failures Round 1). |

**Full result (Round 1):** **failure** — build green; unit fail=0; required e2e present but red.

## Failures (Round 1)

- **What:** After Settings grid + columns=2 + month board on, `/kiosk` never shows `[data-kiosk-pref-cols='2']` (15s).
- **Where:** `e2e/kiosk-layout.spec.ts` · `settings kiosk layout persists on /kiosk` (assert ~L72).
- **Excerpt:** `Error: expect(locator).toBeVisible() failed` · Locator `[data-kiosk-pref-cols='2']` · element(s) not found. Snapshot: kiosk heading + “Database temporarily unavailable” · month board “Unavailable · default currency USD” · weather/loans cells present.
- **Tied to requirement:** Task 8 / Design Important #1 (Settings layout → board). Root cause confirmed in Fix: Postgres down + e2e soft-passed optimistic Settings UI / same-route poll.

## Fix ask for my-dev-flow-code

1. Reproduce e2e with `E2E_STORAGE_STATE=e2e/.auth/user.json` and ensure webserver has working Postgres + migration `0048_kiosk_layout` applied (Smoke risk already noted).
2. Confirm layout-only / Settings PATCH persists `kiosk_layout.columns=2` and `/kiosk` renders `data-kiosk-pref-cols="2"` on `kiosk-board` when DB is up.
3. Re-run targeted `e2e/kiosk-layout.spec.ts` until green (month-board asserts after cols).

## Fix Round (Round 2) — my-dev-flow-code Fix-from-tests

**Result: verify-pass** (build + unit)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.7 · `/kiosk` + `/settings` · `/api/user/preferences` |
| Unit | `npm test` | 0 | **1511 pass · 0 fail · 31 skipped · 1 cancelled** (Telegram AbortSignal pre-existing; fail=0) |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts` | 1 | **Hard-fail (no soft-pass)** — clear env message (see e2e readiness) |

### Fix ask disposition

1. **Migration 0048** — present at `db/migrations/0048_kiosk_layout.sql` (`ADD COLUMN IF NOT EXISTS kiosk_layout jsonb`) + journal tag `0048_kiosk_layout` in `db/migrations/meta/_journal.json`. **Run path:** `pnpm run db:migrate` (README). Local Postgres: `docker compose -f docker-compose-db.yml up -d` then migrate. This Fix could not apply migrate: Docker daemon unavailable (`ECONNREFUSED` on `localhost:5432`).
2. **Prefs PATCH / `data-kiosk-pref-cols`** — product already writes `kiosk_layout` via `hasLayout` in `lib/user-preferences-service.ts`; board sets `data-kiosk-pref-cols` from `kioskLayout.columns` in `components/kiosk/kiosk-dashboard.tsx`. Unit coverage: layout-only PATCH + dashboard cols=2. **Added:** Settings rolls back optimistic layout/widgets on failed save; prefs GET/PATCH return **503** `db_unavailable` when DB unreachable (was opaque 400 Failed query).
3. **E2E hardened** — asserts successful PATCH body (`kioskLayout.columns === 2`); fails immediately if Settings/Kiosk show “Database temporarily unavailable” with migrate/Docker/auth hint; no soft-pass on optimistic UI.

### E2E readiness

- **Status:** not green in this environment — **blocked on Postgres** (Docker not running; `DATABASE_URL` → `localhost:5432` ECONNREFUSED).
- **Auth:** `e2e/.auth/user.json` present; run with `E2E_STORAGE_STATE=e2e/.auth/user.json`.
- **When DB is up:** start DB → `pnpm run db:migrate` (applies `0048_kiosk_layout`) → re-run  
  `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts`  
  Expect green: PATCH columns=2 → `/kiosk` `[data-kiosk-pref-cols='2']` + month-board glance.
- **Latest e2e fail (intentional hard-fail):**  
  `Settings shows Database temporarily unavailable — cannot assert kiosk_layout persistence. Postgres must be up and migrated (pnpm run db:migrate → 0048_kiosk_layout). Start local DB: docker compose -f docker-compose-db.yml up -d. Auth: E2E_STORAGE_STATE=e2e/.auth/user.json`

### Round notes

- Verify attempts this Fix entry: **1** of 3 → **verify-pass**.
- Product files touched: `e2e/kiosk-layout.spec.ts`, `components/kiosk/kiosk-widget-settings.tsx`, `app/api/user/preferences/route.ts`.
- No commit/push.
- Parent: re-run **test-full** (or targeted kiosk e2e) after Postgres + migrate; do not treat e2e as green until that pass.

## Round 3 — Decision 1 Option 1 (migrate + e2e)

**Updated:** 2026-10-13T13:10Z

| Step | Result |
|------|--------|
| Postgres `localhost:5432` | open (already running; Docker Desktop app broken locally) |
| `pnpm run db:migrate` | **success** — migrations applied (0048 included) |
| Agent Playwright e2e | **blocked** — Chromium `SIGSEGV` / sandbox (`kill EPERM`); Next `pnpm dev` also hits `uv_interface_addresses` in agent |
| Full result | still **failure** until local Terminal e2e is green |

**User command (Terminal.app / iTerm, not agent):**

```bash
# ensure app is reachable (dev or start), then:
E2E_SKIP_WEBSERVER=1 E2E_BASE_URL=http://localhost:3000 \
  E2E_STORAGE_STATE=e2e/.auth/user.json \
  npm run test:e2e -- e2e/kiosk-layout.spec.ts
```

Or let Playwright start the server:

```bash
E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts
```

Reply with exit code / pass so parent can mark test-full **success** → Gate C.

## Round 3 close — local Terminal e2e

**Updated:** 2026-10-13T13:43Z  
**User report:** `pass` (local Terminal; agent Chromium SEGV bypassed)

| Step | Result |
|------|--------|
| Postgres + `pnpm run db:migrate` | success (0048 applied earlier this round) |
| E2E `e2e/kiosk-layout.spec.ts` | **pass** (user Terminal) |
| Full result | **success** |

**Full result (Round 3):** **success** — build + unit green (prior Verify); targeted kiosk e2e green on local Terminal. Ready for Gate C.
