# Idea: Kiosk money insights heatmap (e-ink)

## Problem map (diagnose before framing)

**Mode:** full

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?

- Kiosk is a status board of toggleable widgets (`/kiosk`); layout and enable flags live in user preferences.
- `money.month_board` is default on (budget + this-month paired metrics).
- Sibling run shipped optional e-ink insights A/B (`money.insights_stats_grid`, `money.insights_chart`) — both default **off**.
- User wants a **third** insights layout: hero + 2×2 KPIs + year contribution heatmap + dither footer, at 100% fidelity to the ref PNG.
- Ref still shows GitHub demo copy (contributions, streaks, Octocat / @handle) — product must remap to money.

#### What is missing / wrong?

- No kiosk widget matches the contribution-heatmap composition (year glance + streak-style KPIs).
- Existing A/B insights do not cover this layout; amending that paused Gate C run is rejected.
- Demo labels are not money language; intensity meaning (count vs spend) is not settled.
- Heatmap widget is not in the registry and is not default-on beside `month_board`.

#### What are the consequences?

- At-a-glance “year of activity” story stays unavailable on the e-ink / kiosk board.
- Splitting work into a new slug avoids mixing A/B chart/grid scope with heatmap fidelity.
- Wrong metric remap makes impressive UI but misleading money signals.
- If heatmap stays opt-in only, most users never see the new glance (user wants default on).

### Step 2 — Real core problem

- **Surface symptoms:** Board has month board + optional A/B insights; no GitHub-style year heatmap cell.
- **Root cause:** Product wants a new default-on widget keyed to one visual SoT, separate from the paused A/B ship.
- **Core problem (one sentence):** The kiosk lacks a default-on money-insights heatmap widget that matches the e-ink contribution screenshot at 100% fidelity with money-meaningful labels.

### Mind map (visual text)

```
Problem: no default-on money heatmap widget
├── Happening: month_board on; A/B insights opt-in; GitHub-looking ref
├── Missing: registry widget + money remap + heatmap composition
├── Consequences: year glance absent; label risk; scope clash if amend A/B
├── Core: ship new default-on heatmap cell at 100% ref fidelity
└── ★ Top priority: Match refs/money-insights-heatmap.png (hero+2×2+heatmap+footer) as money widget, default on with month_board
```

## Problem

The kiosk has no default-on money-insights heatmap widget that matches the e-ink contribution screenshot at 100% fidelity with money-meaningful labels.

## User / audience

- Primary: the workspace owner viewing `/kiosk` (often e-ink / always-on glance).
- Secondary: same user toggling widgets under Settings → kiosk widgets.

## Outcome

A new kiosk money widget (new id, this slug only) renders hero + 2×2 KPIs + contribution-style heatmap + dither footer at **100% design fidelity** to `refs/money-insights-heatmap.png`, with GitHub demo labels remapped to money metrics; **enabled by default** while `money.month_board` stays default on. Paused A/B e-ink run stays untouched.

## Metric

Side-by-side pixel composition check vs the ref (layout bands, dotted rules, dither levels, footer bar) plus defaults test: fresh preferences resolve with both `money.month_board` and the new heatmap widget enabled.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Visual SoT (hero, 2×2, heatmap, dither footer) | `.my-docs/workflow/20261015-kiosk-money-insights-heatmap/refs/money-insights-heatmap.png` | GitHub demo labels → money remap |
| Run settled picks (new slug; both default on) | `.my-docs/workflow/20261015-kiosk-money-insights-heatmap/00-run.md` | Option 1; defaults A |
| Widget registry + defaultEnabled | `lib/kiosk/widget-registry.ts` | `month_board` true; A/B insights false |
| Default widget set tests | `lib/kiosk/widget-registry.test.ts` | Asserts current defaults |
| Kiosk board role / insights A/B chrome | `docs/DESIGN_GUIDE.md` (`/kiosk` section) | Status board; e-ink cells |
| Month board meaning | `lib/kiosk/month-board.ts`, `GLOSSARY.md` | Current-month glance |
| Insights A/B terms | `GLOSSARY.md` | Separate from this heatmap |
| Kiosk load wiring pattern | `lib/kiosk/load-kiosk-page.ts` | Widget-gated loads |
| Product / agent UI rules | `AGENTS.md`, `README.md` | Shell + Money workspace app |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** One new kiosk cell — three bands (hero|2×2 → heatmap → dither footer); monochrome dither only; dotted 1px rules; Settings toggle for the new widget; skeleton parity with live cell. No separate UI concept step beyond matching the PNG.

