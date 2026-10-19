# Grill: 20261019-fix-remaining-e2e

**Result:** frontier-empty
**Updated:** 2026-10-19
**HITL:** auto — from **HITL Grill** in `00-run.md`
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** Option B geometry restore in product; recovery client fix; locale H1; Custom dismiss + scoped wet; Growth symptoms/save/Activities; investments isolate-then-harden; tip/ml align to product+mock; Has API/DB/auth no.
- **Open frontier:** (empty)
- **Blocked:** (none)

## Frontier round 1

❓ **Q1** — **Home layout contract**: Restore Nap|Diaper shared row (product) or rewrite geometry e2e for stacked rows?

➡️ Recommended: Restore shared row2 in product — user-first: Option B e2e is the locked care composition; idea forbids broad redesign away from tests.

**Settled as:** product restore Nap|Diaper same band + Kind height + Pump below — auto-pick — rationale: ★ Option B in idea; Δy≈179 proves stacked drift.

---

❓ **Q2** — **Investments goto**: Flake after long suite vs product route bug?

➡️ Recommended: Isolate investments first; harden goto only if alone-green — user-first: ERR_ABORTED/timeout after ~22m baby run smells server stress.

**Settled as:** Task 0 isolate → then retry/ready gate — auto-pick — rationale: earlier investments cases can pass; settings/new last.

---

❓ **Q3** — **Growth save/symptoms**: Product missing UI / over-strict saveDisabled vs bad e2e steps?

➡️ Recommended: Product first when cough/ho missing and Save stays disabled after valid fill — user-first: capture must work without e2e-only workarounds.

**Settled as:** fix symptoms visibility + save enablement + Activities list after write — auto-pick.

---

❓ **Q4** — **Bottle footer 120 vs 140**: Change tip/mock or update assert?

➡️ Recommended: Align footer tip + chips to one source (recentBottleMl / presets); update e2e only if product intentionally shows 140 — user-first: one consistent bottle story.

**Settled as:** make chips+footer+mock coherent; keep ≥56px care targets — auto-pick.

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| Ambiguous quick-care error | Under-owner recovery visible; Try again |
| Custom Use clicked | Dialog closes; occurredAt on request |
| Dual wet nodes | Scope click to active section/dialog |
| Investments alone green | Suite flake hardening only |
| Investments alone red | Product route/workspace fix |

## Domain modeling

### Glossary updates
- none this round
- Paths touched: none

### ADR
- **Skipped:** fix-only; easy to reverse; no durable cross-team contract change beyond existing Option B e2e

## Auto-pick log

- `auto-pick — Q1 → product restore Nap\|Diaper row — user-first: locked Option B; system: e2e geometry`
- `auto-pick — Q2 → isolate then harden — user-first: avoid false product bugs; system: late-suite abort`
- `auto-pick — Q3 → product Growth/Activities — user-first: capture UX; system: disabled Save / missing row`
- `auto-pick — Q4 → coherent bottle tip/chips — user-first: one number story; system: 120 vs 140 assert`

## Grill digest (≤4 bullets)

1. Settled product Option B restore + recovery/locale/Custom/Growth; investments isolate-first.
2. Residual risk: hydration noise may still flake locale — watch during Verify.
3. Glossary / ADR: none.
4. Ready for Design? yes
