# Design review log: chart-interaction-parity

**Result:** clean  
**Round:** 1  
**Updated:** 2026-09-27  
**Mode:** full · Has API yes · Has DB no

## General design review

**Verdict:** clean — aligned with Gate A / A2 HTML; Option 1 coherent; tasks cover hover/toggle/drill + thin Loans API.

| Severity | Finding | Status |
|----------|---------|--------|
| — | None Critical/Major | — |

### Alignment checks

| Check | Pass? |
|-------|-------|
| Gate A 80/20 (hover / toggle / modal) | yes |
| A2 HTML lock preserved | yes |
| Skim: reuse ChartShell / no one-off tooltips | yes |
| Pattern-finder drill deferred (documented) | yes |
| Has API/DB flags match contracts | yes |

### Round notes

- main-thread fallback — design-review — usage limit
- Did not re-litigate Gate A 80/20

---

## API contract review (Has API = yes)

**Result:** clean  
**Skill:** api-and-interface-design (isolated section; main-thread fallback)

### Contract under review

`loansInstallments(query: LoansInstallmentsQueryInput!): LoansInstallmentsConnection!`

### Checks

| Check | Pass? | Note |
|-------|-------|------|
| Additive / non-breaking | yes | New query |
| Typed I/O + Zod at edge | yes | Task 2 requires validator tests |
| Pagination cursor | yes | nextCursor |
| Auth / workspace scope | yes | Same as other loans queries |
| Error shape | yes | Empty ≠ error; auth errors existing |
| Naming | yes | Matches investments activities style |
| Idempotent read | yes | |

### Findings

| Severity | Finding | Status |
|----------|---------|--------|
| Enhancement | Lock dueDate vs paidAt filter in Build comments | deferred — Design locks dueDate |
| — | No Critical/Major | — |

### Round notes

- main-thread fallback — API contract review — usage limit
- Investments/Baby reuse existing contracts — no new fields required this pass

---

## DB design review

**Skipped** — Has DB = no
