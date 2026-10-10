# Tasks: Kiosk weather — PM2.5 + day detail page

**Automated tests planned:** yes (unit, `node:test`, run with `npm test`). E2E: none planned — the page needs live Open-Meteo + a seeded city, and no kiosk e2e exists; cover by unit tests + manual light/dark check.

**Rule:** write each test first, see it fail, then change production code.

## Task 1: Chrome wiring for `/kiosk/weather`

**Description:** Make header, rail hiding, and nav active state treat `/kiosk/weather` as part of Kiosk. Add an optional `meta` override on `CoreShellPage`.

**Acceptance:**

- [ ] `resolveCoreAppHeader("/kiosk/weather")` → title `Weather`, breadcrumbs `Kiosk › Weather` (crumb href `/kiosk`), default meta `Hourly outlook`, `cta: null`.
- [ ] `resolveCoreAppHeader("/kiosk")` unchanged.
- [ ] `hidesShellRailChrome("/kiosk/weather")` is true; `"/kioskx"` stays false.
- [ ] Kiosk nav item `activeMatch` is `"prefix"` and is active on `/kiosk/weather`; other nav items unchanged.
- [ ] `CoreShellPage` accepts optional `meta?: string`; when set, it replaces the resolver meta.

**Tests (TDD — what turns red first):**

- [ ] Extend `lib/money-tabs-chrome-path.test.ts`: `/kiosk/weather` and `/kiosk` true; `/kioskx` false.
- [ ] New `lib/core-app-header.test.ts`: cases above (kiosk, kiosk/weather, help, fallback).
- [ ] New `lib/features/registry.kiosk.test.ts` (style of `registry.baby.test.ts`): kiosk `activeMatch === "prefix"`.

**Files likely touched:** `lib/core-app-header.ts`, `lib/money-tabs-chrome-path.ts`, `lib/features/registry.ts`, `components/core-shell-page.tsx`, the three test files above.

**Scope:** S

**Dependencies:** none

---

## Task 2: Pure weather-day helpers

**Description:** Add `lib/weather/weather-day.ts` with types and pure functions. No network.

**Acceptance:**

- [ ] `hourFromLocalTime("2026-10-10T15:00")` → `15`; bad input → `null`.
- [ ] `buildWeatherDay(forecast, aq, label)` returns 24 rows keyed by forecast `hourly.time`, dated by `current.time.slice(0,10)`; `nowIndex` from `current.time`; `current.tempC` from forecast current; `current.pm25` = `Math.round(aq.current.pm2_5)` or `null`.
- [ ] AQ rows merge by identical `time` string; no match → `pm25: null`; hourly `null` stays `null` (never 0).
- [ ] `aqAvailable` false when `aq` is `null` or has no usable hourly/current; all `pm25` null.
- [ ] `rainTotalMm` = sum of non-null `rainMm`, rounded to 1 decimal.
- [ ] Returns `null` when forecast has no usable hours or no `current`.
- [ ] Non-finite numbers become `null`.
- [ ] `formatPm25Line(21.3)` → `"PM2.5 21 µg/m³"`; `null` → `"PM2.5 —"`.
- [ ] `formatPm25Line(0)` and `formatPm25Line(0.4)` → `"PM2.5 0 µg/m³"` (0 is not missing).
- [ ] `formatWeatherDayMeta("Hanoi","2026-10-10")` → `"Hanoi · Sat, Oct 10"` (UTC-based format; independent of device time zone).

**Tests (TDD — what turns red first):**

- [ ] New `lib/weather/weather-day.test.ts` with small fixture JSON for each bullet above. Include: AQ missing a time, AQ `null` hour, rain all zero, current at `T23:00` (nowIndex 23), device TZ ≠ city TZ (assert no `Date` parsing: fixture time `2026-10-10T23:30` stays hour 23).
- [ ] **04a Major:** AQ `current.pm2_5: 0` → `current.pm25 === 0`; forecast temp `0` and `-3.6` stay numbers in rows (never treat 0 as missing).

**Files likely touched:** `lib/weather/weather-day.ts`, `lib/weather/weather-day.test.ts`

**Scope:** M

**Dependencies:** none

---

