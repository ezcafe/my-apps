# Lens: db — 20261012-kiosk-widgets

**Result:** clean
**Round:** 1
**Updated:** 2026-10-13
**Reviewer:** Senior Verifier (fresh context; did not author draft)
**Skill:** `database-and-data-model`
**Sources:** `03-design.md` Database contracts + Example 1–3 · `03a-db-design-review.md` · `04-tasks.md` Task 1/3 · `db/schema/user-preferences.ts` · `db/migrations/0048_kiosk_layout.sql` · `db/migrations/meta/_journal.json` · `lib/user-preferences-service.ts` · `lib/kiosk/month-board.ts` · `lib/kiosk/load-kiosk-page.ts` · `lib/money-services/budgets.ts` `listMoneyBudgets` · AGENTS.md Database/Drizzle

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement | — |

## Deferred (non-blocking)

| Id | Severity | Location | Note |
|----|----------|----------|------|
| D-N1 | Nit | `db/migrations/meta/` | No per-migration snapshot for `0048` (same historical gap after early snapshots). Journal tag present; not a new regression. |

## Design ↔ code match (spot checks)

| Contract | Status | Evidence |
|----------|--------|----------|
| Additive `kiosk_layout` jsonb nullable | pass | `0048_kiosk_layout.sql` `ADD COLUMN IF NOT EXISTS kiosk_layout jsonb`; Drizzle `jsonb("kiosk_layout").$type<KioskLayout>()` (no `.notNull()`) |
| Journal after `0047` | pass | `_journal.json` tag `0048_kiosk_layout` idx 48 |
| Shape `{ mode, columns, focusWidgetId }` | pass | `KioskLayout` + Zod `kioskLayoutSchema`; invalid/null → `resolveKioskLayout` grid-1 |
| Write owner `patchUserPreferences` | pass | Layout/widgets share one `insert…onConflictDoUpdate` `set` when either key present (design dual-upsert Enhancement closed) |
| Read owners get + loader | pass | `getUserPreferences` serializes resolved layout; `loadKioskPageData` sets `kioskLayout` on page data |
| Example 1 point read by `user_sub` | pass | `select().from(userPreferences).where(eq(userSub)).limit(1)` |
| Example 2 upsert whole JSON | pass | Conflict target PK `user_sub`; sets `kioskLayout` when key present |
| Example 3 `listMoneyBudgets` + month range | pass | `load-kiosk-page` → `listMoneyBudgets(workspaceId, { includeSpent: true, from, to })` with `currentMonthDateRange()`; `.find(scopeType === "workspace")`; map spent/limit → chart or null |
| No layout workspace id | pass | Prefs row is user-scoped only; finance stays `getWorkspaceIdForUser` + `runInWorkspace` |
| No migrate of stored widget sets | pass | Null prefs resolve defaults; stored sets unchanged (registry Task 2) |

## DB checklist (db lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed columns / nullability | pass | Nullable jsonb; mirrors `kiosk_widgets`; Zod owns closed set at PATCH |
| Indexes / uniques match queries | pass | PK `user_sub` enough for point get/upsert; no new index; workspace budget uniqueness stays existing money budget uq |
| Write owner + read owners | pass | `patchUserPreferences` / `getUserPreferences`; loader serializes `kioskLayout` into `KioskPageData` |
| Migration additive or expand/contract | pass | Additive column only; no backfill; no destructive drop |
| Safe SQL binds (`inArray` / no bad `::type[]`) | pass | Prefs: scalar `eq(userSub)`; budgets path uses query builder + scalar workspace id (no JS `::uuid[]`) |
| No bigint/`SUM` → `::int` on money/large aggregates | pass | `loadSpentAggregates` uses `coalesce(sum(amount_minor), 0)` without `::int`; existing Number() serialize pattern |
| Lists bounded; no obvious N+1 | pass | Prefs `LIMIT 1`; month-board gated; one `listMoneyBudgets` then `.find(workspace)` (workspace budget list naturally small) |
| Tenant/ownership filters | pass | Prefs by session `user_sub`; Money/Loans via server workspace id + `runInWorkspace` (not client-supplied) |
| Contract matches schema + queries | pass | Design Examples 1–3 match schema/migration/service/loader; Task 1/3 acceptance covered |

Skill: `database-and-data-model`

## Round notes

- **Design-review Enhancement (dual upsert):** Build writes widgets + layout in **one** `onConflictDoUpdate` when both keys are in the patch — closed for code lens.
- **Weather + layout same PATCH:** Still sequential upserts (kiosk block then weather) — pre-existing prefs pattern; not a new layout integrity gap.
- **Month board:** Reuses SoT `listMoneyBudgets`; empty chart when no workspace-scope row; no new money tables/migrations.
- **Out of lens:** Prefs HTTP auth/Zod error shape → API; OWASP → security if planned.
- No code fixes in this lens.
- **Open Critical / Major / Enhancement:** none → **Result: clean**.
