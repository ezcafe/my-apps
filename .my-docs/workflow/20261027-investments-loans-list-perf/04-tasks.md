# Tasks: Investments ledger + loan installments list performance

**TDD:** Red tests first per task. Prefer unit; e2e for `/investments` ledger rows and loan detail installment paging.

**Order:** 1 → 2 → (3|4 by measure rank, both surfaces) → 5 → 6(optional C).

## Planned tests

| Id | Case | Surface | Kind |
|----|------|---------|------|
| P1 | Seed helpers idempotent; investment rows visible under `MONEY_LEDGER_INVESTMENT` first-load locks (`accountTypes: investment`, current-month helper, shared `from`/`to`); loan fixture **list-visible** under `listLoansInstallments` (paired status rows; `workspaceId`+`loanId`; chip status when measured; enough rows for page-1 hasMore) | Fixture | Unit / integration |
| P2 | Timing helper records distinct investment + loan spans without leaking into prod when disabled | Measure | Unit |
| P3 | `/investments` prefetch / page source omits `includeSummary: true` | Investments | Unit (source) |
| P4 | `MONEY_LEDGER_INVESTMENT` SSR seed + client first-load share `includeTotal` + filter query key (ledger helper false) | Investments | Unit |
| P5 | Section uses warm dehydrated list without viewport gate when SSR seeded (`deferFetchUntilVisible` false or equivalent) | Investments | Unit / component |
| P6 | `getLoanDetail` returns `installments: []` for client table path; exposes `installmentCount` / `paidInstallmentCount` / `overdueInstallmentCount` / `nextPaymentMinor` (+ existing next-*); caption/stats need no full array | Loans | Unit |
| P7 | Filter map: `upcoming`→`pending`, `paid`→`paid`, `all`→omit; list order `installmentNumber` ASC (+ `id` tie-break) with matching keyset cursor; `paidWithoutTransaction` on list items; limit+1 → `nextCursor` | Loans | Unit |
| P8 | `/investments` shows ledger rows without waiting on deferred summary | Investments | E2E structural |
| P9 | Loan detail table page-1 in schedule order + Next when `nextCursor` set (filter chip refetch; paidWithoutTransaction visible when set) | Loans | E2E |

## Task 1 — Dual synthetic fixtures + measure harness (S–M)

**Acceptance:**
- In-repo seed/script or test DB helper (**write owner = seed/test helper only**) creates **dedicated synthetic workspace**(s) — prefer **one** workspace for both fixtures — with:
  - Investment-visible ledger volume under **`MONEY_LEDGER_INVESTMENT`** locks: `lockedQuery.accountTypes: ["investment"]`; default measure window = current calendar month via `moneyLedgerFirstLoadFilterQuery(MONEY_LEDGER_INVESTMENT, …)` / `defaultAnalyticsFilters`; shared seed↔list `from`/`to`; do not seed against bare ~90d fallback; ≤366d if widened.
  - One **long-term loan** that is **list-visible** under `listLoansInstallments`: every schedule row has paired `loan_installment_status`; countable under `workspaceId` + that `loanId` (and chip `status` when measuring filters); installment count high enough that page-1 `limit+1` → hasMore; full embed still costly vs page-1 for ranking.
- Fake `created_by_sub`; never reuse a real user workspace; no full row dumps in measure artifacts.
- **Idempotent cleanup** (re-run safe).
- Server (and optional client) timings split at least:
  - Investments: ledger list, summary (when enabled), overview seed pieces, dehydrate/hydrate / deferred section fetch.
  - Loans: `loadInstallmentStates` / detail serialize, `listLoansInstallments` page-1, table paint / filter.
- Written **ranked span tables** (per surface) checked into workflow notes or task comment before Tasks 3–4 land production cuts.
- Optional: `EXPLAIN (ANALYZE, BUFFERS)` on full installment load vs paged list; cite existing `(loan_id, installment_number)` / due / pending-status indexes — no invent DDL unless miss.

