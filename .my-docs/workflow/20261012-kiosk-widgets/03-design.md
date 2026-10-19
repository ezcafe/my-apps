# Design: Configurable kiosk widgets + month money board

**Mode:** full — from `00-run.md`

**Has API:** yes — extend `GET/PATCH /api/user/preferences` with nested `kioskLayout`.
**Has DB:** yes — `user_preferences.kiosk_layout` JSONB + migration + Drizzle/Zod/service.

## Decision 1: which design approach?

Board CSS / layout engine (Grill Q6 left open). Product locks (prefs sync, workspace budget, grid-1 default, conditional focus, `kioskLayout` shape) stay fixed.

### Option 1 — Unified widget-cell CSS Grid (required)

**What it is:**
One board engine: each enabled widget is a cell. Fullscreen = one full-bleed focus cell. Grid = shared `repeat(var(--kiosk-cols), …)` where displayed columns = min(preference, CSS container cap) — phone max 1–2, wider allow 3–4. Drop fixed band stack as the layout owner.

**Example:**
`kiosk-dashboard.tsx` reads `{ mode, columns, focusWidgetId }` + `enabledWidgets` → cells in registry order; fullscreen resolves focus (pick or first enabled); sets `--kiosk-pref-cols` from prefs; CSS container queries override `--kiosk-cols` (live board never measures width in JS). Route `loading` is default-only (see UI lock).

**Pros:**

