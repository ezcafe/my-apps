# Analysis: Kiosk weather — PM2.5 + day detail page

**Mode:** simple (no Gate A / skim). Has UI: yes.

## Quick answers (for parent)

- **Has API: no** — no new public route. Day page is a server page that calls a lib function. (Alternative route listed in Decision 1.)
- **Has DB: no** — reuse `user_preferences` (city, lat, lon). No schema, no migration.
- **Route:** `/kiosk/weather` (child of kiosk).
- **"Menu":** the hamburger `MoneyAppMenu` that `ShellMainPage` already renders. Use `CoreShellPage`. No new menu component.
- **Data:** extend `lib/weather/open-meteo.ts`. Add Air Quality API (PM2.5) and `hourly` fields on the forecast API. Verified live (see Spike notes).

## Deep dive

### Overall

#### What is this?
- Kiosk weather half shows temp + condition + **city**. User wants **PM2.5 under temp** and **no city**.
- The weather block becomes a link to a new **day weather page** with 3 charts: temp, PM2.5, rain.
- Core problem (01-idea): kiosk hides air quality and has no day view.

#### Why do we need this?
- PM2.5 is the number that changes a daily choice (mask, window, outdoor play). City name is already known to the user.
- Without a day view, the user cannot see "will it rain at 3pm" or "when is the air worst".
- Cost of skipping: kiosk stays a one-number weather glance.

#### How to do this?
- **Approach:** server-fetch both Open-Meteo APIs in parallel. Kiosk gets `pm25` on the snapshot. Day page gets hourly arrays for today. Render with visx in client chart components. Page uses `CoreShellPage` (already has menu).
- **Other ways:** client-side fetch via a new `/api/weather/day` route; or one 3-tab chart card. See Decisions.
- **Best practices (repo first):** DESIGN_GUIDE "Kiosk glance pattern" (no double titles, `@container`, skeleton parity); "Drill = page, not drawer"; visx via `ChartShell` + `ChartParentSize`; RSC page with `auth()` redirect like `app/(shell)/kiosk/page.tsx`; fail-soft weather (`try/catch → null`).

#### Solution branches (Mode simple)

| Branch | Options | Effort / risk | Feeds Design? |
|--------|---------|---------------|---------------|
| **1. Quick wins** | Kiosk strip: add PM2.5 line, drop city line, wrap in link | S, low | yes (first tasks) |
| **2. Systemic** ★ | Typed day-series lib + `/kiosk/weather` page + 3 generic day charts + skeletons + chrome wiring | M, low-med | yes |
| **3. Creative** | AQ band colors / WHO line; rain "next hour" alert; live refresh | M, scope creep | no — defer |

- **★ Priority:** Branch 1 + Branch 2 together (matches idea ★: temp + PM2.5 on kiosk, tap → day page).
- **Map to Design:** one recommended design. Branch 3 → Non-goals / deferred Enhancements.

### Solution pieces

#### 1. Kiosk context strip (`KioskContextStrip`)

##### What is this?
- Right half of the strip: temp, condition, city. Change to: temp, condition, `PM2.5 N µg/m³`. Whole half is a link.

##### Why do we need this?
- Matches Gate-A-style #1 (temp + PM2.5 always visible) and #2 (open day page).

##### How to do this?
- **Approach:** replace city `<p>` with PM2.5 `<p>`. Wrap the weather column in `next/link` to `/kiosk/weather` when `weather` exists. Keep Settings link branch un-nested (no link inside link). `weatherCity` prop only decides the "unavailable" vs "set your city" copy.
- **Other ways:** make the whole Card a link (also hits the date half — rejected: idea says "click weather information").
- **Best practices:** hit area ≥44px (`fx-hit-40`), `fx-press`, visible focus ring, `transition-colors` only. PM2.5 null → show `PM2.5 —`, not hide the row (no layout shift).
- **Skeleton:** `KioskDashboardSkeleton` weather side must be 4 lines (label, temp, condition, PM2.5). Today it has 3 and already differs from live — fix both.

#### 2. Weather data layer (`lib/weather/open-meteo.ts`)

##### What is this?
- Today: `fetchCurrentWeather` returns `tempC, weatherCode, label, locationLabel` from `current=temperature_2m,weather_code`. No PM2.5, no hourly.

