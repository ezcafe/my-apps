# Analysis: Configurable kiosk widgets + month money glance

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

**Has API:** yes — extend `GET/PATCH /api/user/preferences` (auth, same-origin, rate limit).
**Has DB:** yes — `user_preferences` needs layout fields (migration + Drizzle + Zod); widgets already JSONB.
**Verify commands (confirm):** cwd `/Users/ptquang86/ws/my-apps` · build `npm run build` · unit `npm test` · e2e `npm run test:e2e`
**Grill recommended?** yes

## Deep dive (required)

### Overall

#### What is this?
Extend the existing kiosk widget system so Settings controls content **and** layout (fullscreen one focus vs grid 1–4 cols, phone width-capped), and ship one current-month money board (budget + six metrics) that upgrades default glance. Honor Gate A 80/20 and DESIGN_GUIDE “status board, not builder.”

#### Why do we need this?
Users can toggle bands but cannot match board density to wall/tablet/phone, and month money stays fragmented across small cards — so the glance job fails (idea Core / ★).

#### How to do this?
Extend registry + prefs + Settings + `kiosk-dashboard` layout + loader payload; add `money.month_board` (name TBD in Design); flip defaults; keep old net/bills/savings optional off. No drag-drop.

**Decision 1 — Where layout prefs live**

| | **Option 1 — `user_preferences` (with widgets)** | **Option 2 — browser local only** |
|--|--------------------------------------------------|-----------------------------------|
| **What it is** | Persist mode/cols/focus via same PATCH path as `kioskWidgets` | `localStorage` / cookie on device |
| **Example** | `{ kioskLayout: { mode: "grid", columns: 2, focusId: "…" } }` in prefs | Key `kiosk-layout` in browser only |
| **Pros** | Cross-device; one Settings story; matches widgets | No migration; faster ship |
| **Cons** | Schema/validator/API work | Wall tablet ≠ phone config; Settings vs board drift risk |
| **Recommendation** | **Option 1** — layout is part of “how I watch kiosk”; same durability as widgets (idea assumption “likely”). Option 2 only if Grill rejects sync cost for v1. |

**Decision 2 — Budget chart source for month board**

| | **Option 1 — Workspace-scope budget(s) for calendar month** | **Option 2 — Aggregate / primary Insights budget row** |
|--|--------------------------------------------------------------|------------------------------------------------------|
| **What it is** | Prefer `scopeType === "workspace"` spent vs limit for current month | Reuse Insights “budget vs actual” pick/order |
| **Example** | One bar: spentMinor / effectiveLimit for workspace budget | Chart from `budgetRowsForChart` first N rows |
| **Pros** | Matches “current vs total” ask; simple glance | Richer if many category budgets |
| **Cons** | Empty if no workspace budget | Clutter / ambiguous “total” |
| **Recommendation** | **Option 1** for v1 glance; empty/unavailable state if none. Grill confirms if multi-budget rollup needed. |

- **Other ways:** Layout-only pass without money board — fails ★ Outcome.
- **Best practices:** Repo: registry normalize/order; widget-gated `load-kiosk-page`; prefs Zod max; skeleton parity; CSS `repeat(auto-fit, minmax(…))` + container queries (no hardcoded breakpoints). Industry: progressive disclosure; glance ≠ builder. (dev-decision-routing MCP unavailable this run — use DESIGN_GUIDE + shell layout tokens.)

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | New money widget in stack; defaults swap; Settings layout later | Med / incomplete Outcome | later / early tasks only |
| **2. Systemic fixes** ★ | Prefs layout + board engine + money widget + defaults + skeleton | Med–high / API+DB+CLS | yes — Design Option 1/2 |
| **3. Creative / lateral** | Device profiles; rotate focus; local-only layout | High / builder smell | later / optional Option |

- **★ Priority branch:** **2. Systemic fixes** (matches idea ★).
- **Map to Design:** Mode full → Option 1/2 from systemic (e.g. prefs shape + board CSS grid variants; or focus-picker vs first-enabled-only). Quick wins → early tasks. Creative → Non-goals unless Grill picks one.

### Solution pieces

#### 1. Layout prefs + Settings controls

##### What is this?
Fullscreen vs grid, columns 1–4, optional focus widget id — Settings → Kiosk; persist per Decision 1.

##### Why do we need this?
Vital few: match density to display; fullscreen rules settled Gate A.

##### How to do this?
- Approach: Extend patch schema + service + `kiosk-widget-settings` (or sibling) with mode/cols/focus; immediate notify save.
- Other ways: Decision 1 Option 2 local-only.
- Best practices: Keep toggles + layout + simple focus only (no builder chrome).

#### 2. Board layout engine (`/kiosk`)

##### What is this?
Render enabled widgets as one full-bleed focus **or** shared column grid; viewport auto-cap (phone max 1–2).

##### Why do we need this?
Fixed band stack cannot deliver Outcome Metric / Success criteria.

##### How to do this?
- Approach: Refactor `kiosk-dashboard.tsx` from band groups to widget cells driven by mode + effective columns; empty → enable prompt (exists).
- Other ways: CSS-only densify stack without prefs — cannot meet Settings control.
- Best practices: Skeleton parity; concentric radii; container queries over breakpoints.

#### 3. Current-month money widget

##### What is this?
New registry id + loader payload + card: budget viz + pairs Expenses/Income, Net/Savings rate, Bills/Loans.

##### Why do we need this?
Primary new glance story; replaces small money cards in defaults (Gate A settled).

