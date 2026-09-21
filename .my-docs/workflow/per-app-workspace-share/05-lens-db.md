# DB lens: per-app-workspace-share

**Result:** clean
**Updated:** 2026-09-21

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | schema | `workspace_member_app` composite FK cascade; CHECK app_key; `user_directory` unique email | — |
| — | binds | Multi-row scalar inserts; no JS `::text[]` | — |
| — | migration | Backfill shared members → money+baby | Apply `0041` before local use |

**Checklist:** ownership · indexes · safe binds · backfill · tenant filters — pass
