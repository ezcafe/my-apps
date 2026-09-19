# Analysis: Baby care pages control parity

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

## Deep dive (required)

### Overall

#### What is this?
Align capture pages with controls caregivers already use: Feed/Pump/Diaper match Baby Home; Growth form chrome matches money/new; skeletons stay in parity. Add `/baby/pump` and move pump off Feed.

#### Why do we need this?
Feed still shows Formula/Pump-amount chips + Amount field and co-locates Pump with breast — unlike Home. Diaper one-taps dirty/mixed without the Home detail sheet. Growth uses a multi-column Field grid + checkboxes, not money/new Category/Amount patterns. Skipping leaves split mental models and worse diaper data on the page vs Home.

#### How to do this?
Reuse Home shared components (`BabyTimedCareChip`, `BabyBottleMlChips`, `BabyCustomMlModal`, `BabyDiaperKindControl`, `BabyDiaperDetailSheet`) and money/new field patterns (`InputGroup` Amount, `MoneyUsageQuickPick` Category). Wire existing GraphQL creates. Update nav, headers, skeletons.

- **Other ways:** Copy Home markup into each page (fork); or only restyle CSS without shared components.
- **Best practices:** Repo already extracts Home chips/sheets — prefer reuse over fork; dual breast/pump timer slots in `lib/baby-breast-timer-store.ts`; skeleton parity rule in AGENTS.md.

### Solution pieces

#### 1. Feed page → Home feed controls

##### What is this?
`/baby/feed` shows Breast L/R + Formula ml chips (Home-like); removes Pump timers and Formula/Pump amount + Amount fields.

##### Why do we need this?
Stops duplicate/conflicting log paths; matches Home feed job.

##### How to do this?
- Approach: Breast chips via `BabyTimedCareChip` on **breast** slot only (`writeBabyCareTimerSlots` / Home patterns). Formula via `BabyBottleMlChips` + `BabyCustomMlModal` → `createBabyFeed({ method: "formula", amountMl })`. Drop `AMOUNT_METHODS` + amount `Field`.
- Other ways: Keep amount Input as advanced only — rejected by idea.
- Best practices: Match Home bottle selection helpers (`lib/baby-home-bottle-selection.ts`, age guide snaps).

#### 2. New Pump page

##### What is this?
`/baby/pump` with Pump L/R timers + pump amount ml chips like Home.

##### Why do we need this?
Pump is its own job; idea requires move off Feed + nav entry.

##### How to do this?
- Approach: New page + form component; pump slot timers; `BabyBottleMlChips` for pump amount → `createBabyFeed({ method: "pump", amountMl })`; stop pump timer → feed mutation with duration (same as Home). Nav + header + icon + loading skeleton.
- Other ways: Nested route under feed — worse discoverability.
- Best practices: Share timer store with Home so concurrent breast+pump stay consistent.

#### 3. Diaper page → Home kind + sheet

##### What is this?
Replace quick-pick wet/dirty/mixed with `BabyDiaperKindControl` (2×2 incl. dry) + `BabyDiaperDetailSheet` for dirty/mixed.

##### Why do we need this?
Home captures color/texture/amount; page currently skips detail.

##### How to do this?
- Approach: Reuse `planBabyDiaperKindTap` / sheet save mutation → `createBabyDiaper` with kind + optional color/texture/amount.
- Other ways: Keep 3 chips + open sheet only — weaker “same buttons” vs Home.
- Best practices: Existing sheet unit tests (`baby-diaper-detail-sheet`, quick-plan).

#### 4. Growth → money/new form chrome

##### What is this?
One field per line; Value/Amount like money Amount (`InputGroup`); Unit + Symptoms like Category (`MoneyUsageQuickPick`).

##### Why do we need this?
User asked money/new parity; current auto-fit grid + free-text Unit + symptom checkboxes diverge.

##### How to do this?
- Approach: Stack fields with `[grid-column:1/-1]` / single-column gap; Value/Amount use `InputGroup` + trailing unit (not `$`); Unit = `MoneyUsageQuickPick` over allowed units; Symptoms = same control chrome with multi-toggle (or quick chips matching Category layout) for `BABY_TEMP_SYMPTOM_IDS`.
- Other ways: Plain `Select` only — weaker match to Category (Category is quick-pick + other).
- Best practices: `money-transaction-form.tsx` Amount + Category blocks.