- One mental model for Settings → board (Gate A #1).
- Fullscreen and dense grid share resolve/fallback rules (invalid focus → first enabled).
- Column cap is one CSS SoT (matches DESIGN_GUIDE container queries; no JS resize path).

**Cons:**

- Larger refactor of today’s band groups in `kiosk-dashboard.tsx`.
- DESIGN_GUIDE “context → attention → metrics” becomes cell order / cell chrome, not separate bands.
- Route `loading` cannot mirror non-default prefs → accept CLS when stored layout ≠ defaults.

### Option 2 — Dual path: keep band stack + fullscreen branch

**What it is:**
Keep band stack for grid-1 (and densify bands with CSS for 2–4 cols). Add a separate fullscreen renderer for the focus widget only.

**Example:**
`mode === "fullscreen"` → render only focus card; else existing bands with `grid-template-columns` on the metrics band.

**Pros:**

- Smaller change to familiar band semantics and DESIGN_GUIDE wording.
- Faster first ship for “grid-1 looks like today.”

**Cons:**

- Two layout code paths drift (Settings vs board surprises).
- Multi-col mixes bands poorly (weather full-width vs money cell vs loans list).
- Skeleton needs two variants that can disagree.

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Medium–high (one engine + skeleton) | Medium (less refactor; dual path later) |
| Complexity | One resolve/layout model | Two models; densify bands awkward |
| Usability | Settings layout matches board cells | Grid-1 familiar; denser/fullscreen diverge |
| Failure cases | Focus fallback shared | Fullscreen vs stack disagree on “what shows” |

## Recommendation

**Pick Option 1** because the user’s daily job is “open `/kiosk` and see the layout I chose.” One cell engine makes fullscreen, grid 1–4, CSS phone caps, and focus fallback one story. Option 2 saves refactor days but risks Settings vs board drift and weak multi-col glance — worse for wall/tablet/phone. Accept DESIGN_GUIDE wording update: status board cells, still not a builder. Accept default-only route `loading` CLS for non-default prefs.

## Chosen design (user-approved)

**Option 1 — Unified widget-cell CSS Grid** (Gate B approved 2026-10-13).

## System design

### Overview

- **What it is:** Workspace-scoped kiosk glance: prefs hold content (`kioskWidgets`) and layout (`kioskLayout`); server page loads widget-gated payloads; client board renders cells (Option 1). Month money board is one registry widget with analytics + workspace budget.
- **Components / boundaries:** Settings UI → `PATCH /api/user/preferences` (auth, same-origin, rate limit) → Postgres `user_preferences`. `/kiosk` RSC → `load-kiosk-page` → Money/Loans/Weather services (workspace cookie / user workspace). Client board consumes resolved prefs + payloads. Route `app/(shell)/kiosk/loading.tsx` is static default-only (no prefs/DB). Trust: session user owns prefs; finance stays workspace-scoped.
- **Data flow:** Save layout/widgets → PATCH → JSONB → reopen `/kiosk` reads prefs + loads enabled payloads → board sets pref cols + CSS container cap + resolve focus → cells. Fields: Contracts.
- **Consistency & failure:** Prefs write strongly consistent. Invalid focus → first enabled. No workspace budget → chart empty; six metrics still if analytics ok. Auth/rate-limit/same-origin failures → existing API errors (Sequence). Non-default prefs may CLS vs default-only `loading` (accepted).
- **Why this shape:** Extends ADR-003 + registry/loader; rejects local-only layout and dual band/fullscreen paths.
- **Best practices:** Registry normalize/order; widget-gated loads; Zod at edge; CSS container column cap (no JS measure); bigint-safe money.
- **Anti-patterns:** Drag-drop builder chrome; client-supplied workspace id; dual-writing layout to localStorage + prefs; DB/await in route `loading`; ResizeObserver column caps.
- **Reference:** `docs/ARCHITECTURE.md` (shell prefs); ADR-003; `lib/kiosk/*`; DESIGN_GUIDE container queries.

### Concept 1 — Effective columns (CSS SoT)

- **What it is:** Displayed columns = `min(preferenceColumns, containerCap)` where **containerCap comes only from CSS** `@container` rules on the board (phone max 1–2; wider allow 3–4).
- **How we use it here:** Live board sets `--kiosk-pref-cols` from stored `columns` (or default 1). CSS owns `--kiosk-cols` / `grid-template-columns` via named container bands below. Pure helper `effectiveKioskColumns(pref, viewportCap)` exists for **unit tests with injected cap only** — live board does **not** measure width in JS. Settings may still offer denser 3–4 choices; board never squeezes them on narrow containers.
- **Named width tokens (container approach, rem bands like DESIGN_GUIDE `minmax` / `@container`):**

  | Token | Container band (intent) | Cap |
  |-------|-------------------------|-----|
  | `kiosk-cq-phone-narrow` | ≤ ~22rem (matches DESIGN_GUIDE auto-fit min band) | 1 |
  | `kiosk-cq-phone-wide` | ~22rem–~40rem | 2 |
  | `kiosk-cq-wider` | ≥ ~40rem | 4 (pref 3 or 4 allowed) |

- **Why we chose it:** Gate A phone rule; one SoT; aligns DESIGN_GUIDE “no hardcoded breakpoints in JS for content.”
- **Best practices:** Cap via CSS custom properties + container queries; inject cap in tests only.
- **Reference:** Idea Outcome / Grill edge table; `docs/DESIGN_GUIDE.md` (container queries / `cqi`).

### Concept 2 — Content + layout prefs

- **What it is:** Two axes of the glance board in one prefs row.
- **How we use it here:** `kiosk_widgets` + `kiosk_layout` JSONB; nested `kioskLayout` on API.
- **Why we chose it:** ADR-003; Settings and board one story.
- **Best practices:** Omit `kioskLayout` → unchanged; when present → full object replace; resolve null layout → grid-1 defaults.
- **Reference:** ADR-003.

## Sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant Set as SettingsKiosk
  participant API as PreferencesAPI
  participant DB as Postgres
  participant Page as KioskPage
  participant Load as loadKioskPage
  participant Money as MoneyServices
  participant Board as KioskDashboard

  U->>Set: toggle widgets / layout / focus
  Set->>API: PATCH kioskWidgets + kioskLayout
  API->>API: auth + same-origin + rate limit + Zod
  alt unauthorized / bad origin / invalid
    API-->>Set: 401 / 400 / 429
  else ok
    API->>DB: upsert kiosk_widgets + kiosk_layout
    DB-->>API: row
    API-->>Set: data + notify
  end

  U->>Page: open /kiosk
  Page->>DB: get prefs
  Page->>Load: enabled + layout
  Load->>Money: analytics + workspace budget if money.month_board
  Money-->>Load: month board payload or empty chart
  Load-->>Page: KioskPageData
  Page->>Board: widgets + kioskLayout
  Board->>Board: resolveFocus; set --kiosk-pref-cols
  Note over Board: CSS @container sets --kiosk-cols cap (no JS measure)
  alt zero enabled
    Board-->>U: empty enable prompt
  else fullscreen
    Board-->>U: one focus cell full-bleed
  else grid
    Board-->>U: widget cells at CSS --kiosk-cols
  end
```

## Contracts

### API contracts

| Item | Detail |
|------|--------|
| Method + path | `GET /api/user/preferences`, `PATCH /api/user/preferences` (extend) |
| Auth / who can call | Signed-in session user; PATCH same-origin; rate limit `user:preferences` |
| Request fields (PATCH add) | `kioskLayout?: { mode: "fullscreen" \| "grid"; columns: 1\|2\|3\|4; focusWidgetId: KioskWidgetId \| null }`. **Nested replace:** omit key → leave stored layout unchanged; when key present → all three fields required; replace stored JSON as a whole (no nested merge). **Layout-only PATCH** (`kioskLayout` without `kioskWidgets` / `weatherCity`) must persist — treat `kioskLayout` as a write key in `applyPreferencesPatch` (today’s weather/widgets early-return would silent no-op). Existing `kioskWidgets`, `weatherCity` unchanged. |
| `focusWidgetId` validation | PATCH Zod: reject unknown ids (`400`, not in registry enum). Known-but-disabled ids may be stored. `resolveFocusWidgetId` at board: invalid / disabled / stale-after-registry-shrink → first enabled (null if zero enabled). |
| Success response | `{ data: SerializedUserPreferences }` including resolved `kioskWidgets` + resolved `kioskLayout` (null/missing → `{ mode: "grid", columns: 1, focusWidgetId: null }`) |
| Errors | `401` no session; `400` bad JSON / Zod / cross-origin; `429` rate limit — same as today |
| Idempotency | Same body upsert is safe to retry; no new idempotency store (matches today’s prefs route). |
| Downstream calls | none beyond Postgres |

**Events / other module APIs:** none as public REST. Month money is server-loaded on `/kiosk` into `KioskPageData.widgets` (typed module I/O below). Workspace id stays server-only.

#### Module I/O — `KioskPageData.widgets.monthBoard` (loader, not REST)

When `money.month_board` is enabled, loader sets optional `widgets.monthBoard` (mirror style of `KioskNetWidget` in `lib/kiosk/load-kiosk-page.ts`):

```ts
type KioskMonthBoardWidget = {
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  savingsRatePct: number | null; // from analytics; null when undefined
  billsMinor: number; // SoT below
  loansMinor: number; // SoT below
  range: { from: string; to: string }; // current calendar month
  budgetChart: { spentMinor: number; limitMinor: number } | null;
  // null = no workspace-scope budget → empty chart UI; metrics still populated
};
```

**Field SoT (loader scalars):**

| Field | Source (reuse existing path) | Rule |
|-------|------------------------------|------|
| `billsMinor` | Same as today’s `bills.summary`: `analyticsFiltersForLedgerPresetFromLookups(MONEY_LEDGER_BILLS, …)` → `computeMoneyAnalyticsSummary` → expense for current month (`ledgerSummaryFromAnalytics` expense / equivalent minor) | Bills-ledger expense, current calendar month |
| `loansMinor` | Same as today’s `loans.summary`: `loansInsightsSummary(ctx, from, to).monthlyObligationMinor` | Lock = `monthlyObligationMinor` (not installment due-sum, not remaining balance) |
| Other metrics | Existing month analytics / workspace budget path | Unchanged |

Do **not** invent a “loans ledger filter” — loans are not a `MONEY_LEDGER_*` preset.

### Database contracts

| Table / collection | Purpose | Key fields (name, type) | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|-------------------------|-------------------|-------------|-------------|
| `user_preferences` (extend) | Persist kiosk layout beside widgets | `kiosk_layout` jsonb nullable → `{ mode, columns, focusWidgetId }`; existing `kiosk_widgets` | PK `user_sub` | `patchUserPreferences` | `getUserPreferences` (page/Settings); loader only if it serializes `kioskLayout` into page data |

**Migration (additive):** `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS kiosk_layout jsonb;` — next number after `0047`; journal entry like `0036_kiosk_widgets`.

**Data ownership notes:**

- One row per `user_sub`. Layout does not store workspace id. Finance reads remain workspace-scoped in loader.
- PATCH rejects unknown `focusWidgetId` (Zod enum). Disabled / stale stored ids → `resolveFocusWidgetId` → first enabled.

### Example queries

```sql
-- Example 1: read prefs for kiosk page
SELECT kiosk_widgets, kiosk_layout, weather_city, weather_latitude, weather_longitude
FROM user_preferences
WHERE user_sub = $1;
```

```sql
-- Example 2: upsert layout (replace whole JSON when kioskLayout present)
INSERT INTO user_preferences (user_sub, kiosk_layout)
VALUES ($1, $2::jsonb)
ON CONFLICT (user_sub) DO UPDATE
SET kiosk_layout = EXCLUDED.kiosk_layout;
```

```ts
// Example 3: workspace budget for month board (loader)
// SoT: lib/money-services/budgets.ts — listMoneyBudgets(workspaceId, opts)
import { listMoneyBudgets } from "@/lib/money-services/budgets";
import { currentMonthDateRange } from "@/lib/kiosk/kiosk-analytics-filters";

const { from, to } = currentMonthDateRange();
const budgets = await listMoneyBudgets(workspaceId, {
  includeSpent: true,
  from,
  to,
});
const workspaceBudget = budgets.find((b) => b.scopeType === "workspace");
// chart: spentAmountMinor / effectiveLimitAmountMinor; no row → budgetChart null
```

## Design patterns used

### Pattern 1 — Registry normalize / resolve

- **What it is:** Canonical id list + defaults; stored prefs filtered to known ids and registry order.
- **How we use it here:** Add `money.month_board`; flip defaults; `resolveKioskLayout` mirrors widgets (null → grid-1). PATCH Zod rejects unknown focus ids; `resolveFocusWidgetId` maps disabled/stale → first enabled at render.
- **Why we chose it:** Repo already owns widget safety; layout must match.
- **Best practices:** Zod enum from registry at PATCH; resolve for disabled/stale only — never invent ids.
- **Anti-patterns:** Client inventing widget ids or column counts outside schema.
- **Reference:** `lib/kiosk/widget-registry.ts`.

### Pattern 2 — Widget-gated loader

- **What it is:** Fetch only payloads for enabled widgets.
- **How we use it here:** Gate month-board on `money.month_board`: month analytics + workspace budget + **bills** via `MONEY_LEDGER_BILLS` expense path (same as `bills.summary`) + **loans** via `loansInsightsSummary` → `monthlyObligationMinor` (same as `loans.summary`). No loans ledger preset.
- **Why we chose it:** Avoid unused finance work; reuse proven SoT helpers.
- **Best practices:** One month range; bigint-safe sums; empty chart without workspace budget; name helper fields in Module I/O.
- **Anti-patterns:** Always loading all Money insights for kiosk; inventing a loans ledger filter.
- **Reference:** `lib/kiosk/load-kiosk-page.ts`, `lib/money-ledger-presets.ts` (`MONEY_LEDGER_BILLS`), `loansInsightsSummary`.

### Pattern 3 — Prefs PATCH + notify compound settings

- **What it is:** Settings parent owns save; children emit patches; toast/notify on success.
- **How we use it here:** `kiosk-widget-settings` adds mode/cols + conditional focus picker (fullscreen + 2+ enabled only).
- **Why we chose it:** Same UX as widget toggles; anti-builder.
- **Best practices:** Immediate feedback; focus UI hidden when not needed.
- **Anti-patterns:** Builder chrome, drag-drop, per-widget size knobs.
- **Reference:** `components/kiosk/kiosk-widget-settings.tsx`.

| Pattern | Why chosen (one line) | Reference |
|---------|----------------------|-----------|
| Registry resolve | Safe ids/defaults/order for widgets + layout | `widget-registry.ts` |
| Widget-gated loader | Cheap page loads | `load-kiosk-page.ts` |
| Prefs PATCH + notify | One Settings story | `kiosk-widget-settings.tsx` |

## UI / UX / mobile

- **UI:** Settings → Kiosk: widget toggles + layout (fullscreen \| grid) + columns 1–4 + focus select only when fullscreen and 2+ enabled. `/kiosk`: Option 1 cell board; empty → enable prompt. No builder on the board.
- **Build ↔ UI lock:** Implementation must match this Design UI + existing shell chrome (Settings section, notify save, kiosk page shell). Do not invent new nav or Tesla/e-ink chrome.
- **80/20 UI:**
  - Goals: glance board; toggle widgets; match density; month money story.
  - Vital few: on/off; layout mode; month money board; upgraded defaults.
  - **Important #1:** Active layout of enabled widgets on `/kiosk` (fullscreen focus or width-capped grid).
  - **Important #2:** Money on → budget progress + Expenses/Income (then Net/Savings rate, Bills/Loans). Money off → primary content of first enabled non-money widget.
  - Secondary: old net/bills/savings toggles; optional insights; weather city; deep links.
  - Measure after ship: ~10s money glance; layout change rate; overlap of new+old money widgets.
- **Layout / hierarchy (month money board):** Match `refs/money-widget-ref.png` layout without footer — open-bottom **circular** budget % gauge (dither fill + 0–100 ticks), 2×3 value-over-label metrics with vertical dither accents (Expenses | Income; Net | Savings rate; Bills | Loans). Uses shell semantic colors + default Card border/surface (same as other kiosk widgets). Empty budget → copy, no progressbar.
- **Loading / empty / error / success:**
  - **Route loading lock:** `app/(shell)/kiosk/loading.tsx` (+ skeleton it renders) is **default-only**: `mode: "grid"`, `columns: 1`, cells for default widgets only — `context.today_weather` + `money.month_board` + `loans.payments` (registry order). **Do not** await `user_preferences` / DB in route `loading`. Accept possible CLS when stored prefs differ (fullscreen, denser cols, other widget sets).
  - Empty board → enable prompt. No workspace → existing unavailable. No workspace budget → chart empty state; metrics still show. Prefs save → existing notify.
- **Skeleton parity:** Route skeleton matches **default-only** layout (structure/radii for those three cells + month-board chart+metrics). Live board after prefs load may differ — CLS for non-default prefs is an accepted tradeoff (no layout cookie, no prefs in `loading`).
- **Mobile:** Thumb-friendly Settings controls (≥44px); board phone max 1–2 cols via CSS container SoT (Concept 1); no hover-only; fullscreen focus readable full-bleed.
- **Accessibility:** Labels on layout radios/selects; metric values + text labels; chart has text fallback (spent / limit); contrast via tokens.
- **Day-to-day:** Config once in Settings; daily path open `/kiosk` and glance — aligned Gate A.

**Registry / defaults (lock):**

| Id | Default | Role |
|----|---------|------|
| `context.today_weather` | on | Context cell |
| `money.month_board` | on | Month money board (new) |
| `loans.payments` | on | Attention list cell |
| `money.net_month`, `bills.summary`, `savings.summary` | off | Optional small cards |
| others | unchanged off | Optional |

Default layout: `{ mode: "grid", columns: 1, focusWidgetId: null }`.

**Null-prefs defaults only:** New registry defaults (`money.month_board` on; old small money cards off) apply when stored widgets are **null/missing**. Existing stored widget sets are **not** migrated in this run — users who already saved prefs keep their set until they toggle in Settings.

## Security design review (OWASP)

Trust boundaries:

- Browser → Preferences API (session + same-origin + rate limit).
- Server loader → Postgres / Money services (workspace from server, not client body).

Abuse cases:

- Forged PATCH with foreign `user_sub` — blocked (session key only).
- Oversized JSON / invalid enums — Zod + `readJsonBounded`.
- Cross-site PATCH — `assertSameOriginStrict`.
- Pref spam — rate limit.

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | pass | Session-scoped prefs; workspace finance server-side |
| A02 Cryptographic Failures | N/A | No new secrets; existing session cookies |
| A03 Injection | pass | Zod + Drizzle; no raw string SQL from client |
| A04 Insecure Design | pass | No builder; layout enum-bounded; focus fallback |
| A05 Security Misconfiguration | pass | Extend existing route guards only |
| A06 Vulnerable Components | N/A | No new deps planned |
| A07 Auth Failures | pass | Same `auth()` gate as today |
| A08 Software / Data Integrity | pass | Validated prefs shape; registry resolve |
| A09 Logging / Monitoring Failures | pass | Keep existing API error responses; no PII in logs |
| A10 SSRF | N/A | Weather city path unchanged; no user URL fetch for layout |

Source: https://owasp.org/Top10/

## Challenges answered

- **Do we need this?** Yes — Gate A vital few: density + month money board; toggles alone fail the glance job.
- **What fails?** No workspace budget → empty chart (metrics remain). Stale focus id → first enabled. Dense pref on phone → CSS container caps cols (Concept 1). Non-default prefs → possible CLS vs default-only `loading` (accepted). Dual-path Option 2 → Settings/board drift (rejected).
- **Is this overspecified?** No — product locks from Grill; only CSS engine was open (Option 1). No drag-drop, no multi-budget chart, no device profiles, no prefs migrate.

## Domain / ADR notes

- **Glossary terms used:** Kiosk layout mode; Kiosk focus widget; Kiosk month money board (`GLOSSARY.md`).
- **ADR:** `docs/decisions/ADR-003-kiosk-layout-in-user-preferences.md`
- **Grill locks honored:** prefs sync Opt 1; workspace budget Opt 1; grid-1 default; focus picker only fullscreen+2+; nested `kioskLayout`; invalid focus → first enabled; CSS = this Decision 1 (recommend Opt 1).
