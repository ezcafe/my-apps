# Design: Investments ledger + loan installments list performance

**Result:** done  
**Mode:** full · **Review profile:** lite  
**Updated:** 2026-10-27 (design-update — paid 03a API+DB Fix asks)

**clarity-check ok — design**

**Proposed Has (signal only):** UI=yes · API=yes · DB=yes · auth/PII/schema=yes  
(No Has flip vs card — Money ledger GraphQL/service + Loans detail / `listLoansInstallments` + SSR/client UI + workspace-scoped reads; v1 avoids schema migrations unless measure forces an index / fixture-only seed. Loan detail softens client table path + additive count / next-payment fields; list gains schedule-stable order/cursor + `paidWithoutTransaction`.)

## Decision 1: How to ship both surfaces

### Option 1 — Measure → ranked list-read wins on both surfaces (recommended)

**What it is:** First ship **repo-owned synthetic fixtures** (investment-visible ledger volume + one long-term loan with many installments) + span ranking for both hot paths. Then implement Grill-locked B-items that match top spans: investment SSR composition + warm-cache section hydrate + sibling `includeTotal`/`hasMore` key parity; loan slim detail + `listLoansInstallments` table paging. Promote C-items only if measure still requires them.

**Example:** Fixture seeds → ranked table in task notes → failing unit “investments prefetch omits `includeSummary: true`” / “detail response has no full installments for table” → land cuts → e2e: `/investments` ledger rows without waiting on deferred summary; loan detail page-1 + Next.

| Pros | Cons |
|------|------|
| Matches ideation + Grill; avoids wrong rewrite | First PR may be instrumentation + fixtures only |
| Clear verify bar without unknown prod SLA | Needs fixture maintainability for two domains |
| Lite review stays scoped to list-read | Loan caption/aggregates need a slim detail contract |

### Option 2 — Land composition + slim-detail cuts first; measure in parallel

**What it is:** Immediately defer investments SSR summary, turn off section viewport defer when seeded, omit detail installments + wire list pager — before ranked timings; run fixtures as a side task.

**Example:** One PR with SSR + loan table paging; add spans later to confirm full embed / COUNT / viewport defer were the villains.

| Pros | Cons |
|------|------|
| Faster visible UX change | Anti-goal risk on small schedules / ledgers |
| Less waiting on fixtures | Harder Gate B if loan GraphQL shape moves twice |

### Recommendation

**Pick Option 1** — Grill Q1/Q6/Q7 lock fixture + structural bar + both surfaces under measure-first; Analyze bans unmeasured deep redesign.

## Locked picks (from Grill)

| Topic | Pick |
|-------|------|
| Success bar | Synthetic fixture timings + structural/e2e on both surfaces; **no** hard prod SLA |
| Surfaces | **Both** in parallel: investment overview ledger + loan detail installment table |
| Investment SSR summary | Default: **do not** pass `includeSummary: true` on `/investments` ledger SSR (mirror sibling `moneyLedgerSsrIncludeSummary`); keep only if measure says cheap |
| Investment section defer | Prefer **use warm dehydrated `MONEY_LEDGER_INVESTMENT` without viewport gate** when SSR seeded (`deferFetchUntilVisible={false}` or equivalent); keep defer only if measure shows no benefit / refetch storms |
| Investment list contract | **Reuse** sibling money SoT (`20261027-transactions-perf` `03-design`): `includeTotal` default **true**; ledger may pass **false** → skip COUNT, **`total: null`**, ban **`-1`**; **`hasMore: Boolean!`** from **pageSize+1**; `includeTotal` on list input + RQ key + SSR seed for `MONEY_LEDGER_INVESTMENT` |
| Loan table | Page via existing `listLoansInstallments` (`limit`+1 → `nextCursor`); **omit** full `installments` from client detail table path |
| Loan list order / cursor | **`installmentNumber` ASC**, tie-break **`id` ASC**; keyset cursor matching that order (not UUID-only `gt(id)`). Intentional shared behavior change for all `loansInstallments` consumers (detail table + drilldown) |
| List item additive | `LoansInstallmentListItem.paidWithoutTransaction: Boolean!` (default false; mirror detail installment) |
| Loan summary/chart v1 | **Server-only** full (or capped) schedule load inside `getLoanDetail` for summary/chart/next-pending/caption aggregates; client path returns `installments: []` |
| LoanDetail additive | `installmentCount` / `paidInstallmentCount` / `overdueInstallmentCount` (`Int!`); `nextPaymentMinor` (`BigInt`, null when no next pending); keep `nextDueDate` / `nextScheduleInstallmentId` / `nextInstallmentNumber` |
| Loan filters | `upcoming`→`status=pending`; `paid`→`status=paid`; `all`→omit status; page with `nextCursor` |
| Caption counts | From locked detail count fields — **not** scanning a full client installments array |
| Fixture | In-repo synthetic: investment-visible ledger rows + long-term loan **list-visible** under `listLoansInstallments` (paired status rows; see Concept 1); write owner = seed/test helper; idempotent cleanup |
| v1 out | Holdings/ATF redesign; loan payment UX beyond list paging; `listLoans` list-page full-load rewrite; sibling workflow edits |
| Auth / cache | Workspace-scoped only; no cross-workspace cache reuse |

