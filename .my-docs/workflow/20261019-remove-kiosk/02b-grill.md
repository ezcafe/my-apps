# Grill: 20261019-remove-kiosk

**Result:** frontier-empty
**Updated:** 2026-10-19
**HITL:** async-notify — from **HITL Grill** in `00-run.md`
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** Full teardown + weather drop (Gate A); `/kiosk` + `/kiosk/:path*` → `/money` permanent; ADRs 003–005 Superseded; keep Popover/MoreMenu; delete kiosk/weather packages; layout loss OK.
- **Open frontier:** (empty)
- **Blocked:** (none)

## Frontier round 1

❓ **Q1** — **Redirect target**: `/money` (Money home / registry) vs `/money/new` (root form)?
➡️ Recommended: `/money` — user-first: Money home, not Add transaction.
**Settled as:** `/money` (auto-pick) — Gate A + registry `href: "/money"`.

❓ **Q2** — **Redirect permanence**: permanent vs temporary for `/kiosk` (+ `:path*`)?
➡️ Recommended: permanent — user-first: feature will not return.
**Settled as:** permanent (auto-pick) — match retired URL moves in `next.config.ts`.

❓ **Q3** — **ADR retire**: Supersede 003–005 vs leave Accepted + footnote?
➡️ Recommended: Superseded + new ADR — user-first: storage choices are dead.
**Settled as:** Superseded via ADR-006 (auto-pick).

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| Bookmark `/kiosk/weather` | Permanent redirect → `/money` (weather dropped) |
| Stale PATCH `kioskLayout` / `weatherCity` | Zod `.strict()` → 400 |
| Code before migration | Ship migration + schema drop with API/UI cut |

## Domain modeling

### Glossary updates
- Removed kiosk / weather-day / baby-inject / money-active-day terms → `GLOSSARY.md`

### ADR
- **Wrote:** `docs/decisions/ADR-006-kiosk-removed-redirect-money.md`; 003–005 → Superseded
- **Skipped:** weather drop alone — Gate A + consumer check (obvious)

## Auto-pick log

- `auto-pick — Q1 → /money — user-first: Money home; system: Gate A + registry`
- `auto-pick — Q2 → permanent — user-first: gone for good; system: next.config pattern`
- `auto-pick — Q3 → Superseded + ADR-006 — user-first: clear dead storage story`

## Grill digest (≤4 bullets)

1. Settled: permanent `/kiosk` (+ children) → `/money`; ADRs 003–005 superseded.
2. Residual risk: leftover Settings imports after delete — Design task order.
3. Glossary purged kiosk terms; ADR-006 written.
4. Ready for Design? yes
