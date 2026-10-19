# Grill: 20261018-kiosk-baby-care-insights

**Result:** frontier-empty
**Updated:** 2026-10-18
**HITL:** async-notify — settle now; veto in next message
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** Gate A + Q1–Q5; ids `baby.funny_time` / `baby.next_care` / `baby.nursery`.
- **Open frontier:** (empty)
- **Blocked:** none

## Frontier round 1

❓ **Q1** — **Next-care SoT**: feed-due vs nap vs placeholder vs hide?
➡️ Recommended: soonest feed|sleep via `lib/baby-next-due.ts` — user-first: real Home due math.
**Settled as:** soonest feed|sleep (auto) — title Next feed/nap; time from `dueAt`; all hidden → quiet empty + chrome; no booking.

❓ **Q2** — **Nursery schedule + bed time**: hide vs sleep-derived vs guideline clocks?
➡️ Recommended: hide when no SoT — user-first: honest empty vs fake clocks.
**Settled as:** hide schedule pill + bed time (auto) — ID = name|age; hero + activity ship.

❓ **Q3** — **Footer labels**: exact refs vs remap all to Baby Care?
➡️ Recommended: refs 1+3 exact; ref 2 drop booking — user-first: fidelity where Gate A allows.
**Settled as:** Parent|Funny Time; Huckleberry|Nursery; Next-care Baby Care|Updated: {local} (auto).

❓ **Q4** — **Inject persist**: resolve-merge only vs write-back once?
➡️ Recommended: write-back once + done flag — user-first: day-one board; offs stick.
**Settled as:** non-empty missing baby + `kioskLayout.babyDefaultsInjected !== true` → merge three, set flag, persist; null→defaults; `[]`→empty; money no-inject stays (auto).

❓ **Q5** — **Activity fidelity**: omit Solids vs notes-only?
➡️ Recommended: omit Solids — user-first: no fake rows.
**Settled as:** formula→Bottle, breast→Nursing, diaper→Diaper+detail; optional sleep fill; under 4 → quiet slots (auto).

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| Prefs `[]` | Empty board; no inject |
| No baby workspace | Soft-empty cells; no crash |
| Inject then offs all three | Flag true → no re-inject |

## Domain modeling

### Glossary updates
- Kiosk Funny Time / next care / nursery dashboard; Baby kiosk default inject → `GLOSSARY.md`

### ADR
- **Wrote:** `docs/decisions/ADR-004-baby-kiosk-default-inject.md`
- **Skipped:** SoT/footers/activity/hide schedule — easy reverse or Design polish.

## Auto-pick log

- Q1→feed|sleep due · Q2→hide schedule · Q3→ref footers + Baby Care/Updated · Q4→write-back+flag · Q5→omit Solids

## Grill digest (≤4 bullets)

1. Locked next-care SoT, hide schedule, footers, write-back inject+flag, activity map, three `baby.*` ids.
2. Residual: due time-range format + Updated locale → Design.
3. Glossary + ADR-004; money no-inject tests stay.
4. Ready for Design? yes
