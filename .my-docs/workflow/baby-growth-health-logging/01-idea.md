# Idea: Baby Growth + health logging

## Problem

Parents need one clear place to log growth and health (meds, vitamins, vaccines, pump sessions, temperature, symptoms). Today the capture surface is still called **Measure**, wording is mixed (**Growth** already appears on Home / Insights), health kinds are thin (temperature + medication only), and Insights filter chrome (care types / growth kinds) gets in the way of a simple date-range review.

## User / audience

Parents (and caregivers) using the **Baby** workspace on phone or desktop — people who already log feed / sleep / diaper and want the same low-friction habit for growth and illness / meds.

## Outcome

- **Rename** the Measure capture path and labels to **Growth** (nav, titles, cues, redirects as needed).
- Parents can **log** medicines, vitamins, vaccines, breast-pumping sessions, temperature, and named symptoms (cough, vomiting, rash, breathing changes, unusual sleepiness) with add / edit / delete and recent list.
- **Assumed / Locked — vaccines write home:** Log vaccine **doses** on **Growth**. **Vaccines** nav stays schedule / read (and deep links into Growth to log a dose). One daily write home — no competing dose forms.
- **Assumed / Locked — breast pump:** New **Growth** pump log (not Feed-only). Happy path = **amount + time** (not start/end). Differs from Feed: Feed `pump` means “baby was fed expressed milk”; Growth pump means “I expressed milk” (volume + when) — no feed implied.
- **Assumed / Locked — symptoms:** Symptom multi-select works **with or without** a temperature value (no fake fever required).
- **Assumed / Locked — med/vitamin name:** Short **name required** (or pick last-used) before save.
- On **Insights**, the only filter control left is **date / time range** — remove care-type, growth-kind, and other non–date-time filter chrome.
- Existing weight / height / head growth logging stays; Activities and Home cues stay coherent with the new Growth name.

## Metric

A caregiver can complete **rename-visible Growth capture** and **log one med (or vitamin / vaccine) + one temperature-with-symptom + one pump session**, then open Insights and change **only** the date range — without seeing care/kind filter chrome.

## Has UI

**yes** — Growth capture rename + new log kinds; Insights filter trim; copy across Baby nav / Home / Activities cues.

## Lean / skip hints

- **Lean UI concept?** no — multi-surface (Growth capture + Insights chrome + nav/copy); Mode full needs a clear primary Growth surface plus Insights-after trim.
- **Copy/token-only?** no — new log types and Insights layout change, not rename-only.

## 80/20 UI (day-to-day)

### Main user goals

- Rename mental model: open **Growth**, not Measure.
- Quickly log health / growth events when they happen (meds, vitamins, vaccines, pump, fever / symptoms).
- Review Insights by **date range only** without fighting extra filters.

### Vital few (high-impact ~20%)

1. Measure → Growth rename (nav + page + shared cues).
2. Log medicines / vitamins / vaccines (with time + simple details).
3. Log temperature + symptoms checklist (symptoms allowed without temp).
4. Log breast-pumping sessions on Growth (amount + time).
5. Insights: date-time filter only.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Pick what to log from kinds **written on Growth only** (growth measures / med / vitamin / vaccine dose / pump / temperature+symptoms) and save with **now** as default time. Kind picker does **not** offer Feed pump or Vaccines-schedule as alternate write homes.
- **Important info / action #2 (always visible):** Recent entries list (scan + edit / delete).
- **Core action placement:** Growth page owns capture; strong kind picker + primary Save; fewer fields on the happy path; immediate saved feedback.
- **Secondary actions:** unit / notes / historical time edit; vaccine **schedule** depth on Vaccines page (read / plan); Insights chart toggles under “More”; anything not needed for a 10-second log → expand / modal / overflow.

### Top user journey to optimize

Open Baby → Growth → choose kind → enter value / check symptoms (temp optional) → Save → see row in recent list → (optional) Insights → set date range → Apply.

### Sensible defaults

