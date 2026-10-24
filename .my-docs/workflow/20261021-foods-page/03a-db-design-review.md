# DB design review: 20261021-foods-page

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-21

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | integrity | `food_analysis` one-row-per-workspace: concurrent saves may race two upserts. | Use single-row upsert on `workspace_id` unique; optional `updated_at` compare. |
| Enhancement | types | `loggedOn` as `date` (no tz) vs timestamptz — calendar days need a defined timezone rule. | Store calendar date in workspace/user local date string `YYYY-MM-DD` (text or `date`); document in README. |
| Nit | audit | Baby tables carry `createdByUserSub` — Foods Design omits. | Optional for v1; add if audit required later. |

**DB checklist:** schema contract · migrations additive · indexes · ownership · FKs · bounded lists · no array-bind / SUM::int footguns · PII note

**Checklist notes (pass / gap):**

- **Schema contract:** pass — `food_log_entry` + `food_analysis`; presets in app code not catalog table (D5).
- **Migrations:** pass — additive new key + tables; expand `WORKSPACE_APP_KEYS`.
- **Indexes:** pass — `(workspace_id, logged_on)` for month queries.
- **Ownership:** pass — writes via Foods API only; reads calendar + analysis same module.
- **FKs:** pass — `workspace_id` → `workspace` cascade (match baby).
- **Bounded lists:** pass — date-range queries.
- **Uniques:** pass — analysis unique on `workspace_id`; entries intentionally non-unique (D1 duplicates).
- **PII:** pass — food notes may be personal; workspace-scoped; no extra retention beyond account (same as other features).
- **AGENTS.md SQL:** N/A for design — Build must avoid `ANY(${arr}::uuid[])` and `SUM(…)::int` on bigint.

## Fix ask for my-dev-flow-design

(none — timezone rule as Build note / Enhancement)

## Deferred Enhancements (do not block clean)

- Upsert race note for analysis row.
- Explicit `YYYY-MM-DD` local-date convention in feature README.
- Optional `createdByUserSub` parity with baby.

Zero Critical; zero open Major → **clean**.
