# TDD test-case review: 20261009-kiosk-weather-detail

**Result:** needs more tests
**Round:** 1
**Updated:** 2026-10-10 (UTC+7)

**Key fact:** The repo already has a render test harness (`renderToStaticMarkup` + `node:test`, for example `components/baby-page-skeleton.test.ts`). Task 4 says "add a render test if a harness exists". The harness exists, so the strip render test is required, not optional.

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Header for `/kiosk/weather` and `/kiosk` unchanged; help and fallback | yes |
| 1 | edge | `hidesShellRailChrome` `/kioskx` false | yes |
| 1 | real | Kiosk nav `activeMatch === "prefix"` | partial — no check that it is not active on `/kioskx` |
| 1 | real | `CoreShellPage` `meta` override | no |
| 2 | real | `buildWeatherDay` rows, `nowIndex`, `current`, rain total | yes |
| 2 | edge | AQ missing time, AQ `null` hour, rain all zero, `T23:30`, device TZ ≠ city TZ | yes |
| 2 | edge | Value `0` stays `0` (PM2.5 `0`, temp `0`, negative temp) | no |
| 2 | edge | Hourly data that spans 2 days; arrays shorter than `time` | no |
| 3 | real | pm25 present; both ok → cached; forecast 500 → `null` | yes |
| 3 | real | AQ 500 → `pm25: null`, not cached | yes |
| 3 | edge | AQ fetch throws (network error) or returns bad JSON | no |
| 3 | edge | Forecast fails while AQ is ok → `null`, not cached | no |
| 3 | edge | Snapshot cache and day cache do not share keys | no |
| 4 | real | Strip link `href`, `PM2.5 —`, no city text | no (marked optional; harness exists) |
| 4 | real | No-city Settings link is not inside the weather link; fetch-failed has no link | no |
| 4 | real | Skeleton = 4 weather lines | no |
| 4 | edge | `/kiosk` has no chart imports (`kiosk-first-load.test.ts`) | partial — existing test does not check the strip |
| 5 | edge | y-domain with `null`, all-null, flat zero, aria summary, ticks | yes |
| 6 | real | Card order, AQ-unavailable copy, rain `0 mm` headline | no (manual only) |
| 6 | real | Auth redirect, no-city empty state | no (manual only; deferred in `03a`) |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 4 | Kiosk weather block markup is user-visible feature #1 and has no automated test. Harness exists. | New `components/kiosk/kiosk-context-strip.test.ts`: (a) weather + pm25 → one `<a href="/kiosk/weather">`, text `PM2.5 21 µg/m³`, city label not in HTML; (b) `pm25: null` → `PM2.5 —`; (c) no weather + no city → Settings link present, no `/kiosk/weather` link, no `<a` inside `<a`; (d) no weather + city set → "temporarily unavailable", zero links in weather side. |
| Major | 6 | AQ-down card state and card order are only checked by hand. | New `components/weather/weather-day-view.test.ts` (render, mock chart via plain props if needed): order Temperature → PM2.5 → Rain; `aqAvailable: false` → "Air quality is temporarily unavailable." and temp + rain cards still render; all rain `0` → headline `0.0 mm` (or the chosen format), no empty state. |
| Major | 3 | Real AQ failures are often a thrown error or non-JSON 200, not a 500. `Promise.allSettled` rejected path is different code. | In `open-meteo.test.ts`, use a URL-routed fake `fetch` (forecast host vs `air-quality-api` host). Add: AQ `fetch` throws → snapshot with `pm25: null`, 2nd call re-fetches AQ; AQ 200 with body `"oops"` → same. Same two cases for `fetchWeatherDay` → `aqAvailable: false`, not cached. |
| Major | 3 | Forecast fails, AQ ok → must return `null` and not cache. A shared cache can also return a snapshot to the day page (wrong shape → crash). | Test: forecast 500 + AQ ok → `null` on both fetchers; 2nd call fetches forecast again. Test: `fetchCurrentWeather(lat,lon)` then `fetchWeatherDay(lat,lon)` → day call still hits the network and returns a `WeatherDay` (has `hours`). |
| Major | 2 | `0` must not be treated as missing (falsy bug). Design lock: never mix `null` and `0`. | In `weather-day.test.ts`: `formatPm25Line(0)` → `"PM2.5 0 µg/m³"`; `formatPm25Line(0.4)` → `"PM2.5 0 µg/m³"`; AQ `current.pm2_5: 0` → `current.pm25 === 0`; forecast temp `0` and `-3.6` stay numbers in rows. |
| Enhancement | 2 | Hourly arrays that span 2 days, or are shorter than `time`. | Fixture with 48 `time` entries → only rows for `current.time.slice(0,10)`; `temperature_2m` shorter than `time` → missing entries `null`. |
| Enhancement | 2 | `hourFromLocalTime` bad inputs and rounding. | `""`, `"2026-10-10"`, `"2026-10-10T25:00"` → `null`. `formatPm25Line(21.5)` → `22`. Rain `[0.1, 0.2]` → `rainTotalMm === 0.3`. |
| Enhancement | 2 | `aqAvailable` when AQ has `current` but no `hourly` (or the reverse) is not defined. | Decide the rule in Build, then one test per side. |
| Enhancement | 5/6 | Tooltip strings are specified in design but not tested. | Pure formatter tests: temp `"15:00 · 31°C"`; rain `"15:00 · 1.2 mm · 40% chance"`; rain with `null` probability has no "chance" part. |
| Enhancement | 1 | `meta` override and nav false-positive. | Kiosk nav item not active on `/kioskx`. `CoreShellPage` meta: render test if it renders without router context; else skip with one line. |
| Enhancement | 4/6 | Skeleton parity and slim `/kiosk` bundle. | Render `KioskDashboardSkeleton` → 4 weather `data-skeleton` lines; `WeatherDayPageSkeleton` → 3 cards in grid order. Extend `kiosk-first-load.test.ts`: strip source has no `@visx` / `weather-day-chart` import. |
| Enhancement | 6 | Auth redirect is manual (already deferred in `03a`). | Optional source check like `kiosk-first-load.test.ts`: `page.tsx` calls `auth()` and `redirect("/login")`. |

