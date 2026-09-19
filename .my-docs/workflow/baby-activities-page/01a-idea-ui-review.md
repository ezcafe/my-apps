# Idea day-to-day review (Gate A): baby-activities-page

**Result:** ok
**Round:** 2
**Updated:** 2026-09-18
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Open one place to scan past feed / sleep / diaper / growth rows without digging through Insights charts.
- Narrow by date (and care type) so the list is easy to scan.
- Fix a wrong entry or delete a mistaken one, then see the list update.
- Keep Insights for pattern review only (charts / KPIs), not ledger cleanup.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Dedicated Activities page (period → filters → ledger) | Cleanup visits need the list; burying it under Insights adds expand/scroll every time |
| Move Activity log off Insights (no duplicate panel) | One job per page — patterns vs manage rows |
| Keep select → Edit / Delete on the ledger | Correcting mistakes is why people open the log |
| Baby section nav entry to Activities | One tap from Baby Care; no Insights detour |
| Short Insights → Activities cue after the move | Stops “my entries vanished” when habits still open Insights first |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Period / date range (and Apply when draft differs) — time scope first, like Spending |
| Important info / action #2 (always visible) | Activity ledger rows (what + when) with select + Edit — not behind a collapsed panel |
| Secondary / deferred (expand / modal / menu / overflow) | Full field edit in modal; rare advanced filters in filter UI / overflow; Insights charts stay on Insights; capture stays on Home / Log flows; no summary-stats strip this pass |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| After the move, caregivers still open Insights and think past entries are gone | yes | Idea now requires a short Insights → Activities link or one-line cue (not silent-only) |
| New page order does not match Spending (filters buried or charts on Activities) | yes | Locked: period → filters → ledger only; no summary strip this pass |
| Nav label / placement unclear | yes | Locked: `/baby/activities`, label **Activities**, next to Insights under review |
| Default date range wrong → empty or noisy list on open | yes | Locked: last 7 days (match current Insights Activity log) |
| Old bookmarks / deep links still expect Insights Activity log | yes | Cue covers Insights habit; leftover URL/redirect detail can stay for Analyze — not a day-to-day idea gap |
| Spending-like summary stats strip on Activities this pass | no | Explicitly out of scope — keeps primary surface focused |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Non-goals drop charts on Activities, dual Insights log, new capture, inline spreadsheet edit, and summary/trend strip. Primary surface stays period → filters → ledger. |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Baby → Activities → keep / set range → scan list → select or row Edit → save / delete → list refreshes | yes |
| Open Insights looking for the old Activity log → see cue → go to Activities → continue cleanup | yes | Presence of cue is required; exact copy left to UI concept |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Date range = last 7 days (current Insights Activity log default) | Matches what caregivers already trust; fewer empty-list surprises |
| No rows selected on open / after clear | Avoids accidental bulk delete |
| Empty list = quiet muted copy, not an error | Empty is normal for a quiet day / tight filter |
| Insights opens charts-first with no embedded Activity log + short Activities cue | Patterns stay on Insights; findability after the move is preserved |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Can a caregiver finish find → edit / delete on Baby → Activities without touching Insights?
- Do caregivers still land on Insights first looking for the log (nav / deep-link / support signal)?
- Empty-list rate on the default 7-day range (too narrow vs too wide).
- Focused UI/e2e: new page path present; Insights Activity log panel gone; Insights → Activities cue present.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Goals, vital few, #1/#2, defaults, and post-move cue are locked |
| Convenience (few steps, low friction in daily use) | yes | Dedicated nav + always-visible ledger; Insights cue for old habit |
| Easy to use (clear actions, low learning cost) | yes | Spending-like stack is familiar; Edit in modal is fine for occasional fixes |
| Understanding (problem + outcome make sense to a real user) | yes | “Cleanup page vs charts page” is easy to grasp |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Caregivers often fix entries on phone; Spending-style chrome should stay thumb-friendly (filters + row Edit ≥44px) — confirm in UI concept, not a blocker here |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Period → filters → ledger reads top to bottom; charts stay off this page |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Exact Insights cue copy / placement still open | Leave to UI concept — presence is already required; no idea rewrite needed |
| Nit | Old URL / redirect beyond `/baby/timeline` still open | Fine for Analyze / Design; cue + nav cover the main day-to-day findability risk |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. None — Round 1 Fix ask is reflected in Outcome, Sensible defaults, Non-goals, Success criteria, and Decided.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Fresh read of current `01-idea.md` (Round 2). Skimmed Round 1 notes only for continuity.
- Round 1 Majors cleared: Insights → Activities cue (no silent-only), default last 7 days, no summary-stats strip this pass, nav `/baby/activities` + **Activities** next to Insights.
- Day-to-day verdict: dedicated cleanup page with Spending-like stack and clear Insights handoff should work for real caregivers. **Result ok** → parent may auto-approve Gate A.
