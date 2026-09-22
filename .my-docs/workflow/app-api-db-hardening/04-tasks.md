# Tasks: App-wide API + DB hardening

**Has API:** yes · **Has DB:** yes · **Has UI:** no  
**Implement ranks:** 1–5, 7–10 · **Rank 6:** docs only · **Rank 8:** Build (hot mutators only)

## Task 1: Shared REST error helpers (`lib/api-http.ts`)

**Description:**
Extract `{ error, code, details? }` helpers (unauthorized, badRequest, forbidden, notFound, conflict, rateLimited, dbUnavailable) from Money’s shape. Point feature `api-*.ts` re-exports at the shared module. Replace plain-text 429/404 (and similar) on tokens / timezone / GraphQL HTTP transport errors with the same JSON.

**Acceptance:**

- [ ] Hardened routes return JSON `{ error, code }` for 401/403/400/404/429/503 (no plain-text body on those paths)
- [ ] Feature facades still importable as today (`unauthorized` from `api-money` / `api-investment` still works)

**Tests (TDD — what turns red first):**

- [ ] Unit: helper maps status → `{ error, code }` (incl. `rate_limited` 429)
- [ ] Unit or route test: tokens/timezone (or GraphQL HTTP) 429/403 body is JSON with `code`, not raw text

**Files likely touched:** `lib/api-http.ts` (new), `lib/api-money.ts`, `lib/api-investment.ts`, `lib/api-baby.ts`, `lib/api-loans.ts`, `app/api/tokens/**`, `app/api/workspace/timezone/route.ts`, `lib/graphql/http-handler.ts`

**Scope:** M

**Dependencies:** none

---

## Task 2: Align Investment REST API-key rules (rank 1)

**Description:**
Change `requireInvestmentContext` so API keys with `appKey` **money** or **investment** are allowed (match `resolveInvestmentWorkspaceId` / GraphQL). Do **not** change GraphQL to reject money keys. Keep wrong keys / missing workspace as 403.

**Acceptance:**

- [ ] Money bearer key can call Investment REST when workspace access passes
- [ ] Investment key still works; savings-only / other keys still 403
- [ ] Investment GraphQL money-key behavior unchanged

**Tests (TDD — what turns red first):**

- [ ] Unit: `requireInvestmentContext` with mocked auth — money key → context; inv key → context; other → forbidden
- [ ] Unit or route: GraphQL investment resolve still accepts money key (regression lock)

**Files likely touched:** `lib/api-investment.ts`, tests under `lib/` or route tests

**Scope:** S

**Dependencies:** Task 1 (preferred for error shape; can start after helpers exist)

---

## Task 3: Rate-limit Investment mutating REST (rank 4)

**Description:**
Add `enforceRateLimit` to Investment activities list/mutate and import routes with stable names. On deny, return shared 429 JSON.

**Acceptance:**

- [ ] Activities + import mutating handlers call `enforceRateLimit` before write work
- [ ] Over-limit response is 429 `{ error, code: "rate_limited" }`

**Tests (TDD — what turns red first):**

- [ ] Route/unit test with rate-limit stub returning false → 429 JSON `rate_limited`

**Files likely touched:** `app/api/investment/activities/route.ts`, `app/api/investment/activities/[id]/route.ts`, `app/api/investment/import/**`

**Scope:** M

**Dependencies:** Task 1

---

## Task 4: Atomic Money import commit + preview delete (rank 5)

**Description:**
Spell nested-tx reality vs today’s helpers and fix it:

1. **Prune outside:** `pruneExpired` / `withBypassRls` must **not** run inside the commit RLS callback. Call optional best-effort prune **before** `withMoneyWorkspaceRls`, and use commit-path get/delete that **skip** `pruneExpired` (or equivalent flags).
2. **One outer RLS connection:** Collapse preview load + commit + preview delete into **one** `withMoneyWorkspaceRls` / `runInWorkspace` callback.
3. **Refactor `commitMoneyImport`:** Stop opening a nested `db.transaction`. Use the ALS-bound `db` from the outer `runInWorkspace` tx (same pattern as other in-tx helpers). Commit writes + preview delete must share that connection so failure rolls back both.

**Acceptance:**

- [ ] Single outer RLS transaction wraps import writes and preview delete
- [ ] No `withBypassRls` / `pruneExpired` inside the commit RLS callback
- [ ] `commitMoneyImport` does not open a nested top-level `db.transaction` when called under RLS
- [ ] If delete (or a later step) fails after import writes, **ROLLBACK** — no committed import rows remain
- [ ] Happy path still returns prior success shape

**Tests (TDD — what turns red first):**

