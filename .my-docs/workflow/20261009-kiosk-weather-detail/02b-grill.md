# Grill: 20261009-kiosk-weather-detail

**Result:** frontier-empty
**Updated:** 2026-10-10 06:35 (UTC+7)
**HITL:** async-notify — auto-settled; veto in next user message
**Code cross-check:** confirmed — `hidesShellRailChrome` + `core-app-header` match `/kiosk` exactly; Kiosk nav `activeMatch: "exact"`; strip shows city; `fetchCurrentWeather` is current-only.

## Design tree summary

- **Settled:** Decisions 1–3 (Analyze) + Q1–Q6 below.
- **Open frontier:** none.
- **Blocked:** none.

## Frontier round 1

❓ **Q1** — **City on weather page**: show city label in the page meta line? Options: yes / no.
➡️ Recommended: yes — user-first: the city left the kiosk; the page must still say *where* the charts are for.
**Settled as:** yes — meta = `<city> · <date>` (auto-pick).

❓ **Q2** — **Rain series shape**: mm bars only, or mm bars + probability line?
➡️ Recommended: mm bars; probability in tooltip — user-first: one unit per chart stays readable at a glance.
**Settled as:** mm bars, `rainProbPct` in tooltip only (auto-pick).

❓ **Q3** — **PM2.5 guide line / color band (WHO 15 µg/m³)**: now or later?
➡️ Recommended: defer — user-first: ship the number + trend first; bands add copy and color rules.
**Settled as:** deferred Enhancement (auto-pick).

❓ **Q4** — **Which "today"**: device tz, server tz, or the city's local day?
➡️ Recommended: city's local day (`timezone=auto`) — user-first: "3pm" means 3pm where the weather is.
**Settled as:** city local day, hours `00`–`23`; "now" index = hour of the forecast `current.time` string (no `new Date()` parsing) (auto-pick).

❓ **Q5** — **Cache on partial failure**: cache a snapshot / day where AQ failed for the full 15 min?
➡️ Recommended: return it, do not cache it — user-first: PM2.5 comes back on next load, not 15 min later.
**Settled as:** cache only when both APIs succeed; partial results are returned uncached (auto-pick).

❓ **Q6** — **PM2.5 value + format**: kiosk uses `current.pm2_5` or the hourly value? Precision?
➡️ Recommended: `current.pm2_5`, rounded to a whole number — user-first: one clear number, same source as the page "now" headline.
**Settled as:** kiosk + page headline = AQ `current.pm2_5`, `Math.round`, label `PM2.5 N µg/m³`; null → `PM2.5 —` (auto-pick).

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| AQ API down, forecast OK | Kiosk shows temp + condition + `PM2.5 —`; page shows temp + rain charts, PM2.5 card says "temporarily unavailable"; nothing cached (Q5). |
| Kiosk device in UTC+7, city in Europe at 23:30 local | Page shows the city's day; "now" marker at hour 23 of the city's grid (Q4). |
| Hourly PM2.5 has `null` gaps (model not run yet) | Chart skips those points (gap), never draws 0; times merged by `time` string, mismatched rows dropped. |

## Domain modeling

### Glossary updates
- **Kiosk weather block** → right half of the kiosk context strip: temp, condition, PM2.5; opens the weather day page.
- **Weather day page** → hourly temperature, PM2.5, and rain for the city's local calendar day.
- Paths touched: `GLOSSARY.md`

### ADR
- **Skipped:** all picks are easy to reverse (route, cache rule, chart shape); no hard-to-reverse trade-off.

## Auto-pick log

- `auto-pick — Q1–Q6 → yes / mm+tooltip / defer / city day / no partial cache / current.pm2_5 rounded — user-first: one clear PM2.5 number, honest city-local day; system: no new API, no DB, small lib change`

## Grill digest (≤4 bullets)

1. Settled: city on page meta; rain mm bars; WHO band deferred; city-local day; no caching of partial results; PM2.5 = rounded `current.pm2_5`.
2. Residual risk: Open-Meteo free tier is non-commercial (fine for personal use); two separate caches can drift slightly within 15 min.
3. Glossary: +2 terms (Kiosk weather block, Weather day page). ADR skipped.
4. Ready for Design? yes.
