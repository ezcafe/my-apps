# Review log: app-api-db-hardening

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `lib/money-import-commit-atomic.test.ts` (suite); Task 4 TDD | **No rollback proof.** Acceptance requires: throw after import writes / on preview delete inside the outer RLS tx → no committed import rows. Draft tests only (a) assert ALS bind when `DATABASE_URL` is set, and (b) `readFileSync` string matches (`skipPrune`, `withMoneyWorkspaceRls`, no `return db.transaction(`). A route can still nest commits or delete outside the tx and stay green. Add a real unit/integration that forces failure after writes (or on delete) and asserts zero lasting import rows. | fixed |
| Major | `lib/api-http-transport.test.ts:5–19`; Task 1 | **Mock theater / wiring gap.** Test calls `rateLimited()` / `forbidden()` helpers only. It never hits `app/api/tokens/**`, `workspace/timezone`, or GraphQL HTTP handlers. Those routes can revert to plain-text 429/403 and this suite still passes. Lock at least one real handler path (or a thin module export used only by those routes) returning JSON `{ code }`. | fixed |
| Major | `lib/investment-rest-hardening.test.ts:31–38`; Task 3 | **Rate-limit deny untested on routes.** Case only builds `rateLimited()` JSON. No stub of `enforceRateLimit` → false on activities list/mutate or import preview/commit. Does not prove handlers call `enforceRateLimit` before writes or return 429 `rate_limited` on deny. Add route/unit with deny stub (cover ≥1 activities + ≥1 import family). | fixed |
| Major | `lib/investment-rest-hardening.test.ts:6–28`; Task 5 | **Zod message not locked on Investment REST.** Test reimplements `issues.map(…).join` + `badRequest` in the test file. It does not invoke activities GET/PATCH/POST handlers. Route can still return opaque `"Validation failed"` / `"Invalid query"` while tests stay green. Drive bad query/body through the route (or shared formatter the route imports) and assert response `error` contains field/issue text. | fixed |
| Major | `lib/http-idempotency.test.ts:327–343`; Task 6 three-route smokes | **Source-scan stands in for replay smoke.** Folded TDD asked for thin smokes: same key → one side effect + `Idempotency-Replayed`. Draft only `readFileSync` + `assert.match` for claim/complete symbols on investment import + members. That does not prove replay, header, or single side effect. Add real (or heavily stubbed handler) replay assertions for those two routes; keep helper protocol suite for the matrix. | fixed |
| Major | `lib/http-idempotency.test.ts:223–269`; Task 6 same-tx | **False confidence on success-without-complete.** Test claims a key, throws inside `withDbTransaction` *before any side-effect write and before `completeIdempotencyClaim`*, then asserts row still `in_progress` and manually deletes. It never proves: fail after mutator writes but before complete → writes roll back **and** no `completed` row. Rewrite to complete-sharing the mutator tx (insert temp row / call complete, then throw) or assert complete uses ALS-bound `db` with a failing sibling write. | fixed |
| Major | `lib/http-idempotency.test.ts:22–33`, `321–325`; Task 6 key length + absent | **Boundary cases stop at parse.** `idempotencyKey_rejectsOver128` and `idempotencyKey_absent_passthrough` never assert “no `http_idempotency` row” or “mutator still succeeds” on a hot route. Over-128 does not prove routes return 400 without `claimIdempotencyKey`. Wire one money (or members) handler path: >128 → 400 `bad_request` + zero rows; missing header → success + zero rows for that request. | fixed |
| Major | Task 4 + Task 6 DB suites; `06-test-log.md` smoke | **Integrity suite skipped in smoke-pass.** Protocol cases and Task 4 ALS use `{ skip: !hasDb }`. Smoke round 2: 24 skip, no `DATABASE_URL` — so claim/replay/prune/in_progress/reclaim never ran when review started. Source-scan + helper tests alone are not enough for ranks 5/8. Either run protocol under CI with a test DB, or add always-on tests that fail closed when the integrity path cannot execute (and document). | fixed |
| Enhancement | `lib/api-investment-auth.test.ts:6–14`; Task 2 | Gate covered via `isInvestmentApiTokenAppKeyAllowed`, not `requireInvestmentContext` with mocked auth as planned. GraphQL `resolveInvestmentWorkspaceId` regression is good. Prefer one mocked-auth test on `requireInvestmentContext` so the REST entry cannot drop the gate. | fixed |
| Enhancement | Task 6 replay HTTP | No test asserts response header `Idempotency-Replayed: true` (constant exists; money/investment/members set it on replay). Add once on helper→response mapping or a stubbed handler. | fixed |
| Enhancement | Task 6 reclaim | Expired **`in_progress`** reclaim is covered; expired **`completed`** reclaim under UNIQUE is not. Add one case: expired completed + same key → new claim (not body_mismatch / in_progress). | fixed |
| Nit | `lib/api-http.test.ts`; Task 1 helpers + facade re-exports | Solid status→`{ error, code }` matrix and facade re-export smoke. Keep. | — |
| Nit | `lib/http-idempotency.test.ts` helper protocol (when DB on) | Claim/replay, body_mismatch, in_progress, abort+delete+retry, prune skips in_progress, raw-byte hash whitespace — strong when executed. | — |
| Nit | `lib/hardening-docs.test.ts`; Tasks 7–9 | Docs/lint presence checks fit docs-only tasks. | — |

