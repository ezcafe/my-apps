# Idea day-to-day review (Gate A): 20261018-kiosk-baby-care-insights

**Result:** ok
**Round:** 2
**Updated:** 2026-10-18
**Role:** end user (day-to-day usage) — fresh context only

## Problem map / Core problem (product clarity)

| Check | Pass? | Note |
|-------|-------|------|
| Problem map present (Mode full) | yes | WHAT → Core → ★ → Outcome present |
| Core problem one clear sentence a real user recognizes | yes | Parents want baby glance on `/kiosk` in the three screenshot layouts, on by default |
| Outcome matches ★ top priority | yes | ★ three widgets at 100% ref match + defaultEnabled + inject ↔ Outcome |

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Glance current baby state (sleeping / awake + since) without opening Baby Home.
- See recent care activity and “what’s next” (next care label + time) at a distance.
- Optionally see a Funny Time line for mood; turn widgets off in Settings if the board feels crowded.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Nursery hero status + recent activity (ref 3) | First check: is the baby asleep, and what happened last? |
| Next-event as baby next-care (label + time range) | Clear glance of what’s coming; no booking/investor noise |
| Default-on for null prefs **and** one-time inject into saved lists | Day-one board without hunting Settings for new and returning parents |
| Funny Time never empty (local time-keyed quotes) | Third default-on cell stays useful, not a blank hole |
| 100% e-ink chrome match (dither + footer) | Fidelity is the Outcome; wrong chrome breaks trust vs refs |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Per cell: nursery **Sleeping**/status hero; next-care **title** (e.g. `1st Nap`); Funny Time **quote line** — matches refs |
| Important info / action #2 (always visible) | Supporting time / activity detail (or next-care time range) + footer brand bar |
| Secondary / deferred (expand / modal / menu / overflow) | Settings on/off + layout; care logging on `/baby`; schedule capsule empty/hidden if no data |
| Core actions dominant? | yes — read-only glance; #1/#2 always on the cell; Settings secondary |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Booking/investor leftovers on next-event | yes | Settled in Outcome — forbid; verify in Design vs ref chrome only |
| Saved lists missing new ids (no day-one glance) | yes | Settled — one-time inject; empty `[]` stays empty |
| Funny Time empty cell | yes | Settled — local time-keyed quote set |
| Fidelity drift (grey fills, wrong footer) | yes | Still non-negotiable vs PNGs in Build/review |
| Which next-care field (nap vs feed) wins | no | Open Q for Analyze — shape is clear enough for daily use |
| Three default-on cells crowd a busy money board | no | User hard ask; Design can order — Enhancement |
| Nursery schedule capsule without schedule data | no | Outcome already allows empty/hidden; status+activity still ship |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Glance-only cells; Settings for toggles; non-goals kill Home rebuild, builder, live Huckleberry sync |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open `/kiosk` → see all three baby widgets (null prefs **or** after one-time inject) → read status / next care / quote → optional Settings to turn off | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| All three `defaultEnabled: true` (null prefs) | Matches hard ask; new boards show baby without hunting |
| One-time inject of the three new baby ids into saved lists that omit them | Returning parents get the same day-one glance |
| Empty `[]` stays empty | Honors “I cleared the board” |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Side-by-side visual check vs the three refs (already in Metric).
- After ship: whether baby widgets stay on; empty / no-baby-workspace clarity; whether next-care title matches what parents expect.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | R1 Majors settled; goals / #1/#2 / journey / defaults aligned |
| Convenience (few steps, low friction in daily use) | yes | Zero-step glance for null and typical saved lists |
| Easy to use (clear actions, low learning cost) | yes | Board stays glance-only; Settings pattern familiar |
| Understanding (problem + outcome make sense to a real user) | yes | Core/★/Outcome clear; next-care + inject + Funny Time lean settled |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Kiosk already phone/wall; large type in refs; watch nursery density on small cells in Design |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Refs: hero/centered title → support → footer; idea states #1/#2 correctly |

## Fidelity vs refs (product, not pixels)

| Ref | Idea claim | Day-to-day note |
|-----|------------|-----------------|
| `funny-time.png` | Centered time-prefixed quote; dither; Parent \| Funny Time | Hierarchy matches; quote set settled for v1 |
| `next-event.png` | Centered next-care title + time; baby footer (no booking copy) | Chrome reused; domain remapped to baby next care — good for parents |
| `nursery-dashboard.png` | Capsule ID → Sleeping hero → 2×2 activity → schedule pill → Huckleberry \| Nursery | Best daily fit; schedule may be empty — Outcome already says so |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Next-care SoT (nap vs feed vs schedule) still an Open Q | Leave for Analyze — Outcome shape is enough for Gate A |
| Enhancement | Three default-on + money board may feel crowded | Design orders cells — do not drop user default-on ask |
| Enhancement | Footer “Huckleberry” / “Parent” may confuse brand | Design remaps labels; keep Open Q |
| Nit | Inject persist shape (read-once vs resolve-merge) is engineering | Leave for Design — product lean already clear |

## Fix ask for Ideation

None — Round 2 clean.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

**This round:** Yes — Result **ok**.

## Round notes

### Round 1

- Fresh Gate A. Problem map / Core / ★ / Outcome align at product level.
- Refs: nursery is the daily hero; Funny Time and next-event chrome match idea hierarchy; next-event domain was not baby yet.
- Blocked on three Majors: next-event baby meaning, saved-prefs default path, Funny Time content lean.

### Ideation-update (after Gate A R1)

- **Next-event:** Settled as baby “next care” glance — centered label (e.g. `1st Nap`) + time range; forbid booking/investor/“Next booking” copy.
- **Saved prefs:** Settled one-time inject of the three new defaultEnabled baby ids when stored `kiosk_widgets` omits them (empty `[]` stays empty).
- **Funny Time:** Settled small local time-keyed quote set for v1 so the cell is never empty.
- Open Qs left for Analyze/Design: next-care SoT field, nursery schedule data, footer brand remap, inject persist shape.

### Round 2

- Re-read updated `01-idea.md`. All three R1 Majors settled in Outcome / 80/20 / Assumptions / Success.
- Problem map, Core problem, ★ ↔ Outcome still clear.
- **80/20 overall pass?** yes. Day-to-day checklist acceptable. No Critical/Major open.
- Remaining items are Enhancement / Analyze-Design Open Qs — do not block Gate A.
