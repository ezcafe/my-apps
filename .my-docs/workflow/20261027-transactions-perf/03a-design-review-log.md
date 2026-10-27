# Design review (overall)

**Result:** clean  
**Updated:** 2026-10-27  
**Mode:** full · **Review profile:** lite  
**Skills:** project AGENTS / ARCHITECTURE; planning-and-task-breakdown; documentation-and-adrs; security-and-hardening (cross-cut only — Isolated API/DB already paid)

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

Cross-cutting only — **no deep re-review** of GraphQL/Zod/`includeTotal` contract or fixture/index/SQL probe (Isolated Round 2 closed those Majors).

Surfaces checked for consistency:

- Grill Q1–Q5 ↔ Design Locked picks / Concepts 1–4 / Non-goals
- Design ↔ `04-tasks.md` order + acceptance + TDD gates
- Architecture Money SSR seed / RQ hydrate / workspace bootstrap (`docs/ARCHITECTURE.md`)
- Auth/PII: workspace scope, fixture isolation, no cookie/CORS change
- UI: pager when `total == null`, stats-strip skeleton (DESIGN_GUIDE / CLS)
- Docs: help catalog + optional ADR bar for nullable `total`

## Consistency

| Area | Status |
|------|--------|
| Grill Q1 success bar ↔ Design Test/acceptance + Task 1/5 | Pass — fixture ≥10k + structural/e2e; no hard prod SLA |
| Grill Q2 COUNT/pager ↔ Design Concept 2 + Task 2/3 | Pass — `includeTotal` default true; skip → `total: null` + `hasMore` pageSize+1; ban `-1` |
| Grill Q3 SSR summary ↔ Design Concept 3 + Task 4 | Pass — default defer `includeSummary`; measure may keep if cheap |
| Grill Q4 v1 scope ↔ Non-goals + Task 6 optional gate | Pass — list-read (+ conditional invalidate); forms/edit out |
| Grill Q5 fixture ↔ Concept 1 + Task 1 | Pass — dedicated synthetic workspace; seed/test write owner; idempotent cleanup |
| Decision 1 Option 1 measure-then-cut ↔ Task 1 before 3/6 | Pass — Task 3/6 gated on rank; Task 4 follows Grill default defer (not COUNT-gated) |
| Architecture Money list dialect | Pass — extend connection (`hasMore`, nullable `total`); no REST rewrite / dialect unify |
| SSR ↔ client first-load | Pass — Design locks filterQuery **and** `includeTotal` key/seed parity |
| Auth / cache tenant | Pass — workspace-scoped; no cross-workspace lookup reuse |
| Design ↔ Isolated Fix asks | Pass — Round 1 Majors closed; Round 2 Enhancements stay Build notes |

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | Build typed I/O | Design contract is locked; live `MoneyTransactionsListResponse.total` is still `number` and dehydrate omits `hasMore` today. | Mirror on client TS + `MONEY_TRANSACTIONS_QUERY` + dehydrate shape in Task 2 (already in Isolated API Enhancement). |
| Enhancement | fixture safety | Seed is test/dev-owned in Design; Build should keep the helper env-gated so it cannot run against real prod workspaces by accident. | Task 1 acceptance: dedicated workspace id + no real-user workspace reuse (already stated). |
| Enhancement | docs | Soften `total: Int!` → `Int` is intentional public GraphQL soften with default-on path. | Help catalog update when flag lands (Design); optional short ADR only if Gate B wants durable “why nullable” — not required for clean. |
| Enhancement | measure window | DB Isolated noted 366d cap on `resolveAnalyticsDateBounds`. | Prefer current-month first-load; if Build widens, keep shared window ≤366d (Build note). |
| Nit | sibling ledgers | Design notes bills/savings/spending same summary policy where strip exists; today only `/money` tab page sets `includeSummary: true` in repo grep. | Task 4 can stay `/money`-first; apply same caller change only where a summary strip exists. |
| Nit | hasMore default path | When `includeTotal: true`, Design allows `(page * pageSize) < total` **or** pageSize+1. | Unit-test the chosen formula (Isolated API Nit). |

**Critical:** none  
**Major:** none  

## Security / OWASP (relevant to this Design)

| ID | Status | Note |
|----|--------|------|
| A01 Access Control | pass | Existing workspace GraphQL auth; fixture = dedicated synthetic workspace |
| A02 Cryptographic Failures | N/A | No new secrets/PII stores |
| A03 Injection | pass | Design keeps parameterized list/`inArray`; bigint amounts; no `SUM::int` |
| A04 Insecure Design | pass | Measure-first; skip-total opt-in via flag default true |
| A05 Misconfiguration | N/A | No CORS/header change |
| A07 Auth Failures | pass | No cookie/session model change |
| A09 Logging | pass | Ban full row dumps in measure artifacts; fake `created_by_sub` |
| A06 / A08 / A10 | N/A | No new deps / webhooks / server URL fetch |

## Architecture / tasks checklist

| Item | Notes |
|------|-------|
| Boundaries clear | pass — list-read in; forms/edit/rollups out |
| Sequence / data flow | pass — mermaid matches Concepts 2–3 |
| Failure / hydrate | pass — existing seed try/catch; key parity called out as risk |
| Tasks verifiable | pass — each task has acceptance + red-first tests; optional tasks gated |
| Skeleton / CLS | pass — Design UI notes + Task 3/4 |
| Non-goals honored | pass |

## Fix ask for my-dev-flow-design

None — zero Critical/Major. Enhancements above are Build acceptance / Gate B notes only — **do not** reopen design-update.

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)

Zero Critical; zero open Major; Isolated paid → **clean**.