**Result:** clean

**Fix ask (adversarial → Fix):** — closed (round 2)

1. ~~Task 4 rollback Red~~ → always-on ledger throw-after-writes + fail-closed RLS wiring (`commit`/`delete`/`complete` in one callback)
2. ~~Task 1 transport~~ → real `handleMoneyGraphQLHttp` 429/403 JSON `{ code }`
3. ~~Task 3 rate-limit stub~~ → activities POST + import preview POST deny → 429 `rate_limited`
4. ~~Task 5 Zod via route~~ → activities GET bad `limit` → 400, not opaque; `details` present
5. ~~Task 6 thin smokes~~ → inv import commit + members add: one side effect + `Idempotency-Replayed: true`
6. ~~Task 6 same-tx~~ → always-on rollback sim + DB case (when `DATABASE_URL`): side write rolls back, claim stays `in_progress`
7. ~~Task 6 over128 + absent~~ → money import commit hot route: 400/`claimCalls===0`; absent → 200/`claimCalls===0`
8. ~~DB skip policy~~ → always-on integrity substitutes; protocol stays `{ skip: !hasDb }` (documented)

**Round notes:**

- Round 1 adversarial (fresh verifier). Generation ≠ verification.
- Planned cases from `04-tasks.md` / `04a` are mostly *named* in draft files, but several Critical/Major paths are helper-only, source-scan, or `{ skip: !hasDb }` — false green risk.
- Do not rewrite product features in Fix unless a Red test proves a real bug; prefer strengthening tests first (TDD).
- Quality / SPM lenses not run in this stage.
- **Round 2 (re-verify after Fix):** Fresh verifier. Re-read Fix notes + suites for Tasks 1–9. Focused run: pass 33 / fail 0 / skipped 9 (DB protocol). Fix ask 1–8 and all three Enhancements closed. Zero open Critical / Major / Enhancement. **Adversarial test review: clean.**
- **Round 3 (re-verify after all fixes):** Fresh Senior Verifier. Generation ≠ verification. Re-read `04-tasks.md` TDD lines, Fix notes (adversarial + quality + SPM test touchpoints), and draft suites: `money-import-commit-atomic`, `api-http` / `api-http-transport`, `investment-rest-hardening`, `api-investment-auth` / `api-investment-context`, `http-idempotency` / `http-idempotency-route`, `hardening-docs`. Focused run (`pnpm exec tsx --experimental-test-module-mocks …` on those nine files): **pass 40 / fail 0 / skipped 9** (skips = DB protocol + ALS when no `DATABASE_URL`; unchanged policy). Fix asks 1–8 remain closed: always-on Task 4 rollback ledger + fail-closed RLS wiring; real `handleMoneyGraphQLHttp` 429/403 JSON; activities POST + import preview POST rate-limit deny; activities GET Zod via handler; stubbed inv/members replay + `Idempotency-Replayed` + `Cache-Control`; same-tx always-on + DB case; money hot route >128/absent/validate-first `claimCalls`; `requireInvestmentContext` mocked auth; expired **completed** reclaim DB case; always-on integrity wiring substitutes. Residual **Nit only** (non-blocking): Task 4 TDD happy path (`previewId` → delete + `imported`) still not a dedicated assertion (wiring source-scan + money route smoke partial); `app/api/tokens/**` / workspace timezone handlers not route-stubbed (Task 1 locked via GraphQL HTTP + shared helpers per plan). No new Critical / Major / Enhancement. **Adversarial test review: clean (round 3 re-verify).**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-care-one-tap.test.ts` | **Unrelated scope in hardening draft.** Diff relaxes sleep one-tap Done-flash assertions (`endedWithDuration` path). Not in Tasks 1–9, design ranks, or Fix notes. Bundling unrelated product-test behavior with API/DB hardening pollutes review and merge risk. Drop from this draft (separate change) or document why it must ship together. | fixed (kept; intentional out-of-scope smoke fix — see Fix notes) |
| Major | `package.json` `scripts.test` | **Repo-wide experimental Node flag.** `pnpm test` now always passes `--experimental-test-module-mocks` so a few hardening suites can `mock.module`. That changes the default runner for every unit test (lib/components/db/features). Prefer scoping the flag to those suites (dedicated script / file runner) or prove + document that mocks cannot leak across files; do not leave an experimental switch as the silent default without a written blast-radius note. | fixed |
| Enhancement | `app/api/money/import/commit/route.ts`, `app/api/investment/import/commit/route.ts`, `app/api/workspace/members/route.ts` | **Idempotency orchestration triplicated (Pattern 4 incomplete).** Claim/replay/409/delete switch (~40 lines) is copy-pasted on three routes and already drifted: money replay sets `Cache-Control: no-store`, investment/members replay do not. Extract one shared `runWithIdempotencyKey` (or equivalent) so header/body/status handling cannot diverge. | fixed |
| Enhancement | Money/investment import commit vs `app/api/workspace/members/route.ts` POST | **Claim vs validate order inconsistent.** Members: Zod first, then claim. Money/investment: claim (INSERT) then parse/validate; invalid bodies still write then DELETE `http_idempotency` rows. Align to validate-first to cut claim churn and match the cleaner members path. | fixed |

**Result:** clean

**Fix ask (quality → Fix):** — closed (round 2)

1. ~~Baby-care Done-flash test: keep + document intentional out-of-scope~~ → comment in suite; contract sync kept
2. ~~Scope `--experimental-test-module-mocks` off default unit pool~~ → `scripts/run-unit-tests.mjs` unit pool without flag; process 2 / `test:module-mocks` for four `mock.module` suites; blast-radius note present
3. ~~Shared idempotency begin + Cache-Control on replay~~ → `beginIdempotencyRequest` / `idempotencyReplayResponse` / `abortIdempotencyClaim`; all three hot routes; replay always `no-store` + `Idempotency-Replayed`
4. ~~Validate-first~~ → money Zod `safeParse` before claim; investment object check before claim; members Zod unchanged via shared begin; route smoke `claimCalls===0` on invalid money body + key

**Round notes:**

- Round 1 Quality (fresh Senior Verifier). Generation ≠ verification. Adversarial tests already clean; this pass is five-axis quality vs `01-idea` / `03-design` System design + Design patterns Best practices / `04-tasks`.
- Honored: shared `lib/api-http.ts` facade + feature re-exports; Investment money\|investment key gate; named `enforceRateLimit` on Investment mutates; Money import one outer RLS + `skipPrune` + no nested `db.transaction` under ALS; claim outside / complete inside mutator tx on three hot routes; docs Tasks 7–9 present.
- Deferred: API contract field/code matrix → API lens; schema/migration/SQL/query ownership → DB lens.
- Checklist (R1): Context understood · Correctness+architecture reviewed · Security skim only (deep → security lens) · Readability · Performance skim · Deps: no new packages; test script flag flagged · Verdict: **Request changes**
- **Round 2 (re-verify after Fix):** Fresh Senior Verifier. Generation ≠ verification. Re-read Fix notes + code for asks 1–4.
  - Ask 1: `components/baby-care-one-tap.test.ts` keeps Done-flash sync with explicit “Intentional out-of-scope” comment — closed.
  - Ask 2: Default unit collect excludes `MODULE_MOCK_FILES`; flag only on second process / `pnpm test:module-mocks`. Confirmed route suite fails without flag (`mock.module is not a function`) and passes with flag — closed.
  - Ask 3: Shared helpers in `lib/http-idempotency.ts`; money/inv/members use `beginIdempotencyRequest`; no remaining inline claim/replay/409 switches; helper + route tests lock `Cache-Control: no-store` on replay — closed.
  - Ask 4: Money Zod before claim; inv object-gate before claim; members Zod before claim; validate-first smoke green under module-mocks — closed.
  - Zero open Critical / Major / Enhancement. Nit only (non-blocking): inv commit has no Zod schema (object gate only); success-path `Cache-Control` still money-only (replay path unified). **Quality: clean.**

- **Round 3 (re-verify, fresh Senior Verifier):** Generation ≠ verification. Re-read draft tree vs `01-idea.md`, `03-design.md` System design / Best practices, `04-tasks.md` Tasks 1–9, and Merged SPM Fix notes (owner-before-claim, investment Zod-before-claim, `clientSafeErrorMessage` / `ClientFacingError`, ARCHITECTURE Idempotency-Key, batched prune, redacted replay bodies).
  - Quality R2 Fix asks 1–4 still hold: baby-care Done-flash comment documents intentional out-of-scope; `scripts/run-unit-tests.mjs` keeps experimental mocks off default pool with blast-radius note; `beginIdempotencyRequest` / `idempotencyReplayResponse` / `abortIdempotencyClaim` on money/inv/members (no inline claim/replay switches); validate-first before claim on all three hot routes (investment now uses `investmentImportCommitBodySchema`, not object-only gate).
  - Architecture/readability: shared `lib/api-http.ts` + feature re-exports; Investment money\|investment key gate; money import one outer RLS + ALS `commitMoneyImport` + `skipPrune`; idempotency complete inside mutator tx.
  - Deferred nits only (do not block): live 200 `Cache-Control: no-store` on money import commit only (replay unified); duplicated `requireSameOrigin` helper across import/activities routes (pre-hardening pattern); body hash via UTF-8 string after bounded decode (API lens A2).
  - Checklist (R3): Context understood · Correctness+architecture vs tasks · Security skim (deep → security lens; SPM closed) · Readability · Performance skim (batched prune) · Deps: no new packages · Verdict: **Approve**
  - Zero open Critical / Major / Enhancement. **Quality: clean (round 3 re-verify).**

---


## Merged SPM (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-api.md`, `05-lens-db.md`, `05-lens-security.md`, `05-lens-performance.md`, `05-lens-memory.md` (only files for lenses in SPM plan this round).

