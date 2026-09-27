# Idea day-to-day review (Gate A): insights-ux-deltas-filters-urgency

**Result:** ok
**Round:** 1
**Updated:** 2026-09-27
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- See if spending got better or worse without opening More insights
- Filter Baby Insights to the care type I care about today
- Know if any loan payment is overdue or due soon

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Money expense delta | First question on Insights is “up or down?” |
| Baby Care filter | Without it, chip plumbing is useless; parents cannot focus sleep vs feed |
| Loans urgency strip | Monitoring job; next-due date alone is not “act now” |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Per surface: Money expense delta; Loans overdue/due-soon; Baby Care filter on toolbar |
| Important info / action #2 (always visible) | Existing ATF content (Money charts / Loans Remaining / Baby Hydration+Night Rest) |
| Secondary / deferred (expand / modal / menu / overflow) | More insights; Growth filter if Care is enough; CSV; Investments deltas; awake/diaper chart polish |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Fake MoM when range is weird | yes | Hide delta when no prior data |
| Baby filters that blank the page | yes | Empty chips = all (existing) |
| Urgency looking like an error | yes | Quiet zero; Alert only if Design chooses warning for overdue > 0 |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Export, Investments deltas, chart rebuilds deferred |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Money Insights → read Expenses + delta → optional More | yes |
| Open Baby Insights → optional Care filter → Apply → scan charts | yes |
| Open Loans Insights → see urgency → tap through to loan | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Existing date ranges | No new first-load surprise |
| Empty Baby chips = all | Matches current series behavior |
| Quiet zero urgency | Empty is not an error |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- E2E: Money delta visible when data supports; Baby Care apply changes visible charts; Loans urgency strip present (including zero).

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Three surfaces, one job each |
| Convenience (few steps, low friction in daily use) | yes | No new pages |
| Easy to use (clear actions, low learning cost) | yes | Reuses existing chrome |
| Understanding (problem + outcome make sense to a real user) | yes | |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Toolbar + KPI band already mobile |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | F-pattern: delta/urgency top-left |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Open Q3 Care vs Care+Growth still open | Fine for Design; prefer Care + Growth if toolbar already supports both |
| Nit | Multi-surface idea is wider than one screen | Keep Non-goals tight; Gate A2 one HTML with three panels OK |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. None — Result **ok**.

## Auto-approve?

- **Yes** — Result **ok**; 80/20 pass; checklist acceptable → parent checks **Gate A**.

## Round notes

- Main-thread Gate A (Task usage limit after retry).
