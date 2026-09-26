# Idea day-to-day review (Gate A): settings-page-optimize

**Result:** ok
**Round:** 1
**Updated:** 2026-09-26
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Change theme or date format quickly
- Jump to one settings area without scrolling past unrelated blocks
- Pair a device / manage tokens when needed
- Rarely touch workspaces or danger zone without those UIs dominating every visit

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Single active category in main pane | Fixes the “sidebar lies” long-page pain |
| Search → matching sections only | Find without scrolling the whole wall |
| Keep light panels short | Theme/date stay one-screen jobs |
| Heavy sections stay in their category | Pairing/tokens don’t stack under Appearance |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Category nav + active category |
| Important info / action #2 (always visible) | Active category’s primary controls |
| Secondary / deferred (expand / modal / menu / overflow) | Account advanced subject; danger confirms; long help; optional in-section collapse |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Sidebar implies focus but all sections still render | yes | Core bug vs best practice |
| Long scroll past rare sections | yes | Fixed by single-pane default |
| Hash / search regressions | yes | Must keep deep links |
| How aggressive to collapse inside Workspaces/API | no | Layout fix first; polish later |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Default = one category; search is the multi-section mode |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Settings → pick Appearance/Date → change → leave | yes |
| Open Settings → search “token” → pair/revoke | yes |
| Open Settings → Danger zone → confirm reset | yes (rare; isolated pane) |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Appearance (or hash) as default category | Most common light change |
| Single-category view, not “all stacked” | Matches how people use Settings elsewhere |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Scroll depth / need to scroll on default Appearance visit
- Hash deep-link open success
- Search → correct section open

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Single-pane is the vital fix |
| Convenience (few steps, low friction in daily use) | yes | Nav → one panel |
| Easy to use (clear actions, low learning cost) | yes | Familiar Settings pattern |
| Understanding (problem + outcome make sense to a real user) | yes | Page is too long today |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Single pane helps small screens most |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Shared `SettingsPageLayout` used by Money/etc. | Design may fix layout once for all consumers; keep Open question |
| Nit | Exact in-section collapse for pairing | Leave for Design after layout fix |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. (none — Result ok)

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- main-thread fallback — Gate A — usage limit after Task retry
- Idea correctly targets false progressive disclosure (sidebar scroll vs filter).
