# Review log: Kiosk weather — PM2.5 + day detail page

## Adversarial test review

**Round:** 1 · **Result:** not clean — 3 Major, 7 Enhancement, 2 Nit/FYI
**Run:** 8 new/changed test files, 43 tests, all pass (`npx tsx --test …`).

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/weather/open-meteo.test.ts:187-208` | **Test name says "pm25 null" but checks only `aqCalls === 2`.** It does not check that a snapshot comes back or that `pm25 === null`. A bug that returns `null` when AQ fails still passes. Add `assert.ok(first)`, `first.tempC === 31.2`, `first.pm25 === null`. | fixed |
| Major | `lib/weather/open-meteo.test.ts:336-357` | **Day AQ-fail test checks only the call count.** It does not check that `day` is non-null, `aqAvailable === false`, `hours.length === 24`, or that every `pm25` is null. Returning `null` (so the page shows "unavailable" instead of temp + rain) still passes. This is the main degrade path for the page. | fixed |
| Major | `lib/weather/open-meteo.test.ts:227-251` | **04a Major is only half done.** AQ `fetch` throws and AQ 200 non-JSON are tested for `fetchCurrentWeather` only. 04-tasks says "same for both fetchers". No test covers `fetchWeatherDay` with these failures (`aqAvailable: false`, not cached, still returns hours). | fixed |
| Enhancement | `lib/weather/open-meteo.ts:263-266` (no test) | **Snapshot caches AQ 200 `{}` / missing `pm2_5`.** `aqOk` is true for any parsed JSON, so `pm25: null` is cached for 15 min. The day path uses `aqHasUsableData` and does not cache. No test locks either rule. Also flag to Quality (behavior mismatch). | open |
| Enhancement | `lib/weather/weather-day.test.ts` | **Task 2 bullets with no test:** no `current` → `null`; non-finite numbers → `null`; AQ hourly `null` hour stays `null` (only forecast temp null is tested); `aqAvailable` false when AQ is `{}` or all-null; `rainTotalMm` with some `null` rain values. | open |
| Enhancement | `components/weather/weather-day-chart-helpers.ts:43-62` | **Tooltip formatters have no tests.** Task 6 asks rain tooltip = mm + probability. `formatWeatherRainTooltip` (with and without prob), `formatWeatherTempTooltip`, `formatWeatherPm25Tooltip` are untested. | open |
| Enhancement | `lib/weather/open-meteo.test.ts:328-329` | **URL checks are loose.** `urls.some(...)` passes if any one URL matches. No check of `forecast_days=1`, the hourly field list, AQ `hourly=pm2_5`, or `next.revalidate === 900`. Check each URL by host. | open |
| Enhancement | `components/kiosk/kiosk-context-strip.test.ts:32` | **"No city" check is weak.** `doesNotMatch(/>Hanoi</)` misses `> Hanoi` or `Hanoi, Vietnam`. Use `doesNotMatch(/Hanoi/)`. The accessible name (temp + PM2.5 in `aria-label`) is not checked. | open |
| Enhancement | `components/core-shell-page.tsx`, `app/(shell)/kiosk/weather/page.tsx` | **No automated test for the `meta` override or the page branches** (no city → empty state; `null` / throw → "unavailable"). Only a manual check is planned. The risk is low, but a small pure helper or a render test would lock these branches. | open |
| Enhancement | `lib/weather/open-meteo.test.ts` | **Cache expiry is not tested.** No fake clock shows that a 15-min entry expires and fetches again. | open |
| Nit | `components/weather/weather-day-view.test.ts:30-50` | The order test uses the first `indexOf` of each word, so it is fragile if copy changes. The AQ-unavailable test does not check that the PM2.5 chart / headline is absent. | open |
| FYI | `lib/weather/weather-day.ts:139-150` | On a DST day, local times can skip or repeat an hour (23 or 25 rows). The chart keys bars by `hour` (`bar-${p.hour}`), so a repeated hour gives duplicate keys. No test covers this. Defer to Quality. | — |

**Round notes:**

- **Strong:** chrome tests (`/kiosk/weather`, `/kioskx` negative, nav prefix); 0 vs missing for PM2.5 and temp; `T23:30` hour without `Date` parsing; separate snapshot/day caches; forecast-fail no-cache (`forecastCalls === 3`); strip link/no-nested-`<a>`; deterministic fixtures; caches cleared in `finally`.
- **No flaky patterns found:** fixed fixtures; global `fetch` restored; distinct coords per test.
- **Fix ask (Major only):**
  1. `open-meteo.test.ts:187-208` — assert snapshot returned with `tempC` and `pm25 === null` on AQ 500.
  2. `open-meteo.test.ts:336-357` — assert day non-null, `aqAvailable === false`, 24 hours, all `pm25` null.
  3. Add `fetchWeatherDay` cases for AQ network throw and AQ 200 non-JSON: still returns hours, `aqAvailable: false`, second call re-fetches AQ.
- Deferred Enhancements: E1–E7 above (log; non-blocking per severity.md).

### Round 2 (re-check after Fix)

**Round:** 2 · **Result:** clean — 0 Critical, 0 Major
**Run:** `npx tsx --test lib/weather/open-meteo.test.ts` → 14 pass, 0 fail.

| Fix ask (Round 1 Major) | Location | Verdict |
|-------------------------|----------|---------|
| Snapshot AQ 500: assert returned snapshot with `tempC` + `pm25 === null` | `lib/weather/open-meteo.test.ts:187-212` | **closed** — `assert.ok(first)`, `tempC === 31.2`, `pm25 === null`, `aqCalls === 2` |
| Day AQ 500: assert day non-null, `aqAvailable === false`, 24 hours, all `pm25` null | `lib/weather/open-meteo.test.ts:340-366` | **closed** — all four shape/degrade asserts + second-call re-fetch |
| Day AQ throw + 200 non-JSON: hours, `aqAvailable: false`, re-fetch AQ | `lib/weather/open-meteo.test.ts:368-396` | **closed** — new test; hours returned, all `pm25` null, `aqAvailable: false`, `aqCalls === 2` |

**Round notes:**

- Round 1 Majors 1–3 are closed in assertions (not call-count-only mock theater).
- Enhancements E1–E7 and Nit/FYI remain open; non-blocking — do not reopen as Major.
- No new Critical/Major found on re-check.

---

## Quality

**Round:** 1 · **Result:** not clean — 0 Critical, 3 Major, 4 Enhancement, 2 Nit
**Axes:** Correctness, Architecture (Patterns 1–3), Readability, Performance (light; defer chart cost to perf lens). Has UI vs Design UI specs. No API/DB deep review.

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/core-app-header.ts:14-20` + `components/ui/breadcrumb.tsx` | **Chrome crumbs drift from Design.** Spec / Task 1: breadcrumbs `Kiosk › Weather` with crumb href `/kiosk` (same shape as baby/money/loans: parent link + current label). Draft returns only `[{ label: "Kiosk", href: "/kiosk" }]`. With a single item, `Breadcrumb` treats it as last → non-link span **"Kiosk"** only; **"Weather" is missing** from the trail and Kiosk is not clickable. Shipped chrome text/position ≠ Design UI. Fix: `[{ label: "Kiosk", href: "/kiosk" }, { label: "Weather" }]` and lock in `core-app-header.test.ts`. | fixed |
| Major | `components/weather/weather-day-chart.tsx:123-168` | **Null hours are not chart gaps (Pattern 3 / AC).** Design: hourly `null` is a gap; use `defined()` to skip null — never draw as 0. Draft filters nulls out of `linePoints` before `LinePath`, so the curve **bridges** missing hours (e.g. 10→12). `defined={(p) => p.value != null}` is dead after the filter. Pass the full 00–23 series (nulls kept) and let `defined` break the path. | fixed |
| Major | `lib/weather/open-meteo.ts:261-281` | **Partial AQ snapshot is cached (Pattern 2 / contract).** Design: fail-soft; do not cache partial; AQ fail → `pm25: null`, **not cached**. `aqOk = true` for any parsed JSON body (e.g. `{}` / missing `pm2_5`), then caches a snapshot with `pm25: null` for 15 min. Day path correctly uses `aqHasUsableData` / `day.aqAvailable`. Align snapshot with usable AQ (or only cache when `pm25 != null` / finite current), matching day. | fixed |
| Enhancement | `components/weather/weather-day-page-skeleton.tsx:7-9` vs `weather-day-view.tsx:46-50` | **Skeleton spacing drift.** Live headline uses `mt-2`; skeleton uses `mt-3`. Chart block live has no top margin class; skeleton uses `mt-4`. Order/grid/radii OK; tighten spacing for skeleton parity / CLS. | open |
| Enhancement | `app/(shell)/kiosk/weather/page.tsx:46` | **Forecast-fail meta uses UTC device calendar day** (`new Date().toISOString().slice(0,10)`), not city-local `day.date`. Wrong date near TZ midnight. Prefer omit override meta or a city-safe fallback. | open |
| Enhancement | `lib/weather/weather-day.ts:149` + `weather-day-chart.tsx:179` | **DST / bad hour → `hour ?? 0` and `key={bar-${p.hour}}`.** Repeated or invalid local hours can collide React keys / stack bars (adversarial FYI). Prefer stable `time` keys; avoid coercing bad hour to 0. | open |
| Enhancement | Perf (defer) | Two Open-Meteo hosts per kiosk + day load, client visx on weather route only — by design. Chart hit-rect density / tooltip churn → **defer to perf lens**. | open |
| Nit | `components/weather/weather-day-chart.tsx:185` | Bar `rx={2}` hard-coded pixels; prefer token/`--radius-sm` if charts elsewhere allow. | open |
| Nit | `components/weather/weather-day-chart.tsx` vs Task 5 | Chart props omit documented `unit` (units live in tooltip/aria helpers only). Harmless if intentional; sync task or add prop. | open |

