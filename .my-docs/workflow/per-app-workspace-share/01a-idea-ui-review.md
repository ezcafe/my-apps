# Idea day-to-day review (Gate A): per-app-workspace-share

**Result:** ok
**Round:** 2
**Updated:** 2026-09-21
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Add a person to a shared workspace
- Give them only some apps (not the whole workspace)
- See who can use Money vs Baby

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Add member | First real step — without it grants never apply |
| App grants (Money, Baby) | Core “not whole workspace” ask |
| Enforce on access | Trust; wrong app must not show the workspace |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Member list + apps each person can use |
| Important info / action #2 (always visible) | Add member + save/confirm |
| Secondary / deferred (expand / modal / menu / overflow) | Remove member, role, owner All-apps row detail |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| No add-member path | yes | Now in Outcome / vital few / journey |
| “Shared” = all apps mental model | yes | Copy + grants |
| Wrong app picker leakage | yes | Enforcement |
| Migration surprise | yes | Default: existing → Money + Baby |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Money + Baby only; no fancy invite product; notes/tasks out |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Settings → Workspaces → shared WS → Add member + apps → save → member uses granted app / blocked on other | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| ≥1 app required | No empty membership |
| Owner = all apps | No busywork |
| Existing members → Money + Baby | No break on ship |
| notes/tasks not in UI | Less clutter |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Add-member + grant save success
- Forbidden access on ungranted app
- Owner time: add → grant → done

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Round-1 gaps closed |
| Convenience (few steps, low friction in daily use) | yes | Add + grants on one settings surface |
| Easy to use (clear actions, low learning cost) | yes | Checkboxes + add field |
| Understanding (problem + outcome make sense to a real user) | yes | Not whole workspace |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Settings list OK |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Identifier (email vs id) still open | Fine for Analyze |
| Nit | Remove-member optional this pass | Prefer include if cheap |

## Fix ask for Ideation

None — Result ok.

## Auto-approve?

- **Yes** — Result is **ok**.

## Round notes

- Round 1 Fix ask addressed in `01-idea.md` (add member in scope, migration default, Money+Baby only).
- Parent ran Gate A in-session (Task subagents unavailable due to usage limits).