## System design

### Overview

- **User jobs:** (1) Open `/investments` → see investment ledger page-1 rows without waiting on SSR summary or a viewport gate that hides a warm dehydrate. (2) Open a loan detail → see installment page-1 + filter chips via list API without shipping the full schedule to the browser.
- **Boundaries:** Investments — `app/(shell)/investments/page.tsx` / `prefetchMoneyLedger` / `MoneyTransactionsPage` section + sibling money list stack. Loans — `getLoanDetail`, GraphQL `loan` / `loansInstallments`, `LoanInstallmentsTable` / `loan-detail-page`. **Out:** holdings/ATF redesign, loan pay mutations UX, sibling Gate C.
- **Data flow (investments):** SSR seed list (`includeSummary` off; `includeTotal` per sibling ledger helper) → dehydrate `MONEY_LEDGER_INVESTMENT` → client hydrate rows **immediately when seeded** → deferred summary / ATF as today after paint.
- **Data flow (loans):** Detail query returns header + summary + chart + next-pending + locked count / `nextPaymentMinor` fields with `installments: []` for the client table path → client `listLoansInstallments({ loanId, limit, cursor, status? })` ordered by schedule number → Next from schedule-stable `nextCursor`.
- **Consistency:** Investment filter query key **and** `includeTotal` SSR ↔ client first-load must match. Loan filter chip ↔ list `status` map must stay stable. List page order matches detail schedule order.
- **Failure:** Existing seed try/catch / GraphQL errors unchanged. Fixture seed is test/dev only.
- **Why this shape:** Highest ROI on confirmed pain with Grill locks + reuse of already-reviewed money list contracts.

### Concept 1 — Measure gate (+ dual fixtures)

- **What:** Dev/test timings split:
  - **Investments:** SSR ledger list vs summary vs overview seed (ATF/holdings/open) vs client hydrate / deferred fetch.
  - **Loans:** `loadInstallmentStates` + detail serialize vs `listLoansInstallments` page-1 vs table paint / filter change.
- **Fixtures (locked):** Prefer **one** dedicated synthetic workspace holding both fixtures (split only if auth/cache isolation tests require it — document if split); write owner = **seed/test helper only**; fake `created_by_sub`; **idempotent cleanup**.
  - **Investment (named first-load locks):**
    - Visible under `MONEY_LEDGER_INVESTMENT` with `lockedQuery.accountTypes: ["investment"]`.
    - Default measure window = **current calendar month** via `moneyLedgerFirstLoadFilterQuery(MONEY_LEDGER_INVESTMENT, …)` / `defaultAnalyticsFilters`.
    - Shared seed↔list `from`/`to`; **do not** seed against bare ~90d analytics fallback; if Build widens the window, keep ≤366d (`resolveAnalyticsDateBounds`).
  - **Loan (list-visibility Major — locked):**
    1. Every schedule row has a paired `loan_installment_status` row (prefer product create / rebuild path, or seed both tables together). Schedule-only seeds are invalid for measure — `listLoansInstallments` **inner-joins** status.
    2. Rows countable under measure list predicates: `loan.workspaceId` + that fixture `loanId`; when measuring filter chips, enough rows match mapped `status` (`pending` / `paid` / omit).
    3. Installment count high enough that page-1 `limit+1` yields **`hasMore` / non-null `nextCursor`** under default list limit (and under chip filters when those are measured).
    4. Full embed of that schedule remains clearly costly vs page-1 (measure rank input).
