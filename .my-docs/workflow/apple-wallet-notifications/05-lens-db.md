# Lens: db — apple-wallet-notifications

**Result:** clean
**Round:** 1
**Updated:** 2026-10-05
**Reviewer:** Senior Verifier (fresh context; did not author draft)
**Skill:** `database-and-data-model`
**Sources:** `03-design.md` Database contracts + example queries · `04-tasks.md` Task 2/3/5/6/8 · `db/schema/apple-wallet.ts` · `db/migrations/0047_apple_wallet.sql` · `db/migrations/meta/_journal.json` · `lib/apple-wallet/store.ts` · `lib/apple-wallet/settings-loader.ts` · `lib/db-housekeeping.ts` · `docs/ARCHITECTURE.md` Non-RLS · AGENTS.md Database/Drizzle

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement | — |

## Deferred (non-blocking)

| Id | Severity | Location | Note |
|----|----------|----------|------|
| D-N1 | Nit | `store.ts` `pruneIssueTokens` | Unbounded `DELETE` of expired/consumed tokens. Matches design cron hook; table is short-TTL + low volume. Batch later only if housekeeping timing grows. |
| D-N2 | Nit | `store.ts` `softUnlink` / `removePushTokens` | Per-serial / per-device orphan counts in a loop. Device count per pass is tiny; not an N+1 product risk. |

## Design ↔ code match (spot checks)

| Contract | Status | Evidence |
|----------|--------|----------|
| Five Non-RLS tables + ARCHITECTURE list | pass | Schema + `0047`; ARCHITECTURE names all five; store uses `withBypassRls` |
| Column types / nulls / defaults / status check | pass | Drizzle + SQL match design tables |
| Uniques `(workspace_id,user_sub)`, `serial_number`, `token_hash` | pass | Unique indexes in schema + migration |
| Indexes `(workspace_id,status)`, `registration.serial`, `issue_token.expires_at` | pass | Present in schema + migration |
| FKs CASCADE (workspace / device / serial) | pass | Migration + Drizzle `foreignKey` / `.references` |
| Issue: subscriber + channel_state one tx | pass | `upsertSubscriberForIssue` transaction; `ON CONFLICT DO NOTHING` channel |
| Register / unregister / unlink / notify txs | pass | Device upsert + reg; last-reg → `removed` + orphan device delete; softUnlink; notify upsert + bump actives |
| Re-Add keeps serial + auth_token | pass | Update path sets `status`/`updatedAt` only |
| Push-token SELECT + listUpdated filters | pass | `status='active'`; joins match design SQL |
| Issue-token prune hook | pass | `lib/db-housekeeping.ts` → `pruneIssueTokens` |
| Settings status ownership | pass | `settings-loader`: Baby workspace + `user_sub` + `status='active'` + reg count |
| Safe SQL | pass | Query builder + `inArray` for token/device batches; no JS `::type[]`; no money `SUM`/`::int` |
| Journal | pass | `_journal.json` tag `0047_apple_wallet` |

## DB checklist (db lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed columns / nullability | pass | `0047` + `db/schema/apple-wallet.ts` match design; status check `active\|removed` |
| Indexes / uniques match queries | pass | Notify uses `(workspace_id, status)`; unlink/count/join use `registration.serial`; redeem uses `token_hash`; prune uses `expires_at` |
| Write owner + read owners | pass | Store owns WS/issue/notify/unlink/prune; Settings RSC reads via loader; humans gated outside store (membership) |
| Migration additive or expand/contract | pass | Additive `CREATE TABLE` + indexes/FKs; no backfill; no destructive drops |
| Safe SQL binds (`inArray` / no bad `::type[]`) | pass | `removePushTokens` uses `inArray`; consume uses scalar `eq` + `consumedAt is null` |
| No bigint/`SUM` → `::int` on money/large aggregates | N/A | No money columns; `count()` only |
| Lists bounded; no obvious N+1 | pass | Lookups `LIMIT 1`; fan-out lists are per-workspace/device (naturally small); see Deferred D-N2 |
| Tenant/ownership filters | pass | Non-RLS by design; mutating human paths filter `workspace_id`+`user_sub`; device paths use serial + auth (API/security); Settings filters membership + active |
| Contract matches schema + queries | pass | Design example notify/listUpdated/push SELECT match store; Task 2 acceptance covered by schema + housekeeping + tests |

## Round notes

- Uniques on subscriber make issue upsert check-then-insert safe for integrity (conflict fails closed); not flagged — rate-limited issue path.
- `consumeIssueToken` conditional update (`consumed_at is null`) matches single-use; expiry enforced in `redeemAppleIssueToken` before issue.
- Live Postgres uniqueness/cascade + store persistence tests skip without `DATABASE_URL` — acceptable; always-on substitutes + migration SQL locks remain.
- No code fixes in this lens.
