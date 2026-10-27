# TDD test plan review

**Result:** clean  
**Updated:** 2026-10-27  
**Prereq:** Design present (`03` Result `done`); Isolated API/DB clean; overall `03a-design-review-log` clean; Grill `frontier-empty`

**clarity-check ok — tdd-review**

**04a unpaid / dirty** when planned tests present ∧ ¬Notes `04a skipped` ∧ (missing **or** Result ∉ {`clean`}) — incl. **`pending`**. ¬ planned tests → **04a ok** (no Prefer). Waiver Notes `04a skipped` = parent after Parent-relay **or** labeled solo after AskQuestion named yes.

## Planned cases reviewed

| Id | Scenario type | Test case | Covered? |
|----|---------------|-----------|----------|
| P1 | fixture / real | Seed helpers idempotent; investment rows under `MONEY_LEDGER_INVESTMENT` first-load locks; loan fixture list-visible under `listLoansInstallments` (status join + loanId; page-1 hasMore) | yes |
| P2 | real / measure | Timing helper records distinct investment + loan spans; disabled → no prod leak | yes |
| P3 | real / SSR | `/investments` prefetch / page source omits `includeSummary: true` | yes |
| P4 | real / cache | `MONEY_LEDGER_INVESTMENT` SSR seed + client first-load share `includeTotal` + filter query key | yes |
| P5 | real / UI | Section uses warm dehydrated list without viewport gate when SSR seeded | yes |
| P6 | real / API | `getLoanDetail` client path `installments: []` + locked count / `nextPaymentMinor` (+ next-*); caption/stats need no full array | yes |
| P7 | real / contract | Filter map upcoming/paid/all; order `installmentNumber` ASC (+ `id`); matching keyset cursor; `paidWithoutTransaction`; limit+1 → `nextCursor` | yes |
| P8 | e2e | `/investments` ledger rows without waiting on deferred summary | yes |
| P9 | e2e | Loan detail table page-1 in schedule order + Next when `nextCursor` set (chip refetch; paidWithoutTransaction when set) | yes |

## Gaps

None blocking. Coverage matches Grill Q1–Q7 locks + Design Concept 4 / Test acceptance + Isolated API/DB closed Majors. Design-review already noted P1–P9 ↔ Test acceptance.

### Enhancement (fold into Task 2/4 Red tests during Build — not required for 04a dirty)

| Severity | Missing scenario | Suggested test |
|----------|------------------|----------------|
| Enhancement | Keyset cursor wire format (Isolated API) | Unit: encode/decode round-trip for `(installmentNumber, id)`; legacy UUID-only cursor → restart or reject |
| Enhancement | Ban sentinel `total: -1` on investment ledger skip-total | Unit (with P4): skip-COUNT path asserts `total === null` and `total !== -1` |
| Enhancement | Caption / payment card do not scan client installments | Unit/component (with P6): caption/stats + payment card read count / next-* fields when `installments` is `[]` |
| Nit | Dual GraphQL typeDefs stay in sync | Acceptance / smoke assert both `loans` + `money-finance` typeDefs expose new list/detail fields (Task 4) |

## Real scenarios checked

- **Happy path:** dual fixtures + measure harness; investment SSR omit summary + warm-cache hydrate; loan slim detail + schedule-stable paged list; structural e2e both surfaces.
- **User-visible:** P8/P9 Grill Q1 structural bar (no hard prod SLA).
- **Permission / workspace:** fixture dedicated synthetic workspace + fake `created_by_sub` (P1 / Task 1 acceptance); GraphQL workspace scope unchanged.

## Edge scenarios checked

- **Boundaries:** page-1 `limit+1` → hasMore/`nextCursor`; filter chip status map; keyset vs UUID-only (Enhancement for Build).
- **Measure gates:** Tasks 3/4/6 correctly gated — no orphan production cuts when ranks demote.
- **Out of v1:** holdings/ATF redesign, loan pay UX, `listLoans` rewrite, sibling workflow edits — correctly omitted from TDD.

## Fix ask

None required for Result **clean**. Optional Enhancement rows above may be added as named Red cases under Tasks 2/4 during Build without re-dirtying 04a.

## Round notes

- Planned tests present in `04-tasks.md` (P1–P9 + per-task TDD).
- No product code written this stage.
- Orchestrated Task: do **not** Prefer `gate-b` / `build` here — parent re-derives after **04a ok**.
