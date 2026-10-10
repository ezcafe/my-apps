# Lens: performance — 20261010-kiosk-ui-improve

**Result:** clean
**Round:** 1
**Updated:** 2026-10-10

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major. | — |

## Round notes

- **Scope:** lists / charts / fetch / bundle + skeleton CLS for Task 0 + Phase 1 attention reorder. Fresh context; did not author this draft. Wrote only this file.
- **Skills / docs:** `performance-optimization`; React/Next → `vercel-react-best-practices` (`async-parallel`, `bundle-dynamic-imports`, no new client waterfalls); `docs/PERFORMANCE.md` kiosk baseline.
- **Draft delta:** dashboard/skeleton reorder + design-system parity; `load-kiosk-page.ts` unchanged vs HEAD.

### Clean / OK

| Check | Evidence |
|-------|----------|
| **Kiosk chart-free** | No `@visx` / `weather-day-chart` under `components/kiosk` or `app/(shell)/kiosk/page.tsx`. Strip uses `formatPm25Line` + snapshot props only. Charts stay on `/kiosk/weather` → `WeatherDayView` → client `WeatherDayChart`. |
| **Lists bounded enough for glance** | Upcoming: `listUpcomingLoanPayments(…, 5)` + in-memory distinct cap. Overdue: all pending-due rows (honest urgency); personal-scale. Payments off → attention section omitted (no phantom list). |
| **Parallel fetch** | `loadKioskPageData`: weather promise starts before workspace resolve; finance widgets `Promise.all` inside `runInWorkspace`; Open-Meteo still `Promise.allSettled([forecast, aq])` + TTL caches. No new waterfall from this pass. |
| **No client fetch waterfall** | `/kiosk` and `/kiosk/weather` remain RSC → server load → props. No weather `/api` round-trip on first paint. |
| **Bundle** | Insight stats still behind `next/dynamic`. Visx only on weather route client boundary. Reorder does not add chart imports to `/kiosk`. |
| **CLS / skeletons** | `kiosk-dashboard-skeleton`: strip → attention list (3 rows) → metrics grid — matches live Phase 1 order/grid/radii. Weather: fixed `h-48 min-h-48` charts; loading shells wrap page skeletons. |

### Deferred (Enhancement / FYI — do not block clean)

| Note | Why deferred |
|------|----------------|
| `listDueInstallments` has no SQL `LIMIT`; attention maps full overdue array | Honest urgency; personal volume; not introduced by this draft. Soft UI/SQL cap later if needed. |
| `listUpcomingLoanPayments` scans pending rows then caps in JS (no SQL `LIMIT`) | Pre-existing slim helper; cap=5 already on payload. Enhancement if schedules grow huge. |
| Weather charts static-imported on day route (not `next/dynamic`) | Route-local visx; same as prior kiosk-weather-detail clean. Dynamic import would be polish only. |
| Skeleton always shows attention band (max-layout stub) | Intentional default-layout parity; live omits when payments off — CLS tradeoff accepted for defaults. |

**Fix ask:** none (Critical 0, Major 0).

**Result:** **clean** — Critical 0, Major 0.
