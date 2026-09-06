# Analysis: Baby page layout vs Money patterns

## What exists today

Baby Care is already a shipped workspace app: GraphQL at `/api/graphql/baby`, TanStack Query keys, EN/VI strings, Telegram link, and seven routes under `app/(shell)/baby/`. Chrome already matches Money (hamburger via `MoneyAppMenu`, `PageHeading`, shell grid, no left rail). **Page bodies still diverge:** home is CTA-only; capture forms use hand-rolled `<label>` + `fx-field` inputs; settings wrap sections in bordered+shadowed cards; timeline/growth rows mix Card chrome with shadows against DESIGN_GUIDE (“Cards: border only”).

**Money already owns the page pattern to copy:** `MONEY_FULL_SPAN` + optional `MONEY_DASHBOARD_STACK`, flat `SettingsSection`, shared `Field` / `Input` / `Select`, Cards only for metrics/charts. Baby already imports `MONEY_FULL_SPAN` everywhere — alignment is incomplete, not greenfield.

### Home “last status” — backend?

**No new backend required** for a useful home status strip.

| Fact | Detail |
|------|--------|
| **Existing query** | `babyTimeline(from, to, cursor, limit)` returns `type` (`feed` / `diaper` / `sleep` / growth kinds), `at`, `endedAt`, `summary`, `source`. |
| **Client path** | Home can reuse `fetchBabyTimelinePage` / `babyKeys.timeline` (same as Timeline). Pick latest item per care type from the page(s), or show a short “today” list. |
| **No dedicated “last feed” API** | Not needed for MVP layout. Client-side reduce is enough. |
| **Design choice (not Gate)** | **Today-bounded** (`dayBoundsIso` like Timeline) vs **last-ever** (query without day filter / wider window). Both stay front-end-only. Empty state when no events of a type. |
| **Sleep nuance** | Open nap = sleep event with `endedAt` null — status UI should show “in progress” from existing fields. |

### Money layout helpers (names = coupling risk)

| Export / helper | Path | Money-named? | Who uses it |
|-----------------|------|--------------|-------------|
| `MONEY_FULL_SPAN` | `lib/money-layout.ts` | **Yes** | Money, Loans, Investments, Kiosk, **Baby (all pages + skeletons)** |
| `MONEY_DASHBOARD_STACK` | `lib/money-layout.ts` | **Yes** | Money dashboards / transactions / analytics / kiosk — **Baby does not use yet** (`space-y-6` instead) |
| `SettingsSection`, `SettingsSubsectionHeading` | `components/money-settings/money-settings-shared.tsx` | Path is Money-prefixed; components are generic | Money settings, Investments, global `/settings` — **Baby settings does not use** (cards instead) |
| `Field` | `components/ui/field.tsx` | **No** (shared UI) | Money forms/settings — **Baby forms/settings mostly skip** (raw labels) |
| `moneyQuickPickChipCls` | `lib/money-quick-pick-chip-cls.ts` | **Yes** | Money quick picks + **Baby language chips** |
| `MoneyAppMenu` | `components/money-section-tabs.tsx` | **Yes** | Money chrome + **Baby route layout** (already settled chrome) |
| `SettingsPageLayout` | `components/settings/settings-page-layout.tsx` | Shared settings shell | Heavy Money/global settings — **overkill for Baby’s 1–2 sections** |

Gate 1 depth = **reuse / generalize**. Analysis recommendation for Design: lift `MONEY_*` span/stack (and possibly move `SettingsSection`) to **neutral names** under something like `lib/shell-layout.ts` / `components/settings/` so Baby does not keep importing “money-” for non-Money UI. Keep behavior identical.

### Skeleton / `loading.tsx` map (every Baby route)

| Route | `loading.tsx` | Skeleton export (`components/baby-page-skeleton.tsx`) |
|-------|---------------|------------------------------------------------------|
| `/baby` | `app/(shell)/baby/loading.tsx` | `BabyHomeSkeleton` |
| `/baby/feed` | `app/(shell)/baby/feed/loading.tsx` | `BabyFeedSkeleton` |
| `/baby/sleep` | `app/(shell)/baby/sleep/loading.tsx` | `BabySleepSkeleton` |
| `/baby/diaper` | `app/(shell)/baby/diaper/loading.tsx` | `BabyDiaperSkeleton` |
| `/baby/growth` | `app/(shell)/baby/growth/loading.tsx` | `BabyGrowthPageSkeleton` (+ `BabyGrowthChartSkeleton`) |
| `/baby/timeline` | `app/(shell)/baby/timeline/loading.tsx` | `BabyTimelineSkeleton` (also Suspense fallback on page) |
| `/baby/settings` | `app/(shell)/baby/settings/loading.tsx` | `BabySettingsSkeleton` (`telegramEnabled` from env) |

