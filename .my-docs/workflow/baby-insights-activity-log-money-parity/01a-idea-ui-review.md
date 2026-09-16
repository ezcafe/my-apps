# Idea day-to-day review (Gate A): baby-insights-activity-log-money-parity

**Result:** ok
**Round:** 1
**Updated:** 2026-09-16
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Find a past care or growth entry in the Activity log (scan by time / type).
- Fix a wrong entry (time, detail, growth value).
- Remove a mistaken entry.
- Select one or a few visible rows and Edit / Delete without hunting a different path.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Money-like checkbox + selected/hover chrome on Activity log | Same select → act habit as Money; stops “relearn this table” friction |
| Per-row Edit (and selection-bar Edit when one row is selected) | Most corrections are one wrong entry; Edit must be obvious |
| Selection-bar Delete with confirm / busy feedback | Mistakes happen in batches; delete must feel safe and familiar |
| Keep browse + show-more / load-more; selection = visible window only | Daily scan still works; no surprise “select all history” |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Activity log rows (what happened + when) once the panel is open |
| Important info / action #2 (always visible) | Leading checkbox + per-row Edit (desktop table and mobile cards) |
| Secondary / deferred (expand / modal / menu / overflow) | Full field edit in modal; multi-select Edit details; Insights filters; Clear on selection bar; expand/collapse Activity log panel |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Whole-row click fighting checkbox / Edit (today’s open-edit vs Money separate controls) | yes | Must drop or change row-click so select and Edit stay clear |
| Unclear multi-Edit / multi-Delete when care + growth are mixed | yes | Idea already flags; day-to-day needs a safe, predictable rule |
| Mobile cards missing selected feel / Edit affordance | yes | Phone is a real caregiving context |
| Skeleton missing checkbox / actions → layout jump | yes | Zero CLS called out in idea |
| Accidental bulk delete without confirm / busy disable | yes | High-stakes destructive action |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | No Money columns (amount/category), no inline cell edit, no new capture chrome; edit details stay in modal; filters stay where Insights already has them |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Insights → open Activity log → find row → (optional) select → Edit or Delete → confirm/save → list + Insights refresh | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| No rows selected on open / after Clear | Browse first; act only when intended |
| Select-all = visible Activity log window only | Matches Money page habit; avoids silent all-history select |
| Single-row selection-bar Edit = same surface as row Edit | One mental model for “fix this entry” |
| Empty log = quiet empty (no fake checkboxes) | Empty is not an error; no fake controls |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Primary: caregiver who knows Money can select rows and use Edit / Delete from the same places without relearning.
- Supporting: UI/e2e for checkbox + row Edit + selection bar; unit for selection/edit helpers; skeleton parity check.
- After ship (light): note failed deletes / edit save errors and whether users still tap the whole row expecting edit.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Idea already fills all 80/20 sections with clear #1 / #2 and deferred secondary |
| Convenience (few steps, low friction in daily use) | yes | Select → Edit / Delete matches a pattern caregivers may already know from Money |
| Easy to use (clear actions, low learning cost) | yes | Explicit checkbox + Edit; Money-shaped bar when selected |
| Understanding (problem + outcome make sense to a real user) | yes | “Look matches Money but acts different” is a real daily annoyance |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Mobile cards + selected feel called out as required |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Rows first, then select/Edit, bar only when needed |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Multi-select Edit is still an open question; mixed care+growth could confuse on the rare multi-select path | Prefer stating a day-to-day default in Open questions / Assumptions (e.g. selection-bar Edit only when exactly one row is selected; multi = Delete / Clear only) so caregivers always know what Edit does |
| Nit | Clear is listed under secondary while also living on the selection bar | Keep as-is; optionally note that when `selectedCount > 0`, Edit / Delete / Clear become the temporary primary actions on that bar |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. None required for Gate A. Optional: lock a preferred default for multi-select Edit under Open questions / Assumptions (Enhancement above).

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

**Auto-approve?** Yes — Result **ok**.

## Round notes

- Reviewed `01-idea.md` only; ignored technical design.
- As a caregiver: correcting or removing a wrong log entry is a real job; matching Money’s select → act pattern reduces daily friction.
- Biggest day-to-day risk already named well: whole-row click vs checkbox/Edit.
- No Critical or Major gaps; 80/20 pass; checklist acceptable.
