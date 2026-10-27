# Money ledger perf measure

**Updated:** 2026-10-27T12:55:21.752Z
**Fixture txs:** 10000
**Workspace:** synthetic (`ownedByUserSub=synthetic-money-ledger-perf`)
**Window:** `2026-09-30T17:00:00.000Z` → `2026-10-31T16:59:59.999Z`

## Ranked read-path spans (top N — gates Tasks 3/6)

| Rank | Span | ms |
|------|------|---:|
| 1 | `bootstrap` | 10.9 |
| 2 | `list.count` | 3.6 |
| 3 | `summary` | 3.1 |
| 4 | `list.rows` | 2.1 |
| 5 | `list.tags` | 1.3 |
| 6 | `dehydrate` | 0.0 |

## All spans (includes `fixture.seed` write)

| Rank | Span | ms |
|------|------|---:|
| 1 | `fixture.seed` | 861.4 |
| 2 | `bootstrap` | 10.9 |
| 3 | `list.count` | 3.6 |
| 4 | `list.rows` | 2.1 |
| 5 | `list.tags` | 1.3 |
| 6 | `summary` | 3.1 |
| 7 | `dehydrate` | 0.0 |

## Gate notes

- Task 3 (COUNT/hasMore): APPLY — `list.count` is in top ranked read spans
- Task 4 (defer SSR summary): APPLY per Grill default (not COUNT-gated).
- Task 6 (targeted invalidation): SKIP — no post-mutation refetch span in this harness.

## Notes

- Seed rows are inside the Spending first-load month + excludeAccountTypes lock.
- No full row dumps.
- Fixture cleaned after measure.
