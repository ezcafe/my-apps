# Idea day-to-day review (Gate A): chart-interaction-parity

**Result:** ok
**Round:** 1
**Updated:** 2026-09-27
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- See exact chart values on hover without guessing
- Hide noisy series so one trend is readable
- Click a slice and see the underlying rows without leaving the page

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Shared hover on Baby (+ gaps) | Baby charts feel broken vs Money; daily scan job |
| Legend toggle on multi-series | Dense payoff / allocation / hydration without hide is unusable |
| Option A drill modals (Loans / Investments / Baby) | Click without rows is a dead end; Money already taught the habit |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Chart geometry (existing ATF cards) |
| Important info / action #2 (always visible) | Interactive legend when multi-series |
| Secondary / deferred (expand / modal / menu / overflow) | Drill list modal; “Open detail” link inside modal; pattern-finder drill if weak keys |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Click navigates away (Loans pie) when modal expected | yes | Modal first |
| Charts look interactive but do nothing (Baby) | yes | Hover + click |
| Wrong / unfiltered modal rows | yes | Inherit date range + click keys |
| Overlapping legend vs chart hits | yes | Design must keep ≥44px legend, clear targets |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | No new chart types; no redesign; CSS progress bars out of visx parity; pattern-finder drill can defer |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Insights → hover → optional toggle → click → skim modal → close | yes |
| Open loan detail → toggle series → click point → skim installments modal | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| All series visible | No surprise empty chart |
| Quiet empty modal | Zero rows ≠ error |
| Inherit Insights date range + click keys | Matches Money mental model |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- E2E: one hover/toggle/drill path per domain (or shared modal + Loans + Baby); unit for filter builders.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Hover / toggle / modal drill |
| Convenience (few steps, low friction in daily use) | yes | Stay on page |
| Easy to use (clear actions, low learning cost) | yes | Same as Money |
| Understanding (problem + outcome make sense to a real user) | yes | |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Tooltip + modal + legend must work on narrow |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Chart → legend → modal |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Pattern-finder drill still open | Keep in Open questions; Design may defer |
| Nit | Loans drill content (paid vs upcoming) open | Analyze/Design |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. (none — Result ok)

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.

## Round notes

- main-thread fallback — Gate A — usage limit after Ideation Task retry
- Settled locks Option A + all charts clear enough for day-to-day review
