# Test log: insights-ux-deltas-filters-urgency

## Smoke

**Result:** smoke-pass  
**Updated:** 2026-09-27  
**Mode:** main-thread (Task usage limit)

| Check | Command | Exit |
|-------|---------|------|
| Build | `pnpm run build` | 0 |
| Unit | `pnpm test` | 0 |

**Notes:**
- Fixed MoM wire: overview query in `AnalyticsDashboard` (shared RQ cache with charts) → `column` on `AnalyticsStats`.
- Focused units for Tasks 1–5 green before full suite.

## Full

**Result:** success  
**Updated:** 2026-09-27  
**Mode:** main-thread

| Step | Result | Note |
|------|--------|------|
| Coverage | skipped | No `test:coverage` script |
| Add e2e | done | Baby Care→Sleep in insights charts test; Loans urgency asserts on existing insights test |
| Build + unit | pass | reused smoke |
| Targeted e2e Baby | pass | `default Insights shows Hydration…` (Care→Sleep period chip) |
| Targeted e2e Loans | skipped | `E2E_STORAGE_STATE` unset — urgency covered by component unit |

```text
pnpm exec playwright test e2e/baby-care.spec.ts -g "default Insights shows Hydration"
→ 1 passed
```
