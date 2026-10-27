# Design: Money transaction list performance

**Result:** done  
**Mode:** full · **Review profile:** lite  
**Updated:** 2026-10-27  
**design-update:** paid Fix asks from `03a-api-contract-review.md` + `03a-db-design-review.md` (Round 1)

**clarity-check ok — design**

**Proposed Has (signal only):** UI=yes · API=yes · DB=yes · auth/PII/schema=yes  
(No Has flip vs card — list GraphQL/service + SSR/client UI + workspace-scoped reads; v1 avoids schema migrations unless measure forces an index/fixture-only seed.)

## Decision 1: How to ship list speed

### Option 1 — Measure → ranked list-read wins (recommended)

**What it is:** First ship a **synthetic ≥10k-tx fixture** (visible under default `/money` first-load predicates) + span ranking (SSR bootstrap / COUNT / rows / tags / summary / client chartLookups / table mount). Then implement only top spans on the **list-read** path, using Grill locks as defaults (defer summary; COUNT→`hasMore` via pageSize+1 when COUNT ranks high; bootstrap/lookup reuse for list chrome; targeted invalidation **only if** list refetch ranks high). Forms/edit bundle stay follow-up.

**Example:** Fixture seed → ranked table in task notes → failing unit for “COUNT skipped when `includeTotal: false`” → change `listMoneyTransactions` + pager UI → `/money` e2e asserts rows without waiting on deferred summary.

| Pros | Cons |
|------|------|
| Matches ideation + Grill; avoids wrong rewrite | First PR may be instrumentation + fixture only |
| Clear verify bar without unknown prod SLA | Needs fixture maintainability |
| Lite review stays small (scoped B-items) | Conditional invalidation may slip to v1.1 |

### Option 2 — Speculate wins first; measure in parallel

**What it is:** Immediately defer `includeSummary`, change COUNT/pager, and slim SSR seed **before** ranked timings; run fixture measure as a side task to catch leftovers.

**Example:** Land summary defer + hasMore pager in one PR; add spans later to confirm COUNT was the villain.

| Pros | Cons |
|------|------|
| Faster visible UX change | Anti-goal risk: wrong win on small workspaces |
| Less waiting on fixture | Harder Gate B story if API shape moves twice |

### Recommendation

**Pick Option 1** — Grill Q1/Q5 lock fixture + structural bar; Analyze anti-goal bans unmeasured refactors.

## Locked picks (from Grill + design-update)

| Topic | Pick |
|-------|------|
| Success bar | Synthetic fixture timings + structural/e2e; no hard prod SLA |
| COUNT / pager | Flag **`includeTotal`** (default **`true`**). When COUNT ranks high on default `occurredAt` ledger, ledger passes **`includeTotal: false`** → skip `COUNT(*)`; **`total: null`**; **`hasMore: Boolean!`** from **pageSize+1**. **Ban `total: -1`**. Exact-total callers (analytics / chart drilldown) keep default `true`. |
| Cache / key | `includeTotal` is part of **list query input** + **React Query key** + **SSR seed input** so skip-total and exact-total never share cache |
| SSR summary | Default: **do not** pass `includeSummary: true` on `/money` SSR; client fetch after paint (keep SSR only if measure says cheap) |
| v1 scope | Measure + list-read (+ conditional invalidation); **out:** form lookups, edit bundle, usage rollups |
| Fixture | Dedicated synthetic workspace; ≥10k txs **visible under default `/money` first-load predicates**; seed write owner = seed/test helper only; idempotent cleanup |
| Auth / cache | Workspace-scoped only; no cross-workspace lookup reuse |

## System design

### Overview

