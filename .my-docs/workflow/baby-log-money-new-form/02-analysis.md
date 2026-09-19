# Analysis: Baby log forms + vaccines on Growth

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows.

## Deep dive (required)

### Overall

#### What is this?
Restyle Baby capture pages (feed, sleep, diaper, growth) to share money/new chrome (chips → fields → save hierarchy), and move vaccine create onto `/baby/growth` as an always-visible type chip. Drop separate Vaccines nav; redirect `/baby/vaccines` to Growth with Vaccine preselected.

#### Why do we need this?
Caregivers get one familiar form pattern and one fewer capture nav item. Skipping leaves inconsistent layouts, a cluttered Capture group, and risk that Vaccine feels “gone” after a nav-only merge.

#### How to do this?
- **Approach:** Keep existing GraphQL create APIs and tables. Extend Growth UI chips to include UI-only `vaccine` (not a `baby_growth` kind). Branch save: growth kinds → `createBabyGrowth`; vaccine → `createBabyVaccine`. Reorder chips to Gate A2 lock. Chrome-restyle feed/sleep/diaper without adding Save steps. Permanent redirect + nav/header/skeleton/test updates.
- **Other ways:** Force all pages into money/new multi-field Save (rejected — Gate A). Fold vaccine rows into `baby_growth` (rejected — skim: keep separate table/API).
- **Best practices:** Repo — `quickPickChipCls` / Growth `?kind=` / `next.config` redirects (e.g. measure→growth) / `growthVaccineCreateInput`. Industry — progressive disclosure; don’t change write contracts when only the entry UI moves.

**Decision 1: Vaccine chip typing**

- **Option 1 — UI sentinel chip:** Add `"vaccine"` to display chips; keep DB kinds without vaccine; save branches by chip.
  - **Example:** `BABY_GROWTH_PAGE_CHIPS` includes `vaccine`; `isBabyGrowthPageDbKind("vaccine")` stays false; save calls `createBabyVaccine`.
  - **Pros:** Matches 01b; no schema migration; helpers already exist (`growthVaccineCreateInput`).
  - **Cons:** Chip type ≠ DB kind — must keep helpers/tests clear.
  - **Recommendation:** Option 1.
- **Option 2 — Migrate vaccine into growth table:** One kind, one mutation.
  - **Example:** `kind: "vaccine"` on `createBabyGrowth`.
  - **Pros:** Single write path.
  - **Cons:** Fights skim hard constraint; breaks Insights/Activities vaccine source; data migration.
  - **Recommendation:** Reject.

**Decision 2: Preselect URL**

- **Option 1 — Reuse `?kind=`:** `/baby/growth?kind=vaccine` (Growth already reads `kind`).
  - **Example:** Redirect destination `/baby/growth?kind=vaccine`.
  - **Pros:** One param; code path exists; e2e-friendly.
  - **Cons:** `kind` name is slightly overloaded (UI chip, not always DB kind).
  - **Recommendation:** Option 1.
- **Option 2 — New `?type=` / `?tab=`:** Separate from growth kinds.
  - **Example:** `/baby/growth?type=vaccine`.
  - **Pros:** Naming purity.
  - **Cons:** Extra param + dual readers; no gain for users.
  - **Recommendation:** Reject.

### Solution pieces

#### 1. Growth + Vaccine merge surface

##### What is this?
One Growth page: locked chip order (Pump → Vaccine → Vitamin → Medication → Temperature → Weight → Height → Head); default selection Weight; Vaccine shows name + First/Second dose + Save (today’s vaccine form).

##### Why do we need this?
Primary Gate A2 surface. Without it, nav merge hides vaccine or breaks bookmarks.

##### How to do this?
- **Approach:** Update `lib/baby-growth-page-chips.ts` order + `vaccine` UI chip; extend `BabyGrowthPage` fields/save branch using existing vaccine helpers; label via `growth.vaccine` (“Vaccine”).
- **Other ways:** Thin vaccine block below growth chips (conflicts with 01b chip model).
- **Best practices:** Keep `BABY_INSIGHTS_GROWTH_CHIPS` separate (already documented); invalidate `vaccines` vs `growth` scopes correctly on save.

#### 2. Redirect, nav, header

##### What is this?
Permanent `/baby/vaccines` → Growth with Vaccine preselected; remove “Log vaccines” section-nav item; header/title paths stop treating vaccines as a live capture page.

##### Why do we need this?
Bookmarks and old links must not 404; Capture group must drop the duplicate item.

##### How to do this?
- **Approach:** `next.config.ts` redirect like measure→growth, destination with `?kind=vaccine`; edit `lib/app-section-nav.ts` + tests; adjust `lib/baby-app-header.ts`; remove or stub vaccines route once redirect wins.
- **Other ways:** Client-only redirect in `vaccines/page.tsx` (weaker for bookmarks/SEO; prefer config permanent).
- **Best practices:** Match existing Baby redirect style in `next.config.ts`.

#### 3. Feed / sleep / diaper chrome (no extra steps)

##### What is this?
Same visual chrome (quick-pick chip look, spacing, radii, auto-fit grids) without forcing a Save step on one-tap paths.

##### Why do we need this?
Metric: open → save must not get worse on high-frequency care.

##### How to do this?
- **Approach:** Restyle method/kind controls with `quickPickChipCls` / group classes where it fits; keep tap-to-log (feed methods, diaper kinds) and sleep start/end as primary actions — no new required Save.
- **Other ways:** Clone money/new multi-field Save on feed/diaper (rejected — Gate A).
- **Best practices:** Chrome ≠ workflow clone; optional fields (amount/timer) stay secondary.

