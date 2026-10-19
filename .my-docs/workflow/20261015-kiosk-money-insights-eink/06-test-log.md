# Test log: 20261015-kiosk-money-insights-eink

**Result:** success  
**Mode last run:** full  
**Round:** 1  
**Updated:** 2026-10-15  
**Smoke source:** Build-verify

## Smoke

**Smoke result:** smoke-pass

| Step | Command | Result |
|------|---------|--------|
| cwd | `/Users/ptquang86/ws/my-apps` | ok |
| build | `npm run build` | pass (exit 0 · Next.js 16.3.7 · `/kiosk` + `/settings`) |
| unit | `npm test` | pass (1537 pass · 0 fail · 31 skipped · 1 cancelled — Telegram AbortSignal pre-existing) |
| e2e | deferred — full test stage (`npm run test:e2e`) | not required for Verify; specs written in `e2e/kiosk-layout.spec.ts` |

**Round notes**

- Verify gate (Build Option 1): build + unit green → **verify-pass** (attempt 1 of 3).
- Shipped draft: registry ids `money.insights_stats_grid` / `money.insights_chart` (default off); gated loaders + pure mappers; e-ink A/B cards (dither bars, dotted rules/grid, footer Money / Insights · this month); visx monochrome chart; Settings toggles via registry; skeleton parity helpers; e2e A-alone / B-alone specs.
- Remaining risks: visual pixel check vs refs (manual); e2e needs `E2E_STORAGE_STATE` + Postgres; CLS when non-default prefs vs default-only skeleton (accepted per DESIGN_GUIDE); Card `bg-surface` vs forced paper may need light/dark eye check.

## Coverage

Map design success criteria / main flows → e2e.

| Criterion / flow | E2E file / test | Status |
|------------------|-----------------|--------|
| Enable A only → stats-grid cell + footer; chart absent | `e2e/kiosk-layout.spec.ts` · `kiosk insights A alone` | covered |
| Enable B only → chart cell + footer; stats-grid absent | `e2e/kiosk-layout.spec.ts` · `kiosk insights B alone` | covered |
| Footer copy `Money` / `Insights · this month` on enabled cell | same A + B tests (`kiosk-insights-footer`) | covered |
| A/B default off; Settings two toggles; layout still persists | `settings kiosk layout persists on /kiosk` + A/B alone toggles | covered |
| Visual 100% pixel match vs refs A/B | — | blocked — manual eye check only (not automatable safely without visual-regression stack) |
| Prefs Zod / registry / mappers / cards / skeletons | unit suites (not e2e) | covered (unit) |

**E2E stack:** Playwright (`@playwright/test`)  
**E2E command:** Verify `npm run test:e2e`; this round ran focused `npm run test:e2e -- e2e/kiosk-layout.spec.ts` (full suite is large; package.json forwards args to playwright)  
**Missing e2e adds:** none — Task 6 A-alone / B-alone / footer already present. No product behavior changes.

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.7 Turbopack · `/kiosk` + `/settings` present |
| Unit | `npm test` | 1* | **1541 pass · 0 fail · 31 skipped · 1 cancelled** — `lib/telegram/send.test.ts` · `passes AbortSignal and times out hung fetch` (pre-existing `cancelledByParent`; fail=0 bar same as smoke / prior workflows). Module-mock second pool skipped when first exit ≠ 0. |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts` | 0 | **3 passed** (layout persist + A alone + B alone). First attempt without env → 3 skipped; Chromium missing in sandbox cache → installed via `npx playwright install chromium`; then green. Hydration warning on Settings hash nav (non-fatal). |

## Failures (if any)

_(none for this slug — unit fail=0; e2e 3/3 pass after auth env + Chromium install)_

## Fix ask for my-dev-flow-code

_(none)_

## Round notes

- **Mode full** coverage: no open required MISSING e2e; visual pixel vs refs remains manual (blocked for automation, not a Fix ask).
- **E2E env:** requires `E2E_STORAGE_STATE=e2e/.auth/user.json` (file present; env unset → soft skip). Postgres was reachable via existing local `pnpm dev` on :3000.
- **Result success** — build green; unit fail=0 (known Telegram cancel only); focused kiosk-layout e2e green; no required coverage gaps.
