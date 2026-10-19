# Design: Kiosk widget edit menu (resize + same-topic sources)

**Mode:** full — from `00-run.md`  
**Has API:** yes — extend `PATCH /api/user/preferences` (`kioskLayout.cells`)  
**Has DB:** yes — extend `user_preferences.kiosk_layout` jsonb shape (no new column; ADR-005)  
**Has auth/PII/schema:** no — same signed-in prefs owner; no new trust boundary

## Decision 1: which design approach?

### Option 1 — Systemic overlay (registry cell + prefs cells)

**What it is:**
Keep each board cell as today’s `KioskWidgetId`. Add **Edit / Done** on a board strip. In edit mode, **money / loans / baby** registry cells get a top-right menu: all get **Resize** (S–XL); only a locked **Source-enabled** subset gets **Source** (1–3 same-topic signals). Persist under `kioskLayout.cells[widgetId]` (ADR-005). Source cards compose from the catalog; Resize-only cards never accept sources. Weather / context / bills / savings / investments stay Settings-only (no menu).

**Example:**
User taps Edit → opens `loans.summary` menu → Source picks Remaining + Monthly obligation → Resize L (each apply PATCHes). Done exits edit. Reload keeps both. Heatmap menu is Resize-only. Settings off hides the cell; overrides stay stored.

**Pros:**

- Matches Gate A ★ path and Grill locks (overlay, nest prefs, board strip, S–XL).
- User-first: Settings on/off stays 1:1; no cell migration; short on-board tweak.
- Reuses ADR-003 PATCH, registry, card families, MoreMenu/Popover, skeleton parity.

**Cons:**

- Three Source-enabled cards must implement compose; Resize-only stay size-only.
- Signal catalog sits beside registry (two vocabularies to keep in sync).
- Residual risk: size S vs dense e-ink cards (must prove readable spans).

### Option 2 — Creative shell (generic cell instance)

**What it is:**
Replace tunable cells with generic shells: instance = topic + sources + size. Registry becomes a signal catalog only; Settings on/off maps to shell instances, not fixed widget compositions.

**Example:**
User creates a “loan glance” shell with three loan signals at size L. Old `loans.summary` id is retired or mapped once into a shell.

**Pros:**

- Cleaner long-term model if many composite cells ship later.
- One render path for all Source mixes.

**Cons:**

- High migrate cost; Settings and e2e rewrite; fights Grill “overlay in v1”.
- System convenience for future builders over today’s glance trust.
- Easy builder creep vs DESIGN_GUIDE status board.

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Medium (prefs + catalog + menus + compose) | High (migrate cells + Settings) |
| Complexity | Overlay + catalog beside registry | New cell identity model |
| Usability | On-board Edit; familiar widgets | Flexible; Settings model changes |
| Failure cases | Weak Zod → bad mixes; tiny S | Migration drift; builder creep |

## Recommendation

**Pick Option 1** because day-to-day value is “tune this cell on the board without leaving glance or relearning Settings.” Overlay + nested `cells` honor Grill and Gate A; Option 2 is cleaner for a future builder but worse for users today. User value over system convenience: sticky widget ids and a bounded menu beat a shell rewrite.

## Chosen design (user-approved)

**Option 1 — Systemic overlay** (Gate B 2026-10-19 — user: "yes Option 1, go build").

### Amend (design-backloop 2026-10-19 — user: "A1 B2")

Extend Option 1 (do not replace):

1. **Immediate Resize + grid reflow** — On Resize apply, footprint updates at once; siblings auto-reflow. Done/reload not required to see layout change.
2. **Drag-handle reorder in edit mode (B2)** — User drags cells to change board order. Persist via **P1** below.

**Persistence lock (P1):** Board order = `kioskWidgets` array order. Change `normalizeKioskWidgets` to **preserve caller order** (filter unknown, dedupe first-seen, **stop** re-sorting to registry). Reorder PATCH sends `kioskWidgets` in new order. `kioskLayout.cells` keys unchanged. Rejected **P2** (`kioskLayout.widgetOrder`) — second list would drift from Settings on/off and duplicate ADR-003 truth.

**DESIGN_GUIDE note:** Guide marks “drag-to-rearrange modules” out of scope for the status board. This amend is a **bounded exception**: edit-mode-only handles, prefs-backed order, no freeform builder. Update DESIGN_GUIDE / glossary in Build (Task 6 / polish).

