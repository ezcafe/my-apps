# Idea day-to-day review (Gate A): 20261015-kiosk-money-insights-heatmap

**Result:** ok
**Round:** 1
**Updated:** 2026-10-15
**Role:** end user (day-to-day usage) — fresh context only

## Problem map / Core problem (product clarity)

| Check | Pass? | Note |
|-------|-------|------|
| Problem map present (Mode full) | yes | WHAT ×3 → Core → mind map ★ → Outcome |
| Core problem one clear sentence a real user recognizes | yes | No default-on year heatmap glance with money labels matching the ref |
| Outcome matches ★ top priority | yes | ★ hero+2×2+heatmap+footer at 100% ref fidelity, default on with month_board ↔ Outcome |

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Glance year-scale money activity from across the room on `/kiosk` / e-ink.
- Read hero total + four KPIs without opening Money analytics.
- Keep the month board visible at the same time (both default on).
- Turn the heatmap off later in Settings if it is not wanted.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Three-band composition matching the PNG | Without it, Outcome fails; glance trust breaks |
| Money-meaningful hero + 2×2 labels | GitHub copy left in → wrong mental model every morning |
| Readable four-level dither heatmap | Core year story; muddy levels = pretty but useless |
| Default on beside `money.month_board` | Opt-in only → most users never see the glance |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Hero metric (large number + money label for the year window) |
| Important info / action #2 (always visible) | Year contribution-style heatmap (day cells, intensity via dither) |
| Secondary / deferred (expand / modal / menu / overflow) | 2×2 KPIs support hero; dither footer; Settings enable/layout — not on the cell |
| Core actions dominant? | yes — passive glance; no in-cell controls; Settings stays off-board |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| GitHub / demo labels left in product | yes | Draft remap exists; Design must ship money language only |
| Heatmap intensity unclear (count vs spend) | yes | Draft table + Open Q; Design picks one primary signal |
| Sparse / empty year looks “broken” | yes | Open Q; empty-by-design must read clearly |
| Fidelity drift (gray fills, color, wrong footer) | yes | Visual SoT non-negotiable |
| Two default-on money cells crowd the board | no | Settled defaults A; Settings can turn heatmap off |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Glance-only cell; configure in Settings; non-goals kill builder, drill-down, GitHub chrome |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open `/kiosk` → see month_board + heatmap (defaults) → read hero / KPIs / heatmap → (optional) Settings → toggle | yes — zero setup for primary glance |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| New heatmap **defaultEnabled: true** | Year glance appears without a Settings trip |
| `money.month_board` stays **defaultEnabled: true** | Keeps current-month glance; user asked for both |
| A/B insights stay **off** | Avoids four money cells on day one |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Side-by-side composition check vs ref (already in Metric).
- After ship: whether heatmap stays enabled; empty-year clarity; whether users understand intensity (count vs spend once locked).

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | All sections filled; defaults + draft remap enough to judge daily use |
| Convenience (few steps, low friction in daily use) | yes | Open `/kiosk` and glance; toggle once if unwanted |
| Easy to use (clear actions, low learning cost) | yes | Passive board; Settings pattern familiar |
| Understanding (problem + outcome make sense to a real user) | yes | Core + ★ + Outcome align; draft remap pictures the glance |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Phone / fullscreen kiosk glance; heatmap density is a Design watch |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Hero → 2×2 → heatmap → footer matches ref bands |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Primary signal still count **or** spend | Leave for Design; draft remap + Open Q1 is enough for Gate A |
| Enhancement | Empty year + year window + footer string still open | Design picks; idea already lists options |
| Nit | Ref letter-art cells are demo; real days will look irregular | Idea already treats RYAN as decorative — keep fidelity = bands/dither/footer, not word shapes |

## Fix ask for Ideation

None — Problem map / Core / ★ / Outcome clear. Defaults settled. Draft money remap + 80/20 present. Open questions are Design depth, not idea blockers.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

**This round:** Yes — Result **ok**.

## Round notes

- **Round 1:** Fresh read of `01-idea.md` only. Problem map + Core pass. Day-to-day path is clear (default-on year glance + Settings off). No Critical/Major. 80/20 pass → Gate A auto-approve.