## Task 3: Fetch layer — PM2.5 on snapshot + `fetchWeatherDay`

**Description:** Extend `open-meteo.ts`. Run forecast + AQ in parallel. Cache only complete results.

**Acceptance:**

- [ ] `WeatherSnapshot.pm25: number | null` (rounded). `fetchCurrentWeather` signature unchanged.
- [ ] AQ call fails or returns bad JSON → snapshot still returned with `pm25: null`; **not cached** (next call fetches again).
- [ ] Both succeed → cached 15 min (existing behavior).
- [ ] Forecast fails → `null`.
- [ ] `fetchWeatherDay(lat,lon,label)` → `WeatherDay | null` using `buildWeatherDay`; URLs include `timezone=auto`, `forecast_days=1`, and the hourly fields in the design; own cache key space/map; cached only when AQ ok.
- [ ] Both fetches use `next: { revalidate: 900 }`.

**Tests (TDD — what turns red first):**

- [ ] Extend `lib/weather/open-meteo.test.ts` with a **URL-routed** fake `fetch` (forecast host vs air-quality host): pm25 present; AQ 500 → `pm25: null` and a second call re-fetches AQ; both ok → second call served from cache; forecast 500 → `null`; day: URLs contain `timezone=auto` + `hourly=`; AQ fail → `aqAvailable: false`, not cached; day cache hit on second call. Update existing assertions for the new `pm25` field.
- [ ] **04a Major:** AQ `fetch` throws (network) and AQ 200 with non-JSON body → snapshot `pm25: null` / day `aqAvailable: false`, not cached (same for both fetchers).
- [ ] **04a Major:** Forecast fails while AQ ok → both fetchers return `null`, not cached; `fetchCurrentWeather` then `fetchWeatherDay` on same coords → day still hits network and returns `hours` (caches must not share keys).

**Files likely touched:** `lib/weather/open-meteo.ts`, `lib/weather/open-meteo.test.ts`

**Scope:** M

**Dependencies:** Task 2

---

## Task 4: Kiosk strip — PM2.5 line, link, no city + skeleton

**Description:** Update `KioskContextStrip` and `KioskDashboardSkeleton` together.

**Acceptance:**

- [ ] Weather side shows temp, condition, `formatPm25Line(weather.pm25)`; city line removed.
- [ ] Weather side is one `next/link` to `/kiosk/weather` with `fx-hit-40 fx-press`, focus ring, `transition-colors`, `rounded-[var(--radius-sm)]`; accessible name includes temp + PM2.5.
- [ ] No-city copy keeps the Settings link and is not inside the weather link. Fetch-failed copy has no link.
- [ ] `weatherCity` prop still picks "unavailable" vs "set your city".
- [ ] Skeleton weather side = 4 lines (label, temp, condition, PM2.5), same grid and radii as live.
- [ ] Update `docs/DESIGN_GUIDE.md` "Kiosk glance pattern" item 1 (today + weather incl. PM2.5, links to day page).

**Tests (TDD — what turns red first):**

- [ ] **Required (04a Major — harness exists):** `components/kiosk/kiosk-context-strip.test.ts` via `renderToStaticMarkup`: (a) weather + pm25 → one link `/kiosk/weather`, text `PM2.5 21 µg/m³`, no city; (b) `pm25: null` → `PM2.5 —`; (c) no weather + no city → Settings link, no weather link, no nested `<a>`; (d) no weather + city → "temporarily unavailable", no weather link.
- [ ] Confirm `lib/kiosk-first-load.test.ts` still passes (no chart imports on `/kiosk`).

**Files likely touched:** `components/kiosk/kiosk-context-strip.tsx`, `components/kiosk/kiosk-dashboard-skeleton.tsx`, `docs/DESIGN_GUIDE.md`

**Scope:** S

**Dependencies:** Task 3

---

## Task 5: Generic day chart (visx)

**Description:** Add `components/weather/weather-day-chart.tsx` (client) — line and bars on a shared `00–23` axis with "now" marker and tooltip.

**Acceptance:**

