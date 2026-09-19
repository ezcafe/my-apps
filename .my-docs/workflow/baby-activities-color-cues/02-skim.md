# Light repo skim: baby-activities-color-cues

**Result:** done
**Updated:** 2026-09-19
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js Baby Care shell: Home quick-care chips (`baby-home.tsx`) plus Activities Spending-style ledger (`baby-activities-page.tsx`). Shared care-timer storage holds **one** active breast/pump side; nap is separate session state. Age guides already exist for feed ml bands; sleep bands are blend copy only (no duration min/max yet).

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/baby-activities-page.tsx` | Filter + list/table activity rows | yes — add accent chrome |
| `components/baby-home.tsx` | Care chips, timers, `message` banner | yes — quiet save + timer isolation |
| `components/baby-timed-care-chip.tsx` | Timed chip + done-flash | yes — Nap height / selective update |
| `components/baby-care-guidelines.tsx` | Age guide accordion | reuse copy/bands, not medical UI |
| `ui-ref-source-history-borders.png` | History color bar / chip border ref | yes — visual language |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/baby-age-guide.ts` | `mlMin`/`mlMax` per age; sleep has labels only |
| `lib/baby-breast-timer-store.ts` | Single `BabyCareTimer` side in localStorage |
| `lib/baby-quick-care-plan.ts` | `home.stepSave*` message keys |
| Timeline / activity log libs | Row type + summary for Activities |

## Hard constraints (do not fight)

1. DESIGN_GUIDE tokens — no hard-coded hex sprawl; skeleton parity on Activities rows.
2. One care-timer record today — Pump vs breast concurrency needs store/model change (or dual keys), not a UI-only patch.
3. Keep chip done-flash; remove `setMessage` success path for care saves (errors still OK).
4. Do not claim medical diagnosis in border copy.

## Risks if we ignore the repo

- Treating timer exclusivity as a chip-only bug will leave Pump still replacing breast in storage.
- Inventing new ml ranges while `baby-age-guide` already has bands → drift.
- Sleep comparison needs new duration windows (not in guide today).

## Enough for UI concept / Analyze?

yes — no blocking question.