**Round notes:**

- **Honored:** Pattern 1 RSC → client charts; Pattern 2 day-path AQ degrade + `Promise.allSettled`; chrome rail hide + kiosk `activeMatch: "prefix"`; strip 4-line PM2.5 + link + no city; card order/grid/copy; `force-dynamic` + `auth()`; `proxy.ts` untouched; skeleton 3-card grid; tokens/`colorByIndex`; kiosk first-load charts not on `/kiosk`.
- **UI walk (Design lock):** Kiosk block size/texts mostly match; **chrome crumbs fail** (Major). Day cards match order/headlines/unavailable copy.
- **Verdict:** Request changes — fix 3 Majors before merge. Enhancements/Nits non-blocking.
- **Checklist:** Context ✓ · Correctness+tests (gaps/cache under-locked) · Security N/A-depth · Architecture (Pattern 2/3 gaps) · Readability OK · Perf defer · Deps untouched · **Request changes**

### Round 2 (re-check after Fix)

**Round:** 2 · **Result:** clean — 0 Critical, 0 Major
**Run:** `npx tsx --test lib/core-app-header.test.ts components/weather/weather-day-chart-helpers.test.ts lib/weather/open-meteo.test.ts` → 25 pass, 0 fail.

| Fix ask (Round 1 Major) | Location | Verdict |
|-------------------------|----------|---------|
| Breadcrumbs `Kiosk › Weather` (parent link + current label) | `lib/core-app-header.ts:14-23` · `lib/core-app-header.test.ts:14-22` · `components/ui/breadcrumb.tsx` | **closed** — trail is `[{ label: "Kiosk", href: "/kiosk" }, { label: "Weather" }]`; with 2 items, Breadcrumb links Kiosk and shows Weather as current; unit locks full trail |
| LinePath gaps for null hours (`defined`, no bridge) | `components/weather/weather-day-chart.tsx:156-165` · helpers + test | **closed** — `data={points}` keeps full series (view `chartPoints` maps hours, no null filter); `defined` uses `isWeatherLineValueDefined` (null/NaN → false); helper unit covers 0 vs null/NaN |
| No snapshot cache when AQ unusable | `lib/weather/open-meteo.ts:261-281` · test `:257-287` | **closed** — `aqOk = pm25 != null`; cache only when `aqOk`; empty `{}` / missing `pm2_5` → `pm25: null`, second call re-fetches (`aqCalls === 2`); day path still gates on `day.aqAvailable` |

