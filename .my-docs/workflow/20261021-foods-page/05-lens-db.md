# Lens

**Lens:** db  
**Result:** clean

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | Concurrency | Analysis upsert races on concurrent saves | Unique PK upsert — last write wins (acceptable) |
| Nit | Audit | Optional createdBy on analysis row | Not required for v1 |
| — | Indexes | `(workspace_id, logged_on)` present | Matches list query |

## DB checklist

| Item | Pass |
|------|------|
| Schema contract | yes |
| Additive migration 0050 | yes |
| Journal entry | yes |
| FKs cascade | yes |
| RLS policies | yes |
| Bounded queries | yes |
| No array-bind / SUM::int | N/A |
| Design match | yes |
