# TDD test-case review: baby-external-apis

**Result:** clean
**Round:** 2
**Updated:** 2026-09-22
**Note:** Refreshed for Decision 3 Option 2 + Decision 4 Option 1. Main-thread.

## Planned / existing test cases reviewed

| Task | Scenario type | Test case | Covered? |
|------|---------------|-----------|----------|
| 1 | real | `tokenApps` from `apps` jsonb | yes |
| 1 | edge | null apps + app_key money → `["money"]` | yes |
| 1 | edge | sav/inv legacy unchanged | yes |
| 2 | real | create apps `[baby]` asserts baby membership | yes |
| 2 | real | create `[money,baby]` asserts both | yes |
| 2 | edge | empty apps → validation fail | yes |
| 2 | real | legacy body `appKey: money` → apps `["money"]` | yes |
| 3 | matrix | grants baby-only / money-only / both × Money GQL × Baby GQL | yes |
| 3 | edge | write scope still required for mutations | yes |
| 3 | regression | session paths unchanged | yes |
| 4 | real | UI payload builder ≥1 app (if extracted) | yes / partial |
| 5 | real | docs mention mny_ + apps toggles | yes |
| 4-inv | regression | investment allowlist still sane | yes |

## Gaps

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Enhancement | 2 | PATCH apps without rotating secret | Add if PATCH ships; else defer |

No Critical/Major. Clean for Gate B.

## Recommended test order (Build)

1. Task 1 `tokenApps` + migration smoke
2. Task 2 create/validator
3. Task 3 grant matrix resolvers
4. Tasks 4–5 UI + docs

## Fix ask

(none)