- [ ] Props: `kind: "line" | "bars"`, points `{hour, value|null, extra?}`, `unit`, `nowIndex`, `colorIndex`, `ariaLabel`, tooltip formatter.
- [ ] Built from `ChartShell` + `ChartParentSize` + `@visx/scale` + `@visx/shape`; colors from `colorByIndex`; no hex.
- [ ] `null` values are gaps (line uses `defined`); bars skip `null`.
- [ ] Ticks 00/06/12/18/23; "now" marker at `nowIndex`; tooltip works on hover, tap, focus.
- [ ] Respects `prefersReducedMotion`; fixed height; wrapper has `role="img"` + `aria-label`.
- [ ] Pure scale/domain/summary helpers are exported from a small non-React file so they can be tested.

**Tests (TDD — what turns red first):**

- [ ] New `components/weather/weather-day-chart-helpers.test.ts`: y-domain with `null`s, all-null → empty flag, flat-zero rain domain not degenerate, `ariaLabel` summary text (min/max), tick list.

**Files likely touched:** `components/weather/weather-day-chart.tsx`, `components/weather/weather-day-chart-helpers.ts`, test file

**Scope:** M

**Dependencies:** Task 2

---

## Task 6: `/kiosk/weather` page, view, skeleton, loading

**Description:** Add the RSC page and views. Page uses `CoreShellPage` with `meta`. Add matching skeleton.

**Acceptance:**

- [ ] `app/(shell)/kiosk/weather/page.tsx`: `force-dynamic`, `auth()` → `/login` redirect, load prefs, `fetchWeatherDay` in `try/catch → null`; passes `meta={formatWeatherDayMeta(city, day.date)}`.
- [ ] No city → `AnalyticsEmptyState` + Settings link. Forecast `null` → "Weather is temporarily unavailable." state.
- [ ] `WeatherDayView`: cards in order Temperature → PM2.5 → Rain; headline values per design (`NN°C`, `NN µg/m³`/`—`, `N.N mm`); auto-fit grid `repeat(auto-fit,minmax(min(100%,26rem),1fr))`; `aqAvailable: false` → PM2.5 card shows "Air quality is temporarily unavailable."
- [ ] Rain tooltip shows mm + probability; temp/PM2.5 tooltips per design.
- [ ] `WeatherDayPageSkeleton` + `app/(shell)/kiosk/weather/loading.tsx`: 3 card skeletons, same grid, order, and radii as live.
- [ ] Header title `Weather`, crumbs, hamburger present, rail hidden, Kiosk nav active (Task 1 wiring).
- [ ] `proxy.ts` unchanged.
- [ ] Read `node_modules/next/dist/docs/` for page/loading/Link conventions before writing.

**Tests (TDD — what turns red first):**

- [ ] **Required (04a Major):** `components/weather/weather-day-view.test.ts` (render; mock chart if needed): card order Temperature → PM2.5 → Rain; `aqAvailable: false` → "Air quality is temporarily unavailable." with temp + rain cards still rendered; all rain `0` → headline `0.0 mm` (or chosen format), not empty state.
- [ ] Pure headline helpers (if any) in `weather-day.ts` / `weather-day.test.ts` (e.g. `formatRainTotal`, `formatTempNow`).
- [ ] Manual (no e2e): signed-in with city → 3 charts; no city → empty state; signed out → `/login`; light + dark.

**Files likely touched:** `app/(shell)/kiosk/weather/page.tsx`, `app/(shell)/kiosk/weather/loading.tsx`, `components/weather/weather-day-view.tsx`, `components/weather/weather-day-page-skeleton.tsx`

**Scope:** M

**Dependencies:** Tasks 1, 3, 5

---

## Checkpoints

After Tasks 1–3:

- [ ] `npm test` passes (new chrome, helper, and fetch tests green).
- [ ] No production change landed before its test failed first.

After Tasks 4–6:

- [ ] `npm run lint` and `npm run build` pass.
- [ ] `/kiosk` shows temp + condition + PM2.5, no city; tap opens `/kiosk/weather`.
- [ ] Skeletons match live (kiosk strip 4 lines; weather page 3 cards); zero visible layout shift.
- [ ] Light and dark checked in `/settings`; `lib/kiosk-first-load.test.ts` passes.
- [ ] `GLOSSARY.md` has the 2 grill terms; `DESIGN_GUIDE.md` kiosk line updated.
