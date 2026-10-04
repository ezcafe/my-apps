# Idea day-to-day review (Gate A): app-improvement-discover-ship

**Result:** ok
**Round:** 1
**Updated:** 2026-10-04
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Log care or money quickly without mistakes
- Scan Insights / urgency without hunting
- Use one clearer app after this run ships a slice (they never see the backlog doc)

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Rank by daily job (capture / scan / act) | Stops polish-first or Baby-only drift |
| One shippable slice criteria | Prevents “improve everything” that never lands |
| Cross-app consistency when habits already learned | Cuts relearning cost |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Ranked backlog by user-job impact |
| Important info / action #2 (always visible) | Ship criteria + size so the pick is safe |
| Secondary / deferred (expand / modal / menu / overflow) | Full Gate C inventory; tech-debt-only; polish |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Ranking that ignores 3AM / spender jobs | yes | Idea already prefers daily frequency |
| Picking an XXL platform item | yes | Cap at one-PR size |
| Shipping paused drafts that drifted | yes | Re-verify vs main |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Non-goals block whole-shell redesign and multi-item ship |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| (Maintainer) Read ranked list → pick one → ship → (User) use that slice daily | yes |
| Caregiver/spender never opens the backlog | yes — by design |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Higher daily-frequency job wins ties | Matches busy parent/spender reality |
| Allow re-verified Gate C finish as a candidate | Recovers already-built value |
| Reject XXL at pick time | Protects “one ship” promise |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Pick time under ~5 minutes; chosen slice has e2e/unit path; user can complete the named job after merge.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Meta-discovery framed around real jobs |
| Convenience (few steps, low friction in daily use) | yes | One ship item, not a program |
| Easy to use (clear actions, low learning cost) | yes | Rank + criteria are clear |
| Understanding (problem + outcome make sense to a real user) | yes | “Ship one useful thing” is clear |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Shipped slice must stay mobile-first |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | #1/#2 backlog + criteria |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Caregivers never see the backlog — only the shipped slice | Optional one-line Outcome note; not blocking |
| Nit | Open Q1–Q3 already have defaults | Fine for Analyze |

## Fix ask for Ideation

None — Result **ok**.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 UI pass**; day-to-day checklist acceptable).
- **No** if **needs update** or **escalate**.

## Round notes

- Fresh read of `01-idea.md` only. Meta discovery is acceptable when Outcome forces a single day-to-day ship slice. No Critical/Major gaps. **Result: ok.**