**TDD (red first):**
- P1, P2.

## Task 2 — Contract helpers + parity locks (S)

**Acceptance:**
- Investments callers align with sibling money contracts: `moneyLedgerListIncludeTotal()` / `moneyLedgerSsrIncludeSummary()` (or investment-specific wrappers that match); ban `total: -1`; RQ key + SSR seed include `includeTotal`. **No new Money GraphQL.**
- Loan filter→status map helper (pure) for UI chips.
- Document help catalog touch if loan detail “includes all installments” copy becomes wrong when slim path lands (may land with Task 4).

**TDD (red first):**
- P4 (parity helpers).
- P7 (status map + order/cursor contract pure tests where feasible).

## Task 3 — Investment list-read cuts when measure ranks them (S–M)

**Gate:** Task 1 investment ranks show SSR summary and/or section viewport defer and/or list COUNT/key mismatch in top spans — else mark skipped pieces with measure citation (Grill still defaults defer summary + warm-cache hydrate unless measure contradicts).

**Acceptance:**
- `/investments` SSR does **not** pass `includeSummary: true` on ledger prefetch (default defer).
- Section ledger uses warm `MONEY_LEDGER_INVESTMENT` cache without IntersectionObserver gate when SSR seeded.
- First-load filter query key **and** `includeTotal` SSR ↔ client match.
- Skeleton parity for deferred summary / section chrome if UI changes.

**TDD (red first):**
- P3, P5; P8 when UI composition lands.

## Task 4 — Loan slim detail + paged table (S–M)

**Gate:** Task 1 loan ranks show full embed / detail serialize in top spans — else cite measure; Grill still defaults slim client payload + list paging unless measure contradicts.

**Acceptance:**
- `listLoansInstallments` / `loansInstallments` order **`installmentNumber` ASC**, tie-break **`id` ASC**; keyset cursor matching that order (not UUID-only `gt(id)`); keep limit+1 → `nextCursor`.
- `LoansInstallmentListItem` includes **`paidWithoutTransaction: Boolean!`**; paged query document selects it.
- `LoanInstallmentsTable` (or successor) loads via list API with `loanId`, status map, limit, cursor; Next from `nextCursor`.
- Client detail path: `installments: []` (field kept); does **not** feed the table from a full array.
- Additive `LoanDetail` fields: `installmentCount`, `paidInstallmentCount`, `overdueInstallmentCount`, `nextPaymentMinor`; payment card uses next-* + `nextPaymentMinor`; caption/stats use counts.
- `getLoanDetail` may still load schedule **server-side** for summary/chart/aggregates in v1.
- Skeleton parity for pager chrome; empty states per filter preserved in meaning.
- Help catalog update if copy still claims full schedule embed.

**TDD (red first):**
- P6, P7 (service/UI wiring); P9 when paging UI lands.

## Task 5 — Acceptance e2e + verify bar (S)

**Acceptance:**
- Playwright (or existing e2e harness): structural bar from Grill Q1 on both surfaces (P8 + P9).
- Document measure table links in PR / workflow.
- Light + dark spot-check for changed chrome.

**TDD (red first):**
- E2E failing before Tasks 3–4 complete; green after.

## Task 6 — Measure-gated C-items (optional)

**Gate:** After Tasks 3–4, Task 1 (re-run or leftover ranks) still shows structural cost — else **out of v1**.

**Candidates (only if gated):**
- Precomputed loan aggregates / capped chart sample (no server full-schedule load).
- Investment overview ATF/holdings waterfall redesign.
- New indexes after EXPLAIN miss (`CONCURRENTLY` if online DDL).

**TDD (red first):**
- Task-specific failing tests for the promoted C-item only.

## Task order

1 → 2 → 3 and/or 4 (by measure, both surfaces in scope) → 5 → 6 if gated.
