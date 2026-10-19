# DB design review: 20261012-kiosk-widgets

**Result:** clean
**Round:** 2
**Updated:** 2026-10-13

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | practice | Same PATCH may still write `kiosk_widgets` and `kiosk_layout` as two upserts (matches today’s weather/widgets style). Brief window if the second write fails. | Prefer one `onConflictDoUpdate` `set` with both columns when both keys are in the patch; sequential upsert OK if Build matches current prefs service. |
| Nit | ownership | Sequence shows Page reading prefs then passing layout; loader may not need `kiosk_layout` itself. | Design already scopes loader to “only if it serializes `kioskLayout` into page data” — keep that at Build. |

**DB checklist:** typed columns · indexes/uniques · write/read owners · additive migration · safe binds · bounded lists · tenant filters · design↔schema match

**Checklist notes (pass / gap):**

- **Typed columns:** pass — nullable `kiosk_layout` jsonb; shape `{ mode, columns, focusWidgetId }`; mirrors `kiosk_widgets`.
- **Indexes/uniques:** pass — PK `user_sub` enough for point get/upsert; no new index needed; workspace budget uniqueness via existing `money_budget_workspace_one_uq`.
- **Write/read owners:** pass — `patchUserPreferences` / `getUserPreferences`; loader only if it serializes layout.
- **Additive migration:** pass — DDL + journal spelled (`ADD COLUMN IF NOT EXISTS kiosk_layout jsonb` after `0047`, pattern like `0036`); Task 1 acceptance locks it.
- **Safe binds:** pass — session `user_sub` scalars; Zod at edge; Example 3 uses service helper (no array/`::uuid[]`).
- **Bounded lists:** pass for prefs (single row); budget via `listMoneyBudgets` + `.find(workspace)`.
- **Tenant filters:** pass — prefs by session `user_sub`; finance via server workspace id.
- **Bigint money:** pass — no new `SUM(…)::int`; reuse budgets/analytics fields as numbers from existing serializers.
- **Transactions:** pass for single-column upsert; Enhancement remains for dual-column patch.
- **Tasks catch migration / query shape:** pass — Task 1 migration; Task 3 locks `listMoneyBudgets` + month range + field names.
- **Sequence covers DB:** pass — PATCH upsert + Page get prefs; Money via services.
- **design↔query match:** pass — Round 1 Major cleared (see Round 2 notes).

## Fix ask for my-dev-flow-design

(none — clean)

## Round notes

- Round 1 Major (query): **verified cleared.** Design Example 3 and Task 3 use `listMoneyBudgets(workspaceId, { includeSpent: true, from, to })` with `currentMonthDateRange()` from `lib/kiosk/kiosk-analytics-filters.ts`, map `spentAmountMinor` / `effectiveLimitAmountMinor`, empty chart when no workspace-scope row. Cross-checked `lib/money-services/budgets.ts` signature and enriched row fields.
- Round 1 Enhancement (explicit DDL + journal): folded into Database contracts / Task 1 — closed for this stage.
- Deferred Enhancements: optional single upsert when widgets+layout patch together (still open; does not block clean).
- No Critical or Major findings this round.

### Round 1 (prior)

**Result:** needs update

| Severity | Area | Finding |
|----------|------|---------|
| Major | query | Example 3 named non-existent `listBudgets`; missing opts / field names |

**Fix ask then:** Correct Example 3 + Task 3 to real `listMoneyBudgets` + current-month range + spent/limit fields.

### Round 2 — design-update (Architect) [from prior notes]

- Applied Fix ask Major 1; Task 3 acceptance locked; DDL/journal Enhancement folded; dual-column upsert left deferred.
