# Idea: Baby home section headers + bottle chips + cleaner status

## Problem

Baby care home already has quick-care button groups (breast L/R, diaper Kind, Start nap, bottle). Three things still hurt at a glance:

1. **No clear section header per group.** Caregivers must infer what each cluster is for, and age-based guidance (sleep total / nap pattern; bottle ml + day’s feed progress) is either missing or buried in noisy status lines.
2. **Bottle control does not match Kind tiles.** Wet / Poop / Mixed / Dry read as a clear chip grid. Bottle still feels like a different control (face / ± / Custom). Desired: same chip style, showing the **last 3 recently used ml** amounts, plus a **Custom** chip that opens the Custom amount modal.
3. **Status lines mix “what happened” with “how far today.”** Examples today:
   - `Feed (Breast L) · 1 hr ago · 7/8 today`
   - `90 ml · Feed (Formula 90 ml) · Just now · 8/8 today`  
   Desired: drop progress (and the leading `90 ml ·` when the summary already has ml):
   - `Feed (Breast L) · 1 hr ago`
   - `Feed (Formula 90 ml) · Just now`  
   Move **recommended feed ml + progress (e.g. 7/8)** into the **bottle section header**; move **recommended sleep for current age** into the **nap section header**.

This pass builds on unmerged home work (`baby-home-redesign`, `baby-home-logging-detail`, `baby-home-controls-polish`). Those Gate 3 pauses are **context**, not blockers.

## User / audience

**Primary:** a tired caregiver logging one-handed at night (EN or VI) — **headers must be easy to understand at 3AM**.

**Secondary:** another caregiver in the same family workspace who reads last-care status and age guidance at a glance.

## Outcome

What “done” looks like:

- **Section headers** sit above each quick-care group (3AM-readable: short, plain words):
  - **Breast:** header above Left / Right — **label + short tip** (e.g. next-due style).
  - **Diaper:** header above Wet / Poop / Mixed / Dry — **label + short tip**.
  - **Nap:** header above Start nap — **one-line blend** of sleep guide (total + naps + typical nap length) for current age.
  - **Bottle:** header above the bottle chips — **recommended feed ml + current progress** (e.g. `7/8`) for current age; empty day still shows `0/N` when a guide max exists.
- **Bottle chips** match Kind-tile style: **last 3 recently used ml** from this baby’s bottle/formula history (fill gaps from age-band snaps if &lt;3) + **Custom** as the last chip → opens Custom amount modal. **Replaces** controls-polish bottle face + ± row.
- **Feed status lines** always `Feed (…) · {when}` — no day progress (`n/N today`), no redundant leading `90 ml ·` when summary already includes amount.
- **Birth date unset:** on first load, **ask the user to input birthday** (existing prompt pattern may apply; no fake age guide until set).
- **Sleep guide bands** (caregiver guide only — not medical advice):

| Age | Sleep guide (user-provided) |
|-----|-----------------------------|
| Newborns (0–1 month) | Total 16–18h/day; naps 4–6/day (unpredictable); short bursts 30m–3h; no day/night yet |
| 1–2 months | Total 15–16h/day; naps 3–5/day; night stretches ~4–6h; naps 45m–2h |
| 3–4 months | Total 14–15h/day; naps 3–4/day (more structured); 4-month sleep regression possible |
| 5–6 months | Total ~14h/day; naps 2–3/day (morning, midday, short late-afternoon); night 8–11h possible |
| 7–12 months | Total 13–14h/day; exactly 2 naps/day (~9AM morning, ~1PM afternoon); night 10–12h stable; catnap dropped |
| 1–3 years (toddlers) | Total 12–13h/day; only 1 afternoon nap; 2→1 nap transition ~15–18 months; nap 1.5–2.5h |

## Metric

In a night check: each button group has a short, 3AM-readable header; nap header shows age-appropriate sleep blend; bottle header shows recommended ml + `n/N` progress; bottle chips look like Kind tiles (3 recent ml + Custom); feed status lines read as summary · when only; missing birthday prompts input on first load.

## Non-goals

What we will **not** build in this pass:

