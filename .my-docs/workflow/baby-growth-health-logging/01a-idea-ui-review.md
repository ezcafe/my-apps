# Idea day-to-day review (Gate A): baby-growth-health-logging

**Result:** ok
**Round:** 2
**Updated:** 2026-09-18
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Open **Growth** (not Measure) when logging size / health / pump events.
- Log a med, vitamin, vaccine dose, pump session, temperature, or symptoms in a few taps with time defaulting to now.
- Scan recent rows and fix or delete a wrong entry.
- On Insights, change only the date/time range — no care-type or growth-kind filter chrome in the way.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Measure → Growth rename (nav, titles, cues) | Split wording breaks the habit loop (“where do I tap?”) |
| Log med / vitamin / vaccine dose with time + simple details | Illness and clinic weeks are high-stress; capture must be fast |
| Log temperature + named symptoms (with or without fever) | Fever nights and “is this new?” checks are the main health use |
| Log breast-pumping on Growth (amount + time), not Feed | Pump is frequent; one clear write home avoids skipped or double logs |
| Insights date/time filter only | Review should be range → scan; extra chips slow every visit |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Kind picker + Save for kinds **written on Growth only** (growth measures / med / vitamin / vaccine dose / pump / temperature+symptoms); time = **now** by default |
| Important info / action #2 (always visible) | Recent entries list (scan + edit / delete) |
| Secondary / deferred (expand / modal / menu / overflow) | Units, notes, historical time edit; Vaccines schedule (read/plan) + deep link into Growth for a dose; Insights chart toggles under “More”; optional pump fields (notes, side) |
| Core actions dominant? | yes — write homes locked; kind picker does not offer Feed pump or Vaccines-schedule as alternate write homes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Vaccines schedule vs Growth dose | yes (locked) | Doses write on Growth; Vaccines = schedule/read + link |
| Pump on Growth vs Feed pump method | yes (locked) | Growth = I expressed (amount + time); Feed pump = baby fed expressed milk |
| Symptoms without temperature | yes (locked) | Multi-select allowed with or without temp |
| Too many kinds/fields on one form | yes | Kind first, few fields — keep that lock |
| Insights empty/broken after chip removal | yes | Date-only chrome + empty copy that mentions range only |
| Empty med/vitamin name | yes (locked) | Short name required or last-used pick |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Non-goals drop clinical AI, dosing calculators, Activities redesign, per-symptom charts. Insights trim + single write home per kind keep the primary surface focused. |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open Baby → Growth → choose kind → enter value / check symptoms (temp optional) → Save → see row in recent list | yes — write homes and symptom/name rules locked |
| Open Insights → set date range → Apply → review (no care/kind chips) | yes — clear and matches daily review |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Recorded time = now | Matches “log it when it happens” |
| °C; last-used med/vitamin name when stored | Fewer taps on repeat doses |
| Med / vitamin name required (or last-used pick) | Clinic review stays useful; no empty “medicine” rows |
| Insights period = current product default; no care/kind chips | Familiar range; all types in range |
| Symptom checkboxes start unchecked; temp optional | Avoids false marks; allows no-fever illness days |
| Pump happy path = amount + recorded time | Fast express log; duration/start-end deferred |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Can a caregiver finish Growth rename-visible path + one med (or vitamin / vaccine) + one temperature-with-symptom + one pump, then Insights date-range only (idea Metric)?
- Wrong-home rate: vaccine dose started on Vaccines then abandoned vs completed via Growth link; pump logged on Feed vs Growth.
- Abandoned saves on med/vitamin when name is empty or hard to find.
- Insights visits that still hunt for removed care/kind filters (support / rage-taps).

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Goals, #1/#2, and write-home locks align for daily use |
| Convenience (few steps, low friction in daily use) | yes | Now-default, kind-then-short-form, locked homes cut hesitation |
| Easy to use (clear actions, low learning cost) | yes | Growth owns writes; Vaccines/Feed roles spelled out in plain words |
| Understanding (problem + outcome make sense to a real user) | yes | One Growth place + simpler Insights review is easy to grasp |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Phone-first logging; kind-then-short-form + large Save fits — confirm in UI concept |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Kind → short form → Save → recent list; Insights = date first |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | “More insights” / chart gating after filter trim still open | Fine for Design if date-only chrome + empty copy stay locked |
| Nit | Exact redirect list for old Measure URLs | Analyze/Design; rename-visible success criteria already cover the habit |
| Nit | Optional pump fields (notes, side L/R) | Design progressive disclosure — already deferred |

## Fix ask for Ideation

None — Round 1 Majors are locked in `01-idea.md`. No Critical/Major gaps remain for day-to-day Gate A.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Fresh read of `00-run.md` + `01-idea.md` only. No prior chat memory.
- Idea direction is right for parents (Growth rename, fast health logs, Insights date-only).
- Blockers are unresolved write homes and symptom-without-fever — not polish.
- **Result needs update** → Ideation must answer Fix ask before Gate A can auto-approve.

### Round 2 — Ideation update (PO)

- Applied all five Fix-ask locks in `01-idea.md`.
- **Vaccines:** dose write on Growth; Vaccines = schedule/read (+ deep link).
- **Pump:** new Growth log; happy path amount+time; distinct from Feed pump (= baby fed expressed milk).
- **Symptoms:** multi-select with or without temperature.
- **Med/vitamin:** short name required (or last-used pick).
- **Primary UI:** Growth kind picker only offers kinds written there.
- Has UI stays **yes**; full 80/20 UI kept. Ready for Gate A re-check.

### Round 2 — Gate A (end user)

- Re-read `01-idea.md` only for day-to-day use (fresh context).
- Round 1 Majors all cleared by Assumed/Locked write-home and form rules.
- **80/20 overall pass** yes; day-to-day checklist all pass (Enhancement/Nit only left for Design).
- **Result ok** → parent may auto-approve Gate A.
