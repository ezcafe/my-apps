# Gate A review: 20261019-kiosk-widget-edit-menu

**Result:** ok
**Round:** 2
**Updated:** 2026-10-19
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Glance the board with quiet chrome in normal use
- Enter edit mode and tune one cell (size + signals) without a Settings detour
- Keep mixed signals in one cell readable and on one topic

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Edit / Done on board chrome | Clear enter/exit; glance stays quiet when not editing |
| Top-right menu on money/loan/baby cells | On-board tweak without Settings round-trip |
| Resize (predefined, ≤4) | Fix density per cell without rebuilding the board |
| Source 1–3 same-topic signals | One cell shows related glance numbers, not extra whole widgets |
| Persist across reload | Daily trust — edit once, still there tomorrow |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Top-right control on each money / loan / baby care cell (edit mode) — opens Resize / Source menu |
| Important info / action #2 (always visible) | **Edit** to enter; **Done** to exit — board chrome |
| Secondary / deferred (expand / modal / menu / overflow) | Widget on/off, columns, focus → Settings; weather/context Settings-only; no drag / freeform |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Accidental edit on wall display | yes | Edit/Done is clear; Design must keep Done obvious and glance quiet after exit |
| Same-topic rule only felt after a block | yes | Picker should show topic early (idea calls this out) |
| Tiny predefined sizes vs dense / e-ink cards | no | Cap ≤4; names TBD in Design |
| Full signal catalog labels | no | Examples enough for day-to-day; Design fills ids |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Menu is Resize + Source only; weather/context and board chrome stay out; non-goals keep builder out |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Tap Edit → open money/loan/baby cell menu → Resize or Source → pick → persist → Done → glance | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Keep today’s composition + size until tuned | No surprise on first open |
| Source starts on current topic (or pick topic if empty) | Fewer wrong mixes |
| Resize starts on current / middle size | One-tap change, not a blank slate |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Edit → Resize complete without Settings visit
- Edit → Source save with 1–3 same-topic picks; cross-topic blocked
- Reload keeps size + sources; chrome quiet after Done

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | #1/#2 locked; journey Edit→Done complete |
| Convenience (few steps, low friction in daily use) | yes | Short on-board path for common tweaks |
| Easy to use (clear actions, low learning cost) | yes | Edit/Done + signal examples make Source clear |
| Understanding (problem + outcome make sense to a real user) | yes | Core problem + Outcome match ★ priority |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Phone in audience; top-right ok if hit targets stay large |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Problem → outcome → vital few reads cleanly |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Exact predefined size names still open | Leave to Design (already capped ≤4) |
| Enhancement | Full signal catalog ids not final | Examples in Vital few are enough for Gate A |
| Nit | DESIGN_GUIDE / glossary still avoid per-widget size | Docs follow-up after Gate A — already noted |

## Fix ask for Ideation

None — Round 1 Majors cleared in `01-idea.md`.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Re-checked Round 1 Majors: (1) Edit/Done enter/exit locked; (2) data source = signal + topic examples; (3) Resize/Source = money/loan/baby only (weather/context out).
- Core problem is one clear sentence; Outcome matches ★ top priority.
- No Critical/Major left; day-to-day + 80/20 pass.