- **Output:** Ranked table **per surface** → only top spans enter production cut tasks.
- **EXPLAIN:** Optional on loan installment full load vs paged list; cite existing indexes below; new index only after clear miss (bigint amounts — no `SUM(…)::int`).

### Concept 2 — Investment ledger: reuse sibling money contracts

- **What:** Apply locked sibling contracts to the investment overview ledger path only (do **not** reopen sibling Gate C / edit that workflow).
  1. **`includeTotal`** default **true**; when false: skip COUNT; **`total: null`**; ban **`-1`**; **`hasMore`** from **pageSize+1**.
  2. Query key / SSR seed / client first-load for `MONEY_LEDGER_INVESTMENT` must share the same `includeTotal` + filter key (use `moneyLedgerListIncludeTotal()` for ledger).
  3. **`includeSummary`:** `/investments` prefetch stops hard-coding `true`; default off via same policy as `/money` (`moneyLedgerSsrIncludeSummary()` / equivalent caller).
  4. **Section warm cache:** when SSR dehydrated the investment list key, section must **not** wait on IntersectionObserver before using cache (pass `deferFetchUntilVisible={false}` when seeded, or equivalent “use cache immediately”).

### Concept 3 — Loan slim detail + paged installments

- **What:**
  1. **Table ownership moves** to `listLoansInstallments` / GraphQL `loansInstallments` (limit+1 → `nextCursor`; optional `status` / `from` / `to`; `loanId` unchanged).
  2. **Schedule-stable list order (locked):** `ORDER BY installment_number ASC, id ASC`. Cursor is a **keyset** for that order (last page row’s `(installmentNumber, id)` encoded in the existing string/`ID` cursor) — **not** UUID-only `gt(id)` on random ids. Keep `limit+1` → `nextCursor`. Intentional shared behavior fix for detail table **and** drilldown consumers.
  3. **List item additive (locked):** `paidWithoutTransaction: Boolean!` on `LoansInstallmentListItem` (mirror `LoanInstallment`; default false). Client paged query **must** select it (“No ledger entry” chip).
  4. **Client detail** no longer uses `loan.installments` as the table data source; stop selecting installments for the table.
  5. **`getLoanDetail` / `LoanDetail` slim client contract (locked):**
     - Keep field `installments: [LoanInstallment!]!`; v1 client-table path serialization returns **`[]`** (do **not** remove the field). Server may still `loadInstallmentStates` for summary / chart / aggregates.
     - Additive fields:
       - `installmentCount: Int!`
       - `paidInstallmentCount: Int!`
       - `overdueInstallmentCount: Int!` — pending ∧ `dueDate` &lt; today (same rule as UI)
       - `nextPaymentMinor: BigInt` — nullable when no next pending (loan-level `paymentMinor` ≠ next installment after rate change)
     - Keep existing `nextDueDate` / `nextScheduleInstallmentId` / `nextInstallmentNumber` for the payment card **with** `nextPaymentMinor`.
     - Caption / stats use count fields — **not** a full client installments array.
  6. **Filter map (locked):** `upcoming`→`pending`; `paid`→`paid`; `all`→omit status. Unit-test the map; overdue caption stays a **detail aggregate**, not a list `status`.
  7. **UI:** `LoanInstallmentsTable` loads pages via RQ on `loansInstallments` (+ loanId/status/cursor); Next when `nextCursor` non-null; skeleton parity for pager chrome (`docs/DESIGN_GUIDE.md`).
- **GraphQL:** Additive soften only — empty `installments` array preserves non-null schema; dropping the field would break other consumers. `loansInstallments` is the table SoT.

### Concept 4 — Tests before production wins

- Failing unit (+ e2e when UI-reachable) before each cut (repo debug rule).
- Structural e2e acceptable for Grill Q1 bar (no hard SLA).

## Design patterns used

### Pattern 1 — Measure-then-cut

- **Problem:** Unknown ledger / term sizes; guessed bottlenecks.
- **Solution:** Dual fixtures + ranked spans before API/UI cuts.
- **Do:** Keep ranked tables next to tasks; cite existing indexes before inventing new ones.
- **Don’t:** Ship C-items (precomputed aggregates, ATF waterfall, new indexes) without measure.

