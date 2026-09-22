# Lens: db — app-api-db-hardening

**Result:** clean
**Round:** 2
**Updated:** 2026-09-22

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open findings | — |

## Round 2 re-verify (prior findings)

| Id | Prior | Status | Evidence |
|----|-------|--------|----------|
| D1 | Major — members claim used body `workspaceId` before owner proof | **Fixed** | `app/api/workspace/members/route.ts`: Zod validate → `assertWorkspaceOwner(userSub, workspaceId)` → then `beginIdempotencyRequest` with that verified id. Money/Investment still use server `ctx.workspaceId`. |
| D2 | Enhancement — unbounded prune `DELETE` | **Fixed** | `lib/http-idempotency.ts` `pruneExpiredIdempotencyCompleted`: `DELETE … WHERE id IN (SELECT … LIMIT IDEMPOTENCY_PRUNE_BATCH_SIZE)` (500); still `status = 'completed'` only. |

## Round 2 also checked (named fixes)

| Topic | Status | Note |
|-------|--------|------|
| Validate-first before claim | pass | Money / Investment / members parse Zod **before** `beginIdempotencyRequest` — invalid bodies do not INSERT claims |
| Money atomic RLS tx | pass | Prune outside; one `withMoneyWorkspaceRls`; `skipPrune` on get/delete; `commitMoneyImport` uses ALS when bound (no nested top-level tx); complete inside same callback |
| Batched prune | pass | See D2 |

## DB checklist (db lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed columns / nullability | pass | Migration `0042` + `db/schema/http-idempotency.ts` match design: uuid PK, FK cascade, text fields, check `in_progress`\|`completed`, jsonb/int nullables, timestamptz + defaults |
| Indexes / uniques match queries | pass | UNIQUE `(workspace_id, user_sub, route, key)`; index on `expires_at`; claim uses `ON CONFLICT DO NOTHING` |
| Write owner + read owners | pass | Helper owns claim/complete/replay; members claim only after `assertWorkspaceOwner`; Money/Investment from auth context |
| Migration additive or expand/contract | pass | Additive `CREATE TABLE` + index; journal tag `0042_http_idempotency`; no backfill |
| Safe SQL binds (`inArray` / no bad `::type[]`) | pass | Drizzle `eq`/`and` on idempotency; prune `LIMIT` is a scalar bind; preview path uses `sql.join` scalars where needed |
| No bigint/`SUM` → `::int` on money/large aggregates | pass | No new money `SUM`/cast in this change set |
| Lists bounded; no obvious N+1 | pass | Idempotency selects `LIMIT 1`; prune batched (`LIMIT` 500); no list API on this table |
| Tenant/ownership filters | pass | Reads/updates/deletes filter `workspace_id` + `user_sub`; members pre-claim owner assert; Money/Investment use auth context |
| Contract matches schema + queries | pass | Schema/migration/claim–complete–prune–reclaim match Example 4 + rank 5 ALS wiring; non-RLS ownership contract honored on members |

Skill: `database-and-data-model`

## Round notes

- **Rank 5:** Money commit: prune outside RLS; one `withMoneyWorkspaceRls`; `skipPrune` on get/delete; `commitMoneyImport` uses ALS when bound (no nested top-level tx). Complete claim inside same RLS callback. Matches design.
- **Rank 8:** `http_idempotency` additive; claim committed outside mutator tx; complete inside money RLS / investment RLS / members `withDbTransaction`; DELETE claim on caught failure; prune completed-only and batched.
- **Journal:** `_journal.json` lists `0042`; repo historically lacks per-migration snapshots after `0003` — not flagged as a new gap.
- **Members nested write:** `addWorkspaceMember` still opens `db.transaction` under the route’s `withDbTransaction` (savepoint on ALS-bound tx). Member inserts + `completeIdempotencyClaim` still share the outer commit — contract intact; not a new finding.
- No code fixes in this lens.
