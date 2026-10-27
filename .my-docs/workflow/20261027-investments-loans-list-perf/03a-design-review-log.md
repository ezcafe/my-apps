# Design review (overall)

**Result:** clean  
**Updated:** 2026-10-27  
**Mode:** full · **Review profile:** lite  
**Skills:** project AGENTS / ARCHITECTURE / DESIGN_GUIDE; planning-and-task-breakdown; documentation-and-adrs; security-and-hardening (cross-cut only — Isolated API/DB already paid)

## FIRST (gates)

| Check | Status |
|-------|--------|
| Design present (`03-design.md` Result done) | ok |
| Grill closed (`02b-grill.md` frontier-empty) | ok |
| Notes `design-stale` | absent |
| design-update unpaid | no (Run-log paid settle-gen:0; Design post Fix asks) |
| Isolated API (`03a-api-contract-review.md`) | clean (required paid) |
| Isolated DB (`03a-db-design-review.md`) | clean (required paid) |

## Scope reviewed (general)

Cross-cutting only — **no deep re-review** of GraphQL/Zod order·cursor·additives or fixture/index/SQL inventory (Isolated Round 2 closed those Majors).

Surfaces checked for consistency:

- Grill Q1–Q7 ↔ Design Locked picks / Concepts 1–4 / Non-goals / Test acceptance
- Design ↔ `04-tasks.md` order + acceptance + TDD (P1–P9) + measure gates
- Architecture Money SSR seed / RQ hydrate / investments+loans Money workspace cookie (`docs/ARCHITECTURE.md`)
- Auth/PII: workspace scope, fixture isolation, fake `created_by_sub`, no cookie/CORS change
- UI: warm-cache section hydrate; loan pager chrome + skeleton parity (DESIGN_GUIDE / CLS)
- Docs: help catalog when slim path lands; sibling workflow reference-only

## Consistency

| Area | Status |
|------|--------|
| Grill Q1 success bar ↔ Design Test/acceptance + Task 1/5 | Pass — dual fixtures + structural/e2e; no hard prod SLA |
| Grill Q2 SSR summary ↔ Design Concept 2 + Task 3 | Pass — default omit `includeSummary: true` on `/investments`; measure may keep if cheap |
| Grill Q3 warm cache ↔ Design Concept 2 §4 + Task 3/P5 | Pass — `deferFetchUntilVisible={false}` (or equivalent) when SSR seeded |
| Grill Q4 slim detail ↔ Concept 3 + Task 4 | Pass — table via list; client `installments: []`; server-only schedule for summary/chart/aggregates; C-items measure-gated |
| Grill Q5 filter map ↔ Concept 3 §6 + Task 2/4/P7 | Pass — upcoming/paid/all map; caption from detail counts |
| Grill Q6 v1 scope ↔ Non-goals + Task 6 optional | Pass — list-read both surfaces; holdings/ATF, pay UX, `listLoans` rewrite out |
| Grill Q7 fixture ↔ Concept 1 + Task 1/P1 | Pass — synthetic investment + list-visible long loan; seed/test write owner; idempotent cleanup |
| Decision 1 Option 1 measure-then-cut ↔ Task 1 before 3\|4 | Pass — Tasks 3/4 gated on rank; Task 6 C-only if leftover |
| Architecture Money list / loans GraphQL | Pass — reuse sibling money contracts on investment ledger; extend existing `loansInstallments` / `LoanDetail` (no new REST; dialect unify out) |
| SSR ↔ client first-load (investments) | Pass — Design locks `includeTotal` + filter key parity for `MONEY_LEDGER_INVESTMENT` |
| Loan list order shared behavior | Pass — intentional schedule-stable order/cursor for all `loansInstallments` consumers (documented) |
| Auth / cache tenant | Pass — workspace-scoped; no cross-workspace reuse |
| Design ↔ Isolated Fix asks | Pass — Round 1 Majors closed; Round 2 Enhancements stay Build notes |
| Design ↔ `04-tasks.md` | Pass — P1–P9 cover Test acceptance; dual-surface order 1→2→3\|4→5→6 |

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | section warm-cache wiring | Live `MoneyTransactionsPage` hard-codes `deferFetchUntilVisible={isSection}` (always true for section). Design locks “false when seeded” but does not name the seed signal. | Task 3: pass false when overview knows SSR dehydrated `MONEY_LEDGER_INVESTMENT`, or equivalent “use cache immediately” (unit P5). |
| Enhancement | cursor wire format | Contract locks keyset semantics; encode/decode string form left to Build (Isolated API). | Opaque stable encode + unit round-trip; reject or restart on legacy UUID-only cursors. |
| Enhancement | dual GraphQL SoT | `LoansInstallmentListItem` / `LoanDetail` live in both loans + money-finance typeDefs (Isolated API). | Keep both in sync when adding fields (Task 4 acceptance). |
| Enhancement | docs / help | Help may still say detail embeds full schedule. | Update `lib/api-help-content.ts` when slim path lands (Design + Task 2/4). |
| Enhancement | fixture safety | Seed is test/dev-owned; dedicated synthetic workspace locked. | Keep helper env-gated; never reuse real-user workspace (Task 1). |
| Nit | filter map + overdue | Overdue stays detail aggregate, not list `status`. | Unit-test map (P7); caption uses locked count fields. |
| Nit | sibling drift | Investments must not reintroduce `total: -1` / key mismatch from money list bugs. | Task 2 parity helpers + ban `-1` in acceptance. |

**Critical:** none  
**Major:** none  

## Security / OWASP (relevant to this Design)

| ID | Status | Note |
|----|--------|------|
| A01 Access Control | pass | Existing workspace GraphQL auth; fixture = dedicated synthetic workspace |
| A02 Cryptographic Failures | N/A | No new secrets/PII stores |
| A03 Injection | pass | Design keeps parameterized list/`inArray`; bigint amounts; no `SUM::int` |
| A04 Insecure Design | pass | Measure-first; shared list order change documented; slim path additive |
| A05 Misconfiguration | N/A | No CORS/header change |
| A07 Auth Failures | pass | No cookie/session model change (Money workspace cookie unchanged) |
| A09 Logging | pass | Ban full row dumps in measure artifacts; fake `created_by_sub` |
| A06 / A08 / A10 | N/A | No new deps / webhooks / server URL fetch |

## Architecture / tasks checklist

| Item | Notes |
|------|-------|
| Boundaries clear | pass — dual list-read in; holdings/ATF redesign, pay UX, `listLoans` rewrite, sibling workflow edits out |
| Sequence / data flow | pass — both mermaid diagrams match Concepts 2–3 |
| Failure / hydrate | pass — existing seed try/catch; key parity + viewport policy called out as risks |
| Tasks verifiable | pass — each task has acceptance + red-first tests; 3/4/6 measure-gated |
| Skeleton / CLS | pass — Design UI notes + Task 3/4 pager/summary chrome |
| Non-goals honored | pass |

## Fix ask for my-dev-flow-design

None — zero Critical/Major. Enhancements above are Build acceptance / Gate B notes only — **do not** reopen design-update.

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)

Zero Critical; zero open Major; Isolated paid → **clean**.
