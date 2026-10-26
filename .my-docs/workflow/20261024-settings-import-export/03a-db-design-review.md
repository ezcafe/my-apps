# DB design review: 20261024-settings-import-export

**Result:** clean  
**Round:** 3 (design-backloop settle-gen:1 — Export all / Import all)  
**Updated:** 2026-10-26

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | practice | Multi-kind Import-all envelope lives in existing `rows` jsonb; Design prefers no new table. Envelope shape (`kinds` map + warnings) not DDL-tabulated. | Build: document envelope in preview-store helpers; add unit tests for round-trip stash/load. No migration unless shape needs a column (not expected). |
| Enhancement | practice | TTL / max-preview caps still “same as Money” by reference. | Clone Money constants at Build (unchanged from Round 2). |

**Prior Majors — still cleared**

| Prior Major | Status |
|-------------|--------|
| Baby/Loans preview schema + RLS | Cleared — already shipped / contracted |
| Housekeeping prune | Cleared |
| Loans commit sequence | Cleared — Import-all commits kinds in order; per-kind writes keep prior sequence inside each kind commit |

**New DB impact (Export all / Import all)**

- Prefer **reuse** `money_import_preview` / `baby_import_preview` / `loans_import_preview` with multi-kind `rows` jsonb envelope.
- **No** new preview table required for Import all.
- Export all is read-only ZIP — no DB schema change.
- Investments Import all = statement wizard — no new Investment preview table.

**DB checklist:** typed columns · indexes/uniques · write/read owners · additive migration · safe binds · bounded lists · tenant filters · design↔schema match — **pass**; residual Enhancements only.

## Fix ask for my-dev-flow-design

None required for advance (Result **clean**).

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)
