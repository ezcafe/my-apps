# Idea: Baby care layout — custom time, Diaper row, timer copy

## Problem

Baby home and baby/log care controls are inconsistent: Nap lacks Pump-style custom time; Pump Left/Right widths do not match Breast; Diaper sits in the wrong place without a custom action; timer “Tap to stop” and Done status layout/copy are awkward.

## User / audience

Parents logging nap, breast, pump, and diaper on baby home and baby/log pages — often one-handed, tired.

## Outcome

- Custom time modal can change an already-set custom time.
- Nap section includes custom time the same way Pump does.
- Pump Left/Right match Breast Left/Right widths.
- Diaper sits on its own row above Pump, with a custom button.
- Same layout/behavior on baby/log routes.
- Active timer label merges title + stop hint (e.g. `End nap - Tap to stop`).
- Done status is horizontally centered in the button.

## Metric

On baby home and baby/log, Nap/Pump/Diaper/Breast controls match the rules above; one-handed logging still works without hunting secondary actions.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes (simple mode — Gate A2 skipped)
- **Copy/token-only?** no (layout + copy)

## 80/20 UI (day-to-day)

### Main user goals

- Start/stop nap and pump timers quickly
- Log diaper and breast sides with consistent control sizes
- Set or change a custom time when needed

### Vital few (high-impact ~20%)

- Timer start/stop + clear merged stop label
- Side buttons (Breast / Pump) equal width
- Diaper + custom on its own row; Nap custom time parity with Pump

### Important info/action #1 and #2

- **#1** Primary care action buttons (start/stop, L/R, diaper kind) always visible
- **#2** Custom time entry reachable from the same section row (not buried)

### Top journey

Open home or log → tap care control → optional custom time → done feedback centered

### Sensible defaults

Reuse existing Pump custom-time and Breast width patterns; do not invent a new control family.

### Biggest usability risks

- Custom button clutter on Diaper row
- Merged stop label too long on narrow screens
- Width parity breaks on small containers

## Non-goals

- New care types or GraphQL fields (unless Analyze finds custom-time already needs a tiny contract tweak)
- Redesigning guidelines, header/footer, or insights
- New design tokens or shell chrome

## Assumptions to attack

- Custom time modal already exists for Pump and can be reused for Nap/Diaper
- baby/log shares the same care control components (or thin wrappers) as home
- “Done” means the post-stop success state on timed care chips/buttons

## Success criteria

- [ ] Custom modal edits existing custom time
- [ ] Nap has Pump-parity custom time control
- [ ] Pump L/R width equals Breast L/R
- [ ] Diaper on row above Pump with custom button
- [ ] baby/log * matches
- [ ] Stop label = `{End …} - Tap to stop`
- [ ] Done status centered horizontally in the button

## Open questions

- Does Diaper “custom” mean the same custom-time modal as Pump/Nap, or a different custom value (e.g. note)? Assume custom **time** unless Analyze finds otherwise.
