# Idea: Baby home controls polish + feed-session merge

## Problem

Baby care home (from `baby-home-redesign` + `baby-home-logging-detail`) already has quick-care: breast L/R, B1 bottle, nap, and a 2×2 diaper Kind grid. Two things still hurt:

1. **Control chrome feels loose.** Kind tiles (Wet / Poop / Mixed / Dry) and bottle cluster (face + ± + Custom) have gaps and outer padding so they look like separate buttons, not one tight control. Custom still sits as under-card text, not an icon-only third segment under ±. Row 2’s three big blocks (bottle / nap / diaper) do not always share one clear height. Active/selected state is weak compared to Money page controls, so it is hard to see what is selected at a glance (especially at night).

2. **Feed day-count lies when switching sides/source.** Today, tapping left breast then right (or bottle) tends to **save each side/source as its own feed**, so status can show `1/8` then `2/8` then `3/8` for what the caregiver thinks is **one** feeding session. Desired: rapid left → right → bottle stays **one** session, with a combined summary like `Feed (Breast L + Breast R + Formula 90 ml) · … · 1/8 today`.

This pass is **polish + session-merge behavior** on top of the existing home. It does not reopen Gate 3 for prior workflows.

## User / audience

**Primary:** a tired caregiver logging one-handed at night (EN or VI).

**Secondary:** another caregiver in the same family workspace who reads last-feed status and today’s feed count.

## Outcome

What “done” looks like:

- **Kind 2×2:** Wet / Poop / Mixed / Dry sit flush — **no gap** between or around tiles; **one shared border** between neighbors (segmented control look).
- **Bottle cluster:** Layout is **one column of three segments** — bottle face on top, ± stacked in the middle column area as today, **Custom as icon-only under ±**. No gap between or around face / ± / Custom; **one border** between segments (same clustered look as Kind).
- **Row 2 height:** Bottle, Start nap, and diaper Kind blocks share the **same outer height**.
- **Money-aligned styles:** Colors / button surfaces / selected treatment match the **Money** page patterns (semantic tokens, stronger **active/selected** so the chosen option is obvious in light and dark).
- **Feed session merge:** Immediately switching among left breast, right breast, and bottle **does not** bump `feedsToday` for each tap. One continuous session shows a **combined** last-feed summary and still counts as **1** toward today’s feed total (e.g. left → right → bottle → `… · 1/8 today`, not `3/8`).

## Metric

In a night check: Kind and bottle controls read as tight segmented clusters with a clear selected state; Custom is icon-only under ±; row 2 heights match; and left → right → bottle within one session leaves status at **1 of today** with a combined feed summary (not three separate counts).

## Non-goals

What we will **not** build in this pass:

- Finishing or reopening Gate 3 merge for `baby-home-redesign` / `baby-home-logging-detail`.
- Full timeline redesign, charts, or Insights alerts.
- Undo after quick save.
- Pump-only or solids logging on home.
- Live multi-device timer sync.
- Reworking nap timer rules or care-order beyond what session-merge requires.
- Backfilling / rewriting old historical multi-event feeds unless Gate 1 says otherwise (default: **forward-only**).

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| “Immediately” means a clear product rule (e.g. same open session / switch before pause), not an unbounded forever-merge | Yes | Ask user for window or end conditions | Design invents a wrong merge rule; counts stay wrong or over-merge |
| Left ↔ right ↔ bottle all belong in **one** merge family (not breast-only) | Yes for stated example | Confirm with user | Bottle stays a separate feed count |
| Combined status copy like `Breast L + Breast R + Formula 90 ml` is the target summary shape | Likely | Ask user / check existing `careSummary` | Different join order, labels, or omit zero-duration sides |
| UI polish is visual + layout only (tokens / borders / gaps / heights / Custom placement) — no new care types | Yes | Ask if Money means specific chips vs all buttons | Scope creeps into Money redesign |
| Skeleton must stay in parity with new clustered layouts | Yes (repo rule) | N/A | CLS / test failures |
| Prior home contracts (2×2 Kind, B1 stacked ±, Wet/Dry instant save, Poop/Mixed sheet) stay unless polish forces a small layout tweak | Yes | Diff against logging-detail design | Accidental regress of diaper sheet / Done flash |

## What we should not build

- A general “edit any past feed into a session” tool on home.
- Medical advice or feed-count goals that claim clinical certainty.
- New Money pages or a shared component library rewrite beyond reusing existing Money **look** on baby controls.

## Success criteria

- [ ] Kind tiles: flush segmented 2×2 — no gap between/around; single shared borders; selected state clearly stronger (Money-like).
- [ ] Bottle: face + stacked ± + **icon-only Custom under ±** in one flush cluster; single shared borders; no outer “island” gaps.
- [ ] Row 2 bottle / nap / diaper outer heights match.
- [ ] EN + VI still work; light and dark follow the design guide; skeleton matches live layout.
- [ ] Immediate left → right → bottle (and breast ↔ bottle switches in the same session) **do not** each increment today’s feed count; status stays **1** for that session with a **combined** last-feed summary.
- [ ] Unit (+ e2e as needed) cover layout contracts tests can assert and the feed-session merge / count behavior.

## Open questions

Settled at Gate 1 (2026-09-13):

1. **Merge window:** **1A + grace** — open breast session; short grace after stop for bottle add-on. Design picks exact grace minutes.
2. **Bottle mid-breast:** **2A** — one merged session (L + R + formula in one feed).
3. **After stop + gap:** **3A** — always a new feed once prior side stopped/saved and grace expired.
4. **Money style:** **4B** — primary button active/selected look; **ripple effect after click**.
5. **Custom icon:** **5B** — ml / droplet-style glyph; aria-label for Custom ml.
6. **History:** **6A** — forward-only (no backfill of old splits).
7. **Storage:** **7B** — one physical feed row for the whole session.

---

**Gate 1:** Approved.