## 80/20 UI (day-to-day)

### Main user goals

- Glance year-scale money activity at a distance on the kiosk / e-ink board.
- Read hero total + four KPIs without opening Money analytics.
- Keep month board available at the same time (both default on).
- Turn the widget off later in Settings if unwanted.

### Vital few (high-impact ~20%)

- Correct three-band composition matching the PNG.
- Money-meaningful hero + 2×2 labels (not GitHub copy).
- Readable four-level heatmap dither (empty → light → dense → solid).
- Default on beside `money.month_board`.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Hero metric (large number + money label for the year window).
- **Important info / action #2 (always visible):** Contribution heatmap (year of day cells, intensity via dither).
- **Core action placement:** Passive glance widget — no in-cell controls; hierarchy is hero → KPI grid → heatmap → footer.
- **Secondary actions:** Enable/disable (and layout focus) in Settings → kiosk widgets / layout — not on the cell.

### Top user journey to optimize

Open `/kiosk` → see month board + new heatmap (defaults) → read hero/KPIs/heatmap → (optional) Settings → toggle widgets.

### Sensible defaults

- New heatmap widget: **defaultEnabled: true**.
- `money.month_board`: stay **defaultEnabled: true**.
- Do not change A/B insights defaults (remain off) in this pass.

### Biggest usability risks to fix first

- GitHub labels left in place → wrong mental model.
- Heatmap intensity unclear (count vs amount) → pretty but useless.
- Sparse / empty year looks “broken” rather than empty-by-design.
- Fidelity drift (gray fills, color accent, wrong footer) vs e-ink SoT.

## Non-goals

- Amend or unblock paused slug `20261015-kiosk-money-insights-eink` (A/B grid + chart).
- Change defaults for `money.insights_stats_grid` / `money.insights_chart`.
- New Money analytics pages, APIs, or DB tables (reuse existing money data paths).
- Interactive heatmap drill-down, tooltips, or color themes.
- Faithful GitHub / Octocat branding in the product footer.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Year window ≈ last ~365 days (GitHub-like) fits money glance | Prefer yes | Confirm with Gate A / user | Shorter window (e.g. this year YTD) → copy + cell count change |
| Heatmap intensity can be a single money signal (e.g. spend or tx days) | Prefer yes | Pick one signal in Design | Dual meaning needs legend → breaks minimal chrome |
| Existing money aggregates can feed hero/KPIs/heatmap without new API/DB | Per `00-run` Has API/DB=no | Skim loaders in Analyze | Scope expands to API/DB → update run flags |
| “RYAN” lettering in ref is decorative demo art only | Yes | Visual check of PNG | If product wants word art → out of scope / reject |

## What we should not build

- Widget builder / freeform sizes.
- Merging heatmap into month board or into A/B insights widgets.
- Live GitHub sync or contribution import.

## Draft money remap (labels only — not architecture)

| Ref (GitHub demo) | Draft money meaning |
|-------------------|---------------------|
| Contributions in last year (hero) | Count of money-active days **or** transaction count in last year |
| Longest streak | Longest consecutive days with money activity |
| Current streak | Current consecutive active days |
| Most in a day | Peak single-day activity (count or spend) |
| Average per day | Average activity across the year window |
| Heatmap cells | Daily intensity (same signal as peak/average), 4 dither levels |
| Footer “GitHub” / @handle | “Money” + short workspace/user glance label |

Exact signal (count vs spend) stays an Open question for Design.

## Success criteria

- [ ] New widget id registered; **default on**; `money.month_board` remains default on.
- [ ] Live cell matches ref composition: hero + 2×2 KPIs + year heatmap + dither footer (monochrome e-ink).
- [ ] All visible labels are money language (no GitHub / Octocat / @demo handle).
- [ ] Settings can disable the widget; skeleton matches live layout (no CLS).
- [ ] Sibling A/B e-ink run / widgets left as-is (still opt-in).

## Open questions

- Hero + heatmap intensity: **transaction/activity count** vs **spend amount** (pick one primary signal)?
- Streak definition: any logged money day, expense-only days, or days above a threshold?
- Year window: rolling last 365 days vs calendar year-to-date?
- Footer right text: workspace name, user display name, or fixed “Insights · last year”?
- Empty year: all-white grid + zero hero, or a short empty line inside the cell?
