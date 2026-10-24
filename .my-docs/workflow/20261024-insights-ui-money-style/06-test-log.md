# Test log: 20261024-insights-ui-money-style

**Result:** success  
**Test path last run:** lite  
**Mode last run:** test-lite  
**Round:** 1  
**Updated:** 2026-10-24T10:34:00+07:00  
**Smoke source:** Build-verify

## Smoke

**Smoke result:** smoke-pass (Build-verify companion — independent Smoke-Task unpaid)

| Step | Command | Result |
|------|---------|--------|
| cwd | `/Users/ptquang86/ws/my-apps` | ok |
| unit | `pnpm test` | pass (exit 0) — prior Verify |
| build | `pnpm run build` | pass (exit 0) — prior Verify |
| e2e | deferred to test-lite | paid below |

**Round notes**

- Verify gate (Build): unit + build green → **Result: verify-pass**.
- Attempt budget: 1 of 3.
- Smoke source remains Build-verify (lite OK).

## Suite / e2e

**Lite path:** targeted hero unit suite + insights e2e.

| Step | Command | Result |
|------|---------|--------|
| unit (hero) | `tsx --test` insights-hero-duo / investment-insights-hero / loans-insights-hero / loans-insights-urgency-skeleton / baby-insights-hero / baby-insights-filter-skeleton | pass — 18/18 |
| e2e (insights) | `playwright test` baby-care + investments + loans, grep ATF/KPI/More/loading/hydration/alerts | pass — 13/13 |

**Covered e2e cases**

- Baby: filters + ATF KPIs; Apply date range; loading skeleton; default Hydration + Night Rest; insight KPI strip; purpose copy; hydration / watery alerts; soft-empty; More chart region; empty growth copy
- Investments / loans: insights More teasers expand (auth via `E2E_STORAGE_STATE`)

**Round notes**

- FIRST: Has API/DB = no|no → not missing required; Review clean; Lenses clean (plan none).
- Playwright Chromium installed once before suite (`playwright install chromium`).
- Lite clear met → **Result: success** + Test path `lite`.
