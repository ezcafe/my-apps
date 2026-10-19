# Lens: db — 20261019-remove-kiosk

**Result:** clean
**Round:** 1
**Updated:** 2026-10-19
**Reviewer:** Senior Verifier (fresh context; did not author draft)
**Skill:** `database-and-data-model`
**Sources:** `00-run.md` · `03-design.md` Database contracts + example queries · `04-tasks.md` Task 3 · `03a-db-design-review.md` · `db/migrations/0049_drop_user_preferences.sql` · `db/migrations/meta/_journal.json` · `db/schema/index.ts` · historical `0035`/`0036`/`0048` · AGENTS.md Database/Drizzle

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major | — |

## Deferred (non-blocking)

| Id | Severity | Location | Note |
|----|----------|----------|------|
| D-N1 | Nit | `db/migrations/meta/` | Repo keeps early snapshots only (`0000`–`0003`); journal tag `0049_drop_user_preferences` is present and consistent with hand-written DROP style (`0026_*`). |

## Design ↔ code match (spot checks)

| Contract | Status | Evidence |
|----------|--------|----------|
| Forward `DROP TABLE user_preferences` (not six `DROP COLUMN` / PK-only leftover) | pass | `0049_drop_user_preferences.sql`: `DROP TABLE IF EXISTS "user_preferences";` |
| Do not rewrite `0035`/`0036`/`0048` | pass | Historical CREATE/ALTER migrations unchanged |
| Remove Drizzle schema file + exports | pass | `db/schema/user-preferences.ts` absent; `db/schema/index.ts` has no prefs export |
| Journal/meta updated after latest | pass | `_journal.json` idx 49 tag `0049_drop_user_preferences` |
| Prefs service/route gone — no SELECT/INSERT on dropped table | pass | No `userPreferences` / `user-preferences-service` / prefs route in TS; retired-route unit asserts files gone |
| No FKs onto table (CASCADE optional) | pass | Migrations never `REFERENCES user_preferences`; plain DROP matches need |
| Write/read owners → none after cut | pass | Table + API resource retired; theme stays client `ThemeSettings` |
| Deploy with API cut | pass | Route/validators/service deleted alongside migration (Task 1+3) |
| ARCHITECTURE table list without `user_preferences` | pass | No live mention in `docs/ARCHITECTURE.md` |
| Data loss accepted (no backfill/export) | pass | Design/Gate A; irreversible DROP documented |

## DB checklist (db lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed columns / nullability | N/A | End-state: table gone; no new columns |
| Indexes / uniques match queries | N/A | No remaining queries on this table |
| Write owner + read owners | pass | none / none after DROP — matches contract |
| Migration additive or expand/contract | pass | Contract phase: forward DROP; history left; data loss accepted |
| Safe SQL binds (`inArray` / no bad `::type[]`) | N/A | Fixed DDL only; no app SQL binds |
| No bigint/`SUM` → `::int` on money/large aggregates | N/A | No money aggregates in this change |
| Lists bounded; no obvious N+1 | N/A | No list queries left |
| Tenant/ownership filters | N/A | Mutating prefs surface removed with table |
| Contract matches schema + queries | pass | Design DROP TABLE + schema remove + journal match draft; no leftover callers |

Skill: `database-and-data-model`

## Round notes

- **Destructive teardown locked:** Option 1 + Gate A data loss; PK-only leftover correctly rejected.
- **Repo DROP style:** Quoted identifier + `IF EXISTS` matches `0026_drop_legacy_finance_tables.sql`.
- **Integrity:** No orphan FKs; no production TS still imports prefs schema.
- **Out of lens:** HTTP 404 / redirects → API; OWASP on retired surface → security.
- No code fixes in this lens.
- **Open Critical / Major:** none → **Result: clean**.
