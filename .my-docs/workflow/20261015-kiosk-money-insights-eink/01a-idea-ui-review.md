# Idea day-to-day review (Gate A): 20261015-kiosk-money-insights-eink

**Result:** ok
**Round:** 2
**Updated:** 2026-10-15
**Role:** end user (day-to-day usage) — fresh context only

## Problem map / Core problem (product clarity)

| Check | Pass? | Note |
|-------|-------|------|
| Problem map present (Mode full) | yes | WHAT → Core → ★ → Outcome present |
| Core problem one clear sentence a real user recognizes | yes | Cannot glance money insights on `/kiosk` in the two e-ink ref layouts — want + gap clear |
| Outcome matches ★ top priority | yes | ★ two widgets at 100% ref fidelity + money remap ↔ Outcome |

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Glance money-insights KPIs in the stats-grid layout (A) without opening Insights.
- Glance trend + top KPIs in the chart layout (B) on the same board.
- Turn each widget on/off in Settings; keep the rest of the kiosk board usable.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Pixel-faithful A and B layouts | Without fidelity, Outcome fails; glance trust breaks |
| Correct money remapping (right numbers/labels) | Wrong map → morning glance is useless |
| Settings enable + board placement | If hard to turn on or misplaced, feature never used |
| Clear role vs `money.month_board` | Overlap → crowded / redundant board |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | When A is on — 2+3+3 money KPI grid (values + labels) with dither bars and row dividers |
| Important info / action #2 (always visible) | When B is on — three money KPIs + line chart; if only one of A/B is on, that cell’s primary content fills the glance |
| Secondary / deferred (expand / modal / menu / overflow) | Footer brand/subtitle; Settings toggles; deep links; other kiosk widgets |
| Core actions dominant? | yes — board has no builder chrome; Settings stays off-board |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Visual fidelity slips (gray, wrong grid, missing footer) | yes | Outcome risk; non-negotiable |
| Wrong or jargon-heavy metric remap | yes | Draft map exists; Analyze must keep plain labels |
| Chart unreadable at phone/fullscreen cell size | yes | Phone is a stated audience |
| Light/dark or Card chrome fighting monochrome refs | yes | Idea leans always-B/W inside cell — keep |
| Crowding three money cells | no | Mitigated: A/B default off; month_board stays default |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Glance-only board; configure in Settings; non-goals kill builder / Insights redesign |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open `/kiosk` → see month_board (defaults) → if wanted, enable A/B in Settings → return → glance KPIs (+ chart on B) | yes — defaults + role vs month_board settled |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| A and B **off**; `money.month_board` stays default money glance | Morning board stays clear; month_board already covers glance; opt-in for ref layouts |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Side-by-side visual check vs refs (already in Metric).
- After ship: whether A/B stay enabled; empty/unavailable state clarity; chart readable on phone cell.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | All sections filled; defaults + draft remap unblock daily judgment |
| Convenience (few steps, low friction in daily use) | yes | Toggle once, then glance |
| Easy to use (clear actions, low learning cost) | yes | Board glance-only; Settings pattern familiar |
| Understanding (problem + outcome make sense to a real user) | yes | Core + Outcome + ★ align; draft metrics picture the glance |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Phone listed; chart size remains a Design risk to watch |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Refs: big KPIs top → support rows / chart → footer |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Chart grain (daily vs weekly) still open | Leave for Analyze/Design; draft series “spend over time” is enough for Gate A |
| Enhancement | Exact footer strings unset | Design picks Money brand + short subtitle (lean already stated) |
| Nit | Some draft labels (“Budget spent”) may need plain-er copy later | Fine as draft; Analyze can rename |

## Fix ask for Ideation

None — Round 1 Majors cleared in `01-idea.md`. No further idea updates required for Gate A.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

**This round:** Yes — Result **ok**.

## Round notes

- **Round 1:** Blocked on missing draft metric map + unset defaults vs month_board.
- **Round 2:** Re-read updated idea. Defaults settled (A/B off; month_board stays). Draft A/B metric map + period present. Open Q4 settled; Q3/5/6 leans enough for product. Problem map / Core / ★ / Outcome OK. 80/20 pass; day-to-day checklist acceptable. Result **ok** → Gate A auto-approve.
