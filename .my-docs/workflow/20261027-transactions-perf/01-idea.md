# Idea / framing

## Intent

Money **transactions** feel slow on **list/load**, **add**, and **edit**. Review the current Money ledger path (SSR seed → GraphQL → Drizzle → React Query → forms) and pick a **measured, ranked** improvement plan. No code in this stage.

**Skip ideation:** say “just start” (or similar) if you want to waive brainstorm and go straight to Gate A / design. Parent will stamp `ideation-skip`.

## Playback (code-grounded guesses — mark as guesses)

Observed hot paths (verified in repo; **slowness cause not yet measured**):

### List / load (`/money`, bills, savings)

- **SSR** seeds bootstrap + page-1 transactions via `seedMoneyLedgerPage` (`lib/money-ssr-seed.ts`) calling `listMoneyTransactions` (pageSize 20).
- **Client** `MoneyTransactionsPage` waits on bootstrap + chart lookups; table is `dynamic()`-imported; standalone ledger sets `deferFetchUntilVisible={false}` so the list query runs when the table mounts.
- **List API** (`listMoneyTransactions` in `lib/money-services/transactions.ts`): always runs **COUNT(*)** + page select in parallel; offset pagination unless keyset cursor + `sort=occurredAt`; then a second query for tag links. Filter path can expand categories (`resolveAnalyticsFiltersForQuery`) and use account-type subqueries / tag CTE (`moneyTransactionConditionsForAnalytics`).
- Indexes exist on `(workspaceId, occurredAt)` and related composites (`db/schema/money.ts`). **Guess:** COUNT + filter width + bootstrap usage joins dominate TTFB more than missing indexes for default sort.

### Add (`money-transaction-form.tsx`)

- On open: **`moneyFormLookupsQueryOptions`** → GraphQL fields `moneyAccounts` / `moneyCategories` / `moneyMerchants` / `moneyTopAmounts` / `moneyTags` — each resolver hits list helpers that **LEFT JOIN transactions for 90d usageCount** (accounts, categories, merchants, tags).
- Also **`moneyFormBudgetStatus`** for chip fills (extra analytics-style work).
- On save: create mutation (rules load, tag asserts, balance effect inside DB txn) then **`invalidateMoneyWorkspaceQueries`** (all active `["money"]` + investment) and optional budget refetch — **guess:** perceived “Saving…” hang is often **broad invalidation refetch**, not only insert latency (comment in `money-query-options.ts` already notes this class of hang).

### Edit (`transaction-edit-form.tsx` / modal / lazy)

- Form waits on **form lookups + transaction-by-id** (cache hit via `findCachedMoneyTransaction` can skip list wait but lookups still run).
- Lazy/dynamic chunk (`transaction-edit-form-lazy.tsx`, `ssr: false`) adds JS parse cost before fields paint.
- On save/delete: same **full money query invalidation** before close/navigate.

### Shared bootstrap cost

- Layout + pages seed **`moneyBootstrap`**: workspace state + `fetchMoneyLookups` with **usage-count joins** on accounts/categories (`lib/money-workspace-bootstrap-data.ts`). Chart lookups are derived from bootstrap on the client, but form lookups **re-query** usage-heavy lists separately.

## Goals

1. Make **first paint / interactive** for ledger list feel fast (skeleton → real rows without long blank/spinner).
2. Make **add** and **edit** open usable quickly (lookups + form chrome).
3. Make **save** feel snappy (mutation + cache update without waiting on a full money refetch storm).
4. Prefer **measure-first** so we fix the real bottleneck, not guessed ones.
5. Keep correctness: balances, rules, workspace isolation, analytics exclusion flags.

## Non-goals

- Redesigning Money UX IA, filter UX, or analytics charts (except where list summary sharing causes list latency).
- Bulk import / CSV performance (separate surface).
- Changing auth / workspace cookie model.
- Full GraphQL → REST rewrite.

## Anti-goals

- Shipping large refactors without timings or failing repros.
- Dropping COUNT/total without a clear UX decision (infinite scroll vs “approx total”).
- Caching lookups across workspaces or leaking PII across users.
- “Fix forward” with only manual feel-checks and no tests (repo debug rule).

