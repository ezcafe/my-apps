# Light repo skim: baby-growth-health-logging

**Result:** done
**Updated:** 2026-09-18
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js Baby workspace under `app/(shell)/baby/` (GraphQL `POST /api/graphql/baby`). Size/health capture is **`/baby/measure`** (`BabyMeasurePage`); vaccines are separate CRUD on `/baby/vaccines`; Feed `pump` is a feed method, not express-volume. Insights + Activities share care/growth chip filters; Home already says “Growth & meds” while nav still says Measure.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `app/(shell)/baby/measure/*` + `components/baby-measure-page.tsx` | Kind chips + list for weight/height/head/temp/medication | yes — rename to Growth; extend kinds |
| `components/baby-insights-dashboard.tsx` | Period + care/growth chips + charts; Activities cue; link → `/baby/measure` | yes — date-only chrome; rename CTA |
| `components/baby-activities-page.tsx` | Ledger + same merged chips; growth edit/delete | yes — copy/filter trim only |
| `components/baby-vaccines-page.tsx` | Vaccine dose CRUD | yes — schedule/read + deep-link Growth |
| `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `messages/baby/{en,vi}.ts` | Nav `/baby/measure`, headers, copy | yes — Growth labels + redirects |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `db/schema/baby.ts` `babyGrowthEntry` / `baby_growth_kind` | Enum: `weight\|height\|head\|temperature\|medication` only |
| `lib/validators/baby.ts` + `features/baby/server/growth.ts` | Zod + CRUD; GraphQL create/update/delete growth |
| `babyVaccineEntry` + `features/baby/server/vaccines.ts` | Separate vaccine write APIs (vs Growth dose lock) |
| `lib/baby-insights-filters.ts` | Care + growth chips shared by Insights & Activities |
| Feed `method: "pump"` | Baby fed expressed milk — not Growth pump volume |

## Hard constraints (do not fight)

1. **`/baby/growth` permanent-redirects to Insights** (`next.config.ts`) — Measure→Growth route must rewrite that.
2. New kinds need **schema/enum + Zod + GraphQL** — not UI-only; vaccine doses today use vaccine APIs.
3. Insights/Activities helpers + `e2e/baby-care.spec.ts` assume care/growth chips.
4. Tokens/`components/ui/` + skeleton parity (`BabyMeasurePageSkeleton`, Insights/Activities).
5. Gate A locks: Growth sole write home for dose/pump/meds/symptoms; Feed pump ≠ Growth pump.

## Risks if we ignore the repo

- Break Insights by reclaiming `/baby/growth` without redirect change; dual vaccine write or Feed/Growth pump confusion; leftover chip chrome / filter empty-copy; half-rename (Home “Growth” vs Measure nav).

## Enough for UI concept / Analyze?

yes — Growth capture + Insights date-only can proceed; Analyze must settle route/redirect, vaccine-table vs new growth kinds.