#### 4. Skeletons + loading parity

##### What is this?
Growth skeleton shows 8 chips and Vaccine field block when that type is the loading target; drop or redirect vaccines loading; feed/diaper/sleep skeletons match restyled controls.

##### Why do we need this?
DESIGN_GUIDE / AGENTS: zero CLS; vaccine chip count changes live UI.

##### How to do this?
- **Approach:** Update `BabyGrowthPageSkeleton` chip count 7→8; align field placeholders; sync `app/(shell)/baby/*/loading.tsx`.
- **Other ways:** Leave skeletons (CLS risk).
- **Best practices:** Skeleton parity rule — same change as live UI.

#### 5. Tests and link cleanup

##### What is this?
Unit (chip order, `kind=vaccine`, db-kind exclusion), nav/header tests, e2e that today hit `/baby/vaccines` / “Log vaccines”, light Insights/Activities link fixes if they point at the old capture route.

##### Why do we need this?
Skim risk: dead bookmarks and stale e2e (`e2e/baby-care.spec.ts`).

##### How to do this?
- **Approach:** Update tests first for new order + redirect; keep vaccine GraphQL tests as-is.
- **Other ways:** Manual-only (rejected — repo TDD habit).
- **Best practices:** Assert UI chip ≠ DB kind; assert Insights growth chips still exclude vaccine.

## What exists today

Growth already uses money quick-pick chips + `?kind=` + Save; vaccines are a separate page/API/table. Helpers `growthVaccineCreateInput` / `growthVaccineSaveBlocked` and i18n `growth.vaccine` already anticipate Growth write UI. Feed/diaper use large one-tap Buttons, not quick-pick chips yet. `next.config` redirects measure→growth but not vaccines yet.

## Dependencies

- Do **not** change `createBabyVaccine` / `baby_vaccine_entry` shape.
- Do **not** add vaccine to Insights growth filter chips.
- Coordinate with paused `baby-growth-health-logging` only as “current tree may already have growth kinds”; this run owns form chrome + vaccines merge.
- Update unit + e2e that assert vaccines nav/route.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-growth-page.tsx` | Merge Vaccine UI + save branch |
| `lib/baby-growth-page-chips.ts` | Order + UI chip vs DB kinds |
| `components/baby-vaccines-page.tsx` | Dose UI to lift; then retire |
| `lib/baby-growth-recent.ts` | Vaccine create/save helpers |
| `components/money-transaction-form.tsx` + `lib/money-quick-pick-chip-cls.ts` | Chrome pattern only |
| `components/baby-{feed,sleep,diaper}-form.tsx` | One-tap restyle |
| `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `next.config.ts` | Nav + redirect |
| `components/baby-page-skeleton.tsx` | Skeleton parity |
| `e2e/baby-care.spec.ts`, `lib/app-section-nav.test.ts`, `lib/baby-growth-page-chips.test.ts` | Regressions |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Quick-pick chips | `lib/money-quick-pick-chip-cls.ts` | Same money/new chip look |
| Growth `?kind=` | `baby-growth-page.tsx` | Preselect + redirect target |
| Vaccine map/save gates | `lib/baby-growth-recent.ts` | Already tested write mapping |
| Permanent Baby redirects | `next.config.ts` | measure→growth precedent |
| Care save + invalidate | `runBabyCareSaveThenNavigate`, `invalidateBabyQueries` | Same success/error UX |

## Constraints and risks

- Gate A: no forced multi-step on feed/diaper/sleep one-tap.
- Gate A2: chip order locked; Vaccine always visible; default Weight.
- Skim: vaccine stays own table/API; don’t fight DESIGN_GUIDE / skeleton parity.
- Risk: treating `vaccine` as DB growth kind breaks Insights/Activities.
- Risk: redirect without `kind=vaccine` lands on Weight — vaccine feels missing.
- Risk: leftover nav/e2e for “Log vaccines”.

## Settled decisions (do not relitigate)

- UI concept / Gate A2 layout and chip order.
- money/new = chrome only on one-tap pages.
- Vaccine always-visible Growth chip; not default; redirect preselects Vaccine.
- Keep vaccine GraphQL/table; move UI entry only.
- Chip label: plain **Vaccine** (`growth.vaccine` already exists).

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Read Growth + vaccine helpers | Confirm merge without schema change | `?kind=` wired; `growthVaccine*` + `growth.vaccine` ready; chips exclude vaccine today | Keep — Design on Option 1 |
| Check redirect precedent | How Baby aliases work | `measure`→`growth` in `next.config.ts`; no vaccines redirect yet | Keep — same pattern + query |
| Feed/diaper chrome gap | What “chrome only” means in code | Methods/kinds are `Button` grids, not quick-pick yet | Keep — restyle to chips, still one-tap |
| context-mode / qan FE routing | Front-end skill lookup | MCP namespace unavailable this run | Discard — used repo patterns instead |

## Blocking questions

1. **Activities / Insights copy:** **Locked Decision 3 Option 2** — update copy + links this pass (labels that imply a separate Vaccines capture page).
2. **Vaccines route files:** **Locked Decision 4 Option 1** — after permanent redirect, delete `app/(shell)/baby/vaccines/*` + `BabyVaccinesPage` (and unused loading) in this pass; keep vaccine API/server.

---

**Clarity check for Design:** Are the instructions and reference files clear enough to design? Any gaps in What / Why / How?
