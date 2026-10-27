# Tasks: Money transaction list performance

**TDD:** Red tests first per task. Prefer unit; e2e for `/money` row hydration / deferred summary.

**Order:** 1 → 2 → (3|4 by measure rank) → 5 → 6(optional).

## Task 1 — Synthetic fixture + measure harness (S–M)

**Acceptance:**
- In-repo seed/script or test DB helper (**write owner = seed/test helper only**) creates a **dedicated synthetic workspace** with **≥10k** transactions (plus minimal accounts/categories/tags for Spending preset filters).
- Seed rows are **visible under default `/money` first-load predicates**: same workspace; `occurredAt` inside the measure `from`/`to` (default = Spending `moneyLedgerFirstLoadFilterQuery` / current-month bounds, **or** an explicit wider window used for **both** seed and list/EXPLAIN); plus preset account-type / kind / category locks. Do not seed outside that window.
- Fake `created_by_sub`; never reuse a real user workspace; no full row dumps in measure artifacts.
- **Idempotent cleanup** of the synthetic workspace / seed rows (re-run safe).
- Server (and optional client) timings split at least: bootstrap, list COUNT, list rows, tag links, summary (when enabled), dehydrate/hydrate list.
- Written **ranked span table** (top N) checked into workflow notes or task comment before Tasks 3–4 land production cuts.
- Optional: `EXPLAIN (ANALYZE, BUFFERS)` on default first-page filter against fixture, compared to existing indexes (`money_transaction_workspace_occurred_id_idx`, `money_tx_workspace_*_occurred_idx`). New index only if EXPLAIN shows a clear miss (`CONCURRENTLY` if online DDL).

**TDD (red first):**
- Unit or integration: seed helper is idempotent / cleans up in test DB (or documented one-shot script with verify count ≥10k **under the same first-load filter predicates** used for measure).
- Unit: timing helper records distinct spans (mock clock / spy) without leaking into prod builds when disabled.

## Task 2 — List total policy helpers + contract (S)

**Acceptance:**
- Pure (or service-level) policy locked to Design:
  - Flag name **`includeTotal`**, default **`true`**.
  - `includeTotal: false` → skip COUNT; **`total: null`** (schema soften `Int!` → `Int`); **ban `-1`**.
  - Always **`hasMore: Boolean!`** via **`LIMIT pageSize+1`** (drop extra row) on skip-total path.
- GraphQL/Zod/`JSONObject` list input includes `includeTotal`; existing callers keep exact total via default.
- **`moneyTransactionsQueryOptions` queryKey** + SSR `moneyTransactionsListQueryInput` / seed include `includeTotal` so ledger skip-total and drilldown exact-total never share cache.
- Workspace isolation unchanged.
- Help catalog documents default + skip-total + `hasMore` when flag lands.

**TDD (red first):**
- Unit: `includeTotal: false` → COUNT not invoked; `total === null`; `hasMore` true when pageSize+1 returns extra row; false when short page.
- Unit: `includeTotal: true` / default → `total` matches COUNT; pager math unchanged.
- Unit: queryKey / list input differ when `includeTotal` flips (no shared cache entry).
- Unit: keyset/`nextCursor` still produced for `sort=occurredAt` when applicable (optional for pager; not the v1 skip-total signal).

## Task 3 — Apply COUNT/pager cut when measure ranks COUNT high (S–M)

**Gate:** Task 1 rank shows COUNT (or total path) in top spans — else mark skipped with measure citation.

**Acceptance:**
- Default ledger list (`occurredAt` desc, first load) passes **`includeTotal: false`** and uses `hasMore` from pageSize+1 per Design.
- Analytics / chart drilldown keep **`includeTotal: true`** (exact total / “Page N of M”).
- `AnalyticsTransactionsTable` (and any shared pager) works without exact “Page N of M” when `total` is null; Next/Prev from `hasMore`; empty states clear.
- Skeleton parity if pager chrome changes.

**TDD (red first):**
- Unit: table/pager derives disabled Next from `hasMore` when `total` is null.
- Unit/service: SSR/client list options for `/money` first load pass `includeTotal: false` (and key includes it).
- E2E or component: pager does not throw / blank when `total` null and `hasMore` true.

## Task 4 — Defer SSR `includeSummary` + list chrome unblock (S)

**Acceptance:**
- `/money` SSR seed defaults **without** `includeSummary: true` (Grill default); summary loads after paint / when strip mounts.
- First-load filter query key **and** `includeTotal` SSR ↔ client match so dehydrated list paints without forced refetch.
- Prefer bootstrap-derived lookup shapes for chart filter chrome when possible so rows are not blocked on duplicate lookups.
- Stats strip skeleton until summary arrives (DESIGN_GUIDE / CLS).

**TDD (red first):**
- Unit/source: `/money` prefetch / page does not request summary on SSR critical path.
- Unit: `moneyLedgerFirstLoadFilterQuery` / list query key parity helper for Spending preset (incl. `includeTotal`).
- E2E: `/money` shows page-1 rows without waiting on summary network (structural: rows visible while summary pending/mock deferred).

## Task 5 — Acceptance e2e + verify bar (S)

**Acceptance:**
- Playwright (or existing money e2e harness): ledger first load shows rows for seeded/fixture workspace (or mock) under structural bar from Grill Q1.
- Document measure table link in PR / workflow.
- Light + dark spot-check for pager/summary skeleton if UI changed.

**TDD (red first):**
- E2E failing before Tasks 3–4 complete; green after.

## Task 6 — Conditional targeted invalidation (S) — optional

**Gate:** Task 1 shows post-mutation list/bootstrap refetch as top span on ledger — else **out of v1** (follow-up with forms).

**Acceptance:**
- Narrow invalidate / optimistic patch for active `moneyTransactions` list keys (**including `includeTotal`**) (+ selective bootstrap) on the mutation path that hits the ledger; do not redesign form lookups.

**TDD (red first):**
- Unit: invalidation helper targets list keys only (extend `money-query-options.invalidate.test.ts` style).
- No cross-workspace key reuse.

## Task order

1 → 2 → 3 and/or 4 (by measure) → 5 → 6 if gated.
