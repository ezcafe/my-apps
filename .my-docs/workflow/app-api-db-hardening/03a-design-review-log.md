# Design review log: app-api-db-hardening

**Result:** clean
**Round:** 2 (general design review)
**Updated:** 2026-09-22 (general design review round 2)

## API contract review (when Has API)

Filled by the isolated **API contract review** Task only.

**Result:** clean
**Updated:** 2026-09-22 (round 3)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None | — |

**Prior Majors (round 2) — verified fixed:**

1. **Post-claim failure / abort:** `03-design.md` Idempotency-Key + Example 4f + Task 6: DELETE claim on caught failure; same key+body may retry (new claim); no stored-error replay; no 24h `in_progress` block for known failures. Acceptance + TDD test wired.
2. **Expired UNIQUE reclaim:** On conflict if `expires_at <= now()`, DELETE then INSERT; never 409 in-flight for expired (`completed` or `in_progress`). Example 4c + Task 6 acceptance + test wired.
3. **Round-2 nits (optional, applied):** Distinct codes `idempotency_in_progress` / `idempotency_body_mismatch` (both 409); body hash = raw request body bytes as received (no re-serialize / sort).

**Prior Majors (round 1) — still fixed:**

1. Hot mutators are real REST only: `POST /api/money/import/commit`, `POST /api/investment/import/commit`, `POST /api/workspace/members` (add). No fictional REST loan pay; GraphQL pay out of scope.
2. Idempotency-Key HTTP surface: optional header, max length 128 → 400, missing → current behavior, TTL 24h, in-flight / body-mismatch 409 with distinct codes, replay + `Idempotency-Replayed: true`, durable unique claim.

**Also OK (no finding):** Shared flat `{ error, code, details? }` matches `lib/api-money.ts` (project-first over nested skill shape). Investment REST money|investment keys + GraphQL unchanged. Rate-limit / Zod message contracts + rank 6 docs-only align with Decisions 3–5. Claim → side effect + complete same-tx (API-visible lifecycle) + DELETE-on-failure + expired reclaim are consistent across design Overview, contracts, Example 4, and Task 6. Task 1–5, 7 acceptance covers those contracts.

**API checklist:** contract first · one error shape · validate at edges · lists documented (rank 6) · additive auth unlock · naming matches repo · mutating idempotent **or** unsafe-to-retry documented — **pass**.

### Fix ask (API only)

None — clean.

## DB design review (when Has DB)

**Result:** clean
**Updated:** 2026-09-22 (round 3)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None | — |

**Round-2 Major — verified fixed:**

1. **Same-tx complete with side effect:** Short committed claim `INSERT`, then side effect + `completed` UPDATE in one DB tx (money: Task 4 outer RLS/ALS; investment import / members: wrapping write tx) before HTTP response. Documented in Idempotency lifecycle, integrity rules 1–2/5, Example 4e, and the “why same-tx closes double-apply” note.
2. **TTL prune completed-only:** Cleanup deletes only `expires_at <= now() AND status = 'completed'`; never prunes ambiguous `in_progress`. Example 4g + Task 6 acceptance/tests.
3. **Expired UNIQUE reclaim:** On conflict if `expires_at <= now()`, DELETE then INSERT; never 409 in-flight for expired (`completed` or `in_progress`). Example 4c + Task 6 acceptance/tests.
4. **No double-apply after success-without-complete:** Same-tx complete makes that window impossible; Task 6 acceptance + test require prove/rollback of writes without a `completed` row (or assert complete shares mutator tx).

**Also OK (no finding):** Rank 5 prune-outside / one outer RLS / no nested `db.transaction` still locked in Task 4. `http_idempotency` typed columns, UNIQUE `(workspace_id, user_sub, route, key)`, FK CASCADE, check on status, no workspace RLS + app-filter, additive migration sketch (next after `0041`), scalar binds in Example 4, DELETE-on-failure (no `failed` status), write/read owners, rank 9 ownership note includes the table and keeps `money_import_preview` off the non-RLS list. Ranks 1–4, 6–7, 9–10 — no DB schema change. Production still has nested `commitMoneyImport` tx and no `http_idempotency` table — expected until Build.

**DB checklist:** typed columns · indexes/uniques · write/read owners · additive migration · multi-write tx · safe binds · no `SUM(money)::int` · tenant filters · design↔schema match — **pass**. Zero Critical / Major / Enhancement.

### Fix ask (DB only)

None.

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None | — |

**Prior Fix ask (general round 1) — verified fixed:**

1. **Idempotency sequence + Money import claim/complete order:** `03-design.md` has Idempotency-Key sequence (claim won → same-tx complete; 409 `idempotency_in_progress` / `idempotency_body_mismatch`; DELETE on failure; expired UNIQUE reclaim; replay). Money import sequence: claim commits outside outer RLS; complete shares mutator tx with import writes + preview delete; DELETE claim on failure path.
2. **Pattern 4:** Idempotency-Key claim/complete taught (What / How here / Why / Best practices + anti-patterns / Reference → Example 4 + Task 6). Patterns 1–3 kept; summary table includes Pattern 4.
3. **OWASP A02 `response_body`:** `pass (target)` — 24h TTL, app-filter (`workspace_id` + `user_sub`), never log `response_body`; ownership one-liner under Database contracts.
4. **Task 6 wiring note:** One-line acceptance that claim commits outside outer RLS and complete shares the mutator tx (matches sequences).

**Also OK (no finding):**

- **Analysis deep dive:** What / Why / How present for overall + five solution pieces; not hand-wavy.
- **System design Overview:** Present; teaches shape/boundaries; matches `docs/ARCHITECTURE.md` (shell vs feature APIs, `runInWorkspace`, dual auth, cron bypass). Does not restate contracts field-by-field.
- **Decisions 3–5:** Closed; Build vs Defer matches ranks 1–5, 7–10 Build and rank 6 docs-only; rank 8 Build.
- **Tasks:** Acceptance + TDD “turns red first” for Tasks 1–6; docs Tasks 7–9; Task 6 migration + API rules wired. No task↔taught-practice contradiction for Patterns 1–4 / Task 4 nested-tx.
- **OWASP table:** All A01–A10 rows present; trust boundaries + abuse cases listed. Primary source linked.
- **Has UI:** N/A correctly. No skim file required in simple mode.
- **API / DB sections:** Left as **clean**; no new cross-cutting task gaps. Did not re-deep-review contracts.

## Fix ask for my-design-workflow

None — clean. API Fix ask: none. DB Fix ask: none.

## Round notes

- API contract review round 3 — **clean** (preserved; not re-deep-reviewed).
- DB design review round 3 — **clean** (preserved; not re-deep-reviewed).
- General design review round 1 — needs update (1 Major, 2 Enhancement) — **closed** by design-update.
- General design review round 2 — **clean** (zero Critical / Major / Enhancement). Prior Fix ask 1–4 verified in `03-design.md` / `04-tasks.md`.
- Verified against `01-idea.md`, `02-analysis.md`, `03-design.md`, `04-tasks.md`, `docs/ARCHITECTURE.md`, OWASP Top 10 via security-and-hardening skill.
- Did **not** edit `01`–`04`. No production code.
- Overall **clean** = API clean + DB clean + general Findings empty.
- Next (parent my-workflow): TDD test-case review → Gate B → Build → Smoke → review/test per **Review profile** lite; SPM plan includes **api** + **db** (+ security).