**Round notes:**

- Round 1 Majors 1–3 closed in draft code + tests (not docs-only).
- Enhancements (skeleton spacing, forecast-fail meta TZ, DST hour keys, perf defer) and Nits remain open; non-blocking — do not reopen as Major.
- No new Critical/Major found on re-check.

**Result:** Quality review: clean.

---

## Merged lenses (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

**Round:** 1
**Result:** clean — single lens **perf** (parent copy; no Merge Task)

### Winners (fix these)

| Severity | Sources (api/db/security/perf/memory) | Finding | Decision |
|----------|---------------------------------------|---------|----------|
| — | perf | none (Critical 0 / Major 0) | n/a |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| — | — | single lens |

### Fix ask (for Fix agent)

None.

**Round notes:**

- Source: `05-lens-performance.md` Result clean. Kiosk chart-free; parallel Open-Meteo + cache rules; skeleton parity noted OK.
- API/DB/Security/Memory lenses not in Lens plan.

---

## Deferred (Enhancements — do not block clean)

-

---

## Fix notes (TDD skipped)

### Fix round 1 — Adversarial Majors (lens = adversarial-tests)

**Date:** 2026-10-10 · **Files:** `lib/weather/open-meteo.test.ts` only (no prod change)

1. **AQ 500 snapshot** — Assert `first` non-null, `tempC === 31.2`, `pm25 === null` (plus second-call re-fetch `aqCalls === 2`).
2. **Day AQ 500** — Assert day non-null, `aqAvailable === false`, `hours.length === 24`, every `pm25 === null`, not cached.
3. **Day AQ throw + non-JSON** — New test `fetchWeatherDay handles AQ network throw and non-JSON without caching`: hours returned, `aqAvailable: false`, all `pm25` null, `aqCalls === 2`.

