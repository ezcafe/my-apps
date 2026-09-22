# TDD test-case review: app-api-db-hardening

**Result:** needs more tests
**Round:** 1
**Updated:** 2026-09-22

**Prereq:** `03a-design-review-log.md` Result **clean** (API + DB + general) — confirmed.

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Helper maps status → `{ error, code }` (incl. `rate_limited` 429) | yes |
| 1 | real | Tokens/timezone (or GraphQL HTTP) 429/403 body is JSON with `code` | yes |
| 1 | real | Feature facades still re-export helpers | partial (acceptance only; no TDD line) |
| 2 | real / permission | `requireInvestmentContext`: money key → ok; inv key → ok; other → forbidden | yes |
| 2 | real / regression | GraphQL investment resolve still accepts money key | yes |
| 3 | real / failure | Rate-limit stub false → 429 JSON `rate_limited` | yes |
| 4 | edge / integrity | Throw after import writes / on delete → no committed import rows | yes |
| 4 | edge | Prune/bypass not invoked inside outer commit callback | yes |
| 4 | real | Happy path: previewId commit deletes preview and returns imported | yes |
| 5 | real / invalid input | Bad Investment query → 400 with field/issue text (not opaque string) | yes |
| 6 | real | Migration/schema: table + unique `(workspace_id, user_sub, route, key)` | yes |
| 6 | real / idempotency | Same key twice → one side effect + replay header | yes |
| 6 | edge | Same key different body → 409 `idempotency_body_mismatch` | yes |
| 6 | edge / race | Non-expired `in_progress` → 409 `idempotency_in_progress` | yes |
| 6 | edge / failure | Post-claim abort → claim deleted; retry same key+body succeeds | yes |
| 6 | edge | Expired row → reclaim (not 409 in-flight) | yes |
| 6 | edge / integrity | Same-tx complete: fail before complete → rollback writes + no `completed` row | yes |
| 6 | edge / boundary | Key length > 128 → 400 `bad_request` | no |
| 6 | real | Missing `Idempotency-Key` → current behavior (no store) | no |
| 6 | edge | TTL prune deletes only expired `completed` (never `in_progress`) | no |
| 6 | real | Protocol wired on all three hot routes (money + investment import + members add) | partial (suite unspecified; risk of money-only) |
| 7–9 | docs / lint | Docs-only / existing eslint hygiene | yes (N/A TDD) |

**Existing repo skim:** No dedicated unit tests yet for `api-http`, `requireInvestmentContext`, money import commit atomicity, or idempotency. Tokens still return plain-text 429 (`app/api/tokens/route.ts`). Investment REST still rejects non-`investment` keys (`lib/api-investment.ts`). Investment activities still use opaque `"Invalid query"` / `"Validation failed"`. No `http_idempotency` table yet — expected until Build.

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 6 | Key longer than 128 → 400 | `idempotencyKey_rejectsOver128` — assert status 400, `code: "bad_request"`, no claim row |
| Major | 6 | Prune must not delete `in_progress` | `idempotencyPrune_skipsInProgress` — insert expired `in_progress` + expired `completed`; prune → only `completed` gone |
| Major | 6 | Missing header keeps today’s behavior | `idempotencyKey_absent_passthrough` — no header → no `http_idempotency` row; mutator still succeeds (one of the three routes) |
| Major | 6 | Three-route wiring (not money-only) | Shared helper owns protocol tests once; add thin smokes: `investmentImportCommit_idempotencyReplay` + `workspaceMembersAdd_idempotencyReplay` (same key → one side effect + `Idempotency-Replayed`) |
| Enhancement | 1 | Facade re-exports still work | `apiMoney_reexportsHttpHelpers` — import `unauthorized` / `rateLimited` from `api-money` (and one peer) still resolves |
| Enhancement | 6 | Raw-body hash (byte identity) | `idempotencyHash_usesRawBytes` — same JSON object, different whitespace/key order → different hash → 409 `idempotency_body_mismatch` (or second claim if treated as new body) |
| Enhancement | 3 | Cover both mutate families | Stub deny once on activities POST **and** once on import commit (or assert both call `enforceRateLimit`) |

## Real scenarios checked

- **Happy path:** Task 4 preview commit; Task 6 same-key replay; Task 2 money/inv keys allowed.
- **User-visible failures:** Task 1 JSON 429/403; Task 3 rate limit; Task 5 Zod messages; Task 6 body mismatch / in-progress 409; Task 6 post-claim failure + retry.
- **Empty / loading / permission:** Has UI = no (N/A). Permission: Task 2 wrong/other key → forbidden. Missing: Task 6 key-length 400; missing-header passthrough.

## Edge scenarios checked

- **Boundaries / invalid input:** Task 5 bad query; Task 6 different body. **Gap:** key length > 128.
- **Concurrency / double-submit / idempotency:** in-progress 409; replay; abort+retry; expired reclaim; same-tx complete. Strong for the helper protocol.
- **Offline / partial data / race:** Task 4 rollback on mid-tx throw; Task 6 same-tx integrity. **Gap:** prune must spare `in_progress`; three-route wiring not locked.

## Fix ask for Build

Concrete tests to add or strengthen (fold into Task 6 / Task 1 in `04-tasks.md` before or during Build):

1. **Task 6 — `idempotencyKey_rejectsOver128`:** header length > 128 → 400 `{ code: "bad_request" }`; no `http_idempotency` insert.
2. **Task 6 — `idempotencyPrune_skipsInProgress`:** prune deletes only `status = 'completed' AND expires_at <= now()`; expired `in_progress` remains.
3. **Task 6 — `idempotencyKey_absent_passthrough`:** omit header on one hot route → success path unchanged; zero rows for that request.
4. **Task 6 — three-route smokes:** keep one full protocol suite on the shared helper (or money import); add thin replay smokes for `POST /api/investment/import/commit` and `POST /api/workspace/members` (add).
5. **Optional (Enhancement):** Task 1 facade re-export smoke; Task 6 raw-byte hash; Task 3 rate-limit deny on both activities + import.

## Round notes

- Design-review clean — TDD review may proceed to Gate B after Fix ask is folded into tasks (or accepted for Build to add Red tests first).
- Tasks 1–5 planned cases are enough for real + important edges (few strong tests). Task 6 protocol suite is strong but incomplete vs acceptance / Example 4g / HTTP max-length rule.
- Prefer helper-level protocol tests + two thin route smokes over duplicating the full matrix three times.
- Docs Tasks 7–9 correctly N/A for TDD.
- No product code written this stage.
