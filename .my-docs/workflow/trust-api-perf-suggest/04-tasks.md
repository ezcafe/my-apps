# Tasks: trust-api-perf-suggest

**Scope:** Suggestions only (Decision 1 Option 3). No production code.  
**TDD:** N/A for this run — no planned test cases to write in Build.  
**Future ship:** When a follow-up run picks backlog #1, copy Tasks F1–F4 into that run’s `04-tasks.md`.

## This run — backlog acceptance

### Task 1 — Ranked backlog published

- [x] `03-design.md` has ~5–8 ranked items with size, job, source
- [x] Already-shipped Idempotency rows excluded from pick line
- [x] L infra / full pagination demoted

**Tests (TDD):** N/A — docs only

### Task 2 — Future #1 sketch complete enough to start a ship run

- [x] Additive Idempotency contract for investment activities POST
- [x] Sequence + API notes + non-goals
- [x] Stub tasks F1–F4 below

**Tests (TDD):** N/A

### Task 3 — Pipeline stop

- [x] No design-review / Gate B / Build / Gate C in this run
- [x] `00-run.md` Status → done (suggest-only)

**Tests (TDD):** N/A

## Future run stub — backlog #1 (not executed here)

### Task F1 — Server Idempotency on investment activities POST

- Add `beginIdempotencyRequest` after Zod validate; complete/abort around create
- Update ARCHITECTURE Idempotency routes table

**Tests (TDD):**
- Unit/route: absent key → 201 create (existing behavior)
- Same key + body → replay + `Idempotency-Replayed`
- Body mismatch → 409
- Key >128 → 400

### Task F2 — Client / docs opt-in

- Wire `newIdempotencyHeaders` (or equivalent) on web create path
- Note optional header in `API.md` / OpenAPI if present

**Tests (TDD):**
- Unit: helper sets Idempotency-Key ≤128

### Task F3 — 409 UX

- Map conflict codes to existing error toast (not success)

**Tests (TDD):**
- Soft: existing `!res.ok` path sufficient if no dedicated mapper

### Task F4 — Verify

- Unit + build green; e2e optional if auth-blocked

**Tests (TDD):** covered by F1–F2