**Tests:** `npx tsx --test lib/weather/open-meteo.test.ts` → 14 pass, 0 fail.

**Enhancements:** left open (not chased).

### Fix round 2 — Quality Majors (lens = quality)

**Date:** 2026-10-10 · **Files:** `lib/core-app-header.ts`, `lib/core-app-header.test.ts`, `components/weather/weather-day-chart.tsx`, `components/weather/weather-day-chart-helpers.ts`, `components/weather/weather-day-chart-helpers.test.ts`, `lib/weather/open-meteo.ts`, `lib/weather/open-meteo.test.ts`

1. **Breadcrumbs** — `/kiosk/weather` now returns `[{ label: "Kiosk", href: "/kiosk" }, { label: "Weather" }]` (parent link + current label). Test locks the full trail.
2. **Chart gaps** — `LinePath` keeps the full 00–23 series; `defined` uses `isWeatherLineValueDefined` so null/non-finite hours break the path (no bridge). Helper test added.
3. **Snapshot AQ cache** — `aqOk` only when `pm25` is finite/usable; empty `{}` / missing `pm2_5` → `pm25: null`, not cached. New test: two calls → `aqCalls === 2`.

**Tests:** `npx tsx --test lib/core-app-header.test.ts components/weather/weather-day-chart-helpers.test.ts lib/weather/open-meteo.test.ts` → 25 pass, 0 fail.

**Enhancements:** left open (not chased).