## System design

### Overview

- **What it is:** On-board edit for money/loans/baby cells: Resize (S–XL) on all of them; Source only on locked ids; persist in `kioskLayout.cells`. **Amend:** immediate size reflow + edit-mode **drag reorder** of all enabled board cells via `kioskWidgets` order (P1).
- **Editable sets (v1 lock vs `widget-registry.ts`):** See UI § Editable widget ids. Reorder set = **all enabled** cells on the board (including weather / investments / bills / savings), not only menu-editable ids.
- **Components / boundaries:** Edit strip + cell MoreMenu → PATCH; Zod + resolve; signal catalog; compose only on Source-enabled cards; Settings on/off + chrome unchanged; **drag handle** chrome in edit mode → reorder → PATCH `kioskWidgets`.
- **Data flow:** Load → resolve size (+ filtered signals if Source) + render `enabledWidgets` in stored order. Each Resize/Source apply → PATCH `cells`. Each successful drop → PATCH `kioskWidgets` (optimistic order first). Done exits (no extra PATCH). Contracts / Sequence.
- **Consistency & failure:** Strong prefs after PATCH. Bad mix / non-editable key / sources on Resize-only → 400. Missing override → today + size M. Off widget keeps override. Fullscreen ignores size display **and** disables drag reorder. Reorder must not invent ids or drop enabled widgets (permutation only).
- **Why this shape:** Analysis ★; Grill frontier-empty; Source only where catalog composes; P1 keeps one ordered list for Settings + board.
- **Best practices:** ADR-003/005; bounded menu; key↔feature + editable-set Zod; preserve `cells` on rewrite; skeleton parity; optimistic apply + rollback on PATCH fail (same as Resize).
- **Anti-patterns:** Source on heatmap/funny-time/etc.; whole-widget swap; cross-topic; silent ignore; wipe `cells`; free px; always-on edit chrome; registry-forced order after user reorder; drag outside edit mode; overlapping handle vs MoreMenu hit areas.
- **Reference:** `widget-registry.ts`, `kiosk-dashboard.tsx`, `kiosk-layout.ts`, ADR-003/005, DESIGN_GUIDE § Kiosk.

### Concept 1 — Cell override overlay (ADR-005)

- **What it is:** Per-widget overrides in `kioskLayout.cells`: Source-enabled → `{ size, sources[] }`; Resize-only → `{ size }`.
- **How we use it here:** Missing → M + today’s composition; PATCH never drops mode/columns/focus/`babyDefaultsInjected`; omit/replace in Contracts.
- **Why we chose it:** One prefs story; no migration column.
- **Reference:** `docs/decisions/ADR-005-kiosk-cell-overrides-in-layout.md`.

### Concept 2 — Signal catalog + topic membership

- **What it is:** Stable signal ids under `money` | `loan` | `baby`; money = core money only.
- **How we use it here:** Source picker + Zod only for Source-enabled keys; Resize-only never stores sources.
- **Why we chose it:** Gate A Source = signals; Fix ask locks compose-capable ids only.
- **Reference:** UI § editable sets + catalog; `lib/kiosk/signal-catalog.ts` (Build).

### Concept 3 — Size tokens under board columns

- **What it is:** S/M/L/XL → CSS grid column-span + min-height tokens under current `columns` + container queries.
- **How we use it here:** Default M; fullscreen ignores footprint display; store always. **Amend:** Resize apply updates class/`data-kiosk-cell-size` **immediately**; CSS grid auto-placement reflows siblings (no Done/reload).
- **Why we chose it:** Per-cell density without freeform builder.
- **Reference:** Grill Q5; DESIGN_GUIDE glance grid; UI § Size tokens + reflow lock.

### Concept 4 — Ordered `kioskWidgets` (P1 reorder)

- **What it is:** Enabled widget list order is the board paint order.
- **How we use it here:** `normalizeKioskWidgets` preserves first-seen order; edit-mode drag permutes the list; drop PATCHes `kioskWidgets`. Settings toggle still add/remove ids; when adding, **append** at end. Board holds **local ordered list** state (seeded from GET) so reorder/reflow is immediate. Baby-defaults inject: append any missing default baby ids in fixed baby-default order **at end** — **do not** re-sort the whole list. Settings feature-group UI may still group for display; stored array order remains SoT for `/kiosk`.
- **Why we chose it:** One list for Settings + board; no second `widgetOrder` nest.
- **Reference:** `lib/kiosk/widget-registry.ts` (`normalizeKioskWidgets`); ADR-003 widgets column; `baby-defaults-inject.ts`.

## Sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant Board as KioskDashboard
  participant Prefs as PATCH /api/user/preferences
  participant Zod as prefs Zod
  participant DB as user_preferences

  U->>Board: Tap Edit (board strip)
  Board->>Board: editMode=true; show cell menus + drag handles
  U->>Board: Open cell menu → Resize (and Source if Source-enabled)
  Board->>Board: Optimistic size/sources; grid reflows siblings
  Board->>Prefs: PATCH on each Resize/Source apply (full kioskLayout + cells)
  Prefs->>Zod: validate cells (editable set; size; sources rules by id)
  alt invalid mix / Resize-only+sources / non-editable key / topic mismatch
    Zod-->>Prefs: 400
    Prefs-->>Board: error feedback; rollback layout
  else ok
    Prefs->>DB: update kiosk_layout jsonb (preserve cells if omitted)
    DB-->>Prefs: row
    Prefs-->>Board: success
  end
  U->>Board: Drag handle → drop new order
  Board->>Board: Optimistic enabledWidgets order; grid reflows
  Board->>Prefs: PATCH kioskWidgets (permutation of enabled ids)
  Prefs->>Zod: validate known ids + dedupe
  Prefs->>DB: update kiosk_widgets array order
  U->>Board: Tap Done
  Board->>Board: editMode=false; quiet glance (no extra PATCH if already saved)
```

## Contracts

### API contracts

| Item | Detail |
|------|--------|
| Method + path | `PATCH /api/user/preferences` (existing); GET returns extended `kioskLayout` + ordered `kioskWidgets` |
| Auth / who can call | Signed-in user; same-origin; owner row only (unchanged) |
| Request fields | Optional `kioskLayout`: `mode`, `columns`, `focusWidgetId`, optional `babyDefaultsInjected`, optional `cells`. Overrides only for **editable keys** (UI §). **Source-enabled** key → `{ size, sources }` with **1–3** catalog ids, same topic = key’s `feature`. **Resize-only** key → `{ size }` only (`sources` absent). Optional **`kioskWidgets`**: ordered list of known widget ids (reorder / on-off). Reorder send = same set of enabled ids, new order. |
| Success response | Updated preferences (same shape as today + `cells` + ordered `kioskWidgets`) |
| Errors | 401 unauth; 400 Zod (cross-topic, sources≠feature topic, length, unknown size/signal, sources on Resize-only, non-editable/unknown cell key, unknown widget id in `kioskWidgets`) |
| Downstream calls | Preferences service write to `user_preferences` |

**`kioskLayout` / `cells` write semantics (Build lock):**

1. **`kioskLayout` omit** → layout unchanged. **Present** → replace mode/columns/focus (and flag fields) as today.
2. **`cells` omitted** (layout PATCH still sent) → **preserve** existing stored `cells`.
3. **`cells` present** → **replace whole** `cells` map (not deep-merge per key).
4. **Clear one override** → send `cells` **without** that widget id (under replace rule). Empty override object `{}` for a key → reject 400; omit the key instead.
5. **Widgets-only** layout rewrite (and any service rebuild of `kiosk_layout`) → **copy existing `cells`**; never wipe by omission.

**Zod rules (Build lock):**

- **Editable keys** = Source-enabled ∪ Resize-only (UI §). All other registry ids + unknown → **400** (no silent ignore). Resolve may drop corrupt stored keys on read.
- **Source-enabled** (`money.net_month`, `money.insights_chart`, `loans.summary`): override **must** include `sources` length 1..3; same-topic among sources; topic = key’s `feature` (money→money, loans→loan). Empty `{}` → 400.
- **Resize-only** (other money/loans/baby ids in UI §): override = `{ size }` only; **`sources` present → 400**.
- Unknown signal id → **400**. Size enum only S–XL.
- Client sends full sibling layout fields on board chrome change; `cells` omit/preserve vs present/replace unchanged.

### Database contracts

| Table / collection | Purpose | Key fields | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|------------|-------------------|-------------|-------------|
| `user_preferences` | Persist board + cell overrides | `kiosk_layout` jsonb (mode, columns, focus, babyDefaultsInjected, **cells**) | PK user | Preferences PATCH service (`applyPreferencesPatch` + inject helpers) | `/kiosk` load, Settings |

**Migration:** No new column. Type/Zod extend only (ADR-005). Optional comment-only migration if team wants journal note; not required for runtime.

**`cells` persist integrity (Build lock):**

- Nest validation **before** persist: same reject / key↔feature-topic / clear-by-omit rules as API Zod.
- **Every** layout rewrite must preserve `cells` unless the caller explicitly sends a new `cells` map: PATCH omit `cells`, widgets-only rewrite, and baby-defaults inject write-back all **copy existing `cells`** into `nextLayout`.
- Present `cells` on PATCH → replace whole map in jsonb (after Zod).

### Example queries

```ts
// Resolve: missing cells → defaults
const layout = resolveKioskLayout(prefs.kioskLayout);
const override = layout.cells?.["loans.summary"]; // undefined → size M + default sources

