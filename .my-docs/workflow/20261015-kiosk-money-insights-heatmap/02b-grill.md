# Grill: 20261015-kiosk-money-insights-heatmap

**Result:** frontier-empty
**Updated:** 2026-10-15
**HITL:** async-notify — settle now; veto in next message
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** Gate A / defaults A; new slug; leave A/B alone; monochrome; + Decisions 1–6 below.
- **Open frontier:** (empty)
- **Blocked:** none

## Frontier round 1

❓ **Q1** — **Primary signal**: activity/tx **count** vs **spend** amount (one signal for hero + cells + peak/avg)?
➡️ Recommended: Opt 1 count — user-first: contribution metaphor = activity, not money weight.
**Settled as:** activity/tx count (auto) — hero = money-active days in window; cells/peak/avg = daily tx count → 4 dither levels.

❓ **Q2** — **Streak definition**: any money day vs expense-only vs threshold?
➡️ Recommended: any money-active day — user-first: touched-money habit; no threshold friction.
**Settled as:** any day with ≥1 money tx (income or expense) (auto).

❓ **Q3** — **Year window**: rolling last ~365 days vs calendar YTD?
➡️ Recommended: rolling ~365 — user-first: full grid year-round (YTD empty in Jan); matches ref.
**Settled as:** rolling last ~365 calendar days (auto).

❓ **Q4** — **Footer right**: workspace / user / fixed “Insights · last year”?
➡️ Recommended: fixed — user-first: matches A/B “Insights · …”; no PII on e-ink.
**Settled as:** left “Money”; right “Insights · last year” (auto).

❓ **Q5** — **Empty year**: all-white + zeros vs short empty line?
➡️ Recommended: white + zeros — user-first: empty-by-design, not “broken” cell.
**Settled as:** full grid (empty dither) + zero KPIs; no empty-copy line (auto).

❓ **Q6** — **Registry id**: lock `money.insights_heatmap`?
➡️ Recommended: yes — user-first: `money.insights_*` family; clear vs A/B ids.
**Settled as:** `money.insights_heatmap` (auto) — defaultEnabled true.

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| No txs in window | Hero 0; streaks 0; all empty dither; still show grid + footer |
| Income-only days | Count as money-active (streaks + cells); not expense-only |
| Heatmap off; month_board on | Board keeps month glance; loader skips year work |

## Domain modeling

### Glossary updates
- Kiosk insights heatmap; Money-active day → `GLOSSARY.md`

### ADR
- **Skipped:** signal/window/footer/id/empty — easy to reverse or Design polish; prefs already ADR-003.

## Auto-pick log

- `auto-pick — Decision 1 Option 1 — user-first: contribution = activity habit at a glance; system: one count signal for hero/cells/peak/avg (not spend)`
- `auto-pick — Decision 2 Option 1 — user-first: any touched-money day keeps streaks honest; system: ≥1 tx/day (income or expense); no threshold`
- `auto-pick — Decision 3 Option 1 — user-first: full year grid every month; system: rolling ~365 calendar days (not YTD)`
- `auto-pick — Decision 4 Option 3 — user-first: stable e-ink chrome like A/B Insights footer; system: “Money” + “Insights · last year”`
- `auto-pick — Decision 5 Option 1 — user-first: empty looks intentional, not broken; system: white/empty dither + zeros; no empty-line`
- `auto-pick — Decision 6 Option 1 — user-first: clear toggle name beside month_board; system: id money.insights_heatmap default on`

## Grill digest (≤4 bullets)

1. Locked count signal, any-tx streaks, rolling ~365, footer, empty=zeros, id `money.insights_heatmap`.
2. Residual: exact 4-level bucket cutoffs + hero number format → Design.
3. Glossary updated; ADR skipped.
4. Ready for Design? yes
