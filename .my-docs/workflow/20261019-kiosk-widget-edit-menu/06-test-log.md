# Test log: 20261019-kiosk-widget-edit-menu

**Result:** success
**Test path last run:** full
**Round:** 3
**Updated:** 2026-10-19T01:28Z
**Smoke source:** Smoke-Task

## Smoke (build + unit — usually written by Build on verify-pass)

Use Verify commands from `00-run.md`.

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.7 Turbopack + TypeScript green (E1 re-run) |
| Unit | `npm test -- lib/kiosk/ components/kiosk/ lib/validators/user-preferences` | 0 | fail 0 |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Source-enabled: Edit → Resize + Source → Done → reload keeps both (Task 7 / Gate A #1) | `e2e/kiosk-edit-menu.spec.ts` → Edit → Resize + Source on loans.summary → Done → reload keeps both | covered (passed this run) |
| Done returns quiet board (no menus; strip back to Edit) | same test (Done + `data-kiosk-edit-mode=false` + no `[data-kiosk-edit-menu]`) | covered (passed) |
| Resize-only cell: menu + Resize; no Source (e.g. heatmap) | same test (`money.insights_heatmap` asserts) | covered (Resize visible / Source absent; Escape closes menu) |
| Weather / no-menu cell: no edit menu | same test (`context.today_weather` count 0) | covered (passed) |
| Settings layout persists on `/kiosk` (columns + month board) | `e2e/kiosk-layout.spec.ts` → settings kiosk layout persists on /kiosk | covered (passed) |
| Heatmap toggle round-trip; off keeps month_board | `e2e/kiosk-layout.spec.ts` → heatmap toggle… | covered (passed) |
| Insights A alone / B alone | `e2e/kiosk-layout.spec.ts` → kiosk insights A/B alone | covered (passed) |
| Cross-topic Source blocked | same edit-menu test (topic chip `loan` + loan-only signal pickers); Zod/unit lock remaining | covered (UI topic-locked; unit covers Zod reject) |

**E2E stack:** Playwright (`npm run test:e2e`)
**E2E command:** `npm run test:e2e -- e2e/kiosk-layout.spec.ts e2e/kiosk-edit-menu.spec.ts` (auth: `E2E_STORAGE_STATE=e2e/.auth/user.json` — file present)

**Open MISSING:** none (required flows have specs)

## Runs (full / lite mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Turbopack compile + TypeScript + 73 static routes |
| Unit | `npm test -- lib/kiosk/ components/kiosk/ lib/validators/user-preferences` | 0 | fail 0 (aggregate ~1673 focused-path tests; pass) |
| E2E (auth) | `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts e2e/kiosk-edit-menu.spec.ts` | 0 | **5 passed** (layout 4 + edit-menu 1). Settings hash nav hydration warning (non-fatal; known pattern). |

## Failures (if any)

none this run

## Fix ask for my-dev-flow-code

n/a — Result success

## Round notes

- Coverage: no required MISSING; Playwright stack present.
- Round 3 (cap raised after Escape sync fix): build 0; unit fail 0; auth e2e **5 passed** → Result **success**.
- Hydrate Edit disable-until-ready holds; Escape after heatmap menu closes (`kiosk-edit-resize` count 0).

### Fix-from-tests Round 1 (verify-pass)

- **Root cause:** SSR Edit button was clickable before React hydrated; Playwright click never hit `onClick` (`aria-pressed` stayed false).
- **Fix:** `KioskEditStrip` keeps toggle `disabled` until client mount (`data-kiosk-edit-ready`); Playwright waits for enabled.
- **Follow-on:** Popover Escape close claimed; e2e asserts count 0 after Escape.
- **Verify (then):** build 0; unit fail 0; auth e2e `kiosk-layout` + `kiosk-edit-menu` → 5 passed.

### Fix-from-tests Round 2 (verify-pass) — Escape after heatmap menu

- **Root cause:** Popover attached Escape `keydown` inside `setTimeout(0)` (with outside-click). Panel painted first; Playwright pressed Escape before the listener bound → menu stayed open (`kiosk-edit-resize` count 1).
- **TDD:** Failing units for sync Escape → `onClose` / `onOpenChange(false)` (`popover-dismiss`, Popover wiring, MoreMenu forward, `applyKioskCellMenuOpenChange`); then product fix.
- **Fix:** `attachPopoverDocumentDismiss` registers Escape (capture) + mousedown immediately; Popover uses it (no Escape deferral). Outside-open still gated by `ignoreOutsideUntilRef`. E2E Escape assert kept.
- **Verify:** `npm run build` 0; `npm test -- lib/kiosk/ components/kiosk/ lib/validators/user-preferences` fail 0; `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts e2e/kiosk-edit-menu.spec.ts` → **5 passed**.
