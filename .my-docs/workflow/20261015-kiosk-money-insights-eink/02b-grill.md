# Grill: 20261015-kiosk-money-insights-eink

**Result:** frontier-empty
**Updated:** 2026-10-15
**HITL:** async-notify — settle now; veto in next message
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** A draft metric map; B = daily spend; ids `money.insights_stats_grid` / `money.insights_chart`; footer Money + Insights; Has API yes / Has DB no; Gate A defaults/fidelity.
- **Open frontier:** (empty)
- **Blocked:** none

## Frontier round 1

❓ **Q1** — **Metric map A**: lock draft (Exp/Inc · Net/Sav%/Bills · Loans/Budget/Spend MoM)?
➡️ Recommended: lock — user-first: Gate A draft; loaders cover eight (MoM = prior summary).
**Settled as:** draft lock (auto) — MoM “Spend vs last month”; format → Design.

❓ **Q2** — **Series B** (Decision 1): daily spend (1) vs weekly (2) vs net cumulative (3)?
➡️ Recommended: Opt 1 — user-first: spend-over-time; daily deltas from expense cumulative.
**Settled as:** Opt 1 daily spend (auto) — weekly only if phone noise later.

❓ **Q3** — **Registry ids**: `money.insights_stats_grid` + `money.insights_chart`?
➡️ Recommended: yes — user-first: two toggles; `money.*` pattern; default off.
**Settled as:** those ids (auto).

❓ **Q4** — **Footer**: “Money” / “Insights · this month”?
➡️ Recommended: yes — user-first: not YouTube/GA/trmnl.
**Settled as:** those strings (auto) — Design polish type only.

❓ **Q5** — **Has API / DB**: API yes / DB no?
➡️ Recommended: confirm — prefs enum grows; no migration.
**Settled as:** confirmed (auto).

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| A+B off; month_board on | Board unchanged |
| Empty month / null savings % | Zeros or “—”; not error |
| No workspace budget | Budget slot unavailable; other A slots show |

## Domain modeling

### Glossary updates
- Kiosk insights stats grid / chart → `GLOSSARY.md`

### ADR
- **Skipped:** map/series/footer/ids — easy reverse or Design; prefs already ADR-003.

## Auto-pick log

- Q1→A draft · Q2→D1 Opt1 daily spend · Q3→two ids · Q4→Money/Insights · Q5→API yes/DB no

## Grill digest (≤4 bullets)

1. Locked A map, B daily spend, ids, footer, API/DB.
2. Residual: MoM format + chart ticks → Design.
3. Glossary updated; ADR skipped.
4. Ready for Design? yes
