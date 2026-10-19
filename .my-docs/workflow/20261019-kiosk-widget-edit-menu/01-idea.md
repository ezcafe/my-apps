# Idea: Kiosk widget edit menu (resize + same-topic sources)

## Problem map (diagnose before framing)

**Mode:** full

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?

- `/kiosk` is a glance **status board** of fixed widget cells (not a home dashboard or freeform builder).
- Users personalize mainly in **Settings**: on/off per registry widget, plus board layout (grid vs fullscreen, columns 1–4, focus widget).
- Each enabled id maps to a **fixed composition** (e.g. loan summary always shows remaining + obligation together).
- Prefs persist in `user_preferences` (`kiosk_widgets`, `kiosk_layout`) via authenticated PATCH.
- There is **no** on-board edit mode, per-cell menu, per-widget size, or multi-source pick inside a cell.

#### What is missing / wrong?

- No way to **resize** one cell to a predefined size while staying on the board.
- No way to choose **1–3 data sources** for a cell (e.g. Remaining loan + Monthly obligation).
- No **same-topic** rule in product (money | loan | baby care) — registry groups are finer (`money`, `loans`, `baby`, plus context/investments/bills/savings).
- Settings toggles whole widgets; they do not tune **what a cell shows** or **how large it is**.
- DESIGN_GUIDE / glossary still frame kiosk as **not** a widget builder and avoid “per-widget size” — product ask pushes past that line with a **bounded** menu (predefined sizes + same-topic sources only).

#### What are the consequences?

- Users leave glance flow for Settings just to swap whole widgets when they only want different signals or footprint.
- Board stays cluttered or sparse because cell size is one board-wide column preference, not per cell.
- Same-topic mixes users want (loan metrics in one cell) require enabling multiple fixed widgets or accepting unused fields.
- Cross-topic confusion risk if Source pick is unconstrained later.
- Wall / phone / tablet layouts stay hard to tune without rebuilding the whole board.

### Step 2 — Real core problem

- **Surface symptoms:** No top-right per-widget control in edit mode; resize and source options do not exist.
- **Root cause:** Kiosk personalization stops at “which whole cells” + “board chrome”; cell **content mix** and **cell footprint** are fixed by registry definitions.
- **Core problem (one sentence):** Users cannot change a kiosk cell’s size or which same-topic signals it shows without leaving the board or replacing entire widgets.

### Mind map (visual text)

```text
Problem: cells not tunable on the board
├── Happening: Settings on/off + board layout only; fixed widget payloads
├── Missing: edit-mode menu; predefined resize; 1–3 same-topic sources
├── Consequences: Settings round-trips; wrong density; unused fields; topic drift risk
├── Core: no per-cell size + source control on /kiosk
└── ★ Top priority: on-board menu — Resize (predefined) + Source (1–3, same topic)
```

## Problem

Users cannot change a kiosk cell’s size or which same-topic signals it shows without leaving the board or replacing entire widgets.

## User / audience

Signed-in household operators who use `/kiosk` as a glance board (phone, tablet, or wall display) and already use Settings → Kiosk for which widgets appear.

## Outcome

On `/kiosk`, the user **enters edit mode** with an **Edit** control on the board chrome and **exits** with **Done** (same chrome). While editing, each **money / loan / baby care** cell shows a top-right control that opens a menu with: **(1) Resize** — pick one predefined size (small fixed set; Design picks names, **≤4** options); **(2) Source** — pick **1 to 3 signals** (not whole widgets) from **one topic only** (money **or** loan **or** baby care). A **data source** is one glance signal the cell can show (e.g. a number or status), not a full registry widget swap. **Money** topic = core money signals only; bills / savings / investments stay out of this topic in v1. Weather / context and other unmapped cells stay as today (Settings on/off only — **no** Resize / Source menu). Choices persist with the existing kiosk preferences story.

## Metric

From Edit → Done, a user can resize one money/loan/baby cell and set 1–3 same-topic signals on that cell; reload `/kiosk` keeps both; invalid cross-topic mixes are blocked (UI and save).

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Kiosk = status board, not widget builder; layout from Settings | `docs/DESIGN_GUIDE.md` (Kiosk glance pattern) | Also out-of-scope: drag rearrange / freeform builders (dashboard pattern table) |
| Widget ids, feature groups, fixed labels/descriptions | `lib/kiosk/widget-registry.ts` | Groups: context, baby, money, loans, investments, bills, savings |
| Board layout shape (mode, columns, focus) — no per-cell size | `lib/kiosk/kiosk-layout.ts`; `GLOSSARY.md` (Kiosk layout mode) | Glossary explicitly avoids “per-widget size” today |
| Prefs columns + types | `db/schema/user-preferences.ts` | `kiosk_widgets`, `kiosk_layout` jsonb |
| Layout/widgets in user prefs (ADR) | `docs/decisions/ADR-003-kiosk-layout-in-user-preferences.md` | Same PATCH story for Settings and board |
| Settings UI: toggles + layout only | `components/kiosk/kiosk-widget-settings.tsx` | Saves via `PATCH /api/user/preferences` |
| Board renders fixed cells from enabled ids | `components/kiosk/kiosk-dashboard.tsx` | No edit overlay / menu today |
| Example loan metrics (remaining, obligation) | `components/loans-insights-stats.tsx`; registry `loans.summary` | Matches user Source example language |
| Layout persistence e2e surface | `e2e/kiosk-layout.spec.ts` | Settings-driven layout, not per-cell edit |

