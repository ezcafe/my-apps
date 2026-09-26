# Idea day-to-day review (Gate A): drawer-nav-assessment

**Result:** ok
**Round:** 1
**Updated:** 2026-09-26
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Reach a section inside the app I am already using
- Jump to another app (Money ↔ Baby, etc.)
- Open Settings / Help / sign out without hunting

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Current-app destinations | Most taps in a session stay in one app |
| Other-app jump | Context switch is rare but high cost when buried |
| Settings / sign out | Trust / account actions must stay findable |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Current-app section list (grouped) |
| Important info / action #2 (always visible) | Other apps as a short jump band |
| Secondary / deferred (expand / modal / menu / overflow) | Page actions, Help, Kiosk, Settings, Sign in/out |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Flat long list / weak categories | yes | Matches idea risk #1 |
| Mixing tasks + shell chrome | yes | Footer band is right |
| Blind cuts without better parents | yes | Framework counterintuitive note honored |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Secondary in footer; visibility settings for optional sections |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open drawer → current-app group → tap → close | yes |
| Open drawer → Other apps → tap app home | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Scope to current app first | Matches how people work most of the day |
| Honor existing tab visibility | Avoids admin dump of optional Money tabs |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Time-to-find for a known in-app destination; optional e2e structure asserts

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | |
| Convenience (few steps, low friction in daily use) | yes | |
| Easy to use (clear actions, low learning cost) | yes | Framework language is heavy in docs; UI should stay plain |
| Understanding (problem + outcome make sense to a real user) | yes | Long-list drawer pain is clear |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Drawer is the phone nav |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Desktop rail vs drawer-first still open | Fine for Design; no idea rewrite |
| Enhancement | Whether group labels show in UI still open | Fine for Design / Gate A2 HTML |
| Nit | Search in drawer deferred | Keep as Open question |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. None — Result **ok**.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.

## Round notes

- Main-thread fallback — Gate A — usage limit after wait 5s + retry
- Result **ok** — parent should auto-approve Gate A and continue to Light skim
