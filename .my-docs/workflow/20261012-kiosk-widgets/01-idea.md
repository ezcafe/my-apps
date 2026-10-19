# Idea: Configurable kiosk widgets with layout modes + current-month money glance

## Problem map (diagnose before framing)

**Mode full:** Steps 1–2 + mind map before Outcome.

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?
Objective symptoms, metrics, or factual observations (3–5):

- `/kiosk` already renders enabled widgets from a registry (`lib/kiosk/widget-registry.ts`) via a fixed band stack in `kiosk-dashboard.tsx`.
- Settings → Kiosk already toggles widgets on/off and saves `kioskWidgets` (`kiosk-widget-settings.tsx`, `user_preferences.kiosk_widgets`).
- Defaults = weather + net this month + loan payments; other ids exist but stay off (`DEFAULT_KIOSK_WIDGETS`).
- No stored layout mode: no fullscreen vs grid, no 1–4 column preference in prefs schema.
- Current money glance is small cards (net / bills / savings), not one current-month board with budget viz + paired metric rows (user ask + `refs/money-widget-ref.png` layout intent).

#### What is missing / wrong?
Gaps in resources, clarity, or alignment (3–5):

- User cannot choose how widgets fill the board (fullscreen one widget vs multi-column grid).
- Column density (4 / 3 / 2 / 1) is not a product control; auto-fit only sizes metric cards.
- No single “current month money” widget matching the ask: budget chart + Expenses/Income, Net/Savings rate, Bills/Loans.
- DESIGN_GUIDE calls kiosk a status board “not a widget builder” — layout power must stay glance-simple, not a free dashboard builder.
- Existing small money widgets may overlap a new combined money widget if both stay on without clear roles.

#### What are the consequences?
Downstream impacts if unsolved (3–5):

- Wall / tablet / phone kiosk cannot match intended glance density (too sparse or too tall).
- Users keep toggling widgets but still get one rigid stack — settings feel incomplete.
- Month money story stays fragmented across cards; budget utilization stays off the board.
- Scope creep into drag-and-drop builders conflicts with DESIGN_GUIDE out-of-scope rules.
- Duplicate or conflicting money widgets confuse defaults and Settings labels.

### Step 2 — Real core problem

- **Surface symptoms:** Fixed stack only; no fullscreen/grid/columns; no current-month money board with budget + key pairs.
- **Root cause:** Product model is “toggle which bands render” only — not “compose a glance board (content + layout) for how the user watches the kiosk.”
- **Core problem (one sentence):** Users cannot shape the kiosk glance (what shows and how it fills the screen) or see one clear current-month money widget, because prefs and UI only support on/off bands in a fixed stack.

### Mind map (visual text)

```text
Problem: kiosk widgets incomplete for glance boards
├── Happening: toggles + fixed stack; no layout prefs; money = small cards
├── Missing: fullscreen/grid 1–4 cols; current-month money board; clear widget roles
├── Consequences: wrong density; fragmented month story; builder creep risk
├── Core: on/off bands ≠ content + layout for how users watch kiosk
└── ★ Top priority: let users pick widgets + layout mode, and ship current-month money glance
```

## Problem

Users cannot shape the kiosk glance (enabled widgets + fullscreen/grid density) or see one current-month money board (budget + key pairs), because today’s model is only on/off bands in a fixed stack.

## User / audience

Primary: signed-in household user (busy parent per DESIGN_GUIDE) who opens `/kiosk` as a glance board on phone, tablet, or dedicated display — configures widgets in Settings, then watches the board day to day.

## Outcome

User can turn widgets on/off in Settings; choose fullscreen or a grid with 1–4 columns (phone auto-caps denser grids so the board stays readable); see existing kiosk info as default widgets upgraded with one current-month money board; and (when that money widget is on) read budget chart plus rows for Expenses/Income, Net/Savings rate, and Bills/Loans — layout and content readable as one glance composition (ref image = layout density cue, not Tesla branding).

**Fullscreen (user rule):** one widget fills the board. With many widgets enabled, show the first enabled widget (registry order) full-bleed; other enabled widgets stay available when the user switches to grid or picks a different focus widget in Settings (simple focus picker — not a builder). With zero widgets enabled: empty state asks to enable one.