## Constraints

- Stack: Next.js app router, React Query, Money GraphQL, Drizzle/postgres.js (`prepare: false`), workspace-scoped data.
- Money amounts are bigint; no `SUM(…)::int`.
- Design system / skeleton parity for any UI change (`docs/DESIGN_GUIDE.md`).
- Auth/PII/schema already in play — any schema/index change needs Design + Gate B later.
- Mode **full**, review profile **lite**.

## Ranked improvement directions

### A — Measure-first (recommended first slice)

**What:** Instrument and rank wall time for: SSR seed (bootstrap vs list), GraphQL `moneyTransactions`, form lookups (per field), create/update mutation, and post-save invalidation/refetch. Browser + server traces (e.g. existing request patterns / `EXPLAIN ANALYZE` on list+count).

**Example:** Dev-only timing around `listMoneyTransactions` COUNT vs rows vs tags; Network waterfall for `MoneyFormLookups` vs `MoneyTransactionCreate` vs follow-up refetches.

| Pros | Cons |
|------|------|
| Avoids wrong big rewrite | Does not itself speed the app |
| Gives Gate B / design a number-backed scope | Needs a short tooling pass |

**Recommend:** Do this **before** deep redesign. Pair with one quick win if a spike is already obvious.

### B — Quick wins (likely high ROI after A confirms)

1. **Narrow post-mutation cache updates** — replace blanket `invalidateMoneyWorkspaceQueries` after create/update/delete with targeted invalidation or optimistic list patch + selective bootstrap/lookup refresh (`lib/money-query-options.ts`, form/edit save paths).
2. **Reuse bootstrap for form lookups** — seed `moneyFormLookups` from bootstrap + lazy merchants/topAmounts only when chips need them; avoid five usage-join queries on every form open.
3. **Defer budget status** — load `moneyFormBudgetStatus` after first paint / when chips visible.
4. **List COUNT policy** — skip or approximate `total` on first page / keyset-only pager when total is only for “page N of M”; or cache total per filter key briefly.
5. **Prefetch form lookups** on ledger hover/focus of Add / row Edit so modal open is cache-hit.

| Pros | Cons |
|------|------|
| Localized changes; good for lite review | May leave deep DB cost if A shows SQL is the villain |
| Aligns with existing React Query structure | Needs careful cache correctness tests |

### C — Deeper redesign (only if A shows structural cost)

1. **List API shape** — always keyset for default `occurredAt` sort; stop OFFSET deep pages; optional separate lightweight `moneyTransactionsPage` without full row serialize.
2. **Usage counts** — materialize / nightly rollup / capped sample instead of 90d LEFT JOIN on every listAccounts/categories/merchants/tags.
3. **Write path** — batch rule load; move journal sync off critical path when not investment; reduce sequential reads in `updateMoneyTransaction`.
4. **UI architecture** — lighter edit modal bundle; avoid waiting on full lookups for fields already known from the list row.

| Pros | Cons |
|------|------|
| Scales with large ledgers | Larger design/API/DB surface; Gate B heavier |
| Addresses root cost classes | Higher regression risk |

## Recommendation (for shared understanding)

Treat this as a **small-to-medium project with written design**, not a one-line tweak.

1. Confirm which surfaces hurt most (list vs add open vs save vs edit).
2. Run **A (measure)** as the first design commitment.
3. Implement **B** items that match the top measured spans.
4. Only promote **C** items that measurement still justifies.

## Has UI (tentative)

- **Has UI:** yes (ledger table, add form, edit modal/page, skeletons)
- **Has API:** yes (Money GraphQL transactions + lookups + mutations)
- **Has DB:** yes (list/count, usage joins, write+balance; possible index/rollup later)
- **Has auth/PII/schema:** yes (workspace-scoped money data; schema only if rollups/indexes land)

## Shared understanding

- [x] User confirmed (brainstorm hard-gate) — pain moment: **transaction list** load (workspace size not stated)
- [ ] Or user skipped ideation (`ideation-skip` + provenance)

## Gate A / confirmation question (Parent-relay)

**Answered:** “transaction list” — scope primary surface to ledger list/load; keep add/edit as secondary unless measurement shows shared cost.
