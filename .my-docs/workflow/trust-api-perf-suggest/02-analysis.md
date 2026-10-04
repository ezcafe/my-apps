# Analysis: trust-api-perf-suggest

**Updated:** 2026-10-04
**Has UI:** no (this run)
**Has API / Has DB (this run):** no / no — deliverable is ranked suggestions; future ship runs set flags per item.

## What is this?

A maintainer-facing ranked backlog of trust, API consistency, and performance debt in `my-apps`, grounded in primary docs and code — not a product feature ship.

## Why do we need this?

Without a ranked list, hardening work is ad hoc. Spenders can still double-apply unsafe REST retries; Non-RLS tables rely on app filters; PERFORMANCE.md follow-ups stay unread. Skipping this leaves the next PR guesswork.

## How to do this?

1. Inventory primary-source gaps (ARCHITECTURE, PERFORMANCE, API, BABY_API + routes).
2. Score by trust impact × finishable S/M × existing pattern reuse.
3. Publish ranked backlog in Design; stop (Decision 1 Option 3).

**Other ways:** Ship one item now (rejected — user chose suggest-only). Full audit report (too large).

**Best practices:** Prefer published contracts (`Idempotency-Key`, Baby `clientRequestId`); do not rename pagination casually; keep Non-RLS ownership tests tight.

## Solution pieces (≤5)

### 1. Residual REST safe-retry coverage

- **What:** Hot mutating REST without `beginIdempotencyRequest` (confirmed: `POST /api/investment/activities`; also workspace create/reset, members remove, import preview/abandon, tokens POST, Watch pair — verify per future ship).
- **Why:** Absent key = unsafe retry (`ARCHITECTURE.md`); activity create is money-adjacent and listed in `API.md`.
- **How:** Extend optional Idempotency-Key + client helper on chosen routes; reuse `lib/http-idempotency`.
- **Other ways:** GraphQL-only mutation keys (different stack).
- **Best practice:** Validate body before claim; optional header additive.

### 2. List pagination dialect unify (scoped)

- **What:** Three dialects documented in `ARCHITECTURE.md` with explicit follow-up.
- **Why:** External/API clients and internal validators diverge.
- **How:** Prefer S slice (docs + one adapter) over big-bang rename.
- **Other ways:** Leave as-is forever (debt grows).
- **Best practice:** Dedicated approved task; no casual renames.

### 3. Non-RLS ownership regression tests

- **What:** Tables without workspace RLS must filter by `userSub` / membership (`ARCHITECTURE.md`).
- **Why:** Wrong filter = cross-user leak risk on tokens/preferences/workspace.
- **How:** Focused unit/integration tests for `api_token`, workspace membership writers, `http_idempotency` actor scope.
- **Other ways:** Rely on code review only.
- **Best practice:** Never trust client-supplied workspace alone.

### 4. DB housekeeping cron (rate limit + import preview)

- **What:** PERFORMANCE.md documents `DELETE` for `security_rate_limit` and `money_import_preview`; no matching `app/api/cron/*` job found.
- **Why:** Table growth → slower limits / stale previews.
- **How:** Cron route + `CRON_SECRET` like existing crons; batch deletes.
- **Other ways:** Manual SQL / pg_cron only.
- **Best practice:** Same cron auth pattern as loan-reminders.

### 5. Baby quick-care retention prune

- **What:** `baby_quick_care_request` grows with Watch retries; has `created_at` index; no prune job in repo skim.
- **Why:** Trust at scale for caregiver logging.
- **How:** TTL prune (mirror `http_idempotency` completed prune) + cron or claim-path best-effort.
- **Other ways:** Unbounded growth until partition.
- **Best practice:** Never delete in-progress / needed replay rows early.

## Spike notes

| Topic | Finding |
|-------|---------|
| Idempotency routes | Only commit, `[kind]`, investment commit, members POST call `beginIdempotencyRequest` |
| Investment activities POST | Rate limit + RLS; no Idempotency-Key |
| Cron housekeeping | No cron files reference `security_rate_limit` / `money_import_preview` |
| Kiosk baseline | PERFORMANCE.md still “(measure after change)” |

## Design tree (frontier) stub

- Rank #1 candidate: residual REST Idempotency (investment activities) vs housekeeping cron vs Non-RLS tests
- Pagination: S docs/adapter vs defer L unify
- Baby prune vs REST residual (lens prefers trust; both OK — REST first for published Idempotency contract)
- Infra L (Redis/PgBouncer): demote below pick line

## Settled (pre-Grill hints)

- Suggest-only stop after Design
- Prior Money `[kind]` Idempotency ship not re-ranked as #1
- Has UI no for this run