**Round:** 1 → 2 (fixes verified)
**Result:** clean

### Winners (fix these)

| Severity | Sources (api/db/security/perf/memory) | Finding | Decision |
|----------|---------------------------------------|---------|----------|
| Major | security (S1), db (D1) | Members POST calls `beginIdempotencyRequest` with body `workspaceId` before owner check. Any signed-in user can INSERT (and briefly leave) `http_idempotency` rows under another workspace’s FK for their `user_sub`. Violates non-RLS trust boundary. | keep — one winner; Security wording + DB ownership |
| Major | security (S2) | Investment import commit only `typeof object` then claims; invalid/huge bodies still create `in_progress` rows. Design + money path require real schema validate before claim. | keep |
| Major | security (S3) | `dbUnavailable` and mutator catches return ops/raw `Error.message` / `String(e)` to clients on hardened paths. | keep |
| Major | api (A1) | Idempotency-Key client contract undocumented (three routes, length 128, replay header, 409 codes, absent key = unsafe to retry). Task 6 / design require docs. | keep |
| Enhancement | db (D2) | `pruneExpiredIdempotencyCompleted` is unbounded `DELETE` of expired completed rows. | keep |
| Enhancement | security (S4) | Replay `response_body` stores email / full commit result for TTL; residual operator/backup exposure. | keep |
| Enhancement | security (S5) | Replay returns stored body without re-checking live ownership/token after revoke within TTL. | keep |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| D1 alone (db) — members body `workspaceId` before claim | S1+D1 merged winner | Same bug as S1. Conflict priority: Security Major + DB integrity → one Fix item; sources listed as security+db. |
| A2 (api Nit) — hash after UTF-8 decode vs raw bytes | — (deferred Nit) | Speculative drift for invalid UTF-8 only; not Critical/Major/Enhancement. |
| S6 (security Nit) — GraphQL POST 405 still plain text | — (deferred Nit) | Transport polish only; non-blocking. |

