# Idea day-to-day review (Gate A): baby-care-pages-control-parity

**Result:** ok
**Round:** 1
**Updated:** 2026-09-19
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Log breast / bottle from Feed with the same taps as Home
- Log pump from a dedicated Pump page (L/R + custom ml)
- Log diaper with Home buttons; add detail for dirty/mixed
- Log growth with a familiar money/new-style form

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Feed matches Home; drop old amount-method fields | Stops double mental model and wrong fields at 3am |
| Pump page = Home pump controls | Pump is a real job; should not live under Feed |
| Diaper + Home detail sheet | Avoids missing dirty/mixed detail vs Home |
| Growth money/new field rows + Category/Amount controls | Cuts form learning cost |
| Skeleton parity | Avoids layout jump while tired / one-handed |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Page primary controls (Feed breast+formula; Pump L/R+ml; Diaper kinds; Growth kind chips + field lines) |
| Important info / action #2 (always visible) | Immediate feedback (timer/done flash) or Growth Save |
| Secondary / deferred (expand / modal / menu / overflow) | Diaper dirty/mixed detail sheet; notes/history elsewhere |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Old Formula/Pump amount/Amount fields still on Feed | yes | Idea already bans them |
| Pump only on Feed | yes | Dedicated page + nav |
| Diaper without Home modal | yes | Match Home |
| Growth controls unlike money/new | yes | Category/Amount parity |
| Skeleton drift | yes | Same change set |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Removes Feed amount-method clutter; Pump split clarifies jobs |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Feed → breast/formula → saved/timer | yes |
| Pump → L/R or custom ml → saved/timer | yes |
| Diaper → kind → (sheet if dirty/mixed) → saved | yes |
| Growth → kind → field lines → Save | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Keep Home bottle ml snaps / Growth default kind / wet one-tap | Matches already-learned Home behavior |
| Vaccine not default on Growth | Avoids wrong type for common logs |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Time / taps open → successful save on Feed, Pump, Diaper dirty/mixed, Growth weight
- Errors on save; abandoned detail sheet on diaper

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Clear vital few |
| Convenience (few steps, low friction in daily use) | yes | Matches Home one-tap patterns |
| Easy to use (clear actions, low learning cost) | yes | Reuses known controls |
| Understanding (problem + outcome make sense to a real user) | yes | |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Care logging is phone-first |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Confirm Pump appears in section nav near Feed | Already in Open questions / Outcome — no idea rewrite required |
| Nit | Sleep out of scope is good — keep it out | none |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. none

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Round 1: Result ok — auto-approve Gate A. Parent continues in-session (Task subagents blocked by usage limits).