- [ ] Unit/integration: throw after import writes / on delete inside same outer tx → no committed import rows (rollback proved)
- [ ] Unit/integration: assert prune/bypass is not invoked during the outer commit callback (or commit-path helpers skip prune)
- [ ] Happy path: previewId commit deletes preview and returns imported

**Files likely touched:** `app/api/money/import/commit/route.ts`, `lib/money-import.ts` (`commitMoneyImport`), `lib/money-import-preview-store.ts` (skip-prune commit path)

**Scope:** M

**Dependencies:** none (can parallel Task 2–3 after Task 1)

---

## Task 5: Investment Zod validation messages (rank 7)

**Description:**
Replace opaque `"Validation failed"` / `"Invalid query"` on Investment REST with joined Zod issues (and optional `details`), matching workspace members style.

**Acceptance:**

- [ ] Invalid Investment query/body returns 400 `bad_request` with readable issue text
- [ ] Optional `details` present when useful; no secrets in payload

**Tests (TDD — what turns red first):**

- [ ] Route/unit: bad query → 400 body includes field/issue text (not only `"Validation failed"`)

**Files likely touched:** `app/api/investment/activities/route.ts` (and other Investment REST with opaque messages), validators if needed

**Scope:** S

**Dependencies:** Task 1

---

## Task 6: Idempotency-Key on hot mutating REST (rank 8)

**Description:**
Add optional `Idempotency-Key` header handling on **exactly** these REST paths:

- `POST /api/money/import/commit`
- `POST /api/investment/import/commit`
- `POST /api/workspace/members` (add only)

**Out of scope:** loan/money **pay** (GraphQL-only — no fictional REST pay path); members remove/patch.

**HTTP rules (must match `03-design.md`):**

- Max key length **128**; longer → 400 `bad_request`
- Missing header → current behavior
- Body hash = **raw request body bytes as received** (same on claim and compare)
- TTL **24h**; replay only non-expired `completed` rows
- Same key + same body hash → replay status/body + header `Idempotency-Replayed: true`
- Same key + different body hash → 409 `{ error, code: "idempotency_body_mismatch" }`
- Concurrent non-expired `in_progress` same key → 409 `{ error, code: "idempotency_in_progress" }` (do not wait)
- **Post-claim failure / abort:** DELETE the claim row; same key+body may retry (do **not** leave `in_progress` for 24h; do **not** store/replay errors)
- **Expired UNIQUE reclaim:** on conflict if `expires_at <= now()`, DELETE then INSERT new claim; never 409 in-flight for expired

**Store + integrity (this run — durable Postgres, not cache):**

- Additive migration + Drizzle schema for `http_idempotency` with typed columns and **UNIQUE** `(workspace_id, user_sub, route, key)`. No workspace RLS; app-filter by auth `workspace_id` + `user_sub`.
- Claim via **`INSERT … ON CONFLICT DO NOTHING`** (or unique-violation catch) — **not** check-then-act.
- Lifecycle: short **committed** claim → side effect + complete in **one** DB transaction (money: Task 4 outer RLS; investment/members: wrapping write tx) **before** HTTP response.
- TTL prune: delete only `status = 'completed' AND expires_at <= now()` — **never** prune `in_progress`.
- See `03-design.md` Example 4 (claim, reclaim, complete, delete-on-failure, prune).
- **Wiring order** must match the updated Money import + Idempotency-Key sequences in `03-design.md`: claim commits outside outer RLS; complete shares the mutator tx with import writes + preview delete.

**Acceptance:**

- [ ] Additive migration creates `http_idempotency` with unique `(workspace_id, user_sub, route, key)`
- [ ] Documented header + rules on the three routes above
- [ ] Replay with same key does not double-commit / double-import / double-add
- [ ] Body mismatch → 409 `{ error, code: "idempotency_body_mismatch" }`
- [ ] Non-expired in-flight same key → 409 `{ error, code: "idempotency_in_progress" }`
- [ ] Failed / aborted first attempt → claim deleted; same key+body retry may proceed (new claim)
- [ ] Expired row (completed or in_progress) + same key → reclaim succeeds; never 409 in-flight for expired
- [ ] Crash between handler success and complete cannot double-apply (same-tx complete with side effect makes the window impossible) — money import uses outer RLS; other two routes use wrapping write tx
- [ ] Prune does not delete `in_progress` rows
- [ ] Routes without the header behave as today

**Tests (TDD — what turns red first):**

