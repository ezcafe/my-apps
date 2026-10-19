# Idea day-to-day review (Gate A): 20261012-kiosk-widgets

**Result:** ok
**Round:** 2
**Updated:** 2026-10-13
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Open `/kiosk` and glance status in a few seconds.
- Pick which widgets show (once in Settings).
- Match board density to the display (one focus vs multi-column grid).
- See this month’s money (budget + key pairs) without opening Money home.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Widget on/off that matches `/kiosk` | Daily board only works if Settings and board agree |
| Layout mode (fullscreen vs grid 1–4 cols) | Wrong density wastes wall/tablet/phone glance time |
| Current-month money board (chart + six metrics) | Main new “why open kiosk” for money glance |
| Defaults = upgraded glance (weather + new money + loans) | Upgrade must not blank the board or duplicate money cards |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Active layout of enabled widgets on `/kiosk` (fullscreen one focus, or width-capped column grid) |
| Important info / action #2 (always visible) | Money on: budget + Expenses/Income (then Net/Savings, Bills/Loans). Money off: primary content of first enabled non-money widget |
| Secondary / deferred (expand / modal / menu / overflow) | Old small money-card toggles; optional insight widgets; weather city setup; deep links; weather detail |
| Core actions dominant? | yes — Settings for toggles/layout/focus; board is glance-only; #1/#2 named for money on and off |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Fullscreen with 0 / 1 / many widgets | n/a | Settled: one full-bleed focus (first enabled or Settings pick); zero → empty enable prompt |
| New money vs old net/bills/savings cards | n/a | Settled: new money replaces in defaults (on); old cards optional off |
| 3–4 cols unreadable on phone | n/a | Settled: viewport auto-cap; phone max 1–2 |
| Settings feeling like a builder | yes | Keep toggles + layout + simple focus pick only (idea already states this) |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | No drag-drop builder; old money cards off by default; focus pick stays simple; secondary widgets deferred |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Settings → Kiosk → toggle widgets + pick layout (and focus if fullscreen) → open `/kiosk` → glance money or first non-money story at readable density | yes — outcomes are predictable from stated rules |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Weather + new current-month money + loans on | Familiar glance upgraded; money story in one widget |
| Old net/bills/savings cards off | Avoid duplicate money clutter |
| Layout stack-like / grid 1 until user densifies | Readable on phone and wall until they opt in |
| Phone auto-caps denser column prefs | Dense Settings choice never breaks narrow glance |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Time to name budget progress + key money pairs on intended width (idea target ~10s).
- Share of users who change layout mode once vs never (defaults quality).
- Count of users with both new money widget and old money cards on (overlap smell).
- Support / confusion: “fullscreen hid my widgets” or “board too crowded on phone.”

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Prior Major gaps closed; core #1/#2, defaults, phone rule, fullscreen rule all stated |
| Convenience (few steps, low friction in daily use) | yes | Config once in Settings; daily path is open `/kiosk` and glance |
| Easy to use (clear actions, low learning cost) | yes | Fullscreen, money roles, and phone density are learnable from the idea |
| Understanding (problem + outcome make sense to a real user) | yes | Core problem + Outcome match daily glance needs |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Phone max 1–2 cols; denser prefs auto-cap by width |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | 80/20, Outcome rules, and Success criteria scan cleanly |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Open question still asks default layout after upgrade while Sensible defaults already say stack-like / grid 1 | Close that open question to match Sensible defaults (optional clarity) |
| Enhancement | Cross-device layout sync still open | Fine for Analyze/Design; not blocking day-to-day clarity |
| Nit | Exact budget definition open | Fine for later if month glance labels stay plain |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

*(none — no open Critical/Major)*

Deferred Enhancements: close leftover default-layout open question; optional sync note for Analyze.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

**Auto-approve this round?** Yes — Result is **ok**.

## Round notes

- **Round 1:** needs update — Majors: fullscreen 0/1/many; money replace/defaults; phone column cap; money-off #2.
- **Round 2:** Re-checked updated `01-idea.md`. All four prior Majors addressed in Outcome, Primary UI, Sensible defaults, Success criteria, and settled Open questions. **80/20 overall pass = yes.** Result **ok**. No new Critical/Major. No code; no rewrite of `01-idea.md`.
