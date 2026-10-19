# DB design review: 20261019-remove-kiosk

**Result:** clean
**Round:** 2
**Updated:** 2026-10-19

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | No open Critical/Major. Round 1 Majors (DROP TABLE end-state; Task 3 + sequence + schema remove) verified against live `db/schema/user-preferences.ts` (PK + six kiosk/weather only). | — |
| Nit | query | Example `DROP TABLE IF EXISTS` matches repo `0026_*` style. Hand-written migrate may still want drizzle `--> statement-breakpoint` if multi-statement. | Optional Build note only. |

**DB checklist:** typed columns · indexes/uniques (N/A after drop) · write/read owners (none) · forward DROP + deploy order · safe binds (N/A) · bounded lists (N/A) · tenant filters (N/A after drop) · design↔schema match (pass)

## Fix ask for my-dev-flow-design

(none)

## Deferred Enhancements (do not block clean)

- ARCHITECTURE.md `user_preferences` row remove — already on Task 6 acceptance.
- `02-analysis.md` still says DROP COLUMN in places; Build SoT is `03`/`04` (DROP TABLE).

## Round notes

- Has DB = yes; destructive DROP + accepted layout/weather data loss matches Gate A.
- No money/`SUM`/array-bind issues; no FKs onto `user_preferences` found in schema.
- Prefs route retire pairs with DROP TABLE (no empty bag / PK-only leftover).

### Round 2 (re-verify after design-update)

- **Fix ask 1:** PASS — Database contracts = `DROP TABLE user_preferences`; today PK + six columns only; PK-only rejected.
- **Fix ask 2:** PASS — Example SQL + Task 3 (migration + remove Drizzle schema/exports + journal) + sequence (DROP TABLE note, no UPDATE remaining) + deploy order one-liner aligned.
- Live schema check: `userSub` PK + `weather_*` (4) + `kioskWidgets` + `kioskLayout` — matches design claim.
- Result **clean**.