- [ ] Migration/schema test or integration: table + unique constraint exist
- [ ] Unit/integration: two commits same key → one side effect, same success body + replay header
- [ ] Unit: same key different payload → 409 `idempotency_body_mismatch`
- [ ] Unit: concurrent claim while non-expired `in_progress` → 409 `idempotency_in_progress` (no double side effect)
- [ ] Unit/integration: first attempt fails/aborts after claim → row gone; retry same key+body succeeds (new claim)
- [ ] Unit/integration: expired row under UNIQUE + same key → reclaim + new claim (not 409 in-flight)
- [ ] Unit/integration: prove success-without-complete cannot double-apply (same-tx: force fail after writes before complete → rollback of writes **and** no `completed` row; or assert complete shares mutator tx)
- [ ] Unit: key length > 128 → 400 `bad_request`, no claim row (`idempotencyKey_rejectsOver128`)
- [ ] Unit: prune deletes expired `completed` only; expired `in_progress` remains (`idempotencyPrune_skipsInProgress`)
- [ ] Unit/route: missing `Idempotency-Key` → no `http_idempotency` row; mutator still succeeds (`idempotencyKey_absent_passthrough`)
- [ ] Thin smoke: investment import commit replay same key → one side effect + `Idempotency-Replayed` (`investmentImportCommit_idempotencyReplay`)
- [ ] Thin smoke: workspace members add replay same key → one side effect + `Idempotency-Replayed` (`workspaceMembersAdd_idempotencyReplay`)

*(Folded from `04a-tdd-test-review.md` Fix ask — Majors for Task 6.)*

**Files likely touched:** `db/migrations/*_http_idempotency.sql`, `db/schema/*`, `lib/` idempotency helper, `app/api/money/import/commit/route.ts`, `app/api/investment/import/commit/route.ts`, `app/api/workspace/members/route.ts`

**Scope:** M

**Dependencies:** Task 1 (error shape); Task 4 preferred before money import-commit wiring
---

## Task 7: Document pagination dialects only (rank 6)

**Description:**
Add a short docs note (AGENTS or architecture subsection) listing Money vs Investment/Savings vs Baby pagination params. **No** validator/route renames. Link follow-up for unify work.

**Acceptance:**

- [ ] Doc table lists the three dialects with paths
- [ ] Explicit “follow-up: unify pagination — not this PR”
- [ ] Zero pagination code/contract changes in this run

**Tests (TDD — what turns red first):**

- [ ] N/A — docs only (smoke: doc file exists / section present)

**Files likely touched:** `docs/ARCHITECTURE.md` and/or `AGENTS.md` (docs only)

**Scope:** S

**Dependencies:** none

---

## Task 8: Document non-RLS system tables (rank 9)

**Description:**
Document that `api_token`, `audit_event`, `user_preferences`, workspace* tables, and **`http_idempotency`** (rank 8) rely on app ownership filters (no workspace RLS). Remind writers to keep `userSub` / membership checks tight. Keep `money_import_preview` **off** this list (has workspace RLS in `0034`).

**Acceptance:**

- [ ] Short ownership note in AGENTS or architecture docs with table names + migration refs (`api_token`, `audit_event`, `user_preferences`, `workspace*`, `http_idempotency`; **not** `money_import_preview`)
- [ ] No schema/RLS migration for those system tables unless a real gap is found (expect none; rank 8 migration is separate Task 6)

**Tests (TDD — what turns red first):**

- [ ] N/A — docs hygiene (optional: existing ownership tests still green)

**Files likely touched:** `docs/ARCHITECTURE.md` and/or `AGENTS.md`

**Scope:** S

**Dependencies:** none

---

## Task 9: Confirm ESLint array / SUM guards (rank 10)

**Description:**
Verify `eslint.config.mjs` still flags `ANY(${x}::type[])` and money `SUM(…)::int`. Add a one-line AGENTS reminder if missing. No production query changes unless a new violation appears (expect clean).

**Acceptance:**

- [ ] Lint rules still present and documented
- [ ] No new `ANY(…::[]`) / `SUM(money)::int` in tree (or fixed if found)

**Tests (TDD — what turns red first):**

- [ ] Existing ESLint rule tests (if any) pass; or add a tiny eslint fixture test if repo already patterns that

**Files likely touched:** `eslint.config.mjs`, `AGENTS.md` (note only)

**Scope:** S

**Dependencies:** none

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit/route tests for Tasks 1–6 pass
- [ ] Docs Tasks 7–9 present; no pagination code drift
- [ ] Auth matrix: money + inv keys on Investment REST; GraphQL money key still works
- [ ] Idempotency: replay same key on import commit does not double-apply; failed attempt allows retry; expired reclaim works; same-tx complete closes success-without-complete
