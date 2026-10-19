# Grill: 20261019-fix-loans-money-e2e

**Result:** frontier-empty
**Updated:** 2026-10-19
**HITL:** auto — from **HITL Grill** in `00-run.md`
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** Loans cold nav → `gotoAppPath`; write failures → product-first then toast a11y; toast remains success signal
- **Open frontier:** empty
- **Blocked:** none

## Frontier round 1

❓ **Q1** — **Write-path success signal**: Keep asserting toast (`Payment recorded in Money` / `Transaction added`), or switch to ledger unique-note visibility?

➡️ Recommended: Option toast — user-first: matches existing Depth C contract and product notify copy

**Settled as:** toast — auto-pick — rationale: product already emits those strings; ledger assert weakens feedback coverage

---

❓ **Q2** — **Pay / Money write failures**: Prefer product fix (mutation hang / toast role) vs e2e-only longer waits / skip?

➡️ Recommended: product-first — user-first: cascade proves real server stress; waits alone hide crash

**Settled as:** product-first after Loans nav green — auto-pick — rationale: CONNECTION_RESET after add-tx is not flake-only

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| `/loans` paints but `load` never fires | Treat as e2e wait issue → `gotoAppPath`; not a missing heading bug |
| Add-tx / Pay hangs until webServer dies | Product fix required; later route REFUSED = cascade, not separate bugs |
| Toast text drifts | Update product notify + e2e together; do not soft-pass without success signal |

## Domain modeling

### Glossary updates
- none this round
- Paths touched: none

### ADR
- **Skipped:** e2e helper reuse + toast assert — easy to reverse, not surprising, fails three-part bar

## Auto-pick log

- `auto-pick — Q1 → toast success signal — user-first: keep Depth C notify contract; system: specs already soft-assert status`
- `auto-pick — Q2 → product-first for writes — user-first: stop server die; system: nav harden first so writes are diagnosable`

## Grill digest (≤4 bullets)

1. Toast stays the success signal; Loans uses `gotoAppPath`; writes get product-first fix
2. Residual risk: seed missing payable installment / accounts (hard-fail messages already in specs)
3. Glossary / ADR: none
4. Ready for Design? yes