Any home status strip, form Field layout, or settings flat-section change **must** update the matching skeleton in the same change (CLS rule).

### Per-surface snapshot (current → Gate 1 target)

| Surface | Today | Target direction (locked product) |
|---------|-------|-----------------------------------|
| **Home** | Primary CTA grid + secondary links; no status | Last feed / nap / diaper (or today summary) **above** CTAs |
| **Feed / sleep / diaper** | Large CTAs; raw inputs; `router.push("/baby/timeline")` after save | Flat form stack + Field; **navigate to `/baby` after save** |
| **Growth** | Add form **already first**, then chart cards, then list — but form sits in bordered+shadow card | Keep **add → chart → list**; flatten form; Cards for charts only |
| **Timeline** | Day list with Card+shadow rows; load more; auto-sync | Day browse; flat list or border-only rows; keep sync behavior |
| **Settings** | Card sections for language / Telegram | `SettingsSection` flat headings + dividers |

### Dev-decision routing (qan)

Front-end routing via `user-context-mode` MCP:

- **HTML** (`Work/Dev/HTML`): empty — no local markup notes.
- **CSS** (`Work/Dev/CSS/CSS tips.md`): intrinsic layout, `repeat(auto-fit, minmax…)`, container queries — already matches `docs/DESIGN_GUIDE.md` and Baby’s auto-fit grids.
- **Js** (`Work/Dev/Js/Javascript features.md`): browser APIs checklist — little page-layout guidance.

**Primary source of truth for this pass:** this repo’s Money pages + `docs/DESIGN_GUIDE.md`.

## Dependencies

**Same repo only** (no other repos).

**Must stay compatible:**

- Baby GraphQL schema / mutations (`lib/graphql/baby-typeDefs.ts`, resolvers, `features/baby/server/*`) — display-only UI unless Design opts into a tiny query tweak (not required).
- `invalidateBabyQueries` care/growth scopes (`lib/baby-query-options.ts`).
- Chrome already done: `components/baby-route-layout.tsx`, `lib/baby-app-header.ts`, registry nav — **do not redo**.
- e2e `e2e/baby-care.spec.ts` + unit tests for home actions / i18n / query options — expect updates when post-save nav and home status land.
- DESIGN_GUIDE token / skeleton / light+dark rules.

**Likely touch set (front-end):**

- `components/baby-*.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/**/loading.tsx`
- `lib/money-layout.ts` (generalize rename) and call sites across Money/Baby/Loans/Investments/Kiosk if renamed
- Optionally move `SettingsSection` out of `money-settings/` path
- `messages/baby/{en,vi}.ts` for new home-status strings
- Tests: `lib/baby-home-actions*`, e2e, any new pure helpers for “last of type”

**Do not expand into:** Telegram bot, multi-baby, prediction, shell chrome redo, new care event types.

## Reference files (for Build)

### Patterns to copy (Money)

| Path | Why it matters |
|------|----------------|
| `lib/money-layout.ts` | Only two layout tokens today — span + dashboard stack. Generalize names per Gate 1 depth. |
| `docs/DESIGN_GUIDE.md` | Flat vs Card rules, dashboard stack order, skeleton parity, concentric radii, no border+shadow on cards. |
| `components/money-settings/money-settings-shared.tsx` | `SettingsSection` flat heading + body — Baby settings target. |
| `components/ui/field.tsx` | Shared Field primitive Money forms use; Baby should adopt. |
| `components/ui/input.tsx`, `components/ui/select.tsx`, `components/ui/button.tsx` | Pair with Field; stop hand-rolled border classes on capture forms. |
| `components/money-transaction-form.tsx` | Capture-page density: Field + large Button; success notify + navigate away after write. |
| `components/money-workspace-settings.tsx` | Settings composed from `SettingsSection` (not Card-per-block). |
| `components/analytics-dashboard.tsx` | `MONEY_FULL_SPAN` + `MONEY_DASHBOARD_STACK` composition example. |
| `components/money-analytics-skeleton.tsx` / `components/money-dashboard-skeleton.tsx` | Skeleton parity discipline for stack pages. |
| `components/money-route-layout.tsx` | Shell grid chrome sibling (Baby already mirrored in `baby-route-layout.tsx`). |

