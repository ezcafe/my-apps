# Idea: Kiosk weather detail (PM2.5 + day charts)

## Problem map (diagnose before framing)

**Mode simple:** stub.

- **Core problem:** Kiosk weather shows location instead of air quality, and there is no day-level weather view with charts.
- Branches: `N/A — root cause clear`

### Mind map (visual text)

```
Problem
├── Happening: kiosk shows temp + condition + location label
├── Missing: PM2.5 under temp; click-through day page with temp / AQ / rain charts; page menu
├── Consequences: hard to judge air quality at a glance; no day trend
├── Core: surface PM2.5 on kiosk; open a day weather page with charts
└── ★ Top priority: kiosk strip shows temp + PM2.5 (no location); tap opens weather day page
```

## Problem

Kiosk weather does not show PM2.5, still shows location, and has no day detail page with charts.

## User / audience

People who glance at `/kiosk` for today context and sometimes want a full-day weather trend.

## Outcome

1. Kiosk weather block: temperature, condition, **PM2.5 under temp**; **no location** line.
2. Weather block is clickable → weather page for the whole day.
3. Weather page: charts for **temperature**, **air quality (PM2.5)**, and **rain** for the day.
4. Weather page has a **menu** (match existing app shell / page chrome patterns).

## Metric

From kiosk, user sees PM2.5 (not city name) and can open the weather page and read day charts for temp, AQ, and rain.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Kiosk context strip UI | `components/kiosk/kiosk-context-strip.tsx` | Shows temp, label, location today |
| Weather fetch | `lib/weather/open-meteo.ts` | Current snapshot only today |
| Open-Meteo forecast / air quality | https://open-meteo.com/en/docs · https://open-meteo.com/en/docs/air-quality-api | Hourly temp, precip, PM2.5 |
| Kiosk IA | `docs/DESIGN_GUIDE.md` (kiosk status board) | Context strip patterns |
| Charts | `docs` / visx usage in repo; user rule: visx for normal charts | Day series charts |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** Update `KioskContextStrip`; add weather day route/page with menu chrome; three day charts (temp, PM2.5, rain). City setup stays in Settings.

## 80/20 UI (day-to-day)

### Main user goals

- See outdoor comfort at a glance on kiosk (temp + air quality).
- Open a day view for temp / AQ / rain trends.

### Vital few (high-impact ~20%)

- PM2.5 under temp on kiosk (remove location).
- Tap weather → day page with three charts.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Temp + PM2.5 on kiosk weather block.
- **Important info / action #2 (always visible):** Open weather day page (click weather info).
- **Core action placement:** Weather half of context strip is the control; day page leads with charts.
- **Secondary actions:** City/geocode setup stays in Settings; page menu for shell navigation.

### Top user journey to optimize

Open `/kiosk` → read temp + PM2.5 → tap weather → scan day charts → use menu to leave or return.

### Sensible defaults

Use existing weather city / coords prefs; “today” as the day window; fail soft if weather unavailable.

### Biggest usability risks to fix first

- Unclear what “menu” means on weather page (shell vs in-page).
- Missing PM2.5 when air-quality API fails while temp still works.
- Charts hard to read on kiosk / large displays.

## Non-goals

- Multi-day forecast UI
- Changing how city is chosen (keep Settings)
- Money / finance widget changes
- Push notifications for AQ

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Open-Meteo can supply hourly temp, PM2.5, rain for one day | yes for charts | Check Open-Meteo docs + current client | Different provider or fewer series |
| “Menu” means existing shell / page menu chrome | preferred | Compare other feature pages | Add weather-only section menu |
| PM2.5 already fetchable or easy to add beside current weather | yes for kiosk strip | Read `open-meteo.ts` + API | Extend fetch + types |

## What we should not build

Weather alerts, historical archives, map views, or a second city picker on the weather page.

## Success criteria

- [ ] Kiosk weather shows temp + condition + PM2.5; location line gone
- [ ] Clicking weather opens a weather day page
- [ ] Day page shows charts for temp, air quality, and rain
- [ ] Weather page includes a menu consistent with app chrome
- [ ] Skeleton / loading states stay in parity with live UI

## Open questions

- Exact meaning of “menu” on the weather page (shell nav vs in-page chart sections) — Design should pick the existing shell pattern unless product needs more.
- Route path for weather page (e.g. `/kiosk/weather` vs `/weather`) — Design/Analyze to match feature registry / shell.