##### How to do this?
- Approach: Extend `KIOSK_WIDGET_IDS` / load path; reuse `computeMoneyAnalyticsSummary` (+ bills/savings ledger filters) and budget load (Decision 2); clean-minimal chart cue from `budget-vs-actual-card` density, not Tesla chrome.
- Other ways: Enlarge existing three cards — fails “one board” ask.
- Best practices: Widget-gated fetch; workspace-scoped finance; bigint-safe amounts.

#### 4. Defaults + old money-card roles

##### What is this?
Defaults → weather + new money + loans; `money.net_month` / `bills.summary` / `savings.summary` optional off.

##### Why do we need this?
Avoid duplicate money clutter; upgrade without blanking board.

##### How to do this?
- Approach: Flip `defaultEnabled` in registry; labels clarify “full month board” vs small cards.
- Other ways: Keep net on by default — Gate A rejected overlap.
- Best practices: `resolveKioskWidgets` null → new defaults; stored prefs keep user choices.

#### 5. Skeleton + loading parity

##### What is this?
`kiosk-dashboard-skeleton.tsx` / `kiosk/loading.tsx` mirror fullscreen vs grid.

##### Why do we need this?
Hard constraint; zero CLS when layout modes change.

##### How to do this?
- Approach: Skeleton variants keyed by same layout props as live board.
- Other ways: Generic shimmer — fails UI skeleton parity rule.
- Best practices: Order/grid/radii match live UI.

## What exists today

`/kiosk` loads widget-gated data (`load-kiosk-page.ts`); dashboard uses fixed bands (context → loans → metric auto-fit → insights). Settings toggles `kioskWidgets` only (`user_preferences.kiosk_widgets`). No layout fields. Money = small cards; analytics already has income/expense/net/savingsRate and budgets.

## Dependencies

- Prefs API/validator/service + migration if Option 1.
- `widget-registry` id list breaks Zod max / tests / e2e that assert defaults.
- DESIGN_GUIDE kiosk glance wording if stack → grid/fullscreen.
- Money workspace presence (existing empty/unavailable alerts).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/kiosk/widget-registry.ts` | Ids, defaults, normalize/order |
| `lib/kiosk/load-kiosk-page.ts` | Widget-gated payloads |
| `components/kiosk/kiosk-dashboard.tsx` | Band → layout engine |
| `components/kiosk/kiosk-widget-settings.tsx` | Toggles + layout/focus UI |
| `db/schema/user-preferences.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts` | Persist layout |
| `components/analytics-chart-cards/budget-vs-actual-card.tsx`, `lib/money-services/analytics.ts` | Budget + month metrics |
| `components/kiosk/kiosk-dashboard-skeleton.tsx` | CLS parity |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Registry normalize / resolve | `widget-registry.ts` | Prefs order + defaults safety |
| Widget-gated loader | `load-kiosk-page.ts` | Avoid unused finance work |
| Prefs PATCH + notify | `kiosk-widget-settings.tsx` | Same save UX for layout |
| Month analytics summary | `computeMoneyAnalyticsSummary` | Net / savings rate / income / expense |
| Ledger preset filters | bills/savings in loader | Bills/Loans rows without new domain |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Content + layout prefs | widgets today; layout missing | Dual axes of glance board |
| Effective columns = min(pref, viewport cap) | new board engine | Phone safety settled Gate A |
| Focus widget for fullscreen | Settings pick or first enabled | Settled 0/1/many rule |
| Status board ≠ builder | DESIGN_GUIDE | Scope bound for Option 1/2 |

## Constraints and risks

- DESIGN_GUIDE: no drag-drop / freeform builder.
- Settings vs board drift if layout not in same prefs path as widgets.
- Duplicate money if defaults not flipped.
- CLS if skeleton ignores mode/cols.
- Prefs API shape change must stay authenticated / rate-limited.
- No workspace budget → chart empty (Decision 2).

## Settled decisions (do not relitigate)

- Gate A ok; 80/20 vital few locked.
- Fullscreen = one focus (first enabled or Settings pick); zero → empty enable prompt; no rotate.
- New money replaces net/bills/savings in defaults; old cards optional off; weather + loans stay.
- Phone auto-caps dense grids (max 1–2 cols).
- Ref image = density cue only; app tokens / clean-minimal.
- Default layout = grid-1 / stack-like until user densifies (Grill Q3).
- **Decision 1:** layout in `user_preferences` with widgets — ADR-003 (Grill Q1).
- **Decision 2:** budget chart = workspace-scope month budget; empty/unavailable if none (Grill Q2).
- Focus picker UI only when mode=fullscreen and 2+ enabled (Grill Q4).
- Prefs shape: nested `kioskLayout` `{ mode, columns, focusWidgetId }` (Grill Q5); invalid focus → first enabled.
- Board CSS engine = Design Option 1/2 only (Grill Q6) — not a product lock.

## Design tree (frontier)

### Settled
- Gate A + Grill R1–R2 above; extend registry/prefs/loader — no greenfield widgets.
- Has API yes; Has DB yes (`kioskLayout` + migration).
- ★ = systemic: layout + money board + defaults.
- Glossary: Kiosk layout mode / focus widget / month money board.

### Open frontier
- (empty) — Result frontier-empty in `02b-grill.md`.

### Blocked
- none

**Grill recommended?** done — see `02b-grill.md`.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| — | — | none this pass | — |

## Blocking questions

~~1–3~~ Settled in Grill (prefs sync, workspace budget, grid-1 default).

## Clear to grill / design?

yes — Grill frontier-empty; clear for Design.
