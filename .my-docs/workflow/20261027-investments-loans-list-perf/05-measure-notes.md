# Investments + loans list perf measure

**Updated:** 2026-10-27T13:46:02.218Z
**Fixture txs:** 500
**Fixture installments:** 120
**Workspace:** synthetic (`ownedByUserSub=synthetic-investments-loans-list-perf`)
**Loan id:** `7332711c-c083-448c-9e38-08a0edf3c0ff`
**Window:** `2026-09-30T17:00:00.000Z` → `2026-10-31T16:59:59.999Z`

## Ranked investment spans (gates Task 3)

| Rank | Span | ms |
|------|------|---:|
| 1 | `investments.list` | 5.7 |
| 2 | `investments.summary` | 2.1 |
| 3 | `investments.dehydrate` | 0.0 |
| 4 | `investments.overview` | 0.0 |

## Ranked loan spans (gates Task 4)

| Rank | Span | ms |
|------|------|---:|
| 1 | `loans.detail.serialize` | 3.9 |
| 2 | `loans.list.page1` | 2.4 |
| 3 | `loans.table.paint` | 0.0 |

## Combined read-path ranks

| Rank | Span | ms |
|------|------|---:|
| 1 | `investments.list` | 5.7 |
| 2 | `loans.detail.serialize` | 3.9 |
| 3 | `loans.list.page1` | 2.4 |
| 4 | `investments.summary` | 2.1 |
| 5 | `investments.dehydrate` | 0.0 |
| 6 | `loans.table.paint` | 0.0 |

## All spans (includes `fixture.seed` write)

| Rank | Span | ms |
|------|------|---:|
| 1 | `fixture.seed` | 265.2 |
| 2 | `investments.list` | 5.7 |
| 3 | `investments.summary` | 2.1 |
| 4 | `investments.overview` | 0.0 |
| 5 | `investments.dehydrate` | 0.0 |
| 6 | `loans.detail.serialize` | 3.9 |
| 7 | `loans.list.page1` | 2.4 |
| 8 | `loans.table.paint` | 0.0 |

## Gate notes

- Task 3 (investment list-read cuts): APPLY per Grill default (omit SSR summary + warm-cache hydrate + includeTotal key parity) — measure ranks: investments.list, investments.summary, investments.dehydrate, investments.overview
- Task 4 (loan slim detail + paged table): APPLY per Grill default — measure ranks: loans.detail.serialize, loans.list.page1, loans.table.paint
- Task 6 (C-items): SKIP unless leftover ranks still show structural cost after Tasks 3–4.

## Notes

- Investment seed rows are inside MONEY_LEDGER_INVESTMENT current-month + accountTypes investment lock.
- Loan fixture is list-visible under listLoansInstallments (paired status; page-1 hasMore).
- No full row dumps.
- Fixture cleaned after measure.
