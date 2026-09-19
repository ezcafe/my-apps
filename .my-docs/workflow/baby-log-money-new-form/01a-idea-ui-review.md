# Idea day-to-day review (Gate A): baby-log-money-new-form

**Result:** ok
**Round:** 2
**Updated:** 2026-09-19
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Log a care event quickly (feed, nap, diaper, growth/health, vaccine).
- Use one familiar “how to fill this” pattern across Baby capture pages (like Money new).
- Find and log a vaccine without a separate nav destination.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Shared form chrome (chips / grid / radii / save) where a form applies | Same “how to fill” feel every day; less layout confusion |
| Keep one-tap / few-field saves on feed/diaper (and sleep one-tap) | Highest daily volume; extra steps would hurt most |
| Vaccine as always-visible Growth chip + drop Vaccines nav | Rare log stays findable; daily nav stays simpler |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Log type chips (money/new-style). On Growth, **Vaccine** is always one chip with a plain label — not menu/overflow-only |
| Important info / action #2 (always visible) | Form pages: primary Save. One-tap pages (feed/diaper/sleep): the true primary tap that saves — no forced extra Save |
| Secondary / deferred (expand / modal / menu / overflow) | Timer extras, optional notes, rare fields, edit/history → expand / menus / Activities / Insights. Vaccine is **not** secondary |
| Core actions dominant? | **yes** — #1/#2 and one-tap vs form paths are locked in the idea |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Restyle slows one-tap feed/diaper | yes | Idea now forbids adding steps; keep this as a hard success check |
| Vaccine feels “gone” after nav merge | yes | Always-visible plain “Vaccine” chip + redirect with preselect |
| Broken `/baby/vaccines` bookmarks | yes | Permanent redirect to Growth with vaccine preselected |
| Inconsistent chip → fields → save order | yes | Same top-to-bottom order after restyle |
| Exact chip label / URL param spelling | no | Fine to settle in design; day-to-day behavior is clear |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | One less nav item; vaccine stays on Growth chips (not buried). Money widgets not cloned onto Baby |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Growth/vaccine → pick type → fill 1–2 fields → Save → success | yes |
| Open feed/diaper (sleep one-tap) → primary tap / few fields → saved (no extra Save) | yes |
| Old `/baby/vaccines` link → Growth with vaccine ready → Save | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Most common type per page (e.g. Growth weight); Vaccine visible but not default | Typical growth log stays one less tap |
| Vaccine selected (or via redirect) → dose-first fields | Rare path still short |
| Keep existing unit / date-time prefills | Matches how people already log |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Taps or time from open → successful save on feed & diaper (must not get worse).
- Vaccine saves started from Growth (findable without Vaccines nav).
- `/baby/vaccines` redirect hits that complete a save.
- Soft fail: cancel/back without save after restyle.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Round 1 gaps settled in updated idea |
| Convenience (few steps, low friction in daily use) | yes | One-tap rule + redirect/preselect protect daily and rare paths |
| Easy to use (clear actions, low learning cost) | yes | Shared chrome; Vaccine chip named plainly |
| Understanding (problem + outcome make sense to a real user) | yes | Uneven forms + extra Vaccines nav are real daily friction |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Phone capture; large chips/save and one-tap matter |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Type → fields → save (or one-tap primary) is clear |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Exact vaccine chip label and dose UI “as today” still open | Keep in Open questions for design; no idea rewrite needed for Gate A |
| Nit | Growth may show more chips after merge | Already: vaccine visible, not default — enough for day-to-day |

## Fix ask for Ideation

None — Round 1 Majors are addressed in `01-idea.md`. No further idea updates required for Gate A.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Round 1 — End-user Gate A: idea direction is sound (same form feel + fewer nav items). Blocked on settling one-tap vs money/new for high-frequency pages and vaccine findability after merge. No escalate (safe, clear enough once those rules are written into `01-idea.md`).
- Round 1 — PO ideation-update: locked one-tap rule + money/new = chrome not forced multi-step; vaccine always-visible Growth chip; redirect `/baby/vaccines` → Growth with vaccine preselected; metric adds taps/time-to-save on feed/diaper and vaccine-from-Growth.
- Round 2 — Re-reviewed updated idea. All Round 1 Majors cleared. 80/20 pass; day-to-day checklist acceptable. Result **ok** → Gate A auto-approve.
