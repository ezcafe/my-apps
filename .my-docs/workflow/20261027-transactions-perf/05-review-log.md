# Code review log

**Overall Result:** clean  
(file-top alone never pays Review clean)

**Updated:** 2026-10-27T20:05:00+07:00  
**Round:** 1  
**Profile:** lite (`code-review-phase` = Adv + Quality)

## Adversarial

**Result:** clean

| Check | Pass? | Note |
|-------|-------|------|
| Spec vs draft (includeTotal / hasMore) | yes | Flag default true; `false` → skip COUNT, `total: null`, ban `-1`; `hasMore` from `LIMIT pageSize+1` via `fetchMoneyTransactionListParts` |
| Schema soften | yes | `MoneyTransactionConnection.total: Int` (nullable) in typeDefs + `docs/money.graphql`; `hasMore: Boolean!` |
| Query key / SSR parity | yes | `includeTotal` on list input + RQ key + `seedMoneyLedgerPage`; ledger helper `false` matches standalone table default |
| Ledger vs analytics split | yes | Standalone → `moneyLedgerListIncludeTotal()`; analytics/drilldown omit → default `true` |
| SSR summary defer | yes | `/money` passes `moneyLedgerSsrIncludeSummary()` false; seed early-returns without summary; client strip uses `AnalyticsStatsSkeleton` |
| Fixture / measure gate | yes | Synthetic workspace + ≥10k under first-load window; ranked table in `05-measure-notes.md`; Task 3+4 APPLY / Task 6 SKIP documented |
| Pager null-total | yes | `moneyListCanPageNext` / label / empty use `hasMore`; no throw on `total == null` |
| Workspace / auth | yes | Existing `requireMoneyWorkspace` / `runInWorkspace`; fixture uses fake owner sub + cleanup |
| Help catalog | yes | `api-help-content` documents default COUNT + skip-total + `hasMore` |

No Critical / Required.

**Optional:** Bills/savings prefetch omit options (same skip-summary + skip-total defaults as Spending). Consider mirroring Spending’s explicit `moneyLedgerSsrIncludeSummary()` for readability only.

**FYI (lens-db):** `listMoneyTransactions` COUNT uses `whereClause` captured before keyset cursor filters; rows use `listWhere`. Pre-existing shape; skip-total path never calls COUNT. Exact-total + cursor remains a lens note if keyset callers expect “remaining” totals.

## Quality

**Result:** clean

| Axis | Pass? | Note |
|------|-------|------|
| Correctness + tests | yes | Policy/pager/options/includeTotal/fixture/spans units (Build 40 pass); e2e structural “rows without waiting on summary”; Task gates match measure |
| Security | yes | No new trust boundary; fixture isolated; no secrets; workspace scoped list unchanged |
| Architecture | yes | Policy extracted (`money-list-total-policy`, pager helpers, ledger options); service uses shared fetch parts; Task 6 correctly skipped |
| Readability | yes | Small helpers; comments cite Design/Grill; no spaghetti growth |
| Performance | yes | COUNT skipped on ledger; SSR summary deferred; measure-driven cuts only |
| Skeleton parity | yes | Deferred summary → `AnalyticsStatsSkeleton`; table skeleton unchanged |

Approval bar met. No Critical / Required.

## Merged

**Result:** clean  
**Lens plan:** api\|db  
**Lenses:** `05-lens-api.md` clean · `05-lens-db.md` clean  
**Updated:** 2026-10-27T20:12:00+07:00

No Critical/Major across planned lenses. Open Optional/FYI stay non-blocking (prefetch options typing; COUNT/keyset whereClause note).

## Fix ask

(none)

## Round notes

- FIRST: Has API/DB=yes|yes; Lens plan api\|db → not missing required; Mode full + lite → not E1 Smoke gate; Smoke Build-writes paid.
- Review clean → unpaid `lens-api` + `lens-db` → both clean → `merge-findings` clean.
- Prefer unpaid `test-lite` next (skill boundary → my-dev-flow-v3-test).
