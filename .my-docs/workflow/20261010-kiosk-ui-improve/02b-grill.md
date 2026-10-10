# Grill: 20261010-kiosk-ui-improve

**Result:** frontier-empty  
**Updated:** 2026-10-10  
**HITL:** blocking — Decision picks locked in `00-run.md` (no needs-round)  
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** D1–D5 (human); dual-attention boundary; one attention zone; Design unlocked; stop after Design.
- **Open frontier:** (empty)
- **Blocked:** none

## Frontier round 1

❓ **Q1 / D1 — Placement:** reorder payments above metrics vs callout + list below?  
➡️ Rec: Option 1. **Settled:** Option 1 (human) — one stack; update guide + skeleton.

❓ **Q2 / D2 — Scope:** loans-only vs loans + bills-due?  
➡️ Rec: Option 2 if both matter. **Settled:** Option 2 (human).  
**Follow-on (auto):** No bills-due list today; `bills.summary` = month ledger ≠ attention. Design may suggest dual-attention IA; no new finance domain; defaults stay loans-led.

❓ **Q3 / D3 — Insights:** compact kiosk vs dense below/opt-in?  
➡️ Rec: Option 1. **Settled:** Option 1 (human) — no `variant="kiosk"`.

❓ **Q4 / D4 — Money #1:** net vs bills/savings?  
➡️ Rec: Option 1. **Settled:** Option 1 (human) — net after attention when on.

❓ **Q5 / D5 — Pipeline:** Design-only stop vs Build?  
➡️ Rec: Option 1 if review/suggest. **Settled:** Option 1 (human) — no Build unless reopened.

❓ **Q6 — Dual layout:** one attention zone vs separate stacks?  
➡️ Rec: one zone. **Settled:** one zone (auto) — loans list primary; bills-due co-located when present.

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| Loan overdue + bills due same day | Both in attention above metrics; loans = action list; bills-due secondary in same zone |
| Loans clear; bills due; `bills.summary` on | Bills-due in attention when signal exists; ledger card stays in metrics |
| Overdue loans; no bills-due data | Loans-only attention; no phantom bills; net still money #1 below |

## Domain modeling

### Glossary updates
- **Kiosk attention** → needs-me-now signals (loan overdue/due-soon + bills-due when available) before calm totals. Paths: `GLOSSARY.md`

### ADR
- **Skipped:** UI reorder / opt-in insights / Design-only stop — easy to reverse; fails three-part bar.

## Auto-pick log

- `auto-pick — Q6 → one attention zone — user-first: single needs-me place`
- `auto-pick — bills.summary ≠ due — user-first: real due only; no due loader today`

## Grill digest (≤4 bullets)

1. Settled: payments above metrics; attention = loans + bills-due (not ledger); insights dense/opt-in; net #1; Design-only stop.
2. Residual risk: bills-due wanted but no kiosk due data — Design must not fake with `bills.summary`.
3. Glossary: `Kiosk attention`; ADR skipped.
4. Ready for Design? **yes**
