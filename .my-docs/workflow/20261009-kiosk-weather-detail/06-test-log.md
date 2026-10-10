# Test log: 20261009-kiosk-weather-detail

**Result:** success
**Mode last run:** lite
**Round:** 1
**Updated:** 2026-10-10 06:53 +0700

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.7 · compile + TS OK · 73 static pages · `/kiosk/weather` in route list · ~6.1s |
| Unit | `npm test` | 1* | 1493 tests · **1464 pass · 0 fail** · 28 skipped · **1 cancelled** — `lib/telegram/send.test.ts` · `passes AbortSignal and times out hung fetch` (`cancelledByParent`; pre-existing, not kiosk weather). Main runner stops before module-mock pool when exit ≠ 0. |
| Unit (module mocks) | `npm run test:module-mocks` | 0 | 22 pass · 0 fail (second pool re-run for smoke completeness) |

**Smoke result:** smoke-pass — build green; unit **fail=0**; non-zero `npm test` exit from known Telegram AbortSignal cancellation only (same bar as prior workflow smokes).

**Fix ask:** none

## Coverage (full mode only)

_(skipped — lite mode; 04-tasks: no e2e planned)_

## Runs (lite)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit | `npm test` | 1* | 1496 tests · **1467 pass · 0 fail** · 28 skipped · **1 cancelled** — `lib/telegram/send.test.ts` · `passes AbortSignal and times out hung fetch` (`cancelledByParent`; pre-existing). open-meteo + weather-day suites ok. |
| Unit (module mocks) | `npm run test:module-mocks` | 0 | 22 pass · 0 fail |
| Build | `npm run build` | 0 | Next.js 16.3.7 · compile + TS OK · 73 routes · `/kiosk/weather` present · ~7.5s |
| E2E | _(not run)_ | — | 04-tasks: no e2e planned (live Open-Meteo + seeded city; cover by unit + manual) |

**Lite result:** success — unit fail=0; module-mocks green; build green; no e2e required.

**Fix ask:** none

## Failures (if any)

None for this slug. One cancelled Telegram unit subtest (pre-existing).

## Fix ask for my-dev-flow-code

None.

## Round notes

- Smoke round 1: build then unit; module-mock pool run separately after main `npm test` exit 1.
- Lite round 1: re-ran unit + module-mocks + build after adversarial fixes; skipped coverage Task and e2e per 04-tasks / lite rules.
