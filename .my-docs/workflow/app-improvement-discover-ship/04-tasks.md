# Tasks: app-improvement-discover-ship

**Scope note:** Tasks below are for **backlog #1 — Safe retry Idempotency** (Design Option 1 recommended). If Decision 6 picks another backlog item, replace Tasks 1–5 before design-review / Gate B.

**TDD:** Red tests first. Has API yes (additive optional header on Money `[kind]`). Has DB no.

## Task 0 — Human ship pick (S)

**Acceptance:**
- [x] Decision 6 → Option 1 (backlog #1 Safe retry Idempotency) recorded in `00-run.md`
- Tasks 1–5 apply to #1

**Tests:** N/A

## Task 1 — Client Idempotency-Key helper (S)

**Acceptance:**
- Pure helper (e.g. `lib/idempotency-client.ts`) mints a key ≤128 Unicode code points and returns headers merging `Content-Type: application/json` + `Idempotency-Key`
- Exported for unit tests; no React dependency

**TDD (red first):**
- Unit: minted key length ≤128 and non-empty after trim
- Unit: headers include both Content-Type and Idempotency-Key
- Unit: optional merge with extra headers does not drop the key

## Task 2 — Wire Investment commit + members POST (S)

**Acceptance:**
- `investment-statement-import-wizard` commit `fetch` uses helper (one key per commit attempt)
- `workspace-members-panel` add-member `POST` uses helper
- Success path unchanged when server returns replay header
- Regenerate key on a new user-initiated attempt (not reuse across different bodies)

**TDD:**
- Source/contract test: both call sites include `Idempotency-Key` in fetch headers (string match or thin wrapper mock)
- Existing investment/members happy-path behavior stays green

## Task 3 — Server Idempotency on Money legacy `[kind]` import (M)

**Acceptance:**
- Switch to `readJsonBoundedWithRaw`; hash uses raw body
- Validate `{ rows: array }` **before** claim (bad body → 400, no INSERT)
- `actor.route` = ``POST /api/money/import/${kind}`` (kind in route id)
- `beginIdempotencyRequest` / complete/abort like commit route
- Same 409 codes / `Idempotency-Replayed` semantics as `docs/ARCHITECTURE.md`
- Absent key still succeeds (unsafe retry) — no breaking change
- Response body shape unchanged `{ data: { created } }`
- Update ARCHITECTURE Idempotency table to list this route

**TDD (red first):**
- Route test: same key + same body → one side effect + `Idempotency-Replayed` on second call (stub domain write)
- Route test: absent key → success, no claim
- Route test: key >128 → 400, no claim
- Route test: invalid body (no rows array) → 400 before claim
- Keep rate-limit / CSRF / workspace gates behavior

## Task 4 — Wire Money CSV wizard (S)

**Acceptance:**
- `money-csv-import-wizard` import `fetch` to `moneyImportApiPath(kind)` sends Idempotency-Key via helper
- Busy/success UX unchanged on 200 (including replay)
- On 409 idempotency codes: error toast (existing path); next attempt uses a new key

**TDD:**
- Source/contract test: wizard fetch headers include Idempotency-Key
- Existing import wizard unit/source tests stay green

## Task 5 — Smoke verify (S)

**Acceptance:**
- `pnpm` build + unit (or project scripts) green for touched tests
- Manual optional: double-submit import with network throttle shows one create (document if auth-blocked)

**TDD:**
- Covered by Tasks 1–4 automated tests; e2e optional / skip if auth-blocked — say so in `06-test-log`

## Task order

0 (pick) → 1 → 2 → 3 → 4 → 5

## Planned tests summary (for 04a)

- Unit: client helper
- Route/unit: Money `[kind]` idempotency replay / absent / too long
- Source: three UI call sites send header

## If another backlog item is picked

Replace this file with S/M tasks + TDD for that item only. Keep Task 0 checked in `00-run.md`.
