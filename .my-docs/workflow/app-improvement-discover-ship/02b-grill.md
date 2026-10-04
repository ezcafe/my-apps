# Grill: app-improvement-discover-ship

**Result:** frontier-empty  
**Updated:** 2026-10-04  
**HITL Gate B:** blocking — human answered Round 1  
**Round:** 1 settled

## Grill digest

1. Tie-break → **spender (Money / Loans) first** (Decision 2 Option 2).
2. Baby API tokens **demoted** below daily UI / spender trust jobs (Decision 3 Option 2).
3. Ship size cap → **S/M only** (Decision 4 Option 1).
4. Gate C paperwork **excluded** from product backlog (Decision 5 Option 2).

## Settled frontier

| Q | Pick | Rationale (user) |
|---|------|------------------|
| Q1 Tie-break | Option 2 — Spender first | Prefer Money/Loans jobs on ties |
| Q2 Baby API tokens | Option 2 — Demote | Below daily UI / trust jobs |
| Q3 Max ship size | Option 1 — S/M only | One-PR promise |
| Q4 Gate C-only | Option 2 — Exclude | Not user-facing |

## Scenario stress-test (closed)

| Scenario | Outcome with settled rules |
|----------|----------------------------|
| Baby API vs client Idempotency on import | Idempotency ranks higher (spender + demote tokens) |
| Full pagination unify | Out of pick list until re-scoped to S/M |
| Close Gate C docs only | Excluded from backlog |

## Glossary / ADR

- **Glossary:** none.
- **ADR:** skipped — ship pick still pending; no hard-to-reverse architecture yet.

## Paths touched

- `02b-grill.md`
- `02-analysis.md` (Settled updated)
