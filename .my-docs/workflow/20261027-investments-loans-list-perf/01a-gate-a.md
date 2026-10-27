# Gate A

**Result:** ok

## Notes

- Framing is clear: investment overview ledger and loan detail installment table both hurt about the same (ideation-confirmed · user: "both about the same").
- Scope for this run: measure-first on **both** surfaces in parallel; then list-scoped wins that match top spans. Investments: reuse sibling money list-perf contracts (`includeTotal` / `hasMore`, SSR summary defer) on `MoneyTransactionsPage` / `MONEY_LEDGER_INVESTMENT`. Loans: stop shipping full `loan.installments` for the table; page via existing `listLoansInstallments` (limit+1 / `nextCursor`).
- Sibling `20261027-transactions-perf` is **reference only** (paused at Gate C) — copy contracts, do not edit that workflow or reopen Money `/money` Gate C from here.
- Non-goals / anti-goals are enough for Analyze: no Investments IA / holdings-ATF redesign, no loan payment UX rewrite beyond list paging, no form/mutation work unless measurement ties it, no GraphQL→REST / auth-cookie rewrite, no ship without timings/tests, no cross-workspace cache.
- Has UI / API / DB / auth-PII-schema all **yes** → Mode full + review profile **lite**; Gate B blocking later if schema/index/API shape changes land.
- Open defaults OK for Analyze / Grill / Design: how “fast enough” is judged without named loan term / ledger size; whether loan status filter (`all` / `upcoming` / `paid`) maps to list API in v1 or stays client-on-page; whether investment section `deferFetchUntilVisible` stays when SSR already seeded the ledger key; how slim detail keeps summary/chart/next-pending without the full schedule embed.
- No escalate: intent and boundaries are enough for skim → analyze.
- Proceed to skim.
