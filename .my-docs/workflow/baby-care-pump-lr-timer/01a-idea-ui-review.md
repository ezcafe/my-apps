# Idea day-to-day review (Gate A): baby-care-pump-lr-timer

**Result:** ok
**Round:** 2
**Updated:** 2026-09-19
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Start / stop a timed side session without a false **Done**.
- Log Pump L vs Pump R the same way as breast L/R (home and feed).
- Enter amount only when needed via **Pump amount** (not on every stop).
- Use feed / sleep / diaper logs with the same one-tap rules as home.
- Keep Growth for growth/health only (no pump there).
- Glance at short pump guidelines when useful (not while fighting the timer).

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Running → **Tap to stop**; **Done** only after stop | Stops false “finished” at night; builds trust |
| Pump L + Pump R on **Baby home and `/baby/feed`** | Night one-tap + same mental model as breast |
| **Pump amount** Bottle-like, secondary | Volume when needed; never blocks stop |
| Log pages match home one-tap / Done-flash | Same action feels the same everywhere |
| Remove Pump from Growth | Ends wrong-place logging |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Home care rows: Breast L·R + Bottle; Nap + Diaper; Pump L·R + Pump amount — large chips, idle vs running clear; Pump L/R also on feed |
| Important info / action #2 (always visible) | Running: elapsed + **Tap to stop**; after stop: brief **Done** (duration). Row 4 guidelines below chips |
| Secondary / deferred (expand / modal / menu / overflow) | Pump amount / Bottle amount; optional duration, Custom bottle, diaper detail, notes |
| Core actions dominant? | **yes** — layout + happy-path stop locked; amount not forced on stop |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| **Done** while timer still running | yes | Still the #1 night pain; idea prioritizes it |
| Single Pump + Growth pump (no sides / wrong place) | yes | L/R on home+feed; Growth pump removed |
| Amount forced on every pump stop | yes | Locked duration-only; Pump amount secondary |
| Log pages feel like forms | yes | Parity with home is in scope |
| Guidelines crowding night chips | yes | Under-chip short; fuller text in Row 4 |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Growth pump gone; no confirm on every stop; amount via dedicated control; legacy migrate deferred |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Baby home → tap Pump L (or Breast L) → Tap to stop → stop → brief Done (duration) → idle; optional Pump amount | **yes** |
| Same Pump L/R + timer rules on `/baby/feed` | **yes** |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Idle: Tap to start (or current home idle copy) | Clear next action |
| Running: elapsed + Tap to stop (never Done) | Matches real session |
| Stop → duration-only Done; amount via Pump amount | Keeps one-tap at night |
| Growth default stays weight (non-pump) after Pump removed | Health capture stays familiar |
| Match home validation spirit on logs | Same trust rules everywhere |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Metric night check: home + log timer show Tap to stop until stop; Done only after; duration saved; no amount form on stop.
- Watch: Pump amount used when needed (not abandoned); Growth no longer used for pump; under-chip vs Row 4 still readable on small phones.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Round 1 blockers locked; #1/#2 clear |
| Convenience (few steps, low friction in daily use) | yes | One-tap stop; amount optional like Bottle |
| Easy to use (clear actions, low learning cost) | yes | Pump L/R mirrors breast; same rules on feed |
| Understanding (problem + outcome make sense to a real user) | yes | Three pains + locked outcomes match night use |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Large chips; home-first night path |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Care rows → timer copy → Row 4 guidelines; amount secondary |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Row 4 + under-chip text could push chips down on small phones | At UI concept: keep Rows 1–3 first-screen; Row 4 scrolls below |
| Enhancement | Pump amount next to Pump L/R may look like a third timer | Visually match Bottle (amount, not timer) so night taps stay obvious |
| Nit | Exact EN/VI Tap to stop vs `home.tapToSave` | Fine at UI concept — pick one product string |
| Nit | How much guideline table under chips vs Row 4 only | Fine at UI concept / copy length |

## Fix ask for Ideation

None — Result **ok**. No Critical/Major gaps.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- **Round 1:** needs update — Pump home vs feed-only and stop payload (duration vs amount) unsettled; journey could not stay “always visible.”
- **Human lock → ideation update:** D1 Opt1 home+feed; D2 Opt1 duration-only + Pump amount; home rows 1–4 + under-chip / Row 4 guidelines; legacy generic “Pump” label OK.
- **Round 2:** ok — locked decisions clear night one-tap; 80/20 pass; checklist acceptable. Remaining notes are UI-concept polish only.