- Recorded time = **now**.
- Common units preselected (e.g. °C for temperature; last-used med/vitamin name when we already store it).
- **Assumed / Locked:** Med / vitamin **name required** (type short name or pick last-used) — empty “medicine” rows blocked.
- Insights date range = current product default period (same as today); **no** care/kind chips applied (all types in range).
- Symptom checkboxes start **unchecked**; temperature field optional when logging symptoms.
- Pump happy path: amount + recorded time (duration / start-end is secondary or out of this pass).

### Biggest usability risks to fix first

- Split brain Measure vs Growth — rename must be complete in user-facing copy.
- Overloaded primary form (too many kinds and fields at once) — kind first, few fields.
- Pump vs Feed confusion — copy and kind labels must say Growth pump = expressing milk, not a baby feed.
- Vaccines schedule vs Growth dose — Vaccines stays read/schedule; dose write only on Growth (with link from Vaccines).
- Insights feels empty or “broken” after filter removal — clear date-only chrome and empty states that mention date range only.

## Non-goals

- New clinical decision support, dosing calculators, or doctor integrations.
- Redesigning Feed / Sleep / Diaper quick-care on Home (except cues that say Measure).
- Full vaccine schedule product rewrite (beyond dose logging on Growth + schedule stays on Vaccines).
- Activities page redesign (except label consistency with Growth).
- Charts for every new symptom type in Insights (date-range view of existing charts is enough this pass).
- Turning Feed `pump` method into the breast-pumping session log (Growth owns express logs).

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Growth is the single **write** home for meds, vitamins, vaccine **doses**, pump express, temperature, symptoms | **Locked yes** (Assumed) | Gate A re-open if parents insist Vaccines owns doses | Move dose write back to Vaccines; Growth links only |
| Vaccines page = schedule / read (+ deep link to Growth for a dose) | **Locked yes** (Assumed) | Usability after ship | Keep dual write (rejected for day-to-day) |
| Breast-pumping = **new Growth log**, happy path **amount + time**; distinct from Feed pump method | **Locked yes** (Assumed) | Check Feed payload / user pushback | Feed-only pump; drop Growth pump kind |
| Insights “date time filter only” = remove care-type + growth-kind chrome; keep period + Apply | Yes | Confirm at Gate A | Keep some chips under “More” |
| Symptoms attach to a health entry **with or without** temperature | **Locked yes** (Assumed) | Support tickets after ship | Force temp; add separate symptom-only kind later |
| Med / vitamin short name required (or last-used pick) | **Locked yes** (Assumed) | Abandoned-save metrics | Allow nameless rows (rejected for clinic use) |

## What we should not build

- AI symptom triage or “when to call the doctor” flows.
- Multi-baby picker changes beyond current workspace baby.
- Push / Telegram alerts for fever (notify exists elsewhere — out of this pass unless already wired).

## Success criteria

- [ ] Nav and Measure route/labels show **Growth** (EN + VI); old Measure wording gone from user-facing Baby UI for this path.
- [ ] User can add / edit / delete on Growth: medicine, vitamin, vaccine **dose**, breast-pumping (amount + time), temperature, and the listed symptoms (**with or without** temp).
- [ ] Med / vitamin save requires a short name or last-used pick.
- [ ] Vaccines page remains schedule / read for doses; dose write lives on Growth (link OK).
- [ ] Weight / height / head still work on Growth.
- [ ] Insights primary filter UI is **date/time range only** (no care-type / growth-kind filter bars).
- [ ] Empty / error copy no longer tells users to use care-type filters to find data.
- [ ] Light + dark usable; skeletons match new Growth / Insights chrome.

## Open questions

- After Insights filter trim: should “More insights” / growth charts behavior stay as today (gated by moreOpen)? — fine for Design if date-only chrome + empty copy stay locked.
- Exact redirect list for old Measure URLs — Analyze / Design (rename-visible success criteria cover the habit).
- Optional pump fields beyond amount + time (notes, side L/R) — Design progressive disclosure.
