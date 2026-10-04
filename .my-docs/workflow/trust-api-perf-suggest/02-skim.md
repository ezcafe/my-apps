# Light repo skim: trust-api-perf-suggest

**Result:** done
**Updated:** 2026-10-04
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Analyze / Design in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js shell with Money / Investments / Loans / Baby features, shared workspace cookies, GraphQL + REST, Postgres RLS for domain tables. Trust contracts live in `docs/ARCHITECTURE.md`; perf baselines in `docs/PERFORMANCE.md`.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| Money/Investment import wizards | CSV commit / legacy kind | Already send Idempotency-Key (prior ship) |
| Workspace members panel | Add member | Idempotent POST |
| Settings → API tokens | Token CRUD | Non-RLS `api_token` |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `POST …/import/commit`, `[kind]`, investment commit, members | Idempotency-Key wired |
| `POST /api/investment/activities` | Create — **no** Idempotency-Key |
| `baby_quick_care_request` | Watch idempotency store; index on `created_at`; no prune cron found |
| `docs/PERFORMANCE.md` housekeeping SQL | Not scheduled under `app/api/cron/*` |

## Hard constraints (do not fight)

1. Do not unify pagination dialects without a dedicated approved task (`ARCHITECTURE.md`).
2. Suggest-only: no production code in this run.
3. Prefer existing `lib/http-idempotency` for REST; Baby uses `clientRequestId` GraphQL path.

## Risks if we ignore the repo

Duplicate prior Idempotency work; fight RLS vs Non-RLS ownership rules; pick infra L items as “next week.”

## Enough for Analyze / Design?

yes
