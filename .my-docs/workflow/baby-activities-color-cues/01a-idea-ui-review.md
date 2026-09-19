# Idea day-to-day review (Gate A): baby-activities-color-cues

**Result:** ok
**Round:** 1
**Updated:** 2026-09-19
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Scan past care on Activities and know **what kind** of entry it is at a glance
- Spot feeds/sleeps that look **short, normal, or long** vs usual for baby’s age without opening Edit
- Log care on Home **quietly** (no “Saved …” interruption)
- Run Nap / breast / Pump without the whole button row jumping, and without Pump killing Nap or feed

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Per-type color on Activities | Every scan starts with “what is this row?” |
| Border cue for time/ml vs age-regular | Catches wrong logs without opening every row |
| Remove Saved … messages for all care actions | Night logging; less interruption |
| Timer re-render only related chips + stable Nap height | Layout jump is trust-breaking on Home |
| Pump does not stop feed/nap | Unrelated actions must not fight |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Activities row type + color accent (border cue when time/ml) |
| Important info / action #2 (always visible) | Home care chips that stay stable while timers run; quiet save (chip flash OK, no banner) |
| Secondary / deferred (expand / modal / menu / overflow) | Full “regular” explanations, personal norms, History timeline rebuild, Insights chart colors |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Rows look identical on Activities | yes | Color first |
| Saved toast noise on every save | yes | Remove for all care actions |
| Pump stops feed/nap | yes | Independence |
| Nap height jump / full grid redraw | yes | Stability |
| Border feels like medical alarm | yes | Soft cue language |
| Custom norms UI | no | Out of scope |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | No new filters or legend required in primary UI; cues ride on existing rows/chips |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Home → Nap start → Pump tap (Nap still running) → Nap stop (no Saved toast) → Activities scan colors/borders → Edit if needed | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Age from birth date; unknown age → type color only | No false “unusual” cues |
| Near-regular uses activity theme border | Familiar color = normal |
| Keep chip done-flash; drop Saved banners | Quiet but not silent |
| Breast L/R may still replace each other; Pump/Nap independent | Matches caregiver mental model |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Unit: color map, banding, timer isolation, Nap height fixture
- E2E/UI: no Saved toast after save; Pump does not clear nap/breast timer; Activities row shows accent

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | |
| Convenience (few steps, low friction in daily use) | yes | Fewer interruptions |
| Easy to use (clear actions, low learning cost) | yes | Colors match common baby apps |
| Understanding (problem + outcome make sense to a real user) | yes | |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Home + Activities both phone-first |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Lock chip done-flash keep + breast L/R preemption | Already in Open questions with recommend — treat as decided for Design |
| Nit | Two surfaces in one idea | OK for one run; keep Outcomes sectioned |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. None — Result ok.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Gate A auto-approved (Result ok). Decisions locked for Design: keep chip done-flash; breast L/R may preempt each other; Pump must not stop feed/nap.
