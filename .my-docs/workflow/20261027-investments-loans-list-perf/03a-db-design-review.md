# DB design review: 20261027-investments-loans-list-perf

**Result:** clean  
**Round:** 2 (re-review after design-update)  
**Updated:** 2026-10-27  
**Skill:** database-and-data-model · stage `db-design-review`

Re-reviewed updated `03-design.md` (design-update paid Round-1 Fix asks). Zero Critical/Major open.

| Severity | Area | Finding | Status |
|----------|------|---------|--------|
| — | loan fixture list-visibility | Prior Major: lock paired `loan_installment_status`, measure predicates, page-1 hasMore, write owner / synthetic workspace / cleanup | **Closed** — Concept 1 + Data model + Locked picks + Test acceptance |
| — | investment fixture naming | Prior Enhancement: name `accountTypes` / current-month helper / 90d·366d | **Closed** — Concept 1 investment locks |
| — | installment index inventory | Prior Enhancement: cite existing indexes; gate invent DDL | **Closed** — Data model cites uq/idx names; schedule-stable `(loan_id, installment_number)` order aligns better than UUID-only; new index still EXPLAIN-gated |
| — | dual-surface fixture workspace | Prior Nit: prefer one workspace | **Closed** — Concept 1 prefer one; document if split |

**DB impact (v1 Design Option 1 — unchanged)**

- **Schema migration:** none by default — agree (measure-first; no invent).
- **`paid_without_transaction`:** already on `loan_installment_status` (`db/schema/loans.ts`) — GraphQL list additive is **column expose**, not new DDL.
- **Query-only wins:** `listLoansInstallments` stays bounded (`LIMIT`+1); order/cursor moves to keyset on `installment_number ASC, id ASC` (intentional shared behavior) — uses existing `(loan_id, installment_number)` unique/index; do **not** invent `(loan_id, id)` unless EXPLAIN miss.
- **Server-only full schedule:** `getLoanDetail` may still `loadInstallmentStates` for summary/chart/aggregates — same index path.
- **Fixture:** seed against existing money + loan / schedule / status tables; list-visibility contract now locked.
- **Indexes / rollups:** only if EXPLAIN after filter-correct fixtures demands; additive (+ `CONCURRENTLY` if ops need online DDL).
- **Amounts:** keep bigint; no `SUM(…)::int`.

**DB checklist:**

| Check | Status |
|-------|--------|
| Tables/columns typed; nullability | pass — reuse money + loans; no new DDL |
| Indexes / uniques match filters | pass — cited; schedule-stable order matches `(loan_id, installment_number)`; new gated on EXPLAIN |
| Write owner + read owners | pass — fixture seed/test helper; list/detail reads workspace-scoped |
| Migration additive / expand-contract | pass — none default; later index additive |
| Backfill bounded / idempotent | pass — fixture idempotent cleanup locked |
| Multi-write transactional | N/A for list-read; fixture batches restart-safe |
| Safe array binds / no `SUM::int` | pass in Design; Build keeps `inArray` / bigint |
| Lists bounded; no obvious N+1 | pass — installments `LIMIT`+1; detail full load = measure target |
| Tenant filter on reads | pass — `workspaceId` on loan join / money list; fixture isolated |
| Design ↔ schema match | **pass** — fixture visibility + index cites + existing `paid_without_transaction` column |

**Fix ask for my-dev-flow-design:** none.

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)

Zero Critical/Major → **clean**.
