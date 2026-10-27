# Grill log

**Result:** frontier-empty

**clarity-check ok — grill**

**Grill open** = ¬Notes `grill-skip` ∧ (no `02b` ∨ Result ≠ `frontier-empty`) (incl. template **`pending`** alone — does not close). **Closed** on Notes `grill-skip` (parent-only) **or** Result `frontier-empty` only — Result `skipped` does **not** close.

## Design tree

- Intent locked (ideation): Money transactions perf; primary pain = **transaction list** load; workspace size unknown; measure-first then list-scoped quick wins; deprioritize add/edit-only unless shared with list.
- Gate A / skim / Analyze paid.
- Round 1 frontier **settled** (user “yes” = accept all five recommendations) → no further decision frontier → **Grill closed**.

## Settled decisions (Round 1)

| Id | Topic | Locked answer |
|----|--------|----------------|
| Q1 | Success bar | Fixture (≥10k txs) + structural/e2e bar; **no** hard wall-clock SLA on unknown prod size |
| Q2 | COUNT / pager | Allow drop exact `total` on default ledger list when COUNT ranks high (hasMore / keyset / deferred count); exact total only if cheap or UI still requires it |
| Q3 | SSR summary | Default Design **defers** `includeSummary` off SSR critical path; measure may keep if cheap |
| Q4 | v1 scope | **list-read** (+ **conditional** targeted invalidation if list refetch ranks high); **exclude** add/edit form-lookup and edit-bundle |
| Q5 | Measure fixture | Repo-owned synthetic seed/script (or test DB seed); real-workspace timings optional later |

## Round log

### Round 1 — frontier (settled)

❓ **Q1** - **Success bar without known workspace size**: Treat v1 success as **(a)** ranked timings on a **synthetic large ledger fixture** (≥10k txs) plus structural wins (e.g. summary/COUNT off critical path), and **(b)** `/money` e2e that rows hydrate without waiting on deferred work — not a single wall-clock SLA on an unknown real workspace?

➡️ **Yes** — fixture + structural/e2e bar; no hard SLA on unknown prod size.

**Answer:** Yes (accepted).

---

❓ **Q2** - **COUNT / pager UX**: If measure shows COUNT is expensive, allow Design to replace exact `total` on the default ledger pager with **hasMore / keyset** (or deferred exact count) — accept “page N of M” may change or go away for default `occurredAt` sort?

➡️ **Yes** — allow dropping exact total on default ledger list when COUNT ranks high; keep exact total only if cheap or still required by UI decision later.

**Answer:** Yes (accepted).

---

❓ **Q3** - **SSR summary on `/money`**: Put **deferring `includeSummary` off the SSR critical path** in the default Design recommendation for v1 (client/lazy after first paint), and only keep it on SSR if measure proves it is cheap?

➡️ **Yes** — default Design assumes defer summary; measure can keep it if cheap.

**Answer:** Yes (accepted).

---

❓ **Q4** - **v1 scope boundary**: Lock Build v1 to **measure + list-read path** (list API/COUNT/pagination, SSR seed composition, bootstrap/lookup reuse for list chrome, tests) — include **targeted invalidation** only if measure shows list refetch after mutation is a top span; **exclude** add/edit form-lookup and edit-bundle work from v1?

➡️ **Yes** — list-read (+ conditional invalidation); forms/edit bundle follow-up.

**Answer:** Yes (accepted).

---

❓ **Q5** - **Measure fixture**: Prefer a **repo-owned seed/script** (synthetic large workspace) for EXPLAIN + span ranking so Build does not depend on the user’s private ledger size?

➡️ **Yes** — synthetic fixture in-repo (or test DB seed); real-workspace timings optional later.

**Answer:** Yes (accepted).

---

### Round 2+

None — prerequisites settled; no new product/UX frontier. Implementation choices live in Design / tasks.
