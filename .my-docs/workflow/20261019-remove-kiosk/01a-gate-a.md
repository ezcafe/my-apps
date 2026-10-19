# Gate A review: 20261019-remove-kiosk

**Result:** ok
**Round:** 1
**Updated:** 2026-10-19
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Open the app and go straight to a real area (Money, Baby, Settings) — not a board I no longer use.
- Open Settings and only see prefs that still matter (theme, account, etc.).
- Not hit a half-dead Kiosk page from an old bookmark.

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Shell nav without Kiosk | Every session starts at nav; a dead item wastes attention every day |
| Settings without widget/layout blocks | Settings is the other daily surface; clutter or errors hurt trust |
| Clean gone behavior for `/kiosk` | Old links must not look like a broken app |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Remaining shell nav destinations (first useful feature after Kiosk is gone) |
| Important info / action #2 (always visible) | Settings sections that still matter (not kiosk widgets/layout) |
| Secondary / deferred (expand / modal / menu / overflow) | Weather-city control only if something still needs it; else remove with kiosk |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Leftover Kiosk nav or Settings heading | yes | Breaks daily trust immediately |
| Settings breaks after kiosk modules deleted | yes | Blocks theme/account prefs |
| Old `/kiosk` bookmark with no clear outcome | yes | Prefer redirect to Money (or first remaining home) over a bare 404 |
| Weather city UI with no board to show it | yes | Drop with kiosk unless another screen uses it |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Full teardown is the simplify move — no stub “coming soon” page |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open app → shell nav → land on a real feature → Settings → only relevant prefs | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| First useful nav focus after Kiosk removed (e.g. Money) | Matches how people already work without the board |
| Prefs work without kiosk fields | No surprise errors when saving Settings |
| Drop saved kiosk layouts with the feature | Layouts unused if board is gone; no export needed for daily use |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- After ship: confirm no Kiosk in nav; Settings loads; prefs save without kiosk fields; old `/kiosk` URL behaves as chosen; remaining e2e/unit green.

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Teardown idea matches daily use |
| Convenience (few steps, low friction in daily use) | yes | Fewer nav/Settings dead ends |
| Easy to use (clear actions, low learning cost) | yes | Removal; no new screens to learn |
| Understanding (problem + outcome make sense to a real user) | yes | Core problem one clear sentence; Outcome matches ★ |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Shell + Settings still matter on phone; dead Kiosk entry hurts there too |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Problem map → Outcome → 80/20 reads cleanly |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Weather keep/drop still open in idea | Optional: lock “drop weather with kiosk” in Open questions / Success criteria (Gate A call below) |
| Enhancement | Deep-link policy still open | Optional: prefer redirect to Money (or first remaining home) over hard 404 |
| Nit | — | — |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. None — no Critical/Major product gaps.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 overall pass**; day-to-day checklist acceptable) → parent checks **Gate A**.
- **No** if **needs update** or **escalate**. Missing main goals, vital few, #1/#2 core actions, or a cluttered primary UI → **needs update** (not ok).

## Round notes

- Core problem is clear; Outcome matches ★ end-to-end teardown.
- Gate A product confirms: full teardown (Option 2) still right; losing saved kiosk layouts OK (no export).
- Gate A product call for Design: drop weather prefs/Settings/`weather_*` with kiosk unless Analyze finds another consumer; prefer redirect old `/kiosk` URLs to Money (or first remaining home).
- Auto-approve? **Yes**
