# Test log: baby-home-controls-polish

**Result:** success
**Round:** 2
**Updated:** 2026-09-13 07:55 +07 (Run suite Round 2)

## Coverage

Map design success criteria / main flows → e2e (from `01-idea.md` success criteria + `03-design.md` sequence / fail matrix + Task 11).

**Verdict:** covered **14** · MISSING **0** · blocked **2**. Stack is Playwright. Focus file: `e2e/baby-home-option-b.spec.ts` (+ `e2e/helpers/baby-home-graphql.ts`; smoke/i18n also in `e2e/baby-care.spec.ts`).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Bottle flush cluster: face → stacked ± → **icon-only Custom under ±**; no under-card text | `e2e/baby-home-option-b.spec.ts` → `bottle B1 soft smoke: flush cluster, stacked ±, Custom icon, Done~2s` | covered |
| Custom modal still confirm-sets-ml (no auto-save) | `…` → `custom ml modal: confirm, cancel paths, backdrop, validation, focus` | covered |
| L→R→bottle one session: `feedSessionEventId` reused; **feedsToday stays 1**; combined last-feed summary | `…` → `L→R→bottle one session: same feedSessionEventId; feedsToday stays 1` | covered |
| Open continuation: other breast while timer runs (save current + start other) | `…` → `other breast while timer runs: save current and start other` | covered |
| Post-stop bottle in grace still sends same `feedSessionEventId` | same L→R→bottle test (bottle body after R stop) | covered |
| Breast start is timer-only until stop (idle start empty steps) | `…` → `idle breast press starts elapsed timer; press again saves one feed` (+ `idle breast start empty steps…`) | covered |
| EN + VI home controls / Custom | `…` → `Vietnamese: Custom modal, birth prompt, and home controls`; EN default in option-b; EN↔VI in `e2e/baby-care.spec.ts` | covered |
| Hit targets ≥44 (Kind tiles + Custom icon) | `…` → `3AM geometry: care controls ≥ 56 px; Custom chip excluded` | covered |
| Existing Option B flows still pass (nap, Wet/Dry, Poop sheet, pending, etc.) | many tests in `e2e/baby-home-option-b.spec.ts` (e.g. sleep, Kind Wet/Dry, Step 2 sheet) | covered |
| Kind flush 2×2 + stronger **primary** selected (no gap / shared borders) | `…` → `Kind flush 2×2 + primary selected on Done flash` | covered |
| Row 2 bottle / nap / **Kind** outer heights match | `…` → `row 2 Kind outer height matches bottle and nap` | covered |
| Mid-breast bottle while timer still running (**2A** first write / both legs) | `…` → `mid-breast bottle while timer runs (2A): one insert, both legs` | covered |
| After stop + **grace expired** → new feed / omit session id (**3A**) | `…` → `after stop + grace expired (3A): bottle omits session id; feedsToday +1` | covered |
| Skeleton matches live Kind + bottle cluster + row stretch | `…` → `skeleton soft smoke: Kind + bottle markers (or live layout mirror)` — soft smoke (catch loading.tsx if visible; always assert live `data-layout` mirror). Full CLS parity stays unit (`baby-page-skeleton.test.ts`) | covered |
| Light + dark follow design guide (primary selected readable) | — | blocked — Checkpoint B manual glance; no theme e2e on baby home |
| Ripple + breast primary chrome (**4B**) | — | blocked — Checkpoint B manual glance; CSS motion not asserted in e2e |

**E2E stack:** Playwright (`@playwright/test`)
**E2E command:** `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm exec playwright test e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts`

**Note:** Coverage closed in Round 1 (5 former MISSING gaps). Round 2 did not re-open coverage. Light/dark + ripple stay blocked (manual Checkpoint B). Server-only matrix (bad id, past 6h open window, adopt-on-insert) stays unit/db — not listed as e2e gaps.

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm run build` | 0 | Next.js 16.3.2 compile + TS + static pages OK (~8.6s) |
| Unit | `pnpm test` | 0 | 820 tests · 804 pass · 0 fail · 16 skip (~6.1s) |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm exec playwright test e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts` | 0 | Scoped Option B + baby-care. 59 passed (~2.8m) |

## Failures (if any)

None this round.

## Fix ask for my-code-workflow

None — suite green.

## Round notes

- Add missing e2e: closed 5 former MISSING gaps in `e2e/baby-home-option-b.spec.ts`; light/dark + ripple remain blocked.
- Run suite round 1: build green; unit 1 fail; e2e 2 fail → **Result failure**.
- Fix-from-tests (round 1 ask): (1) unit regex expects `wrote` in quick-care mutation steps; (2) L→R→bottle toast → `Saved bottle` / `Đã lưu bình`; (3) hamburger Log diaper → `Poop Only` / `Chỉ phân`. No product behavior change.
- Run suite round 2: build 0 · unit 0 · e2e 0 (59 passed) · Coverage 14/0 MISSING / 2 blocked manual → **Result success**.
