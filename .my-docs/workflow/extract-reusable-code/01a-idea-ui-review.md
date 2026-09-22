# Idea day-to-day review (Gate A): extract-reusable-code

**Result:** ok
**Round:** 1
**Updated:** 2026-09-22
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Use Money, Baby, Investments, and Loans with familiar chrome (headers, filters, loading).
- Trust that pages look and behave the same after shared-code extract (no surprise redesign).
- (Developer day-to-day) Change shared chrome once and see it apply in more than one app.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Stable page header / primary CTA | Every feature open starts here; drift hurts trust |
| Skeleton ↔ live layout parity | Daily loads; CLS and “jumping” layout breaks focus |
| Shared filter/chip patterns | Used on list/insights journeys across apps |
| Defer deep Baby/one-off widgets | Rare or feature-specific — not day-to-day reuse pain |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Existing app chrome + primary page actions stay put |
| Important info / action #2 (always visible) | Loading skeletons match live layout |
| Secondary / deferred (expand / modal / menu / overflow) | Feature-only widgets, one-off charts, experimental controls |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Visual drift after extract | yes | Wrong radii/spacing would hit every visit |
| Over-abstract props at call sites | yes | Makes future edits harder for daily builders |
| “Reuse admin” new screen for end users | n/a | Correctly out of scope — good |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Idea keeps end-user UI the same; defers rare widgets; wave 1 only |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open feature → header/filters → skeleton → data → act | yes — path unchanged; only shared implementation |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Extend `components/ui/` + existing `lib/` | Matches how the app already ships chrome |
| Highest-duplication / lowest-risk wave 1 | Less chance of breaking daily use |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Parity tests (unit/e2e smoke) on adopted surfaces; no CLS/regression reports on wave-1 pages.
- Developer signal: one shared module used by ≥2 features.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Clear vital few; no new end-user surface |
| Convenience (few steps, low friction in daily use) | yes | Same journeys; fewer places for builders to fix bugs |
| Easy to use (clear actions, low learning cost) | yes | No new product UI to learn |
| Understanding (problem + outcome make sense to a real user) | yes | “Same look, less copy-paste” is clear |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Must keep existing mobile chrome parity |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Problem → outcome → 80/20 is scannable |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Open question on wave-1 cluster is fine for Analyze | Keep; no idea rewrite needed |
| Nit | “Developer” is primary audience — still OK for Gate A | Already balanced with end-user parity |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. (none — Result ok)

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Round 1: Result **ok** — auto-approve Gate A. Parent continues to light repo skim.