// PATCH: set/replace overrides (whole cells map)
{
  kioskLayout: {
    mode: "grid",
    columns: 2,
    focusWidgetId: null,
    babyDefaultsInjected: true,
    cells: {
      "loans.summary": {
        size: "L",
        sources: ["loan.remaining", "loan.obligation"],
      },
    },
  },
}

// PATCH: change columns only — omit cells → keep stored overrides
{ kioskLayout: { mode: "grid", columns: 3, focusWidgetId: null } }

// PATCH: Resize-only (no sources)
{ kioskLayout: { mode: "grid", columns: 2, focusWidgetId: null,
  cells: { "money.insights_heatmap": { size: "L" } } } }

// PATCH: clear loans.summary — replace map without that id
{
  kioskLayout: {
    mode: "grid",
    columns: 2,
    focusWidgetId: null,
    cells: {
      "money.net_month": { size: "M", sources: ["money.net"] },
      // "loans.summary" omitted → removed
    },
  },
}

// Reject 400: loan signals under money key; sources on heatmap; cells["weather…"]
```

## Design patterns used

### Pattern 1 — Preferences overlay resolve

- **What it is:** Stored partial overrides; resolver fills defaults.
- **How we use it here:** Extend `resolveKioskLayout` to pass through `cells` and drop corrupt keys on read; write paths honor omit/preserve vs replace.
- **Why we chose it:** Same pattern as mode/columns/focus + ADR-004 flag.
- **Best practices:** Never drop sibling layout fields or `cells` on rewrite; Zod reject before persist.
- **Anti-patterns:** LocalStorage-only size; silent ignore bad keys; wipe `cells` on Settings/inject rebuild.
- **Reference:** `lib/kiosk/kiosk-layout.ts`, `user-preferences-service.ts`.

### Pattern 2 — Bounded secondary menu (MoreMenu)

- **What it is:** Quiet glance; secondary actions in a small menu.
- **How we use it here:** Edit-mode top-right → Resize always; Source subflow only on Source-enabled ids.
- **Why we chose it:** DESIGN_GUIDE secondary actions; wall safety vs always-on chrome.
- **Best practices:** `iconOnly` / `fx-hit-40`; Done obvious; chrome quiet after exit.
- **Reference:** `components/ui/more-menu.tsx`.

### Pattern 3 — Catalog + membership validation

- **What it is:** Closed signal ids + editable widget-id sets for UI and server.
- **How we use it here:** Catalog drives Source picker; Zod locks Source-enabled vs Resize-only vs reject.
- **Why we chose it:** One vocabulary; Source ≠ widget id; no invent-compose on heatmap/etc.
- **Best practices:** Export editable-id sets + topic maps; tests lock membership.
- **Reference:** proposed `lib/kiosk/signal-catalog.ts` + Design UI § sets.

### Pattern 4 — Edit-mode drag reorder (bounded)

- **What it is:** Pointer drag (plus keyboard move) to permute board cells; persist order in prefs.
- **How we use it here:** Handles only when `editMode` + grid mode; drop → optimistic order → PATCH `kioskWidgets`; MoreMenu stays top-right without overlapping handle hit area.
- **Why we chose it:** User chose B2; P1 avoids a second order field.
- **Best practices:** Permutation-only (no add/remove via drag); rollback on PATCH fail; `fx-hit-40` without double-hit; keyboard path required.
- **Anti-patterns:** Drag outside edit mode; registry re-sort after save; freeform pixel layout.
- **Reference:** DESIGN_GUIDE bounded exception note; `normalizeKioskWidgets` order preserve.

## UI / UX / mobile

- **UI (when Has UI):** Board strip **Edit** / **Done**; edit mode → top-right on **editable** money/loans/baby cells; Resize on all of those; Source only when Source-enabled; weather/context/bills/savings/investments unchanged for **menu**. **Amend:** every **enabled** board cell shows a **drag handle** in edit mode (grid only).
- **Build ↔ UI lock:** Match Gate A #1/#2 + this section. Locks: board-strip Edit/Done; menus only on editable sets below; ≤4 sizes S M L XL; Source = signals 1–3 same topic **and only Source-enabled ids**; **PATCH on each Resize/Source apply**; **PATCH `kioskWidgets` on each reorder drop**; Done exits; quiet after Done; skeleton parity (handles + size footprints).
- **80/20 UI:** #1 = cell top-right menu (edit mode). #2 = Edit / Done strip. **Amend #3** = drag reorder in edit mode. Settings secondary.
- **Layout / hierarchy:** Strip above/beside grid; size tokens → span/min-height under `columns` + container queries; paint order = `kioskWidgets` order.
- **Loading / empty / error / success:** Skeleton mirrors edit chrome (handles when edit); PATCH error toast/inline + rollback; success = applied size/sources/order; empty Source not allowed on Source-enabled (min 1).
- **Mobile / a11y basics:** ≥44 hit targets; focus return; no hover-only edit; drag handle + **keyboard** reorder (focus handle → ArrowUp/ArrowDown or equivalent move commands) required in Design/Build.

### Drag reorder locks (amend B2)

| Lock | Rule |
|------|------|
| When | `editMode === true` and `layout.mode === "grid"` only |
| Who | **All enabled** cells currently painted on the board |
| Chrome | Drag handle (e.g. top-left); MoreMenu stays top-right on editable cells; **no overlapping** extended hit areas |
| Persist | Drop (or keyboard move commit) → optimistic order → PATCH `kioskWidgets` |
| Done | No reorder PATCH |
| Fullscreen | No handles; no reorder |
| Set math | Reorder is a **permutation** of the current enabled list (no silent add/remove) |
| Settings | Toggle off removes from list; toggle on **appends** at end (keeps relative order of remaining) |

### Editable widget ids (v1 lock vs `lib/kiosk/widget-registry.ts`)

| Set | `KioskWidgetId` | Menu |
|-----|-----------------|------|
| **Source-enabled** | `money.net_month`, `money.insights_chart`, `loans.summary` | Resize + Source |
| **Resize-only** | `money.month_board`, `money.insights_heatmap`, `money.insights_stats_grid`, `loans.payments`, `baby.nursery`, `baby.next_care`, `baby.funny_time` | Resize only (no Source action; Zod rejects `sources`) |
| **No menu** | `context.today_weather`, `investments.summary`, `bills.summary`, `savings.summary` | Settings on/off only; cells key → 400 |

### Source compose map (Source-enabled only)

| Widget id | Catalog signals → card behavior |
|-----------|----------------------------------|
| `money.net_month` | `money.net` → Net hero; `money.income` → Income row; `money.spend` → Expenses row. Untuned → today’s full card. Tuned → show only picked rows/hero. |
| `money.insights_chart` | `money.spend` → Expenses KPI + daily spend chart; `money.income` → Income KPI; `money.net` → Net KPI. Untuned → all three KPIs + chart. Tuned without `money.spend` → hide chart band. |
| `loans.summary` | `loan.remaining` → remaining; `loan.obligation` → monthly obligation; `loan.next_payment` → next due. Untuned → today’s stats (incl. APR). Tuned → only picked fields; **APR and other non-catalog fields hide**. |

**No Source compose in v1** for heatmap, stats grid, month board, payments list, nursery, next care, funny time — Resize-only until a real compose is designed.

### Signal catalog draft (lock ids in Build / tasks)

| Topic | Signal id | Label (draft) |
|-------|-----------|---------------|
| money | `money.spend` | This-month spend |
| money | `money.income` | This-month income |
| money | `money.net` | This-month net |
| loan | `loan.remaining` | Remaining balance |
| loan | `loan.obligation` | Monthly obligation |
| loan | `loan.next_payment` | Next payment |
| baby | `baby.last_feed` | Last feed |
| baby | `baby.next_sleep` | Next nap / sleep |
| baby | `baby.last_diaper` | Last diaper |

**Topic ↔ registry feature:** money → `feature: "money"`; loan → `feature: "loans"`; baby → `feature: "baby"`. **Baby signals:** catalog kept for later; **no Source-enabled baby widget in v1** (all baby cells Resize-only). Untuned Source-enabled cell → today’s defaults; after Source save → only picked 1–3.

### Size tokens + immediate reflow (Build lock)

| Token | Intent | Grid / height (design intent) |
|-------|--------|-------------------------------|
| S | Compact | `span 1`; min-height ~8rem; still readable e-ink |
| M | Default | `span 1`; min-height ~12rem |
| L | Emphasized | `span min(2, --kiosk-cols)`; min-height ~16rem |
| XL | Hero-ish | `span min(2, --kiosk-cols)`; min-height ~20rem |

**Immediate apply:** On Resize click, update `data-kiosk-cell-size` + size class **before** PATCH resolves; CSS grid auto-flow reflows neighbors. Rollback class/order if PATCH fails.

**Reflow intent:**

- `--kiosk-cols` ≥ 2 → L/XL take two tracks; later cells pack into remaining tracks (native CSS grid, no layout engine).
- `--kiosk-cols` = 1 → span stays 1; **min-height** still changes immediately (vertical reflow).
- No masonry / absolute positioning. Keep simple CSS grid.

## Security design review (OWASP)

Trust boundaries:

- Browser (edit UI) → authenticated `PATCH /api/user/preferences` → Postgres `user_preferences` (owner only).
- No new public routes; no cross-user layout reads.

Abuse cases:

- Crafted PATCH with cross-topic sources, sources≠cell feature topic, or >3 ids → Zod 400.
- `sources` on Resize-only keys, or cells keys outside editable sets (weather, context, bills, savings, investments) → 400 (no ignore).
- CSRF: same-origin + existing session cookies (unchanged app pattern).

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | OK | Owner prefs only; no new endpoints |
| A02 Cryptographic Failures | N/A | No new secrets |
| A03 Injection | OK | Zod enums; jsonb typed write via ORM |
| A04 Insecure Design | OK | Bounded menu; topic lock UI+server |
| A05 Security Misconfiguration | OK | No new env |
| A06 Vulnerable Components | N/A | No new deps planned |
| A07 Auth Failures | OK | Existing session gate |
| A08 Software/Data Integrity | OK | Full layout merge; no silent corrupt |
| A09 Logging/Monitoring | OK | Prefer no PII in client logs (prefs already non-secret layout) |
| A10 SSRF | N/A | No outbound from this feature |

See https://owasp.org/Top10/

## Challenges answered

- **Do we need this?** Yes — Core problem: cells not tunable on the board; Gate A ok. Amend: Resize must feel live; users need order control without Settings.
- **What fails?** Weak Zod (cross-topic / key≠feature / Source on Resize-only / silent ignore); Settings wipe of `cells`; tiny S on e-ink; accidental Edit without clear Done; Source misread as widget swap; **registry re-sort wiping drag order**; handle overlapping MoreMenu — mitigated by editable-set + compose locks + catalog labels + P1 order preserve + hit-area lock.
- **Is this overspecified?** Option 2 shell is overspecified for v1; Option 1 stays bounded. Drag is edit-mode-only (DESIGN_GUIDE exception), not a dashboard builder.

## Domain / ADR notes

- **Glossary terms used:** Kiosk edit mode, Kiosk data source, Kiosk cell override, Kiosk cell size, Kiosk layout mode (clarify `_Avoid_` stays; bounded exception via edit menu + drag reorder).
- **ADR:** [ADR-005](../../../docs/decisions/ADR-005-kiosk-cell-overrides-in-layout.md); builds on [ADR-003](../../../docs/decisions/ADR-003-kiosk-layout-in-user-preferences.md) — **order lives in `kiosk_widgets` array (ADR-003), not a new nest**.
- **Grill locks honored:** Overlay; nest `kioskLayout.cells`; board-strip Edit/Done; catalog draft here; S–XL span/height; edges (topic lock; keep overrides when off; fullscreen ignores size display). Source compose narrowed to three registry ids (design-update).
- **Round notes (design-backloop amend):** Immediate Resize reflow + drag reorder (B2) + P1 `kioskWidgets` order; Gate B must re-approve before Build.
