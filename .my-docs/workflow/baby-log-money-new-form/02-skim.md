# Light repo skim: baby-log-money-new-form

**Result:** done  
**Updated:** 2026-09-19  
**Size:** ≤ ~40 lines — constraints only (not full analysis)

## Project shape

Next.js shell with Baby + Money. `/money/new` → `MoneyTransactionForm` (kind chips → fields → save). Baby capture = client forms under `app/(shell)/baby/{feed,sleep,diaper,growth,vaccines}`; growth already uses money quick-pick chips; vaccines are still a separate route, nav item, and GraphQL table.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `app/(shell)/money/(tabs)/new/page.tsx`, `components/money-transaction-form.tsx` | money/new chrome | Pattern only — don’t redesign Money |
| `components/baby-{feed,sleep,diaper}-form.tsx` + route pages | One-tap / few-field capture | Restyle chrome; keep one-tap |
| `components/baby-growth-page.tsx`, `lib/baby-growth-page-chips.ts` | Growth chips (no vaccine) + Save | Primary merge surface |
| `components/baby-vaccines-page.tsx`, `app/(shell)/baby/vaccines/` | Standalone vaccine create | Move write UI → Growth; redirect |
| `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `components/baby-page-skeleton.tsx` | Nav, headers, skeletons | Drop vaccines nav; skeleton parity |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| GraphQL `createBabyVaccine` / `babyVaccines` (`features/baby/server/vaccines.ts`, `lib/graphql/baby-*.ts`) | Keep API; UI entry moves to Growth |
| `db/schema/baby.ts` → `baby_vaccine_entry` | Separate from growth kinds |
| `lib/baby-growth-recent.ts`, `lib/baby-query-options.ts` | Helpers/invalidation already know vaccine |
| `next.config.ts` | `/baby/measure` → growth exists; no vaccines→growth yet |
| Insights/Activities vaccine edit paths | Keep data shape; fix links/nav as needed |

## Hard constraints (do not fight)

1. Gate A: money/new = chrome only — no forced multi-step on feed/diaper/sleep one-tap.
2. Vaccine = always-visible Growth chip; drop “Log vaccines” nav; `/baby/vaccines` → Growth with vaccine preselected.
3. `docs/DESIGN_GUIDE.md` + skeleton parity; chips via `lib/money-quick-pick-chip-cls.ts`.
4. `BABY_GROWTH_PAGE_CHIPS` excludes vaccine today; vaccine stays its own table/API.

## Risks if we ignore the repo

- Slow feed/diaper/sleep by cloning Money’s multi-field Save flow.
- Dead `/baby/vaccines` bookmarks or leftover nav/e2e (`e2e/baby-care.spec.ts`).
- Vaccine “gone” if chip stays excluded / overflow-only.
- Break Insights/Activities by changing vaccine data shape instead of UI entry.

## Enough for UI concept / Analyze?

**yes** — pattern, capture surfaces, nav, vaccine API, growth helpers located; chip label / preselect query param wait for design.
