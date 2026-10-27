# DB design review: 20261027-transactions-perf

**Result:** clean  
**Round:** 2 (re-review after design-update settle-gen:0)  
**Updated:** 2026-10-27  
**Skill:** database-and-data-model · stage `db-design-review`

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | measure window cap | Design locks shared seed/list `from`/`to` and warns about the bare 90d fallback. `resolveAnalyticsDateBounds` also **caps** ranges to **366d**. A “wider” measure window beyond that would truncate list predicates and again hide seeded rows. | Prefer current-month first-load (already locked) for ≥10k; if Build widens, keep explicit window **≤366d** and document the cap next to the shared `from`/`to` note. |
| Enhancement | index inventory | Design cites keyset + filter composites correctly (verified in `db/schema/money.ts`). Also present: `money_tx_workspace_occurred_idx` `(workspace_id, occurred_at)` (non-DESC, no `id`). | Optional cite in EXPLAIN notes; do not invent a duplicate of either family. |
| Nit | rollups | Usage-count rollups / materialization remain out of v1 (Grill Q4). | Do not invent rollup tables/indexes unless a later measure promotes them. |

**Prior Majors**

| Prior | Status |
|-------|--------|
| Fixture filter visibility (rows countable under default `/money` first-load predicates; write owner; dedicated workspace; idempotent cleanup) | **Closed** — Concept 1 + Data model lock same-workspace seed, measure `from`/`to` (default = current calendar month via `moneyLedgerFirstLoadFilterQuery` / `defaultAnalyticsFilters`), Spending preset account-type / kind / category locks, seed/test write owner, fake `created_by_sub`, idempotent cleanup. Verified first-load is current month (not bare 90d); design warns not to seed against the 90d fallback. |
| (Enhancement) Name existing list/keyset indexes | **Closed** — Concept 1 lists `money_transaction_workspace_occurred_id_idx` + `money_tx_workspace_*_occurred_idx`; names match schema/migrations. New index only after EXPLAIN miss; `CONCURRENTLY` / expand-contract noted. |
| (Enhancement) Single skip-total `hasMore` SQL probe | **Closed** — locked `LIMIT pageSize+1` → drop extra → `hasMore`; dual probes / cursor-only skip-total banned for v1. |

**DB impact (v1 Design Option 1)**

- **Schema migration:** none by default (agree — measure-first; no invent).
- **Query-only wins:** skip `COUNT(*)` when `includeTotal: false`; workspace filter kept; bounded `LIMIT pageSize+1` on skip-total; existing keyset index for occurredAt+id order.
- **Fixture:** seed/script write volume against existing `money_transaction` (+ minimal accounts/categories/tags for preset); not a new table; filter-visible contract locked.
- **Indexes / rollups:** only if EXPLAIN after filter-correct fixture demands; then additive (+ `CONCURRENTLY` if ops need online DDL).

**DB checklist:**

| Check | Status |
|-------|--------|
| Tables/columns typed; nullability | pass — reuse `money_transaction` / tags; no new DDL planned |
| Indexes / uniques match filters | pass — existing composites + keyset named; new indexes gated on EXPLAIN |
| Write owner + read owners | pass — list reads = money list/GraphQL/SSR; fixture write owner = seed/test helper only; dedicated synthetic workspace |
| Migration additive / expand-contract | pass — none default; if index later, additive / `CONCURRENTLY` |
| Backfill bounded / idempotent | pass — fixture seed + idempotent cleanup contracted |
| Multi-write transactional | N/A for list-read; fixture batch should stay restart-safe (acceptance already: idempotent seed) |
| Safe array binds / no `SUM::int` | pass in Design; Build keeps `inArray` / bigint |
| Lists bounded; no obvious N+1 | pass — `LIMIT` + batched tag `inArray`; COUNT skip is the main win |
| Tenant filter on reads | pass — `workspaceId` in conditions; fixture isolated |
| Design ↔ schema match | pass — fixture visibility, indexes, skip-total probe, no default migration |

## Fix ask for my-dev-flow-design

None — zero Critical/Major. Optional Enhancements above may land in Build acceptance notes without a design-update.

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card — DB=yes for workspace-scoped list reads + fixture seed against existing schema; still **no** required migration unless measure promotes an index)

Zero Critical; zero open Major → **clean**.
