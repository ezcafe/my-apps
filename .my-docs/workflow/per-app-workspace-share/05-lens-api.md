# API lens: per-app-workspace-share

**Result:** clean
**Updated:** 2026-09-21

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | contracts | Members GET/POST/PATCH + remove POST; active/list/default grant-aware; flat `{ error, code }` | — |

**Checklist:** typed Zod · one error shape · edge validation · unbounded list noted · 409 conflict · same-origin + rate-limit — pass
