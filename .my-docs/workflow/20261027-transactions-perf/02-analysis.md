# Analysis: Money transaction list performance

**Result:** done  
**Size:** Prefer bullets. ≤5 solution pieces.  
**Updated:** 2026-10-27

**clarity-check ok — analyze**

## Deep dive

### Overall

#### What is this?
Speed up **Money transaction list / first load** (`/money` and sibling ledger tabs). Use **measure-first**, then ship **list-scoped** quick wins. Keep add/edit-only work out of v1 unless measurement shows shared cost with list (bootstrap usage joins, SSR summary, broad invalidation while list is visible).

#### Why do we need this?
User confirmed pain = **transaction list** load. Workspace size unknown. Today SSR chains bootstrap (usage joins) + `listMoneyTransactions` (always COUNT + page + tags) + optional analytics summary; client still waits on chart lookups and a dynamic table before rows feel ready. Guessed bottlenecks exist; none are timed.

#### How to do this?
Instrument the hot path, rank spans, then implement the matching B-items from ideation (COUNT policy, SSR summary deferral, bootstrap/lookup reuse for list chrome, targeted cache updates when they affect list refetch). Promote deeper C-items only if measurement still justifies after B.

### Solution pieces

#### 1. Measure-first instrumentation (gate for all other work)

##### What is this?
Dev/ops timings that split wall time for: bootstrap (`fetchMoneyLookups` usage joins), list COUNT, list rows, tag links, optional SSR summary, GraphQL `moneyTransactions`, and client chart-lookups + table mount → rows painted.

##### Why do we need this?
Anti-goal: ship large refactors without timings. Workspace size unknown — need numbers on a real (or seeded) workspace before locking B/C scope.

##### How to do this?
- Server: short-lived spans / logs around `seedMoneyLedgerPage` steps and inside `listMoneyTransactions` (COUNT vs SELECT vs tags).
- Optional: `EXPLAIN (ANALYZE, BUFFERS)` on default first-page filter for a large fixture.
- Client: Network waterfall + React Query fetch markers for bootstrap / chartLookups / moneyTransactions.
- Output: ranked table in Design / tasks — top N spans only enter Build.

#### 2. List API — COUNT / total policy + pagination path

##### What is this?
Change how `listMoneyTransactions` pays for `total` and deep pages on the default ledger path (`occurredAt` desc, page 1).

##### Why do we need this?
COUNT always runs with the page select. UI uses `total` only for “page N of M”. Keyset exists but first load never sends a cursor. Likely high ROI if measure shows COUNT dominates.

##### How to do this? (Grill locks policy)
Options to evaluate after measure:
- Skip or defer COUNT on first page / when `total` unused.
- Approximate total or “hasMore” only for keyset UI.
- Prefer keyset for default sort (keep offset for other sorts).
Keep workspace isolation and filter semantics.

#### 3. SSR first-load composition on `/money`

##### What is this?
Reorder or slim `seedMoneyLedgerPage` / `prefetchMoneyLedger` so list rows hydrate sooner: bootstrap size, optional `includeSummary`, and client dependency on chart lookups before filter/table readiness.

##### Why do we need this?
`/money` sets `includeSummary: true` — summary analytics runs on SSR beside list. Bootstrap usage joins hit every ledger seed. Client blocks preset filter seed on chart lookups even when SSR already seeded list data for first-load filters.

##### How to do this?
- Defer summary off critical path (client after paint, or separate query).
- Seed / reuse lookup data from bootstrap for chart filter chrome when shapes match.
- Ensure dehydrated list query key matches client first-load filters so rows paint without a refetch storm.
- Skeleton parity if chrome order changes.

#### 4. Shared cache / invalidation only where list pays

##### What is this?
Narrow post-mutation invalidation **when** measure shows list refetch after save/delete is part of perceived list cost (or when editing from the ledger). Do **not** pull full add/edit form lookup redesign into v1 unless shared.

##### Why do we need this?
`invalidateMoneyWorkspaceQueries` refetches all active `["money"]` queries — can re-hit list + bootstrap while user is on the ledger. Ideation B1 is high ROI for save feel; for **list** focus, only include slices that reduce list refetch or bootstrap reload on the ledger.

##### How to do this?
- Targeted invalidate / optimistic patch for `moneyTransactions` list keys + selective bootstrap.
- Leave form-lookup reuse (B2/B3) and edit-bundle work for a follow-up unless measure ties them to list TTFB.

#### 5. Tests and acceptance for list wins

##### What is this?
Failing repros first (repo debug rule): unit for COUNT/pagination/cache-key helpers; e2e for `/money` rows appearing without long blank after hydration when UI/SSR changes.

##### Why do we need this?
Anti-goal: fix-forward with only manual feel. Lite review still needs a clear verify bar.

##### How to do this?
- Unit: list query policy (count skipped vs required), SSR seed query-key parity, invalidation targeting.
- E2E: ledger first load shows page-1 rows (seeded or mock) within agreed budget **or** structural assertion that summary/lookups are not on the critical path if that is the chosen win.
- No production change without the failing test for that bug/win.

### Risks

- **Unknown scale:** optimizing COUNT helps large ledgers; small workspaces may be bootstrap/JS bound — measure first.
- **COUNT UX:** dropping exact total breaks classic pager without a product decision.
- **Filter key mismatch:** SSR seed vs client `filterQuery` causes duplicate fetch (false “still slow”).
- **Summary deferral:** stats strip may flash empty — needs skeleton parity.
- **Over-scoping into forms:** dilutes list focus; Gate B heavier if schema/rollups enter early.
- **Auth/PII:** caching must stay workspace-scoped; no cross-workspace lookup reuse.

### Open questions (→ Grill)

1. How do we judge “fast enough” without a stated workspace size?
2. Accept exact COUNT skip / approx / keyset-only pager for v1?
3. Is SSR summary deferral in v1 even before measure, or only if summary span ranks high?
4. Include targeted invalidation in v1 list ship, or list-read path only?
5. Fixture size for measure (synthetic large ledger vs user’s real workspace)?
