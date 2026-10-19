# Lens: db — 20261019-kiosk-widget-edit-menu

**Result:** clean
**Round:** 1
**Updated:** 2026-10-19
**Reviewer:** Senior Verifier (fresh context; did not author draft)
**Skill:** `database-and-data-model`
**Sources:** `00-run.md` · `03-design.md` Database contracts + example queries · `04-tasks.md` Task 2/6 · `03a-db-design-review.md` · ADR-005 · `db/schema/user-preferences.ts` · `db/migrations/0048_kiosk_layout.sql` · `lib/validators/user-preferences.ts` · `lib/user-preferences-service.ts` · `lib/kiosk/kiosk-layout.ts` · `lib/kiosk/baby-defaults-inject.ts` · `lib/kiosk/load-kiosk-page.ts` · `lib/kiosk/cell-edit-save.ts` · AGENTS.md Database/Drizzle

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major | — |

## Deferred (non-blocking)

| Id | Severity | Location | Note |
|----|----------|----------|------|
| D-N1 | Nit | `03-design.md` contract table | Still says indexes “PK user”; column is `user_sub` (same Nit as 03a Round 2). |
| D-E1 | Enhancement | `lib/kiosk/kiosk-layout.ts` `copyLayoutPreservingCells` | Helper unused; widgets-only + inject inline the same preserve rules. Dead helper only — write paths already correct. |

## Design ↔ code match (spot checks)

| Contract | Status | Evidence |
|----------|--------|----------|
| Nest `cells` in `kiosk_layout` jsonb; no new column (ADR-005) | pass | Schema still `jsonb("kiosk_layout").$type<KioskLayout>()`; `KioskLayout.cells` optional; no `kiosk_cells` column/migration |
| Migration type/Zod only | pass | Existing `0048` additive jsonb column only; no new DDL for cells |
| Omit `cells` → preserve; present → replace whole map | pass | `applyPreferencesPatch` `"cells" in patch.kioskLayout` branch; units in `user-preferences-service.test.ts` |
| Clear = omit id from sent map | pass | Replace without id drops entry; Zod rejects empty `{}` per key |
| Widgets-only rewrite copies `cells` | pass | `hasKiosk` without layout copies `existing.kioskLayout.cells` |
| Baby-inject write-back copies `cells` | pass | `planBabyDefaultsInject` copies; `load-kiosk-page` PATCH sends `injectPlan.layout` with cells |
| Nest validate before persist | pass | `userPreferencesPatchSchema` / `validateCellsMap` in `patchUserPreferences` before upsert |
| Resolve: missing → defaults; drop corrupt on read | pass | `resolveKioskLayout` + `sanitizeKioskLayoutCells` |
| Write owner / read owners | pass | PATCH service (+ inject via same PATCH); GET prefs + `/kiosk` load |
| Point row by session `user_sub` | pass | `eq(userPreferences.userSub, userSub)` + PK upsert target |

## DB checklist (db lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed columns / nullability | pass | Nullable `kiosk_layout` jsonb; `cells` optional nest; Zod owns closed sets at PATCH |
| Indexes / uniques match queries | pass | PK `user_sub` enough for point get/upsert; nest needs no index |
| Write owner + read owners | pass | `applyPreferencesPatch` / inject helpers; readers serialize via `resolveKioskLayout` |
| Migration additive or expand/contract | pass | No new DDL; ADR-005 type/Zod extend on existing column; no backfill (missing → defaults) |
| Safe SQL binds (`inArray` / no bad `::type[]`) | pass | Scalar `eq(userSub)` upsert only; no array/`::type[]` binds |
| No bigint/`SUM` → `::int` on money/large aggregates | pass | N/A — prefs jsonb only; no money aggregates in this change |
| Lists bounded; no obvious N+1 | pass | Prefs `LIMIT 1`; Zod caps editable keys + sources 1–3 |
| Tenant/ownership filters | pass | Session `user_sub` only; no client-supplied tenant id |
| Contract matches schema + queries | pass | Design contracts + examples match schema/service/Zod/inject/load; Task 2/6 units cover preserve/replace/clear |

Skill: `database-and-data-model`

## Round notes

- **ADR-005 honored:** overrides nest in `kiosk_layout`; no separate column.
- **Rewrite integrity:** layout PATCH omit, widgets-only, and baby-inject all keep `cells` unless a new map is sent.
- **Single-row upsert:** no multi-row transaction needed; weather path remains a separate sequential upsert (pre-existing).
- **Out of lens:** HTTP auth / Zod error shape → API; OWASP → security.
- No code fixes in this lens.
- **Open Critical / Major:** none → **Result: clean**.
