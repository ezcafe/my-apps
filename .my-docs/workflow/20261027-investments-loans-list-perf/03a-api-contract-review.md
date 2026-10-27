# API contract review

**Result:** clean

**Round:** 2 (re-review after design-update)  
**Updated:** 2026-10-27  
**Skills:** api-and-interface-design (+ repo GraphQL / Money list / Loans list patterns)

## FIRST (gates)

| Check | Status |
|-------|--------|
| Design present (`03-design.md` Result done) | ok |
| Grill closed (`02b-grill.md` frontier-empty) | ok |
| Notes `design-stale` | absent |
| design-update unpaid | no (Run-log paid settle-gen:0) |

## Scope reviewed

- Re-review updated `03-design.md` (design-update) against Round-1 Fix asks + live SoT.
- **Investments:** sibling Money ledger reuse (`includeTotal` / `total: null` / `hasMore` / RQ+SSR key parity / `includeSummary` caller policy) for `MONEY_LEDGER_INVESTMENT`.
- **Loans:** schedule-stable `loansInstallments` order/cursor; list `paidWithoutTransaction`; slim `LoanDetail` additive counts / `nextPaymentMinor`; `installments: []` client-table path.
- No new REST; read-path / additive GraphQL; existing workspace GraphQL auth.
- Live refs: `lib/graphql/loans-typeDefs.ts`, `lib/graphql/money-finance-typeDefs.ts`, `lib/loans-services/installments-list.ts` (today still UUID `id` ASC + `gt(id)` — Build must flip to locked contract), `lib/loans-services/loans.ts`, `lib/loans-gql-documents.ts`, `lib/validators/loans.ts`, `lib/money-ledger-list-options.ts`.

## Round-1 Fix ask disposition

| Fix ask | Status in `03-design.md` |
|---------|--------------------------|
| `loansInstallments` order `installmentNumber` ASC + `id` ASC + matching keyset cursor | **Locked** — Locked picks, Concept 3 §2, API contracts table |
| `LoansInstallmentListItem.paidWithoutTransaction: Boolean!` | **Locked** — Locked picks, Concept 3 §3, API contracts |
| `LoanDetail` keep `installments`; client path `[]`; additive counts + `nextPaymentMinor`; keep next-* | **Locked** — Locked picks, Concept 3 §5, API contracts |
| Investments Money reuse confirm (no schema) | **Confirmed** — Concept 2 + API contracts |

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | cursor wire format | Contract locks **keyset semantics** `(installmentNumber, id)` in the existing `ID` cursor; exact encode/decode string form is left to Build. | Prefer one opaque opaque-safe encode (e.g. stable `number:uuid` or base64 JSON) + unit tests for round-trip + reject legacy UUID-only cursors or treat as page restart. |
| Enhancement | dual GraphQL SoT | `LoansInstallmentListItem` / `LoanDetail` appear in both `loans-typeDefs.ts` and `money-finance-typeDefs.ts`. | Build: keep both typeDefs in sync when adding fields (acceptance note). |
| Enhancement | docs / help | Help may still describe full schedule embed. | Update `lib/api-help-content.ts` when slim path lands (Design Docs / help already notes). |
| Nit | filter map | `upcoming`→`pending`, `paid`→`paid`, `all`→omit remains locked; overdue stays detail aggregate. | Unit-test the map. |
| Nit | pure list helper | Live `installmentRowMatchesQuery` still assumes UUID cursor compare — Build updates with order/cursor. | Mirror locked keyset in unit helper. |

**Critical:** none  
**Major:** none (Round-1 Majors closed by design-update)  
**Auth / workspace:** pass — existing GraphQL workspace scope; no cookie/CORS change; no cross-workspace cache.  
**Errors / idempotency:** N/A for read-path reuse / additive fields; mutating pay paths out of v1 chrome.  
**Additive fields:** investments pass (reuse); loans fields **locked** for Build.  
**Repo patterns:** pass — extend existing `loansInstallments` + `LoanDetail`; no new REST; `BigInt` for money additives matches live schema.

## API checklist

| Item | Notes |
|------|--------|
| Typed I/O | pass — order/cursor + list/detail additives locked |
| Single error shape | pass (unchanged reads) |
| Validation at edges | pass — reuse `loansInstallmentsQuerySchema`; extend list/detail output + Zod as needed |
| List pagination | pass — schedule-stable keyset + limit+1 → `nextCursor` locked |
| Additive fields | pass — locked names/types |
| Naming | pass — filter map + caption field names locked |
| Idempotency | n/a (GET/list) |
| Matches repo | pass — intentional order/cursor behavior change documented for all consumers |

## Fix ask for my-dev-flow-design

None — Result clean.

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)
