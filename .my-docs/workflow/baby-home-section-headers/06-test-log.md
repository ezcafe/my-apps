# Test log: baby-home-section-headers

**Result:** success
**Round:** 2
**Updated:** 2026-09-13 (Run suite — build + unit + e2e all green)

## Coverage

Map design success criteria / main flows → e2e (from `01-idea.md` success criteria + `03-design.md` sequence / Task 10).

**Verdict:** covered **12** · MISSING **0** · blocked **1**. Stack is Playwright. Focus file: `e2e/baby-home-option-b.spec.ts` (+ `e2e/helpers/baby-home-graphql.ts`).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Section order breast → bottle → nap → diaper | `e2e/baby-home-option-b.spec.ts` → `section order breast → bottle → nap → diaper` (+ soft assert in skeleton smoke) | covered |
| Bottle chips: up to 3 ml from `recentBottleMl` + snaps; tap saves FORMULA; no face/± | `…` → `bottle chip tap saves; chips from recentBottleMl`; `bottle B1 soft smoke: flush cluster, stacked ±, Custom icon, Done~2s` | covered |
| Custom chip → confirm-then-set modal (no auto-save) | `…` → `custom ml modal: confirm, cancel paths, backdrop, validation, focus` | covered |
| No birth: fixed chips 60/90/120; bottle header label-only (no `n/N` / recommended ml); prompt on load | `…` → `no birth: fixed chips 60/90/120; label-only bottle header; birth prompt` | covered |
| Feed status = `summary · when` only (no leading ml, no `n/N today`); progress on bottle header | `…` → `feed status is summary · when only (no leading ml, no n/N today)`; `last ml on row 3 when last feed has amountMl` | covered |
| Birth prompt visit dismiss (`sessionStorage`); survives refresh; ignores old 7-day `localStorage` | `…` → `birth prompt visit dismiss survives refresh; ignores 7-day localStorage` | covered |
| Set birth → nap sleep blend + bottle `0/N` (or `n/N`) + recommended ml | `…` → `birth-date prompt on home; set on settings; error tokens → local copy` | covered |
| Main flow: open home → status (incl. recent ml) → chips → save | same chip-tap + status tests; helper `defaultStatus` includes `recentBottleMl` | covered |
| Skeleton / live section markers (breast/bottle/nap/diaper + chip layout) | `…` → `skeleton soft smoke: Kind + bottle markers (or live layout mirror)` | covered |
| EN + VI home labels / next-due / Custom modal (partial) | `…` → `Vietnamese: Custom modal, birth prompt, and home controls`; EN defaults elsewhere in option-b | covered |
| Breast + diaper **section headers** with tip copy (`baby-home-header-breast` / `baby-home-header-diaper`; next-due / empty tips) | `…` → `breast + diaper section headers: empty, next-due, and overdue tips` | covered |
| VI nap blend (and/or all four section headers in Vietnamese) | `…` → `Vietnamese: Custom modal, birth prompt, and home controls` (asserts `baby-home-header-*` labels + nap blend + header tips) | covered |
| Light + dark readable headers/chips | — | blocked — manual Checkpoint D glance; no theme e2e on baby home (repo has no baby-home light/dark Playwright pattern) |

**E2E stack:** Playwright (`@playwright/test`)
**E2E command:** `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm exec playwright test e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts`

**Note:** Task 10 acceptance rows are covered. Idea success criteria for breast/diaper header tips and full VI header/blend are e2e-covered. Guide-caveat / medical-certainty copy stays unit/i18n — not listed as an e2e gap. Pure helpers stay unit/db. Light/dark remains blocked (manual) — OK for Result success.

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm run build` | 0 | Next.js 16.3.2 compile + TypeScript + 70 static pages OK (~9.5s) |
| Unit | `pnpm test` | 0 | 855 tests · 839 pass · 0 fail · 16 skip (~7.6s) |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm exec playwright test e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts` | 0 | **65 passed** (~2.6m). Hydration mismatch warnings on `/baby` (`data-day-key`) still appear; did not fail tests. Forced GraphQL errors in logs are intentional e2e mocks. |

## Failures (if any)

None this round.

## Fix ask for my-code-workflow

None — suite green; no open MISSING required gaps.

## Round notes

- Round 1: build 0 · unit 839 pass · e2e 58/65 — failure = stale locators for header/status Option B move.
- Fix-from-tests: e2e locators aligned to bottle/breast/diaper headers; Fix claimed full e2e green.
- Round 2 re-run: build 0 · unit 839 pass · e2e **65 passed** · Coverage still 12 covered / 0 MISSING / 1 blocked manual → **Result success**.