### Fix ask (for Fix agent)

1. **Major (S1/D1):** In `app/api/workspace/members/route.ts`, verify workspace ownership (same check as list/add owner) **before** `beginIdempotencyRequest`. Pass only that verified `workspaceId` into the actor. Do not claim on body `workspaceId` alone.
2. **Major (S2):** In `app/api/investment/import/commit/route.ts`, parse with a Zod (or shared) commit schema **before** `beginIdempotencyRequest` — same validate-first order as money import commit. Invalid bodies must not INSERT claims.
3. **Major (S3):** In `lib/api-http.ts` `dbUnavailable` and catch paths on investment activities (+ `[id]`), investment import commit, money import commit: return stable client messages only (`"Database unavailable"`, `"Import failed"`, etc.). Map known domain codes; log internals server-side. No raw `Error.message` / `String(e)` / docker/`DATABASE_URL` hints to clients.
4. **Major (A1):** Document Idempotency-Key client contract in `docs/ARCHITECTURE.md` (or AGENTS): three paths (`POST /api/money/import/commit`, `POST /api/investment/import/commit`, `POST /api/workspace/members`); optional header; max 128 code points; replay header; 409 `idempotency_*` codes; **without header = unsafe to retry**.
5. **Enhancement (D2):** Batch `pruneExpiredIdempotencyCompleted` (`LIMIT` / `DELETE … WHERE id IN (SELECT … LIMIT n)`) on the claim path, or a tiny cron — avoid unbounded lock holds.
6. **Enhancement (S4):** Prefer redacted replay bodies (ids/counts) or hash+status where product allows; keep TTL + never log `response_body`.
7. **Enhancement (S5):** On replay, re-run ownership/token validity before returning stored body, or accept short TTL explicitly in docs if product chooses not to re-check.

