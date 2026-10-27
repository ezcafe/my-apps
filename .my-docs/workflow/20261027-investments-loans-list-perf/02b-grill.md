# Grill log

**Result:** frontier-empty

**clarity-check ok — grill**

**Grill open** = ¬Notes `grill-skip` ∧ (no `02b` ∨ Result ≠ `frontier-empty`) (incl. template **`pending`** alone — does not close). **Closed** on Notes `grill-skip` (parent-only) **or** Result `frontier-empty` only — Result `skipped` does **not** close.

## Design tree

- Intent locked (ideation): both investment overview ledger **and** loan detail installment table; measure-first; reuse sibling money `includeTotal`/`hasMore` for investment `MoneyTransactionsPage`; loan detail → page via `listLoansInstallments`; sibling workflow reference only.
- Gate A / skim / Analyze paid.
- Round 1 frontier **closed** — user accepted all seven recommendations (Parent-relay: `"yes"`).

## Settled decisions

| Id | Decision | Source |
|----|----------|--------|
| Q1 | Success bar = ranked timings on **synthetic fixtures** + structural/e2e checks; **no** hard wall-clock SLA on unknown prod sizes | Round 1 yes |
| Q2 | Default Design: **defer** `includeSummary` off `/investments` ledger SSR critical path (stop hard-coded `includeSummary: true`; mirror sibling `/money`); keep SSR summary only if measure proves cheap | Round 1 yes |
| Q3 | Prefer hydrate/use warm dehydrated `MONEY_LEDGER_INVESTMENT` **without** viewport gate when SSR seeded (e.g. `deferFetchUntilVisible={false}` when seeded); keep defer only if measure shows no benefit / refetch storms | Round 1 yes |
| Q4 | Table via `listLoansInstallments` (cursor / limit+1); detail GraphQL **omits** full `installments` for client table; **server-only** full (or capped) schedule load inside `getLoanDetail` for summary/chart/next-pending/caption aggregates in v1; precomputed aggregates / chart redesign = measure-gated C | Round 1 yes |
| Q5 | UI chips → list filters: `upcoming`→`status=pending`, `paid`→`status=paid`, `all`→omit status; page with `nextCursor`; caption paid/overdue from detail aggregates (or cheap counts), not full client array | Round 1 yes |
| Q6 | v1 = measure + both surfaces’ list-read wins; **out:** holdings/ATF redesign, loan payment UX beyond list paging, `listLoans` list-page full-load rewrite unless measure ties them | Round 1 yes |
| Q7 | Measure fixtures = **repo-owned** synthetic investment-visible ledger rows + one long-term loan with many installments; real-workspace timings optional later | Round 1 yes |

## Round log

### Round 1 — frontier (settled)

All Q1–Q7 recommendations accepted as written (user: `"yes"`).

❓ **Q1** - **Success bar without known sizes**: Treat v1 success as **(a)** ranked timings on **synthetic fixtures** (investment ledger volume + a long-term loan schedule) plus structural wins (e.g. investment summary off SSR critical path; loan table not fed by full detail embed), and **(b)** e2e/structural checks on `/investments` ledger rows and loan detail page-1 installments — **not** a single wall-clock SLA on unknown prod sizes?

➡️ **Yes** — fixture + structural/e2e bar; no hard SLA on unknown prod size. **Accepted.**

---

❓ **Q2** - **Investment SSR summary**: Put **deferring `includeSummary` off the `/investments` ledger SSR critical path** in the default Design recommendation for v1 (stop hard-coded `includeSummary: true`; mirror sibling `/money` defer), and only keep SSR summary if measure proves it is cheap?

➡️ **Yes** — default Design assumes defer summary on investments SSR; measure can keep it if cheap. **Accepted.**

---

❓ **Q3** - **Section defer vs warm SSR cache**: For investment overview `variant="section"`, allow Design to **stop requiring viewport before using a warm dehydrated `MONEY_LEDGER_INVESTMENT` list** (e.g. `deferFetchUntilVisible={false}` when SSR seeded, or equivalent “use cache immediately”) so below-fold ledger rows are not delayed only by IntersectionObserver?

➡️ **Yes** — prefer hydrate/use warm list without viewport gate when SSR already seeded; keep defer only if measure shows no benefit or causes refetch storms. **Accepted.**

---

❓ **Q4** - **Loan slim detail (summary/chart vs table)**: Lock v1 so the **table** loads via `listLoansInstallments` (cursor / limit+1), and **detail GraphQL omits the full `installments` array for the client table**. Allow Design to keep a **server-only** full (or capped) schedule load inside `getLoanDetail` for summary/chart/next-pending/caption aggregates in v1 — promote precomputed aggregates / chart redesign only if measure still requires it after that split?

➡️ **Yes** — page the table; omit full installments from the client detail payload; server may still compute summary/chart from schedule internally in v1; deeper aggregate redesign is measure-gated C. **Accepted.**

---

❓ **Q5** - **Loan filter → list API**: Map UI chips to existing list filters in v1 — `upcoming` → `status=pending`, `paid` → `status=paid`, `all` → omit status — and page with `nextCursor` (no client filter over a full embedded array)?

➡️ **Yes** — server-page with that status map; caption paid/overdue counts come from detail aggregates (or cheap count fields), not from scanning a full client array. **Accepted.**

---

❓ **Q6** - **v1 ship both surfaces**: Keep Build v1 scoped to **measure + both surfaces’ list-read wins** that match top spans (investment SSR/composition + sibling list contracts; loan slim detail + paged installments + tests) — **exclude** holdings/ATF redesign, loan payment UX beyond list paging, and `listLoans` list-page full-load rewrite unless measure ties them?

➡️ **Yes** — both surfaces in parallel under measure-first; non-list redesigns stay follow-up. **Accepted.**

---

❓ **Q7** - **Measure fixtures**: Prefer **repo-owned seeds/scripts** (synthetic investment-visible ledger rows + one long-term loan with many installments) for span ranking / optional EXPLAIN so Build does not depend on the user’s private data size?

➡️ **Yes** — in-repo synthetic fixtures; real-workspace timings optional later. **Accepted.**

---

### Round 2+

Not needed — frontier empty.
