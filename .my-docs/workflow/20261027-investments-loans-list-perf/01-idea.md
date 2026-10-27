# Idea / framing

## Intent

Apply the same **list-perf** approach as Money `/money` (sibling run `20261027-transactions-perf`: measure-first, `includeTotal` / `hasMore` skip-COUNT, defer non-critical SSR work) to two slower list surfaces:

1. **Investments** — investment ledger under overview (`MoneyTransactionsPage` + `MONEY_LEDGER_INVESTMENT` in `components/investment-overview-page.tsx`).
2. **Loan details** — installment list on loan detail (`LoanInstallmentsTable` from full `loan.installments` in the detail query).

No code in this stage. Sibling money run stays **paused at Gate C** — use its `03-design` contracts as reference only; do not edit that workflow.

**Skip ideation:** say “just start” (or similar) if you want to waive brainstorm and go straight to Gate A / design. Parent will stamp `ideation-skip`.

## Playback (code-grounded guesses — mark as guesses)

Observed hot paths (verified in repo; **slowness cause not yet measured**):

### Investments overview (`/investments`)

- **SSR** (`app/(shell)/investments/page.tsx`) runs in parallel: `prefetchMoneyLedger(…, MONEY_LEDGER_INVESTMENT, { includeSummary: true })` + `prefetchInvestmentOverview` (holdings / open activities / related overview seed).
- **Client** overview also loads ATF (`investmentInsightsAtfQueryOptions`), holdings, and open activities **above** the ledger section.
- Ledger is `MoneyTransactionsPage` with `variant="section"` → `deferFetchUntilVisible={true}` on the table (`components/money-transactions-page.tsx`). Standalone table already uses `moneyLedgerListIncludeTotal()` → **false** on client (skip-COUNT path from sibling).
- **Guess vs `/money`:** investments still SSR-seeds the ledger **and** summary (`includeSummary: true`), then stacks ATF/holdings/open work; section defer means first paint of the ledger may wait on viewport + competing overview queries even when React Query was dehydrated. Not “zero SSR,” but **not the same composition** as `/money` after sibling locks (no summary on SSR; list-first).

### Loan detail installments

- **Detail** (`getLoanDetail` in `lib/loans-services/loans.ts`) loads **all** installment states via `loadInstallmentStates`, embeds them on `loan.installments`, and uses the full set for summary / chart / next-pending.
- **UI** (`LoanInstallmentsTable`) filters client-side (`all` / `upcoming` / `paid`) over that embedded array — no windowing.
- **Existing pager API:** `listLoansInstallments` already supports `limit` (default 50), `cursor`, and **limit+1 → `nextCursor`** (`lib/loans-services/installments-list.ts` + GraphQL). **Guess:** detail should stop embedding the full schedule for the table and page through that list (or a loan-scoped cousin), while keeping a slim path for summary/next-pending math.

### Shared with sibling money list-perf

- Measure-first ranking before deep redesign.
- Ledger list: `includeTotal` + `hasMore` (pageSize+1); ban `total: -1`.
- Defer non-critical SSR (summary / below-fold chrome) so page-1 rows win TTFB / first paint.
- Workspace-scoped auth; no cross-workspace cache reuse.

## Goals

1. Make **investment overview ledger** feel as fast as the tightened `/money` list path (hydrate or fetch page-1 rows without waiting on ATF/holdings/summary).
2. Make **loan detail installment table** scale without shipping every installment in the detail payload.
3. Prefer **measure-first** so we fix the real bottleneck on each surface.
4. Reuse sibling contracts where shapes already match (`includeTotal` / `hasMore`; existing `listLoansInstallments` cursor).
5. Keep correctness: balances, loan summary/next-pending, workspace isolation, skeleton parity.

## Non-goals

- Reopening Money `/money` Gate C / merging the sibling run from this workflow.
- Redesigning Investments IA, holdings/ATF charts, or loan payment UX (except list paging chrome).
- Form / add-edit / mutation invalidation work unless measurement ties it to these lists.
- Full GraphQL → REST rewrite; auth / workspace cookie model changes.

## Anti-goals

- Shipping large refactors without timings or failing repros.
- Dropping exact installment data needed for summary/chart without a clear slim-detail design.
- Caching across workspaces or leaking PII across users.
- “Fix forward” with only manual feel-checks and no tests (repo debug rule).
- Editing sibling workflow artifacts except as read-only contract reference.

