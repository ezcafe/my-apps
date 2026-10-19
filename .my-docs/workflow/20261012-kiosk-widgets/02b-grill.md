# Grill: 20261012-kiosk-widgets

**Result:** frontier-empty
**Updated:** 2026-10-13
**HITL:** async-notify — settle now; veto in next message
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** prefs layout sync; workspace budget chart; grid-1 default; focus pick if fullscreen+2+; `kioskLayout` shape; invalid focus → first enabled; CSS = Design Options.
- **Open frontier:** (empty)
- **Blocked:** none

## Frontier round 1

❓ **Q1** — **Layout store**: prefs (Opt 1) vs local (Opt 2)?
➡️ Recommended: Opt 1 — user-first: same durability as widgets.
**Settled as:** Opt 1 (auto) — code: only `kiosk_widgets` today.

❓ **Q2** — **Budget chart**: workspace month (Opt 1) vs Insights multi-row (Opt 2)?
➡️ Recommended: Opt 1 — user-first: one current vs total; empty if none.
**Settled as:** Opt 1 (auto) — code: unique workspace budget; reject `budgetRowsForChart` for v1.

❓ **Q3** — **Default layout**: grid-1 vs denser?
➡️ Recommended: grid-1 — user-first: keep today’s stack.
**Settled as:** grid-1 (auto).

## Frontier round 2

❓ **Q4** — **Focus picker**: always vs fullscreen+2+ only?
➡️ Recommended: fullscreen+2+ — user-first: anti-builder.
**Settled as:** conditional (auto).

❓ **Q5** — **Prefs shape**: nested `kioskLayout` vs flat?
➡️ Recommended: `{ mode, columns, focusWidgetId }` — null focus → first enabled.
**Settled as:** nested `kioskLayout` (auto).

❓ **Q6** — **Board CSS**: lock now?
➡️ Recommended: Design Opt 1/2 — not a product fork.
**Settled as:** Design Options (auto).

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| Focus id disabled/unknown | Fall back to first enabled (registry order) |
| No workspace budget | Chart empty; six metrics still load if data ok |
| columns=4 on phone | Effective = min(pref, viewport cap 1–2) |

## Domain modeling

### Glossary updates
- Kiosk layout mode / focus widget / month money board → `GLOSSARY.md`

### ADR
- **Wrote:** `docs/decisions/ADR-003-kiosk-layout-in-user-preferences.md`
- **Skipped:** budget, grid-1, focus UI, CSS — easy reverse or Design Options

## Auto-pick log

- Q1→prefs · Q2→workspace budget · Q3→grid-1 · Q4→fullscreen+2+ · Q5→`kioskLayout` · Q6→Design Options

## Grill digest (≤4 bullets)

1. Prefs sync + workspace budget + grid-1 + conditional focus + `kioskLayout` locked.
2. Residual: empty chart without workspace budget; stale focus needs fallback.
3. Glossary + ADR-003; CSS left to Design Options.
4. Ready for Design? yes
