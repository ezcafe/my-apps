# Idea: Baby home polish — controls + pump fix + guideline

## Problem

On the baby home page:

1. Quick-care button labels/icons/Done text are not consistently centered (before and after click).
2. Breast L / R / Nap button heights do not match the stacked Bottle 100ml + 200ml column (plus borders).
3. After clicking a custom Bottle / Diaper / Pump control, Done always appears on the first button instead of the one that was clicked.
4. Custom pump log fails: GraphQL rejects `PUMP_AMOUNT` — not in `BabyQuickActionKind` enum (400).
5. Age guideline section is too visually loud and outdated; content should be one quiet merged block with new Vietnamese stage guidance.

## User / audience

Parents/caregivers logging feeds, diapers, pump, sleep from baby home.

## Outcome

- All home quick buttons: title/icon/text/Done centered horizontally and vertically in idle and Done states.
- Breast L, R, Nap height = Bottle 100ml height + Bottle 200ml height + top border + bottom border + border between them.
- Custom Bottle / Diaper / Pump: Done shows only on the triggered button.
- Custom pump amount logs successfully (`PUMP_AMOUNT` accepted by schema + handlers).
- One low-attraction guideline block replaces old tips; content = **I. room temp/sleep safety (VN)** + **II. five stages** (0–1m … 12–24m) with sleep, nutrition, WHO, y tế dự phòng (vitamin/vaccine/thuốc), diaper. Full text: `01-guideline-content.md`.

## Metric

- Pump custom amount mutation succeeds (no enum 400).
- Visual: Done on correct custom button; Breast/Nap height matches bottle stack; guideline is single quiet block with new copy.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes (existing surface polish)
- **Copy/token-only?** no (layout + bug + API + content)

## 80/20 UI (day-to-day)

### Main user goals

- Log breast / bottle / diaper / pump / nap quickly from home
- See quiet age-stage guidance when needed (not competing with log actions)

### Vital few (high-impact ~20%)

- Correct Done feedback on the button pressed
- Pump custom amount works
- Button targets easy to hit and visually aligned

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** quick care button grid
- **Important info / action #2 (always visible):** live timers / open session cues (existing)
- **Core action placement:** keep existing home layout; fix alignment/height/Done only
- **Secondary actions:** guideline — de-emphasize (muted typography, no loud cards); one merged block

### Top user journey to optimize

Open home → tap quick button (or custom amount) → see Done on that control → optional glance at quiet guideline

### Sensible defaults

Keep existing presets (100/200 ml, diaper kinds); only fix wrong Done target and missing enum.

## Non-goals

- Redesigning whole baby home IA
- Changing Money or other apps
- New guideline features (charts, personalization)
- Translating guideline to English in this pass (ship VN as provided)

## Assumptions to attack

- `PUMP_AMOUNT` is intended client kind; server enum/resolver simply missing it (not a wrong client string)
- Custom Done bug is client state keyed wrongly (first button), not server
- Height formula uses live Bottle 100 + 200 row heights + their shared borders as specified

## Success criteria

- [ ] Centering idle + Done for home quick buttons
- [ ] Breast L/R/Nap height matches bottle stack + borders
- [ ] Done on triggered custom Bottle/Diaper/Pump button
- [ ] Custom pump logs without GraphQL enum error
- [ ] One quiet guideline with Section I (nhiệt độ/phòng ngủ) + five-stage VN content (incl. vaccine/thuốc subsections)

## Open questions

None blocking — proceed Analyze → Design.
