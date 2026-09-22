# Idea day-to-day review (Gate A): baby-external-apis

**Result:** ok
**Round:** 1
**Updated:** 2026-09-22
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Create a Baby API token for one workspace
- Copy the secret once into an external app
- See existing tokens and revoke a bad one

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Create Baby token (app + workspace + scopes) | Without this, external app cannot auth |
| Copy secret once | Daily setup step for the other app |
| Revoke token | Safety when a secret leaks |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Create token (Baby + workspace + scopes) |
| Important info / action #2 (always visible) | Token list + revoke |
| Secondary / deferred (expand / modal / menu / overflow) | Help docs link, prefix/scope explanation |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Picking Money token by mistake for Baby | yes | App selector must show Baby clearly |
| Secret only shown once | yes | Keep copy UX clear (existing pattern) |
| Hard to find Settings → API tokens | no | Same path as Money; Help can point |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Reuse existing Settings tokens UI; no new portal |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Settings → API tokens → Baby → workspace → scopes → Create → copy → paste in external app | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Workspace list filtered by Baby when Baby selected | Avoids wrong-app workspace pick |
| Same read/write scope labels as Money | Familiar, fewer decisions |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Token create success for appKey=baby
- Baby GraphQL Bearer success vs 401/403 rate

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Lean Settings reuse |
| Convenience (few steps, low friction in daily use) | yes | Same path as Money tokens |
| Easy to use (clear actions, low learning cost) | yes | Familiar pattern |
| Understanding (problem + outcome make sense to a real user) | yes | External app needs a Baby secret |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Settings already mobile; rare create is OK |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Create then list |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Open question on exact ops for first external app | Keep in Open questions; Analyze can narrow |
| Nit | Prefix naming (`baby_` vs `bby_`) | Leave for Design |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. (none — Result ok)

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- main-thread fallback — Gate A — usage limit
- Idea reuses Money Settings tokens pattern; day-to-day create/copy/revoke is clear.