- **User job:** Open `/money` → see page-1 rows quickly; deferred chrome (summary / non-critical lookups) must not block row paint.
- **Boundaries:** `seedMoneyLedgerPage` / `prefetchMoneyLedger`, `listMoneyTransactions` + GraphQL `moneyTransactions`, React Query list keys (incl. `includeTotal`), ledger table pager, optional narrow invalidate after mutation. **Out:** `moneyFormLookups`, edit modal bundle, schema rollups.
- **Data flow:** SSR bootstrap → list page (`includeSummary` off; `includeTotal` false only after measure ranks COUNT) → dehydrate → client hydrate rows → lazy summary / chartLookups as needed.
- **Consistency:** Filter query key **and** `includeTotal` SSR ↔ client first-load must match (no refetch storm / wrong hydrate).
- **Failure:** List errors still fall through to client GraphQL (existing seed try/catch). Fixture seed is test/dev only.
- **Why this shape:** Highest ROI on the confirmed pain surface with Grill-approved UX trade-offs + locked public contract from Isolated reviews.

### Concept 1 — Measure gate (+ fixture filter visibility)

- **What:** Dev/test timings split COUNT vs SELECT vs tags vs bootstrap vs summary; optional `EXPLAIN (ANALYZE, BUFFERS)` on **default first-page filter** against fixture.
- **Fixture visibility (locked):** ≥10k `money_transaction` rows must be **countable under the same predicates as default `/money` first-load** for the Spending ledger:
  - Same **dedicated synthetic workspace** (never a real user workspace).
  - `occurredAt` inside the measure `from`/`to`. Default measure window = Spending first-load dates from `moneyLedgerFirstLoadFilterQuery` / `defaultAnalyticsFilters` (**current calendar month**). If measure needs a **wider** window for volume, set an **explicit** `from`/`to` used for **both** seed inserts and the list/EXPLAIN filter (do not seed outside the list window). Note: bare analytics without `from`/`to` falls back to ~90d in `resolveAnalyticsDateBounds` — measure must not rely on that fallback while seeding outside the actual first-load query.
  - Plus Spending **preset** account-type / kind / category locks from `defaultFiltersForLedgerPreset` / `mergeLedgerPresetQuery` (minimal accounts/categories/tags so preset filters do not exclude the seed).
- **Write owner:** seed/test helper or in-repo script only (not prod list/mutation paths). Fake `created_by_sub`; do not log full row dumps in measure artifacts.
- **Cleanup:** idempotent (re-run safe) delete of the synthetic workspace subtree / tagged seed rows.
- **How:** Short-lived server spans around `seedMoneyLedgerPage` steps + `listMoneyTransactions`; client Network / RQ markers for list vs deferred work.
- **Output:** Ranked table → only top N enter Build tasks after Task 1.
- **EXPLAIN baseline indexes (existing — do not invent duplicates):**
  - `money_transaction_workspace_occurred_id_idx` `(workspace_id, occurred_at DESC, id DESC)` — default occurredAt+id order / keyset
  - `money_tx_workspace_kind_occurred_idx`
  - `money_tx_workspace_category_occurred_idx`
  - `money_tx_workspace_merchant_occurred_idx`
  - `money_tx_workspace_account_occurred_idx`
  - `money_tx_workspace_recurrence_occurred_idx`  
  New index only if EXPLAIN shows a clear miss; prefer `CREATE INDEX CONCURRENTLY` / expand-contract if ops need online DDL on large `money_transaction`.

### Concept 2 — List total policy (`includeTotal` + `hasMore`)

- **What (locked contract):**
  1. Query flag name: **`includeTotal`**, default **`true`** (preserves today’s COUNT for analytics / drilldown / any `Int!`-era callers until schema softens).
  2. When `includeTotal: false`: **skip `COUNT(*)`**; return **`total: null`** after intentional GraphQL schema soften **`total: Int`** (nullable). **Ban sentinel `-1`** (breaks `Math.ceil(total/pageSize)`, `total === 0` / `total > 0` pager/empty math).
  3. **Always** return **`hasMore: Boolean!`**. Skip-total SQL probe (locked): **`LIMIT pageSize + 1`**, drop the extra row, set `hasMore` from whether the extra row existed. Do **not** ship ambiguous dual probes (`length === pageSize` alone or cursor-only) for v1 skip-total — those false-positive on exact page multiples / unused `nextCursor` in the client list query. Existing `nextCursor` for `occurredAt` keyset may remain additive for v1.1; it is **not** the v1 continuation signal.
  4. When `includeTotal: true` (default): keep exact `total` from COUNT; still may set `hasMore` consistently (`(page * pageSize) < total` or same pageSize+1 probe — Build picks one and unit-tests it; default path must not break “Page N of M”).
