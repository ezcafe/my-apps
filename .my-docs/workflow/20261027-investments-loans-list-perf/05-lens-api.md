# Lens: API

**Result:** clean  
**Updated:** 2026-10-27T20:56:00+07:00  
**Round:** 1

## Checklist

| Item | Verdict |
|------|---------|
| Design contract match (investments ledger reuse) | Pass — SSR `moneyLedgerSsrIncludeSummary()`; seed/client `includeTotal` via `moneyLedgerListIncludeTotal()`; no new Money GraphQL |
| Design contract match (loan slim detail) | Pass — `installments: []` kept; additive `installmentCount` / `paidInstallmentCount` / `overdueInstallmentCount` / `nextPaymentMinor`; next-* retained |
| Design contract match (loansInstallments) | Pass — order `installmentNumber` ASC + `id` ASC; keyset cursor `number:uuid`; `paidWithoutTransaction: Boolean!`; limit+1 → `nextCursor` |
| Additive / non-silent break | Pass — empty `installments` is intentional soften (Design locked); list order/cursor intentional shared fix; dual typeDefs kept in sync |
| List pagination + filters | Pass — chips map upcoming→pending / paid→paid / all→omit; status via query; Next from `nextCursor` |
| Validate at edge | Pass — `loansInstallmentsQuerySchema` + existing loan id parse; no re-validate of trusted internals |
| Query key / client selection | Pass — detail query selects counts + nextPaymentMinor; list query selects `paidWithoutTransaction`; RQ options map BigInt minors |
| Auth / workspace boundary | Pass — existing GraphQL `require` / workspace scope; no new cookie/CORS |
| Error shape / internals leak | Pass — unchanged mapServiceError paths; no new error variants |
| Docs / help | Pass — `api-help-content` updated for slim detail + paging |

## Findings

None Critical/Major.

**Optional:** Align pure `installmentRowMatchesQuery` malformed-cursor behavior with DB restart semantics (or document the intentional difference).

**FYI:** External GraphQL clients that still select `loan.installments` receive `[]` on all detail responses (not only the app table path) — matches Design Concept 3.
