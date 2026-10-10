# Lens: performance — 20261009-kiosk-weather-detail

**Result:** clean
**Round:** 1
**Updated:** 2026-10-10

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major. | — |

## Round notes

- **Scope:** Charts + weather fetch + kiosk bundle + CLS/skeletons + Open-Meteo parallel/cache. Fresh context; did not write this draft. Wrote only this file (did not edit `05-review-log.md`).
- **Skills / docs:** `performance-optimization`; React/Next UI → `vercel-react-best-practices` checks (async-parallel, bundle isolation, no client waterfall); `docs/PERFORMANCE.md` kiosk baseline notes.

### Clean / OK

| Check | Evidence |
|-------|----------|
| **Kiosk chart-free** | No `@visx` / `weather-day-chart` under `components/kiosk` or `app/(shell)/kiosk/page.tsx`. Strip uses `formatPm25Line` + `import type` snapshot only. Charts live under `/kiosk/weather` → `WeatherDayView` → client `WeatherDayChart`. |
| **Parallel Open-Meteo** | `fetchCurrentWeather` / `fetchWeatherDay` use `Promise.allSettled([forecast, aq])`. Kiosk loader starts `weatherPromise` before workspace resolve so weather overlaps finance work. |
| **Cache rules** | Separate `snapshotCache` / `dayCache`; TTL 15 min; write only when AQ ok (`pm25 != null` / `day.aqAvailable`). Partial AQ fail not cached (matches design). Both hosts use `next: { revalidate: 900 }`. `forecast_days=1` → bounded ~24 rows. |
| **No client fetch waterfall** | Day page is RSC: `auth` → prefs → `fetchWeatherDay` on server; props to charts. No `/api` weather client round-trip. |
| **Bundle** | visx + `ChartShell` only on weather route client boundary. Kiosk keeps insight stats behind existing `next/dynamic`. |
| **CLS / skeletons** | Strip: 4 weather skeleton lines (`mt-1` / `mt-0.5`) + same `@container` grid/radii as live; PM2.5 row always present (`PM2.5 —` when null). Day: `WeatherDayPageSkeleton` = 3 cards, auto-fit grid, `h-48` chart block; `loading.tsx` wraps same shell. Charts fixed `h-48 min-h-48`. |

### Deferred (Enhancement / FYI — do not block clean)

| Note | Why deferred |
|------|----------------|
| `lib/kiosk-first-load.test.ts` does not assert “no chart imports on `/kiosk`” (Task 4 wording) | Code is already chart-free; test guard would be Enhancement. |
| AQ-fail day view: PM2.5 card drops chart (shorter than skeleton chart slot) | Design fail-soft copy; rare vs success path skeleton parity. |
| In-memory Maps keep expired keys until overwrite | Personal-scale lat/lon set; memory lens / later prune if needed. |

**Fix ask:** none (Critical 0, Major 0).

**Result:** **clean** — Critical 0, Major 0.