**Mobile grid (user rule):** max columns follow viewport width (e.g. 4/3 only when wide enough; phone max 1–2). A denser choice in Settings never forces an unreadable phone layout.

## Metric

From Settings, user enables/disables widgets and picks a layout mode (fullscreen or grid columns 1–4); reopen `/kiosk` and confirm the board matches that choice without reload confusion — fullscreen shows one focus widget (first enabled by default, or the Settings focus pick); phone never shows an unreadable 3–4 column squeeze. With the money widget on, user can name current budget progress plus at least Expenses, Income, Net, Savings rate, Bills, Loans in one short glance (target under ~10 seconds on the intended display width).

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Kiosk = status board; not widget builder | `docs/DESIGN_GUIDE.md` (§ Kiosk glance pattern; Insights “Out of scope”) | Layout must stay glance-simple |
| Page + band stack | `app/(shell)/kiosk/page.tsx`, `components/kiosk/kiosk-dashboard.tsx` | Actual render order |
| Widget ids / defaults | `lib/kiosk/widget-registry.ts` | Existing “default widgets” |
| Settings toggles | `components/kiosk/kiosk-widget-settings.tsx`, `app/(shell)/settings/page.tsx` | On/off only today |
| Prefs storage | `db/schema/user-preferences.ts`, `lib/user-preferences-service.ts` | `kioskWidgets` only; no layout field |
| Data load | `lib/kiosk/load-kiosk-page.ts` | Per-widget payloads |
| Shell entry | `lib/features/registry.ts` | Kiosk in nav |
| Money widget layout cue | `.my-docs/workflow/20261012-kiosk-widgets/refs/money-widget-ref.png` | Large viz + metric grid density |
| Product ask | User request in this run (`00-run.md` Notes) | Fullscreen/grid; money rows |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** Surfaces: Settings → Kiosk (toggles + layout + optional simple focus pick for fullscreen) and `/kiosk` board (fullscreen one widget vs grid 1–4 cols, width-capped on phone) + skeleton parity. Current-month money widget replaces small money cards in defaults: budget chart (current vs total) + paired rows Expenses/Income, Net/Savings rate, Bills/Loans — density inspired by ref image; app tokens / clean-minimal, not e-ink Tesla chrome. Old `money.net_month` / `bills.summary` / `savings.summary` stay optional toggles off by default. Two Design options in Mode full — no solution branches here.

## 80/20 UI (day-to-day)

### Main user goals

- Glance the board quickly after opening `/kiosk`.
- Choose which widgets appear (Settings).
- Match layout to the display (fullscreen one focus vs multi-column grid).
- Read this month’s money story (budget + expenses/income/net/savings/bills/loans) without opening Money home.

### Vital few (high-impact ~20%)

- Reliable widget on/off that matches `/kiosk`.
- Layout mode: fullscreen vs grid with 1–4 columns.
- Current-month money widget composition (chart + six metrics in three pairs).
- Sensible defaults = existing glance story upgraded (weather + new money board + loans; old small money cards off by default).

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Active layout of enabled widgets on `/kiosk` (fullscreen one focus widget, or chosen column grid capped by width).
- **Important info / action #2 (always visible):** When money widget is on — budget progress + Expenses/Income (then Net/Savings rate, Bills/Loans). When money widget is off — primary content of the first enabled non-money widget (e.g. weather summary, or net/loans if those toggles are on).
- **Core action placement:** Settings for toggles + layout (+ simple fullscreen focus pick if needed); kiosk page for glance only (no builder chrome on the board). Clear labels; helpful defaults; immediate save feedback (existing notify pattern).
- **Secondary actions:** Optional insight-heavy widgets; old small money-card toggles; weather city setup; deep links into Money/Loans; weather detail page.

### Top user journey to optimize

Open Settings → Kiosk → toggle widgets + pick layout (and focus if fullscreen) → open `/kiosk` → glance money (if on) or first non-money widget story, plus other enabled widgets at a readable density → (optional) deep link.

### Sensible defaults