#### 5. Skeletons + nav chrome

##### What is this?
Update `BabyFeedSkeleton`, add pump skeleton, fix diaper/growth skeletons; section nav + app header for `/baby/pump`.

##### Why do we need this?
CLS rule; Pump must be discoverable.

##### How to do this?
- Approach: Mirror live layouts in `baby-page-skeleton.tsx` + `loading.tsx`; add `babyPump` icon id in nav + `money-section-tabs`; header title in `baby-app-header.ts`; i18n keys.
- Other ways: Skip skeleton until later — violates AGENTS.md.
- Best practices: Existing skeleton tests in `baby-page-skeleton.test.ts`.

## What exists today

Feed form still mixes 4 timed sides + Formula/Pump amount chips + Amount input (`components/baby-feed-form.tsx`) and uses legacy single-timer reads. Home already has dual slots, bottle/pump ml chips, diaper 2×2 + sheet. Growth is chip row + auto-fit Field grid. No `/baby/pump` route or nav item. Skeletons still model old Feed/Diaper layouts.

## Dependencies

- Shared timer store must stay compatible with Home.
- Diaper GraphQL already accepts color/texture/amount — no schema change expected.
- Section nav icon union + tests; baby header path tests; e2e care specs may assert old Feed pump chips.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | Source behavior for feed/pump/diaper |
| `components/baby-feed-form.tsx` | Rewrite target |
| `components/baby-diaper-form.tsx` | Rewrite target |
| `components/baby-growth-page.tsx` | Restyle target |
| `components/baby-bottle-ml-chips.tsx` | Formula/pump ml UI |
| `components/baby-diaper-kind-control.tsx` | Diaper buttons |
| `components/baby-diaper-detail-sheet.tsx` | Diaper modal |
| `components/money-transaction-form.tsx` | Amount + Category patterns |
| `components/money-usage-quick-pick.tsx` | Category control |
| `lib/baby-breast-timer-store.ts` | Dual breast/pump slots |
| `lib/app-section-nav.ts` | Add `/baby/pump` |
| `components/baby-page-skeleton.tsx` | Skeleton parity |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Timed care chip | `BabyTimedCareChip` | Same L/R timers as Home |
| Bottle/pump ml 2×2 | `BabyBottleMlChips` + custom modal | Same ml + Custom |
| Diaper kind + sheet | Kind control + detail sheet | Same buttons + modal |
| Money Amount `InputGroup` | money transaction form | Value/Amount chrome |
| Money Category quick-pick | `MoneyUsageQuickPick` | Unit/Symptoms chrome |
| Care save navigate | `runBabyCareSaveThenNavigate` | Keep after-save UX |

## Constraints and risks

- Feed must not keep Formula/Pump amount/Amount fields or Pump L/R.
- Do not desync Home timer localStorage.
- Symptoms are multi-select; Category is single — adapt carefully, keep same visual control family.
- Growth Value must not show currency `$` (Gate A2 note).
- E2E/unit tests targeting old Feed pump chips will need updates.

## Settled decisions (do not relitigate)

- Gate A / A2: four surfaces as in `01b` + ui-refs.
- Sleep out of scope.
- Reuse existing create mutations; assume **Has API = no**, **Has DB = no** unless Build finds a hard gap.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Timer API on Feed | What: Feed vs Home timer. Why: avoid desync. How: read feed form vs store. | Feed uses legacy single-timer; Home uses dual slots — Pump page + Feed must use slots API. | Keep finding |

## Blocking questions

- none for Design — assume Home diaper includes **dry** tile on the page (same as Home control). If product wants wet/dirty/mixed only, note in Gate B.

## Has API / Has DB (for parent)

- **Has API:** **no** — reuse `createBabyFeed` / `createBabyDiaper` / `createBabyGrowth`; no new public contracts.
- **Has DB:** **no** — no schema/migration; existing columns cover diaper detail + feed methods.

## Clear enough to design?

yes — reuse paths and gaps are clear. Proceed to Design with Option 1 = shared Home/money components.