- Finishing or reopening Gate 3 merge for prior baby-home workflows.
- Full sleep-tracking charts, nap schedules with alarms, or Insights alerts for “regression.”
- Medical diagnosis, doctor chat, or claims of clinical certainty.
- Undo after quick save.
- Pump-only or solids logging on home.
- Reworking breast timer / feed-session merge rules (owned by `baby-home-controls-polish`) beyond what headers/chips need.
- Full timeline redesign.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Progress (`7/8`) moves **only** to the bottle section header; status lines drop it | Yes (Gate 1) | — | — |
| Leading `90 ml ·` is removed from status when summary already has ml | Yes (Gate 1 status) | — | — |
| “Last 3 recent used ml” = this baby’s recent bottle/formula amounts; fill &lt;3 from age-band snaps | Yes (Gate 1 · 3A) | — | — |
| Breast / diaper headers = label + short tip | Yes (Gate 1 · 1B) | — | — |
| Nap header = one-line blend (total + naps + typical length) | Yes (Gate 1 · 2B) | — | — |
| Bottle face + ± replaced by ml chips + Custom | Yes (Gate 1 · 4A) | — | — |
| Empty progress still shows `0/N` + recommended ml when guide max exists | Yes (Gate 1 · 5A) | — | — |
| Missing birth date → prompt on first load; no fake age guide until set | Yes (Gate 1 addendum) | Check `lib/baby-birth-date-prompt.ts` | Wire or extend existing prompt |
| Headers stay short enough for 3AM (plain words, not full table dump) | Yes | Review copy in Design | Trim tip fields |

## What we should not build

- A full pediatric sleep curriculum or editable custom sleep schedules per baby.
- Server-side “push” reminders for nap windows.
- Changing how `feedsToday` is counted (session merge stays with controls-polish).

## Success criteria

- [ ] Each of the four quick-care groups (breast, diaper, nap, bottle) has a visible section header above its controls (label+tip for breast/diaper; sleep blend for nap; ml + progress for bottle).
- [ ] Headers are short and plain enough for 3AM use (EN + VI).
- [ ] Nap header shows one-line sleep blend for the baby’s current age band.
- [ ] Bottle header shows recommended feed ml and current progress (e.g. `7/8` / `0/8`) when a guide max exists.
- [ ] Bottle control uses Kind-like chips: last 3 recently used ml (fill from snaps) + Custom → Custom amount modal; face/± removed for bottle.
- [ ] Feed status lines are always `Feed (…) · {when}` — no `n/N today`, no redundant leading `ml ·`.
- [ ] Unset birth date prompts input on first home load (reuse/extend existing prompt).
- [ ] Skeleton / loading UI matches the new header + chip layout (zero CLS).
- [ ] Light + dark, EN + VI still work; guidelines copy does not claim medical certainty.
- [ ] Unit (+ e2e as needed) cover header visibility, progress placement, chip set, cleaned status copy, and birth-date prompt.

## Gate 1 decisions (approved)

| # | Pick | Meaning |
|---|------|---------|
| 1 | **B** | Breast / diaper headers = label + short tip |
| 2 | **B** | Nap header = one-line blend (total + naps + typical length) |
| 3 | **A** | Bottle chips = last 3 from history; fill &lt;3 from age-band snaps |
| 4 | **A** | Chips replace bottle face + ± |
| 5 | **A** | Show `0/N` + recommended ml when guide exists; missing birth date → prompt (no fake guide) |
| Status | **yes** | Always `Feed (…) · {when}` — no progress, no leading duplicate ml |
| Addendum | — | Headers easy at 3AM; birthday unset → ask on first load |
| Birth prompt | **A** | Always until set (no 7-day snooze); “Not now” = this visit only |

## Open questions (for Analyze / Design — not blocking Gate 1)

1. Exact tip copy for breast/diaper (next-due vs last-ago) — keep 3AM-short.
2. Exact nap blend string per band (EN + VI).
3. Sleep bands: extend `lib/baby-age-guide.ts` vs sibling module.
4. Birth-date prompt: reuse `lib/baby-birth-date-prompt.ts` snooze vs always show until set on first load this session.

---

**Gate 1:** Approved 2026-09-13 (1B, 2B, 3A, 4A, 5A, status yes + birth-date prompt + 3AM headers).