- **Input + cache (locked):** Put `includeTotal` on Zod / `JSONObject` list query (`transactionListQuerySchema` + `moneyTransactionsListQueryInput`), on **`moneyTransactionsQueryOptions` queryKey** (alongside workspace, filterQuery, page, pageSize, sort, dir), and on SSR `seedMoneyLedgerPage` / dehydrated list options. Ledger may pass `false` only after measure ranks COUNT; drilldown / analytics keep default `true` so they never hydrate from a skip-total cache entry.
- **UI:** `AnalyticsTransactionsTable` pager adapts when `total == null` (Next/Prev from `hasMore`); skeleton parity if pager chrome changes. Chart drilldown keeps exact total.

### Concept 3 — SSR composition

- **What:** `/money` seed defaults to **no** `includeSummary`; summary query runs client-side after first paint (or when stats strip mounts).
- **How:** Change `prefetchMoneyLedger` / page callers; keep skeleton for stats strip (DESIGN_GUIDE).
- **Reuse:** Prefer bootstrap-derived accounts/categories/tags for chart filter chrome when shapes match so client does not block rows on duplicate GraphQL lookups.

### Concept 4 — Conditional invalidation (optional v1)

- **What:** If measure shows post-mutation list refetch as a top span while on ledger, replace blanket `invalidateMoneyWorkspaceQueries` for that path with targeted `moneyTransactions` (+ selective bootstrap) invalidate/optimistic patch — keys must include `includeTotal`.
- **How:** Only after Task 1 ranking; otherwise defer to follow-up with forms work.

## Design patterns used

### Pattern 1 — Measure-then-cut

- **Problem:** Unknown workspace size; guessed bottlenecks.
- **Solution:** Filter-visible fixture + spans before API/UI cuts.
- **Do:** Keep ranked table next to tasks; EXPLAIN against named existing indexes.
- **Don’t:** Ship C-items (rollups, full keyset-only rewrite) without measure; seed rows outside the list window.

### Pattern 2 — Progressive list contract

- **Problem:** Exact COUNT blocks TTFB for “page N of M” only.
- **Solution:** `includeTotal` default true; ledger may skip with `total: null` + `hasMore` from pageSize+1.
- **Do:** Workspace isolation unchanged; filter semantics unchanged; key includes `includeTotal`.
- **Don’t:** Drop total silently for analytics/drilldown; never use `-1`; never share RQ cache across total policies.

### Pattern 3 — Dehydrate critical path only

- **Problem:** Summary analytics shares SSR with list on `/money`.
- **Solution:** Seed list (+ bootstrap); defer summary.
- **Do:** Skeleton parity for empty stats strip.
- **Don’t:** Change auth/cookie model.

## Sequence diagram (v1 happy path)

```mermaid
sequenceDiagram
  participant U as User
  participant P as /money SSR
  participant S as seedMoneyLedgerPage
  participant L as listMoneyTransactions
  participant C as Client RQ
  participant T as Ledger table

  U->>P: GET /money
  P->>S: bootstrap + list (includeSummary=false, includeTotal per policy)
  S->>L: page 1 (COUNT iff includeTotal; else LIMIT pageSize+1)
  L-->>S: rows + total|null + hasMore
  S-->>P: dehydrate bootstrap + list (key includes includeTotal)
  P-->>U: HTML + dehydrated state
  U->>C: hydrate
  C->>T: paint page-1 rows
  C-->>C: fetch summary / chartLookups (deferred)
```

## API contracts

### GraphQL / list query (additive — locked)

