# Code review log

**Overall Result:** clean  
(file-top alone never pays Review clean)

**Updated:** 2026-10-27T20:55:00+07:00  
**Round:** 1  
**Profile:** lite (`code-review-phase` = Adv + Quality)

## Adversarial

**Result:** clean

| Check | Pass? | Note |
|-------|-------|------|
| Spec vs draft (investments SSR / warm) | yes | `/investments` uses `moneyLedgerSsrIncludeSummary()` (not hard-coded `true`); section passes `deferLedgerFetchUntilVisible={false}`; seed default `includeTotal` via `moneyLedgerListIncludeTotal()` |
| Spec vs draft (loan slim + paging) | yes | `getLoanDetail` returns `installments: []` + count / `nextPaymentMinor`; table uses `loansInstallments` + filter map; keyset `installmentNumber:id` |
| Schema soften / additive | yes | Dual typeDefs (`loans` + `money-finance`) add counts / `nextPaymentMinor` / list `paidWithoutTransaction`; field `installments` kept |
| Query / client selection | yes | `LOAN_DETAIL_QUERY` selects counts + next-* (no full schedule); `LOANS_INSTALLMENTS_QUERY` selects `paidWithoutTransaction` |
| List order / cursor | yes | `ORDER BY installment_number ASC, id ASC`; encode/decode + reject legacy UUID-only; limit+1 → `nextCursor` |
| Fixture / measure gate | yes | Dual synthetic fixture + ranked spans in `05-measure-notes.md`; Task 3/4 APPLY; Task 6 SKIP |
| Workspace / auth | yes | List joins `loan.workspaceId`; detail/list via existing GraphQL workspace path; fixture fake owner + cleanup |
| Help catalog | yes | `api-help-content` documents slim detail + `loansInstallments` paging |
| Skeleton parity | yes | Pager chrome on table + detail skeleton; nested `rounded-[var(--radius-sm)]` |

No Critical / Required.

**Optional:** Pure `installmentRowMatchesQuery` returns false on malformed cursor; DB list treats malformed/legacy as page restart (no keyset filter). Align helper comment/behavior if tests start asserting restart semantics.

**FYI:** `getLoanDetail` still loads full schedule server-side for summary/chart/counts (Design v1). Re-measure → Task 6 only if leftover ranks demand it.

## Quality

**Result:** clean

| Axis | Pass? | Note |
|------|-------|------|
| Correctness + tests | yes | P1–P7 units (+ DB-gated slim/fixture); e2e structural P8/P9; Build verify 20/20; filter map + cursor + keyset units |
| Security | yes | No new trust boundary; workspace-scoped reads; fixture isolated; no secrets |
| Architecture | yes | Helpers extracted (cursor, filter map, detail counts, ledger options reuse); UI table ownership moved to list API |
| Readability | yes | Small pure modules; comments cite Design/Grill; no spaghetti growth |
| Performance | yes | SSR summary deferred; warm dehydrate without viewport gate; client omits full schedule; list keyset uses existing `(loan_id, installment_number)` indexes |
| Skeleton parity | yes | Next button skeleton + in-table loading skeleton |

Approval bar met. No Critical / Required.

## Merged

**Result:** clean  
**Lens plan:** api\|db  
**Lenses:** `05-lens-api.md` clean · `05-lens-db.md` clean  
**Updated:** 2026-10-27T20:57:00+07:00

No Critical/Major across planned lenses. Open Optional/FYI stay non-blocking (malformed-cursor helper vs DB restart; server full schedule load for aggregates).

## Fix ask

(none)

## Round notes

- FIRST: Has API/DB=yes|yes; Lens plan api\|db → not missing required; Mode full + lite → not E1 Smoke gate; Smoke Build-writes paid.
- Review clean → unpaid `lens-api` + `lens-db` → both clean → `merge-findings` clean.
- Prefer unpaid `test-lite` next (skill boundary → my-dev-flow-v3-test).