### Pattern 2 — Progressive list contracts (reuse)

- **Problem:** Exact COUNT / full embed block first paint.
- **Solution:** Sibling `includeTotal`/`hasMore` for investment ledger; cursor pager for loan installments.
- **Do:** Key parity SSR↔client; status map for chips; workspace isolation.
- **Don’t:** `total: -1`; client-filter over a re-introduced full array; cross-workspace cache.

### Pattern 3 — Dehydrate / slim critical path only

- **Problem:** SSR summary + viewport defer hide warm investment list; detail embeds schedule for table.
- **Solution:** Seed list without summary; use warm cache immediately; slim client detail + page table.
- **Do:** Skeleton parity for deferred summary / pager chrome.
- **Don’t:** Change auth/cookie model; redesign holdings/ATF in v1.

## Sequence diagrams

### Investments `/investments` (v1 happy path)

```mermaid
sequenceDiagram
  participant U as User
  participant P as /investments SSR
  participant S as prefetchMoneyLedger
  participant L as listMoneyTransactions
  participant C as Client RQ
  participant T as Section ledger

  U->>P: GET /investments
  P->>S: MONEY_LEDGER_INVESTMENT (includeSummary=false, includeTotal per ledger helper)
  S->>L: page 1 (COUNT iff includeTotal; else LIMIT pageSize+1)
  L-->>S: rows + total|null + hasMore
  S-->>P: dehydrate list (+ overview seeds in parallel)
  P-->>U: HTML + dehydrated state
  U->>C: hydrate
  C->>T: paint page-1 from warm cache (no viewport wait when seeded)
  C-->>C: fetch summary / ATF as deferred
```

### Loan detail installments (v1 happy path)

```mermaid
sequenceDiagram
  participant U as User
  participant D as getLoanDetail
  participant T as LoanInstallmentsTable
  participant I as listLoansInstallments

  U->>D: loan(id)
  Note over D: server may load schedule for summary/chart/aggregates
  D-->>U: header + summary + chart + next* + count fields; installments=[]
  U->>T: mount table
  T->>I: loanId + status map + limit (+ schedule keyset cursor)
  Note over I: order installmentNumber ASC, id ASC
  I-->>T: items (incl paidWithoutTransaction) + nextCursor
  T-->>U: page-1 rows; Next when nextCursor set
```

## API contracts

### Money / investment ledger (reuse sibling — reference only)

| Field / input | Contract |
|---------------|----------|
| `includeTotal` | Default **true**; ledger first-load may pass **false** via `moneyLedgerListIncludeTotal()` |
| `total` | Nullable; **null** when skip-COUNT; **never `-1`** |
| `hasMore` | **Boolean!** from **pageSize+1** |
| RQ / SSR | Key + seed input include `includeTotal` + same filter query for `MONEY_LEDGER_INVESTMENT` |
| SSR summary | `/investments` must **not** hard-code `includeSummary: true` |

No new Money GraphQL fields required for v1 if sibling already shipped; investments callers must **align** with those contracts.

### Loans detail + installments list

| Surface | Contract (locked) |
|---------|-------------------|
| `listLoansInstallments` / `loansInstallments` | Table SoT. Inputs: `loanId`, optional `status` / `from` / `to`, `limit`, `cursor`. Output: `items` + `nextCursor` via **limit+1**. |
| Order | **`installmentNumber` ASC**, tie-break **`id` ASC** (shared behavior change vs today’s UUID `id` ASC). |
| Cursor | Keyset matching that order — encode last row `(installmentNumber, id)`; resume with composite “after” predicate. **Do not** use UUID-only `gt(id)`. |
| `LoansInstallmentListItem` | Additive **`paidWithoutTransaction: Boolean!`** (default false). |
| `LoanDetail.installments` | Keep `[LoanInstallment!]!`; v1 client-table path returns **`[]`**. Client stops selecting installments for the table. |
| `LoanDetail` additive | `installmentCount: Int!`, `paidInstallmentCount: Int!`, `overdueInstallmentCount: Int!` (pending ∧ dueDate &lt; today), `nextPaymentMinor: BigInt` (nullable). Keep `nextDueDate` / `nextScheduleInstallmentId` / `nextInstallmentNumber`. |
| Caption / payment card | Counts + `nextPaymentMinor` + existing next-* fields — **not** a client installments array. |
| Filter map | `upcoming`→`pending`; `paid`→`paid`; `all`→omit |
| Auth | Existing workspace GraphQL auth; no cookie model change |