**Round notes:**

- Lenses this round: **api**, **db**, **security** (no perf/memory files).
- Deduped D1 ↔ S1 into one winner (user + arbiter rule).
- Nits A2/S6 deferred — do not block Result.
- Result **needs fix**: 4 Major + 3 Enhancement open after merge (round 1).
- **Merged SPM round 2 (parent verify + test fix):** Fix ask 1–7 implemented in code/docs; `http-idempotency-route.test.ts` mocks `assertWorkspaceOwner`; members replay data shape fixed. **Result: clean.**
- **Lens round 2 re-verify (retry after stopped/errors):** Fresh parallel verifiers rewrote `05-lens-api.md`, `05-lens-db.md`, `05-lens-security.md` (Round 2). All three **Result: clean**; zero open Critical/Major/Enhancement. Deferred nits only: API A2 UTF-8 hash path; security S6 GraphQL 405 plain text. Adversarial + Quality **round 3 re-verify** also clean (`pnpm test` green; hardening suites 40 pass / 9 skip).

---

## Fix notes (merged-spm)

All Merged SPM Fix ask items 1–7 verified in tree: members owner-before-claim; investment Zod-before-claim; `clientSafeErrorMessage` on hardened catches; ARCHITECTURE Idempotency-Key section; batched prune; redacted members replay body; auth-on-replay documented in ARCHITECTURE. Test fix: `assertWorkspaceOwner` mock in route smokes; source-scan uses `await assertWorkspaceOwner(userSub, workspaceId)`.

---

## Fix notes (adversarial → Fix, lens = adversarial-tests)

**TDD:** Strengthened tests first. No product-code bug found (all Red→Green via test/harness only). Enabled `--experimental-test-module-mocks` on `pnpm test` for stubbed handler paths.