### Baby surfaces to change

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | Add status above CTAs; keep `BABY_HOME_ACTIONS` / secondary links. |
| `lib/baby-home-actions.ts` | Primary CTA list source of truth + tests. |
| `components/baby-feed-form.tsx` | Capture pattern + **post-save → `/baby`**. |
| `components/baby-sleep-form.tsx` | Same (start/end both currently go to timeline). |
| `components/baby-diaper-form.tsx` | Same. |
| `components/baby-growth-page.tsx` | Flatten add form; keep order add → charts → list; Chart Cards OK. |
| `components/baby-growth-chart.tsx` | Chart Card surface for visx. |
| `components/baby-timeline.tsx` | Day browse; list chrome; reuse day bounds + sync. |
| `components/baby-settings-page.tsx` | Replace Card sections with `SettingsSection` + Field. |
| `components/baby-page-skeleton.tsx` | Update every skeleton with live UI. |
| `components/baby-route-layout.tsx` | Chrome only — leave unless span rename ripples. |
| `components/baby-workspace-provider.tsx` / `components/baby-locale-provider.tsx` | Providers stay; home status uses existing QueryClient. |
| `lib/baby-query-options.ts` | Timeline fetch helpers for home status; invalidation after care writes. |
| `lib/baby-app-header.ts` | Titles/crumbs — keep unless Design finds a rename win. |
| `messages/baby/en.ts`, `messages/baby/vi.ts` | Status / empty / “in progress” copy. |
| `app/(shell)/baby/**/page.tsx` + `loading.tsx` | Thin pages + skeleton wiring. |
| `e2e/baby-care.spec.ts` | Assert home status + post-save home redirect. |

### API / schema (read-only for this pass)

| Path | Why it matters |
|------|----------------|
| `lib/graphql/baby-typeDefs.ts` | Confirms timeline + care mutations; no last-status query. |
| `features/baby/server/timeline.ts` | `type` + `summary` + `endedAt` semantics for status chips. |
| `lib/api-baby.ts` | Auth/workspace context (unchanged). |

## Constraints and risks

- **Money-named helpers:** Baby already depends on `MONEY_FULL_SPAN`. Renaming without updating Money/Loans/Investments/Kiosk call sites leaves a half-migration. Prefer one rename PR slice or keep aliases (`export const FULL_SPAN = MONEY_FULL_SPAN`).
- **DESIGN_GUIDE vs current Baby cards:** Several Baby surfaces use `border` **and** `shadow-[var(--shadow-sm)]` on the same panel — guide forbids that combo on Cards. Layout pass should fix while touching those surfaces.
- **Home status loading:** Extra timeline query on home — reuse keys with Timeline where possible to avoid double-fetch thrash; skeleton must include status row(s).
- **Post-save redirect change:** Feed/sleep/diaper currently land on Timeline; Gate 1 wants Home. Update e2e and any user muscle-memory docs in workflow only (no product docs unless asked).
- **Growth order already matches Gate 1** (form then chart) — do not “fix” by flipping to Money dashboard’s metrics-first order; Gate 1 explicitly overrode that for Growth.
- **Scope = all seven surfaces** — easy to under-ship settings/timeline polish; keep checklist per route.
- **Do not copy Money finance KPIs** onto Baby home — only layout language + caregiving status.
- **Tribal:** Shell grid `col-span-2 md:col-span-6 lg:col-span-12` must stay on the **outer** page body once; nested children must not re-apply full-span.

## Settled decisions (do not relitigate)

From Gate 1 (2026-09-06) / `01-idea.md`:

1. Home: last feed / nap / diaper (or today summary) **above** log CTAs.
2. After save on feed / sleep / diaper: navigate **back to home**.
3. Growth: **add form first**, then chart.
4. Scope: **all seven** Baby surfaces.
5. Depth: **reuse / generalize** Money primitives (Field, settings sections, stack helpers) for both apps.
6. Nav / page titles: keep current labels unless Design finds a clear rename win (non-blocking).
7. Chrome / hamburger already done — out of scope.
8. No new care features; no Telegram/GraphQL rewrite unless a tiny display-only need appears (timeline client reduce preferred).

Soft Design picks **locked** (2026-09-06):

9. Home status window: **last-ever per type** (not today-only).
10. Layout tokens: **MOVE/RENAME** to `lib/shell-layout.ts`; update all Money + Baby + Loans + Investments + Kiosk callers.
11. `SettingsSection`: move to neutral `components/settings/` path (cheap — folder exists).

## Blocking questions

None. Soft picks locked; Design proceeds with HOW options only (shared page body vs per-page tokens / fetch strategy).

---

*Analyze complete. Soft picks locked. Design stage owns HOW options.*