##### Why do we need this?
- Kiosk needs `pm25`. Day page needs 24 hourly points for 3 series.

##### How to do this?
- **Approach (verified):**
  - Air quality: `GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude&longitude&current=pm2_5&hourly=pm2_5&forecast_days=1&timezone=auto` → `current.pm2_5` (µg/m³), `hourly.pm2_5[24]`.
  - Forecast: `GET https://api.open-meteo.com/v1/forecast?...&hourly=temperature_2m,precipitation,precipitation_probability&forecast_days=1&timezone=auto` → 24 local hourly rows, `00:00`–`23:00` (whole day incl. past hours).
  - Add `pm25: number | null` to `WeatherSnapshot`; `fetchCurrentWeather` runs AQ in parallel; AQ failure → `pm25: null`, weather still returned.
  - Add `fetchWeatherDay(lat, lon, label)` → `{ date, nowIndex, hours: [{ time, tempC, pm25|null, rainMm|null, rainProbPct|null }] }` or `null`. Merge by index (both arrays are same hour grid when same `timezone=auto`; verify by `time` string, drop mismatch).
  - Separate in-memory cache (15 min, same as today) for day data. Keep `next: { revalidate: 900 }`.
- **Other ways:** one combined endpoint — none exists (AQ is a separate host). Use Archive/Historical API — not needed for "today".
- **Best practices:** keep times as local strings from API (do not `new Date()` them — avoids TZ shift). Hourly values can be `null` → keep `null`, chart skips point. Open-Meteo free tier is non-commercial (https://open-meteo.com/en/terms) — fine for a personal app; note as risk.

#### 3. Weather day route + menu chrome

##### What is this?
- New page `app/(shell)/kiosk/weather/page.tsx` (+ `loading.tsx`).

##### Why do we need this?
- Idea: day page with menu. DESIGN_GUIDE: drill detail is a **page**.

##### How to do this?
- **Approach:** RSC page: `auth()` → redirect `/login`; load prefs → `fetchWeatherDay`; render `<CoreShellPage><WeatherDayView/></CoreShellPage>`. `ShellMainPage` already puts `MoneyAppMenu` (hamburger) in `PageHeading`. That **is** the menu. No city → empty state with Settings link; fetch failed → per-chart "temporarily unavailable".
- **Must-change wiring (found in code):**
  - `lib/core-app-header.ts`: unknown paths fall through to **"Settings"** title — add `/kiosk/weather` → title "Weather", breadcrumbs `Kiosk › Weather`, meta = city label + date.
  - `lib/money-tabs-chrome-path.ts`: `hidesShellRailChrome` uses `pathname === "/kiosk"` — change to also match `/kiosk/`, else the shell aside shows beside the in-page hamburger.
  - `lib/features/registry.ts`: Kiosk nav `activeMatch: "exact"` → `"prefix"` so Kiosk stays active on `/kiosk/weather`.
  - `proxy.ts`: kiosk auth is page-only by design (comment in file). Do **not** add to matcher; use page `auth()`.
- **Other ways:** `/weather` top-level + new registry entry (extra nav item, new IA — rejected); modal/drawer (breaks "Drill = page").

#### 4. Day charts (visx)

##### What is this?
- Three time-series cards: **Temperature** (line, °C), **PM2.5** (line/area, µg/m³), **Rain** (bars, mm; probability in tooltip).

##### Why do we need this?
- The whole point of the page. Same x-axis (hours 00–23) lets the user compare.

##### How to do this?
- **Approach:** existing `LineChart` / `ColumnChart` are tied to money (`netMinor`, "Net" label, income/expense colors, `dayOfMonth` domain). Add small generic `components/weather/weather-day-chart.tsx` (client) using `ChartShell`, `ChartParentSize`, `@visx/scale`, `@visx/shape`, `colorByIndex` from `lib/theme-chart-palette.ts`. Shared x domain `HH`; "now" vertical marker from `nowIndex`; hover tooltip via `useChartTooltip`.
- **Other ways:** generalize `LineChart` (big blast radius on Money); lightweight-charts (price charts only per user rule).
- **Best practices:** card title inside card, big "now" value + unit; auto-fit grid `repeat(auto-fit,minmax(min(100%,26rem),1fr))`, fixed chart height; no hardcoded breakpoints; tokens only; reduced motion respected (`prefersReducedMotion`). Only this route imports charts → kiosk first-load unchanged (`lib/kiosk-first-load.test.ts` still valid).
- **Skeleton:** `WeatherDayPageSkeleton` = 3 card skeletons, same grid, same radii; used by `kiosk/weather/loading.tsx` and any Suspense fallback.

## Decisions

### Decision 1 — How the day page gets its data
- **Option 1 — Server page calls lib (recommended).** What: RSC reads prefs, calls `fetchWeatherDay`. Example: `const day = await fetchWeatherDay(lat, lon, city)` in `page.tsx`. Pros: no new public surface; reuses auth/cache pattern; no client waterfall. Cons: no client refresh without reload.
- **Option 2 — New `GET /api/weather/day` + client fetch.** What: route handler + react-query. Example: `fetch("/api/weather/day")`. Pros: refresh without navigation. Cons: Has API = yes; rate limit + contract + tests; loading flash.
- **Recommendation:** Option 1. Simpler, safer, matches `/kiosk` today. Kiosk is `force-dynamic`, so a reload refreshes.

### Decision 2 — What "menu" means
- **Option 1 — Existing shell hamburger via `CoreShellPage` (recommended).** What: `MoneyAppMenu` in the page heading (lists Kiosk, Money, …, Settings). Example: same as `/help`. Pros: zero new IA; works light/dark; matches "match app chrome". Cons: no weather-specific entries.
- **Option 2 — Weather-only section menu (e.g. Temp / Air / Rain anchors).** What: in-page nav to chart cards. Example: `#weather-temp`. Pros: quick jump. Cons: 3 short cards fit on screen; new IA; extra skeleton work.
- **Recommendation:** Option 1. If the user meant in-page jump links, Option 2 can be added later.

### Decision 3 — Route
- **Option 1 — `/kiosk/weather` (recommended).** Pros: back-link/breadcrumb obvious; no new nav item. Cons: needs 3 small chrome fixes (listed in piece 3).
- **Option 2 — `/weather`.** Pros: short URL. Cons: new registry entry, new section; kiosk-owned feature gets its own nav slot.
- **Recommendation:** Option 1.

## What exists today
- Kiosk strip: `components/kiosk/kiosk-context-strip.tsx` (client, takes `weather`, `weatherCity`). Loader: `lib/kiosk/load-kiosk-page.ts` → `loadWeatherSnapshot` → `fetchCurrentWeather`. Skeleton: `components/kiosk/kiosk-dashboard-skeleton.tsx`, `app/(shell)/kiosk/loading.tsx`.
- Chrome: `CoreShellPage` → `ShellMainPage` → `PageHeading` + `MoneyAppMenu`. Rail hidden by `hidesShellRailChrome`.
- Charts: visx primitives in `components/charts/` (money-specific line/column).
- Tests: `lib/weather/open-meteo.test.ts` (node:test, fake `fetch`).

## Dependencies
- Kiosk widget id `context.today_weather` and Settings city picker stay unchanged.
- Update DESIGN_GUIDE "Kiosk glance pattern" line 1: strip = today + weather (temp, condition, PM2.5) and links to day page.
- `WeatherSnapshot` change touches `load-kiosk-page.ts`, kiosk strip, and tests.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/weather/open-meteo.ts` | Extend snapshot, add day fetch + cache |
| `lib/weather/open-meteo.test.ts` | Add PM2.5 / day / fail-soft tests |
| `components/kiosk/kiosk-context-strip.tsx` | PM2.5 line, no city, link |
| `components/kiosk/kiosk-dashboard-skeleton.tsx` | Skeleton parity |
| `lib/kiosk/load-kiosk-page.ts` | Weather loader (unchanged shape except `pm25`) |
| `lib/core-app-header.ts` | Add `/kiosk/weather` header |
| `lib/money-tabs-chrome-path.ts` (+ `.test.ts`) | Hide rail for `/kiosk/*` |
| `lib/features/registry.ts` | Kiosk `activeMatch: prefix` |
| `app/(shell)/kiosk/page.tsx` | Auth + loader pattern to copy |
| `components/core-shell-page.tsx`, `shell-main-page.tsx` | Menu chrome |
| `components/charts/chart-shell.tsx`, `chart-parent-size.tsx`, `use-chart-tooltip.ts` | Chart building blocks |
| `lib/theme-chart-palette.ts` | Series colors |
| `docs/DESIGN_GUIDE.md` (Kiosk glance pattern) | Hard constraints |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| RSC page + `auth()` redirect | `app/(shell)/kiosk/page.tsx` | Same auth model; no proxy change |
| `CoreShellPage` chrome | `components/core-shell-page.tsx` | Gives the menu for free |
| Fail-soft loader (`try/catch → null`) | `loadWeatherSnapshot` | AQ failure must not hide temp |
| In-memory TTL cache by lat/lon | `weatherCache` in `open-meteo.ts` | Same 15-min rule for day data |
| `ChartShell` + `ChartParentSize` | `components/charts/` | Resize + tooltip for visx |
| `@container` / auto-fit grid | kiosk strip, skeleton | No hardcoded breakpoints |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Parallel fetch + partial failure (`Promise.allSettled`) | new in `open-meteo.ts` | Temp must survive AQ failure |
| Server-first data (RSC → client chart props) | kiosk page | Why no API route |
| Hour-grid merge by time key | `fetchWeatherDay` | Two APIs, one table |

(Has API/DB = no → System design Overview may be `N/A` or very short.)

## Constraints and risks
- **Skeleton parity (mandatory):** kiosk strip skeleton (4 lines) + new weather page skeleton.
- **Chrome fall-through:** without the 3 chrome fixes, `/kiosk/weather` shows title "Settings" and a duplicate rail.
- **Nested links:** strip must not put the Settings `<Link>` inside the new weather `<Link>`.
- **Nulls:** hourly AQ may have `null`; chart must skip, not draw 0.
- **Times:** use API local time strings; never `new Date(string)` for labels.
- **Tooling:** `AGENTS.md` says this Next.js (16.3.7) differs from training data — Design/Build must read `node_modules/next/dist/docs/` before writing route code.
- **Provider terms:** Open-Meteo free = non-commercial; fine for personal use.
- **Charts:** user rule = visx for normal charts; no lightweight-charts here.

## Settled decisions (do not relitigate)
- Has DB = no. Has API = no (Decision 1, Option 1).
- Route `/kiosk/weather`; menu = existing hamburger (Decisions 2, 3).
- City setup stays in Settings; no second picker on the weather page (idea non-goal).
- Rain chart = precipitation mm bars, probability in tooltip.
- Weather link only when a snapshot exists; no-city copy keeps Settings link.
- **Grill Q1:** weather page meta shows `<city> · <date>`.
- **Grill Q2:** rain = mm bars; `rainProbPct` in tooltip only.
- **Grill Q3:** PM2.5 WHO line / color band deferred (Enhancement).
- **Grill Q4:** "today" = city local day (`timezone=auto`), hours `00`–`23`; now index from forecast `current.time` string.
- **Grill Q5:** cache only when both APIs succeed; partial (AQ-failed) results returned but not cached.
- **Grill Q6:** kiosk + page headline PM2.5 = AQ `current.pm2_5`, rounded whole number; null → `PM2.5 —`.

## Design tree (frontier)

### Settled
- Gate A skipped (simple). Outcome 1–4 in `01-idea.md`. Decisions 1–3 above. Grill Q1–Q6 (see `02b-grill.md`).

### Open frontier
- _(empty — Grill frontier-empty)_

### Blocked
- None.

**Grill recommended?** Settled — see `02b-grill.md` Result **frontier-empty**.

## Spike notes

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Live Open-Meteo calls (HCMC coords, 2026-10-10) | Confirm PM2.5 + hourly are available with `timezone=auto` | AQ `current.pm2_5=21.3 µg/m³`; `hourly.pm2_5` 24 rows from `T00:00`. Forecast `hourly` temp/precip/prob also 24 rows from `T00:00`. Times are local, no offset. | Keep finding; no code kept |

Sources: https://open-meteo.com/en/docs · https://open-meteo.com/en/docs/air-quality-api · repo paths above.

## Blocking questions
- None.

## Clear to grill / design?
yes — Has API: **no**, Has DB: **no**. Instructions and reference files are clear. Grill frontier-empty; Design next.