| Fix ask # | What changed | Files |
|-----------|--------------|-------|
| 1 | Always-on outer-tx rollback Red: throw after import writes → ledger empty; fail-closed wiring that commit+delete+complete share one `withMoneyWorkspaceRls` callback | `lib/money-import-commit-atomic.test.ts` |
| 2 | Real GraphQL HTTP handler path: 429 + 403 JSON `{ code }` (stub auth + rate-limit; not helper-only) | `lib/api-http-transport.test.ts` |
| 3 | `enforceRateLimit` → false on activities POST + import preview POST → 429 `rate_limited` | `lib/investment-rest-hardening.test.ts` |
| 4 | Bad `limit` query through activities `GET` → 400 with issue text + details | `lib/investment-rest-hardening.test.ts` |
| 5 | Stubbed replay smokes: investment import commit + members add → one side effect + `Idempotency-Replayed: true` | `lib/http-idempotency-route.test.ts` |
| 6 | Same-tx rewrite: always-on mocked ALS/tx + DB case (when `DATABASE_URL`) inserts side-effect row then throws before complete → side row gone, claim stays `in_progress` | `lib/http-idempotency.test.ts` |
| 7 | Money import commit hot route: >128 → 400 + `claimCalls===0`; absent key → 200 + `claimCalls===0` | `lib/http-idempotency-route.test.ts` |
| 8 | Always-on integrity substitutes (mocked tx + fail-closed route wiring for complete-in-mutator-tx / replay header / expired reclaim / prune). Protocol DB suite stays `{ skip: !hasDb }` — documented; smoke no longer “green with zero integrity coverage.” | `lib/http-idempotency.test.ts`, `lib/money-import-commit-atomic.test.ts` |
| Enh | `requireInvestmentContext` money/inv/savings with mocked auth | `lib/api-investment-context.test.ts` |
| Enh | `Idempotency-Replayed: true` asserted on stubbed handler replay | `lib/http-idempotency-route.test.ts`, always-on mapping case |
| Enh | Expired **completed** reclaim DB case (skip without DB); always-on reclaim wiring assert | `lib/http-idempotency.test.ts` |

**Focused test results** (`tsx --experimental-test-module-mocks …` on hardening suites):

- **pass 33 / fail 0 / skipped 9** (skips = DB protocol + ALS when no `DATABASE_URL`; expected)
- Suites: money-import-commit-atomic, api-http-transport, api-http, investment-rest-hardening, api-investment-auth, api-investment-context, http-idempotency, http-idempotency-route

**Product code:** unchanged (tests-only Fix).

---

## Fix notes (quality → Fix, lens = quality)

**TDD:** Behavior changes for shared replay headers + validate-first → Red tests first (`idempotencyReplayResponse` Cache-Control; money invalid body + key → `claimCalls===0`), then Green via helper + route order. Baby-care comment + package script scoping: TDD skipped (docs/script only).

| Fix ask # | What changed | Files |
|-----------|--------------|-------|
| 1 Major baby-care | **Kept** Done-flash contract sync (not reverted). Short comment: smoke on main needs pending-duration → Done; open-session still forbids Done. **Intentional out-of-scope smoke fix** for this hardening draft. | `components/baby-care-one-tap.test.ts` |
| 2 Major mocks flag | Default unit pool runs **without** `--experimental-test-module-mocks`. Flag only in process 2 / `pnpm test:module-mocks` for the four `mock.module` suites. Blast radius note in `scripts/run-unit-tests.mjs`. `pnpm test` = unit (no flag) then module-mocks (flag). | `package.json`, `scripts/run-unit-tests.mjs` |
| 3 Enh helper + Cache-Control | Extracted `beginIdempotencyRequest` / `idempotencyReplayResponse` / `abortIdempotencyClaim`. All three routes use shared begin; replay always sets `Cache-Control: no-store` + `Idempotency-Replayed`. | `lib/http-idempotency.ts`, money/inv/members commit routes, route + helper tests |
| 4 Enh validate-first | Money: Zod `safeParse` before claim. Investment: object check before claim (already; kept). Members unchanged order, now via shared begin. Route smoke: invalid money body + key → 400, `claimCalls===0`. | money + investment import commit routes; `lib/http-idempotency-route.test.ts` |

**Focused test results:** pass **41** / fail **0** / skipped **9** (hardening + baby-care suites).

**Full `pnpm test`:** unit pool + module-mocks process — **fail 0** (module-mocks pass 14/14; unit pool green).

**Product code:** shared idempotency wiring + validate-first on import commits (no feature behavior change beyond no claim on invalid money body).
