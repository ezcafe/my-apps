# Test log: 20261015-kiosk-money-insights-heatmap

**Result:** success  
**Mode last run:** full  
**Round:** 2  
**Updated:** 2026-10-15  
**Smoke source:** Build-verify

## Smoke

**Smoke result:** smoke-pass

| Step | Command | Result |
|------|---------|--------|
| cwd | `/Users/ptquang86/ws/my-apps` | ok |
| build | `npm run build` | pass |
| unit | `npm test` | pass (fail=0) |
| e2e | deferred to full test stage | Build Verify SoT: build + unit |

## Coverage

| Criterion / flow | E2E file / test | Status |
|------------------|-----------------|--------|
| Heatmap toggle round-trip Settings → `/kiosk` | `e2e/kiosk-layout.spec.ts` · `heatmap toggle round-trip; off keeps month_board` | **covered** · executed green |
| Heatmap off keeps month_board | same | **covered** · executed green |
| Layout persist / A·B alone (siblings) | same file | **covered** · executed green |
| Visual 100% pixel vs ref | — | **blocked** — manual only |
| Prefs / registry / mapper / card / skeleton | unit suites | **covered** (unit) |

**Missing e2e adds:** none

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Round 1 + Round 2 |
| Unit | `npm test` | 0 | fail=0 (Telegram cancel flake only) |
| E2E Round 1 | focused kiosk-layout | not run | Docker down |
| E2E Round 2 | `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-layout.spec.ts` | 0 | **4 passed** (layout persist · heatmap toggle · A alone · B alone) · Postgres started via docker compose |

## Failures (if any)

none (Round 2)

## Round notes

- Round 1 failure was env-only (Docker/Postgres). Parent started Docker + migrate; focused e2e **4/4** green.
- **Result success** — Gate C bar met for Review profile full.