## Constraints

- Stack: Next.js app router, React Query, Money/Loans GraphQL, Drizzle/postgres.js (`prepare: false`), workspace-scoped data.
- Money amounts / loan minors are bigint; no `SUM(…)::int`.
- Design system / skeleton parity for any UI change (`docs/DESIGN_GUIDE.md`).
- Auth/PII/schema already in play — schema/index changes need Design + Gate B later.
- Mode **full**, review profile **lite**.
- Sibling `20261027-transactions-perf` `03-design` is the SoT for money ledger `includeTotal` / `hasMore` / SSR-summary defer contracts.

## Ranked improvement directions

### A — Measure-first (recommended first slice)

**What:** Rank wall time for investments SSR (ledger seed vs summary vs overview ATF/holdings/open) vs client deferred list; and loan detail (full `loadInstallmentStates` vs table paint) vs `listLoansInstallments` page-1.

**Example:** Dev-only spans around `seedMoneyLedgerPage` / `seedInvestmentOverview` / `getLoanDetail`; Network waterfall for overview queries vs deferred ledger; optional EXPLAIN on installment load for a long-term loan.

| Pros | Cons |
|------|------|
| Avoids wrong big rewrite | Does not itself speed the app |
| Aligns Gate B / design with numbers | Needs a short tooling / fixture pass |

**Recommend:** Do this **before** deep redesign. Pair with one obvious composition win only if measure confirms it.

### B — Quick wins (likely high ROI after A confirms)

1. **Investments SSR composition** — stop `includeSummary: true` on overview ledger seed; keep page-1 list hydrate; let summary / ATF compete after paint (mirror sibling Concept 3).
2. **Section list fetch policy** — revisit `deferFetchUntilVisible` when SSR already seeded `MONEY_LEDGER_INVESTMENT` so viewport defer does not hide a warm cache or delay first rows below the fold unnecessarily.
3. **Loan detail slim payload** — detail returns loan header + summary inputs (or aggregates) + next-pending; table loads via `listLoansInstallments({ loanId, limit, cursor, status? })` with existing limit+1/`nextCursor`.
4. **Reuse money ledger skip-COUNT** — keep client `includeTotal: false` on investment ledger; ensure SSR seed query key matches (sibling cache lock).

| Pros | Cons |
|------|------|
| Localized; lite review friendly | May leave deep SQL cost if A shows DB is the villain |
| Builds on existing APIs | Loan UI filter (upcoming/paid) must map cleanly to list query |

### C — Deeper redesign (only if A shows structural cost)

1. Split loan summary math from installment list ownership (precomputed aggregates / capped schedule sample).
2. Investment overview query waterfall redesign (single ATF+holdings bundle; priority hints).
3. New indexes only if EXPLAIN shows a clear miss on installment/loan schedules.

| Pros | Cons |
|------|------|
| Scales with large schedules / ledgers | Larger API/DB surface; Gate B heavier |
| Addresses root cost classes | Higher regression risk |

## Recommendation (for shared understanding)

Treat this as a **small-to-medium project with written design**, sibling to money list-perf — not a one-line tweak.

1. Confirm which surface hurts most (investments ledger vs loan installments vs both equally).
2. Run **A (measure)** as the first design commitment on the chosen surface(s).
3. Implement **B** items that match the top measured spans; reuse sibling money contracts for the ledger.
4. Only promote **C** items that measurement still justifies.

## Has UI (tentative)

- **Has UI:** yes (investment ledger section, loan installments table, skeletons / pager chrome)
- **Has API:** yes (Money ledger list GraphQL; Loans detail + `listLoansInstallments`)
- **Has DB:** yes (ledger list/count path; installment load / cursor pages; possible index later)
- **Has auth/PII/schema:** yes (workspace-scoped money/loans data; schema only if indexes land)

## Shared understanding

- [x] User confirmed (brainstorm hard-gate) — **both about the same** (investments ledger + loan installment table)
- [ ] Or user skipped ideation (`ideation-skip` + provenance)

## Gate A / confirmation question (Parent-relay)

**Answered:** “both about the same” — v1 scope both surfaces in parallel under measure-first.