## Real scenarios checked

- **Happy path:** Covered for helpers, fetch, chrome, chart helpers. Missing for the two UI surfaces (strip, day view).
- **User-visible failures:** AQ 500 covered. AQ throw / bad JSON, forecast-fail-with-AQ-ok, and the AQ-unavailable card are missing.
- **Empty / loading / permission:** No-city and fetch-failed strip states missing; skeletons manual only; auth manual only (accepted as Enhancement).

## Edge scenarios checked

- **Boundaries / invalid input:** `null` hours, `T23:30`, flat-zero domain covered. Zero values, bad time strings, 2-day arrays missing.
- **Concurrency / double-submit / idempotency:** N/A — read-only, no writes. Cache correctness covered under Task 3 gaps.
- **Offline / partial data / race:** Partial AQ covered by 500 only. Thrown fetch and cache-key collision missing.

## Fix ask for Build

Concrete tests to add or strengthen:

1. **Task 4 (Major):** Add `components/kiosk/kiosk-context-strip.test.ts` with the 4 render cases in the Gaps table. Make it required in `04-tasks.md` (harness exists).
2. **Task 6 (Major):** Add `components/weather/weather-day-view.test.ts`: card order, AQ-unavailable copy with temp + rain still shown, rain all-zero headline.
3. **Task 3 (Major):** Switch to a URL-routed fake `fetch`. Add AQ throws and AQ non-JSON cases for both fetchers (pm25 `null` / `aqAvailable: false`, not cached).
4. **Task 3 (Major):** Add forecast-fail + AQ-ok → `null`, not cached; and snapshot-then-day on same coords → day still fetches and has `hours`.
5. **Task 2 (Major):** Add zero-value tests: `formatPm25Line(0)`, `pm2_5: 0` → `0`, temp `0` and negative stay numbers.

## Round notes

- Round 1: plan is strong for pure helpers and cache rules. Main gap is that both UI surfaces rely on manual checks while a render harness already exists. 5 Major, 7 Enhancement.
- Deferred Enhancements: 2-day arrays, bad time strings + rounding, `aqAvailable` partial rule, tooltip formatter tests, nav `/kioskx`, skeleton render tests + slim-bundle check, auth source check.