- Default enabled widgets = today’s glance story upgraded: weather + **new current-month money widget** + loan payments. New money widget **on by default**.
- Old small money cards (`money.net_month` / `bills.summary` / `savings.summary`) stay available as optional toggles but **off by default** (not in the default set — the new money widget replaces their glance role).
- Default layout: stack-like / grid 1 (or current readable stack) until the user opts into a denser grid; phone still auto-caps columns by width.

### Biggest usability risks to fix first

- Fullscreen vs “one column” ambiguity — mitigated by rule: fullscreen = one full-bleed focus widget (first enabled or Settings focus pick); zero widgets → empty enable prompt.
- Overlap between new money widget and existing net/bills/savings cards — mitigated: new money replaces them in defaults; old cards optional off by default.
- Grid with 3–4 columns unreadable on narrow phones — mitigated: auto-cap max columns by viewport (phone max 1–2).
- Settings controls that feel like a dashboard builder (conflicts with DESIGN_GUIDE) — keep toggles + layout + simple focus pick only.

## Non-goals

- Drag-and-drop rearrange / freeform dashboard builder (DESIGN_GUIDE out of scope).
- Per-widget custom sizes beyond fullscreen vs shared grid column count.
- New non-money widget catalog beyond extending the existing registry model.
- Tesla / e-ink visual theme; third-party vehicle branding.
- Changing weather detail page unless layout wiring requires it.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Fullscreen = one widget full-bleed; many enabled → first in registry (or Settings focus pick); zero → empty enable prompt | Yes (settled Gate A) | Grill if focus picker feels like a builder | Drop focus pick; only first-enabled + mode switch |
| New current-month money widget replaces net/bills/savings in the default set; those ids stay optional off by default; weather + loans stay defaults | Yes (settled Gate A) | Check Settings labels vs user mental model | Re-add a small card to defaults only if glance gaps remain |
| Layout mode + column count persist per user (like `kioskWidgets`) | Likely | Check if device-local is enough | Cookie/local-only vs prefs column |
| Ref image is layout density only; content labels come from user ask | Yes | Align Design mock to clean-minimal tokens | Avoid shipping stipple/Tesla look |
| Dense grid prefs auto-cap on narrow viewports (phone max 1–2 cols) | Yes (settled Gate A) | Try 4-col pref on phone width | Else force grid-1-only below a width token |

## What we should not build

- Widget marketplace, arbitrary HTML widgets, or multi-user shared board layouts in this pass.
- Editing budgets or posting transactions from the kiosk board.

## Success criteria

- [ ] Settings can toggle which widgets show on `/kiosk` (extend existing control if needed).
- [ ] User can choose fullscreen or grid with 4 / 3 / 2 / 1 columns; `/kiosk` reflects the choice; phone auto-caps denser grids (max 1–2 cols).
- [ ] Fullscreen shows one full-bleed widget (first enabled by registry order, or Settings focus pick); zero enabled → empty state to enable one.
- [ ] Defaults: weather + current-month money widget + loans; old net/bills/savings cards optional and off by default.
- [ ] Current-month money widget shows budget chart (current vs total) and rows: Expenses + Income; Net + Savings rate; Bills + Loans.
- [ ] When money widget is off, always-visible #2 is primary content of the first enabled non-money widget.
- [ ] Loading skeleton matches live board layout (no CLS).
- [ ] Works in light and dark; follows DESIGN_GUIDE tokens (not ref-image chrome).

## Open questions

- ~~Fullscreen with 0 / 1 / many widgets?~~ **Settled:** one full-bleed focus (first enabled or Settings focus pick); zero → empty enable prompt; no rotate.
- ~~New money vs small money cards?~~ **Settled:** new money replaces them in defaults (on by default); old cards optional off by default; weather + loans stay defaults.
- Default layout after upgrade: keep today’s vertical stack equivalent (grid 1 / stack-like), or name another default? (Phone still width-caps columns.)
- Must layout prefs sync across devices via `user_preferences`, or is same-browser enough for v1?
- Exact budget metric: workspace total budget utilization for the calendar month, or another Money budget definition already used in Insights?
