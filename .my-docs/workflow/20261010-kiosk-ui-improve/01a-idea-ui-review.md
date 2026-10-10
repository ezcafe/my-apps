# Idea day-to-day review (Gate A): 20261010-kiosk-ui-improve

**Result:** ok
**Round:** 1
**Updated:** 2026-10-10
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Know if anything needs action today (overdue / due-soon loan payments).
- See this month’s money position at a glance (net first).
- Check today + weather without leaving the board.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Attention / urgency for loan payments | Missed payments hurt; must be seen in seconds |
| One primary money total (net this month) | Answers “how am I doing?” without a full Money tour |
| Calm context strip (date + weather) | Useful orientation; must not bury money urgency |
| Keep dense insight grids off the critical path | Extra KPI walls kill the glance job |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Urgent loan payment state (overdue / next due) with default widgets |
| Important info / action #2 (always visible) | Net this month (primary money total) with default widgets |
| Secondary / deferred (expand / modal / menu / overflow) | Insight KPI grids; extra ledger widgets; Settings toggles; weather detail |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Urgency buried under calm metric cards | yes | Matches ★ priority |
| Look-alike cards / dense insights force reading | yes | Main scan killer |
| Optional widgets on → no re-hierarchy | yes | Glance trust breaks |
| Ledger labels (bills/savings) feel like income/expense | no | Secondary; Design can refine |
| Widget setup only in Settings | n/a | Fine if defaults stay glance-safe |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Defaults stay small; insights/extra ledgers opt-in; Settings for toggles; no builder |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open `/kiosk` → see urgency (if any) → read net → optional pay/loan → optional weather/Settings | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Weather + net + loan payments on | Covers attention + money + light context |
| Bills / savings / loan summary / investments off | Protects glance; opt-in density |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Time-to-answer: open → name (1) any urgent payment and (2) this month’s net; target ~5s on phone-width with defaults; with overdue, urgency named before scrolling past first screen.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Clear in 01-idea; matches busy-parent glance |
| Convenience (few steps, low friction in daily use) | yes | One open → answer; pay stays one step on rows |
| Easy to use (clear actions, low learning cost) | yes | Status board, not a second Money home |
| Understanding (problem + outcome make sense to a real user) | yes | Core problem + Outcome match ★ priority |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Primary audience is phone between tasks |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Attention → key totals → optional density |

## Problem map / Core problem check

| Check | Pass? | Note |
|-------|-------|------|
| Problem map present (Mode full) | yes | Steps 1–2 + mind map |
| Core problem one clear user sentence | yes | Busy parent cannot tell what needs attention today in a few seconds… |
| Outcome matches ★ top priority | yes | Needs-me-now + key totals ahead of optional density |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | “Always visible” #1/#2 still depend on widgets being on | Optional: one line that default-on widgets are the day-to-day contract for #1/#2 |
| Enhancement | Open: attention = loans only vs bills too | Leave for Design unless households need bills-due in this pass |
| Enhancement | Calm board when nothing is urgent | Optional Outcome note: “all clear” should still feel fast, not empty |

## Fix ask for Ideation

None — Result **ok**. No Critical/Major.

## Auto-approve?

- **Yes** — Result **ok**; Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable → parent checks **Gate A**.

## Round notes

- Fresh end-user read of `01-idea.md` only; technical layout options deferred to Design as stated.
- Prior weather-detail run noted as out of primary scope — agreed for this glance job.