### Docs / help

Update `lib/api-help-content.ts` when the slim path lands if help still says detail embeds the full schedule (Build acceptance).

## Data model / DB

| Item | v1 |
|------|-----|
| Schema migration | **None** by default |
| Investment fixture | Same synthetic workspace preferred; `accountTypes: ["investment"]`; current-month `moneyLedgerFirstLoadFilterQuery(MONEY_LEDGER_INVESTMENT)` / shared seed↔list `from`/`to`; warn against bare 90d fallback; ≤366d if widened |
| Loan fixture (list-visibility) | Long-term loan: every schedule row **paired** with `loan_installment_status`; countable under `workspaceId` + fixture `loanId` (+ chip `status` when measuring filters); enough rows for page-1 `hasMore`; seed/test helper write owner; fake `created_by_sub`; idempotent cleanup |
| Existing indexes (cite in measure notes) | `loan_schedule_installment_loan_num_uq` + `loan_schedule_installment_loan_number_idx` `(loan_id, installment_number)`; `loan_schedule_installment_due_idx` `(due_date)`; `loan_installment_status_pending_idx` `(status)`. Schedule-stable list order uses `(loan_id, installment_number)` path; do **not** invent `(loan_id, id)` or status composites unless EXPLAIN on the fixture shows a miss |
| Amounts | Keep bigint; no `SUM(…)::int` on installment money aggregates |
| Precomputed aggregates | Out of v1 unless measure still shows structural cost after slim split (Grill Q4 C-gate) |

## UI notes

- Investment section: warm-cache hydrate; stats/summary skeleton if deferred (`docs/DESIGN_GUIDE.md` / skeleton parity).
- Loan table: chip filters remount/refetch list query; pager Next from schedule-stable `nextCursor`; select `paidWithoutTransaction`; caption / stats use locked count fields; payment card uses next-* + `nextPaymentMinor`; empty states per filter unchanged in meaning.
- Light + dark verify for any chrome change.

## Test / acceptance (Grill Q1)

1. **Unit:** investments prefetch omits `includeSummary: true`; `MONEY_LEDGER_INVESTMENT` SSR/client `includeTotal` + key parity; loan status map; detail returns `installments: []` + locked count / `nextPaymentMinor` fields; list order `installmentNumber` ASC (+ id tie-break) with matching keyset cursor; list items expose `paidWithoutTransaction`; list page hasMore/`nextCursor` from limit+1; fixture rows visible under `listLoansInstallments` predicates (status join + loanId/status).
2. **E2E:** `/investments` ledger rows without waiting on deferred summary; loan detail page-1 installments in schedule order + Next when paging lands.
3. **Measure artifact:** Ranked span tables (both surfaces) from **list-visible** fixtures before implementing cuts.
4. Repo rule: failing test before each production win.

## Non-goals (v1)

- Holdings / ATF / overview waterfall redesign.
- Loan payment / mark-paid UX beyond list paging chrome.
- `listLoans` list-page full-load rewrite.
- Editing sibling `20261027-transactions-perf` artifacts.
- Hard wall-clock SLA on real user data.
- Auth / workspace cookie model changes.

## Follow-ups (after v1)

- Precomputed loan aggregates / capped chart sample if measure still requires (C).
- Optional real-workspace timing pass.
- Investment overview query waterfall if ATF still tops ranks after B.
- New indexes only after EXPLAIN miss.

## Risks

- Small schedules/ledgers may be JS/composition-bound — measure may demote SQL work.
- Loan summary/chart correctness if server-only load is dropped too early — keep in v1 per Grill Q4.
- Investment section fetch policy mismatch → refetch storm or blank below-fold until viewport.
- Sibling drift (`total: -1`, key mismatch) reintroduces money list bugs.
- Over-scope into holdings/ATF or listLoans rewrite — keep Gate B lite.

## Open questions

None for Grill — frontier empty. Product HITL not required for Design within locked Q1–Q7.