| Field / input | Change |
|---------------|--------|
| List query `JSONObject` / Zod | Add **`includeTotal: boolean`**, **default `true`** |
| `MoneyTransactionConnection.total` | Soften **`Int!` → `Int`** (nullable). When `includeTotal: false` → **`null`**. **Never `-1`**. |
| `MoneyTransactionConnection.hasMore` | Add **`hasMore: Boolean!`**. Skip-total path: from **pageSize+1** probe. |
| `nextCursor` | Keep optional; **not** required for v1 skip-total pager |
| Auth | Existing workspace GraphQL auth; no cookie model change |

### Client / SSR cache (locked)

| Surface | Requirement |
|---------|-------------|
| `moneyTransactionsListQueryInput` | Pass `includeTotal` |
| `moneyTransactionsQueryOptions` queryKey | Include `includeTotal` (default `true`) |
| SSR seed / dehydrate | Same `includeTotal` as client first-load for that surface |
| Ledger after measure | May pass `false`; drilldown / exact-total callers stay `true` |

### Docs / help

When flag lands, update `lib/api-help-content.ts` (or catalog) for default-on COUNT, skip-total + `hasMore` (Build acceptance).

### SSR summary

| Caller | Change |
|--------|--------|
| `/money` prefetch | Default `includeSummary` **off** (Grill Q3) — caller-only; no GraphQL break |
| Bills/savings/spending | Same list cost class; apply same summary policy only where summary strip exists |

No new REST routes required for v1.

## Data model / DB

| Item | v1 |
|------|-----|
| Schema migration | **None** by default |
| Fixture | Dedicated synthetic workspace; ≥10k `money_transaction` rows **inside measure from/to** + Spending first-load preset filters; write owner = seed/test helper; fake `created_by_sub`; **idempotent cleanup** |
| Measure window | Default = current-month first-load bounds; **or** explicit wider `from`/`to` shared by seed **and** list/EXPLAIN |
| Indexes | Cite existing (Concept 1); new only after EXPLAIN miss; `CONCURRENTLY` if online DDL needed |
| Skip-total probe | **`LIMIT pageSize+1`** → `hasMore` (single locked shape) |
| Amounts | Keep bigint; no `SUM(…)::int`; fixture must not cast money aggregates to int4 |
| Rollups | Out of v1 (Grill Q4) |

## UI notes

- Pager copy may change from “Page N of M (T total)” → hasMore-style controls when `total == null`.
- Stats strip: loading skeleton until deferred summary resolves (zero CLS).
- Light + dark verify for any chrome change (`docs/DESIGN_GUIDE.md`).

## Test / acceptance (Grill Q1)

1. **Unit:** `includeTotal` false → COUNT not run; `total === null`; `hasMore` from pageSize+1; default true → exact total; queryKey / SSR input include `includeTotal`; fixture seed idempotent + count ≥10k under first-load predicates.
2. **E2E:** `/money` shows page-1 rows without waiting on deferred summary (structural assertion acceptable).
3. **Measure artifact:** Ranked span table from **filter-visible** fixture attached or linked in task notes before implementing cuts.
4. Repo rule: failing test before each production win.

## Non-goals (v1)

- Add/edit form lookup reuse and edit-bundle split.
- Usage-count rollups / materialization.
- Full GraphQL → REST rewrite.
- Hard wall-clock SLA on real user ledgers.
- Dual hasMore probes or cursor-only skip-total pager.

## Follow-ups (after v1)

- Forms B2/B3 + budget status defer.
- Deeper C-items only if fixture still shows structural SQL cost.
- Optional real-workspace timing pass.
- Optional keyset UI using `nextCursor` (v1.1).

## Risks

- Small ledgers may be JS/bootstrap-bound — measure may demote COUNT work.
- Pager UX change needs clear empty/disabled Next states.
- SSR/client filter **or `includeTotal`** mismatch → duplicate fetch / wrong hydrate.
- Seeding outside first-load window → false “COUNT is cheap” ranks.
- Over-scoping invalidation into forms — keep Gate B lite.

## Open questions

None for Grill — frontier empty. Product HITL not required: Design stays within Grill Q2 (drop exact total on default ledger when COUNT ranks high) with the locked `includeTotal` / nullable `total` / `hasMore` shape.