**Project shape (quick scan):** Next.js shell app (Money, Baby, Kiosk) with PostgreSQL/Drizzle and Pocket ID auth. `/kiosk` is a widget-cell glance board; personalization today is Settings widget toggles plus board layout prefs (ADR-003), not per-cell menus.

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** `/kiosk` **Edit** / **Done** board chrome; top-right menu on money/loan/baby cells only; Resize (≤4 sizes) + Source (signals) subflows; weather/context stay Settings-only; skeleton/edit overlay parity; clean-minimal glance pattern (bounded, not a builder canvas).

## 80/20 UI (day-to-day)

### Main user goals

- Glance the board without chrome noise in normal mode.
- Enter edit mode and tune **one cell** (size + sources) without a Settings detour.
- Keep sources coherent (one topic) so the cell stays readable at a glance.

### Vital few (high-impact ~20%)

- **Edit / Done** on board chrome + top-right control on each money/loan/baby cell.
- Resize to a **predefined** size (one pick; ≤4 sizes).
- Source pick **1–3 signals** (same topic: money | loan | baby care) — examples below.
- Persist so reload matches last edit.

**Data source (user words):** a single signal the cell can show — not turning the cell into a different whole widget. Examples:

| Topic | Example sources (signals) |
|-------|---------------------------|
| Money | This-month spend, income, net |
| Loan | Remaining balance, monthly obligation, next payment |
| Baby care | Last feed, next nap / sleep, last diaper |

### Primary UI — core actions dominant

- **Important info / action #1 (always visible in edit mode):** Top-right control on each **money / loan / baby care** cell (opens Resize / Source menu).
- **Important info / action #2 (always visible on the board):** **Edit** to enter edit mode; **Done** to exit — glance stays quiet when not editing.
- **Core action placement:** Menu lists Resize and Source first; short labels; immediate apply + save feedback; reject cross-topic before save.
- **Secondary actions:** Full widget on/off, board mode/columns/focus stay in Settings; weather/context stay Settings-only; drag-reorder and freeform layout stay out.

### Top user journey to optimize

Tap **Edit** on `/kiosk` → open a money/loan/baby cell menu → Resize **or** Source → pick size or 1–3 same-topic signals → save/persist → tap **Done** → glance confirms size + signals.

### Sensible defaults

- New/untuned cells keep today’s registry default composition and default size.
- Source picker starts on the cell’s current topic (or empty → user picks topic first).
- Resize defaults to current size (or the middle predefined size if none stored).

### Biggest usability risks to fix first

- Edit chrome competing with glance readability (accidental edit on wall display).
- Unclear what a “data source” is vs a whole widget id.
- Same-topic rule hard to discover until after a blocked mix.
- Predefined sizes that break e-ink / dense cards when too small.
- Tension with “not a widget builder” — menus must feel **bounded**, not a dashboard constructor.

## Non-goals

- Drag-to-rearrange cells or freeform absolute layout.
- Cross-topic source mixes (money + baby, loan + money, etc.).
- Unlimited source count or arbitrary custom metrics.
- Replacing Settings widget on/off or board mode/columns/focus in this pass (extend, do not rip out).
- **Resize / Source menu on weather, context, or other unmapped cells** in v1 — those stay fixed composition; Settings on/off only.
- Treating bills / savings / investments as **money** topic sources in v1 (deferred).
- Source as whole-widget swap (picker is signals only).
- Full visual widget builder / theme packs.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| “Data source” = one signal (not a whole registry widget id); examples in Vital few | Yes for Source UX | Gate A: confirm catalog labels | Source becomes widget-swap — different model |
| Predefined sizes are a small fixed set (**≤4**, not free px); names TBD in Design | Yes | Design size table | Scope shrinks to board columns only / drops Resize |
| Topics: loan ≈ registry `loans`; baby ≈ `baby`; **money** = core money only (not bills/savings/investments in v1) | Yes for validation | Gate A: topic membership | Expand/collapse allowed source lists |
| Edit / Done on board chrome is the only enter/exit path (not always-on hover) | Yes | Gate A: confirm | Wall-display safety and chrome rules change |
| Bounded per-cell menu is an allowed exception to “not a widget builder” | Yes to ship | Gate A vs DESIGN_GUIDE | Re-scope to Settings-only size/source forms; docs follow-up after Gate A |

## What we should not build

- Freeform dashboard builder, rainbow chrome, or per-pixel sizing.
- Cross-topic composite cells.
- Silent auto-mix of unrelated metrics.

## Success criteria

- [ ] **Edit** / **Done** on `/kiosk` board chrome enter and exit edit mode.
- [ ] Edit mode exposes a top-right control on each **money / loan / baby care** cell (not weather/context).
- [ ] Menu offers Resize and Source as the two primary actions.
- [ ] Resize applies one of a predefined size set (≤4) and persists across reload.
- [ ] Source allows 1–3 **signals**; all picks share one topic (money **or** loan **or** baby care); cross-topic blocked.
- [ ] Normal (non-edit) glance stays quiet — no permanent heavy chrome.
- [ ] Existing Settings widget toggles + board layout still work; prefs remain the persistence path.

## Open questions

- Exact **predefined size** names + footprint rules vs grid columns (cap: ≤4; Design).
- Full **signal catalog** ids + labels per topic (examples above are product intent, not final ids).
- Is a cell still a registry `KioskWidgetId`, or does Source turn cells into a **generic shell** with a source list?
- DESIGN_GUIDE / glossary still avoid per-widget size — **docs follow-up after Gate A** (not blocking day-to-day wording).
