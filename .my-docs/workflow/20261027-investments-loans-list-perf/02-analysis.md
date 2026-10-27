# Analysis: Investments ledger + loan installments list performance

**Result:** done  
**Size:** Prefer bullets. ≤5 solution pieces.  
**Updated:** 2026-10-27

**clarity-check ok — analyze**

## Deep dive

### Overall

#### What is this?
Speed up **two** list surfaces that hurt about the same: (1) investment overview ledger (`MoneyTransactionsPage` + `MONEY_LEDGER_INVESTMENT` on `/investments`), (2) loan detail installment table (`LoanInstallmentsTable` fed by full `loan.installments` from `getLoanDetail`). Use **measure-first**, then ship list-scoped wins. Reuse sibling money list-perf contracts for the investment ledger; page loan installments via existing `listLoansInstallments`.

#### Why do we need this?
User confirmed both surfaces. Investments still SSR-seeds ledger **with** `includeSummary: true` beside overview ATF/holdings/open, and the section table uses `deferFetchUntilVisible`. Loan detail always loads the full schedule for summary/chart **and** embeds every row for a client-filtered table — while a cursor pager API already exists unused by detail. Causes are guessed; none timed on these paths.

#### How to do this?
Instrument both hot paths, rank spans, then implement matching B-items (investment SSR composition + section fetch policy + sibling `includeTotal`/`hasMore` cache parity; loan slim detail + `listLoansInstallments` table). Promote C-items (precomputed loan aggregates, overview waterfall redesign, new indexes) only if measurement still justifies after B.

### Solution pieces

#### 1. Measure-first instrumentation (gate for all other work)

##### What is this?
Dev/ops timings that split wall time for:
- **Investments:** SSR `seedMoneyLedgerPage` (list vs summary) vs `seedInvestmentOverview` (ATF/holdings/open) vs client deferred ledger fetch / hydrate.
- **Loans:** `loadInstallmentStates` + detail serialize vs `listLoansInstallments` page-1 vs table paint / filter.

##### Why do we need this?
Anti-goal: large refactors without timings. Loan term and investment ledger size unknown — need numbers before locking B/C.

##### How to do this?
- Server spans around investment SSR seeds and `getLoanDetail` / `listLoansInstallments`.
- Optional EXPLAIN on long-term loan installment load vs paged list.
- Client Network / RQ markers for overview queries vs deferred ledger; loan detail vs installment list query.
- Output: ranked table per surface → only top spans enter Build tasks.

#### 2. Investment ledger — reuse sibling money list-perf contracts

##### What is this?
Apply locked sibling contracts from `20261027-transactions-perf` `03-design` to the investment overview ledger path: `includeTotal` / `hasMore` (pageSize+1), ban `total: -1`, query-key parity SSR↔client, and SSR summary deferral for this surface.

##### Why do we need this?
Client standalone already uses `moneyLedgerListIncludeTotal()` → false. Investments SSR still hard-codes `includeSummary: true`. Section embed may defer fetch even when cache is warm. Composition ≠ tightened `/money`.

##### How to do this? (Grill locks policy)
- Stop `includeSummary: true` on `/investments` ledger prefetch (mirror sibling Concept 3 / `moneyLedgerSsrIncludeSummary`).
- Confirm SSR seed `includeTotal` + filter key match client first-load for `MONEY_LEDGER_INVESTMENT`.
- Decide section `deferFetchUntilVisible` when SSR already seeded the ledger key (Grill).
- Do **not** reopen sibling Gate C or edit that workflow.

#### 3. Loan detail — slim payload + page installments list

##### What is this?
Stop using the full embedded `loan.installments` array as the table data source. Load the table through `listLoansInstallments({ loanId, limit, cursor, status? })` (existing limit+1 / `nextCursor`). Keep a slim path for summary / chart / next-pending / caption counts.

##### Why do we need this?
Detail always pays full-schedule join + large GraphQL payload. UI filters client-side with no windowing. Pager API already exists and supports `status` for `pending`/`paid`/`skipped`.

##### How to do this? (Grill locks policy)
- Map UI filters: `upcoming` → `status=pending`; `paid` → `paid`; `all` → omit status.
- Detail returns header + summary + chart + next-pending (+ optional aggregate counts) without shipping the full schedule for the table.
- How summary/chart get their inputs without the full embed is a Design/Grill decision (aggregates / capped sample / keep one internal full load server-side but omit from response).
- Skeleton parity for pager chrome.

#### 4. Tests and acceptance for both surfaces

##### What is this?
Failing repros first (repo debug rule): unit for investment SSR summary flag / list key parity and installment list paging + filter map; e2e when UI paging or SSR composition changes land.

##### Why do we need this?
Anti-goal: fix-forward with only manual feel. Lite review still needs a clear verify bar on both surfaces.

##### How to do this?
- Unit: investments prefetch omits `includeSummary: true` when deferred; loan list query status map; detail response omits full installments array (or shrinks it) once Design locks shape.
- E2E: `/investments` ledger rows without waiting on deferred summary; loan detail table page-1 + Next when paging lands.
- No production change without the failing test for that win.

#### 5. Deeper redesign only if measure still justifies (C-items)

##### What is this?
Precomputed loan aggregates / capped chart sample; investment overview query waterfall redesign; new indexes only after EXPLAIN miss.

##### Why do we need this?
May be needed for long-term loans or heavy ATF — but higher API/DB surface and Gate B weight. Keep behind measure gate.

##### How to do this?
Promote only after Task-1 ranked table still shows structural cost after B-items.

### Risks

- **Unknown scale:** small loan terms / ledgers may be JS/SSR-composition bound, not SQL — measure first.
- **Loan summary/chart correctness:** dropping full embed without a clear slim-detail design breaks stats/progress.
- **Filter / pager UX:** “upcoming” is pending-only today; status API matches, but caption paid/overdue counts need aggregates if array goes away.
- **Investment section defer:** wrong fetch policy can hide warm SSR cache or race overview queries.
- **Sibling drift:** copying money contracts incorrectly (key mismatch, `total: -1`) reintroduces sibling bugs.
- **Over-scope:** touching `listLoans` list-page full loads or holdings/ATF redesign dilutes v1.
- **Auth/PII:** workspace-scoped only; no cross-workspace cache reuse.

### Open questions (→ Grill)

1. How do we judge “fast enough” without named loan term / investment ledger size?
2. Default-defer investment SSR `includeSummary` (like sibling), or only after measure ranks it?
3. Keep / change section `deferFetchUntilVisible` when SSR already seeded `MONEY_LEDGER_INVESTMENT`?
4. Slim loan detail: omit installments from response and keep server-only full load for summary/chart, or move summary/chart to aggregates / capped sample in v1?
5. Loan table v1: server-page via `listLoansInstallments` with status map, or client-on-first-page only?
6. Measure fixtures: synthetic investment ledger + long-term loan seed in-repo?
