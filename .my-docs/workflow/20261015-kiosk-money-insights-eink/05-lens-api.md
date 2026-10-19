# Lens: api — 20261015-kiosk-money-insights-eink

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-15  
**Verifier:** Senior Verifier (fresh context; did not author draft; did not change code)  
**Skill:** api-and-interface-design

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A1 | Nit | `03-design.md` Errors row vs `app/api/user/preferences/route.ts` | Design lists `401` / `403` / `400` Zod / rate-limit. Route uses `401` / `400` / `429` (+ `503` db). No `403` on this surface. | Align design wording with route (drop `403`, name `429`). Pre-existing; not introduced by this enum extend. |
| A2 | Nit | `route.ts` 429 branch | Prefs `429` returns `{ error: "Too many requests" }` without `code`, while `badRequest` / `unauthorized` use `{ error, code }`. Design locks “existing” statuses. | Out of scope unless route adopts `rateLimited()` from `lib/api-http.ts`. |
| A3 | Enhancement | `03-design.md` API contracts | No idempotency one-liner for PATCH (same-body upsert is safe to retry today). | Optional contract line; behavior already matches prefs upsert. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | PATCH `kioskWidgets?: KioskWidgetId[]` via `userPreferencesPatchSchema` + `kioskWidgetIdSchema` enum. Success `{ data: SerializedUserPreferences }` with resolved `kioskWidgets`. Page DTOs typed: `KioskInsightsStatsGridWidget` (8 slots + `range`) / `KioskInsightsChartWidget` (3 KPIs + `series` + `range`) — match design conceptual tables; not new REST. |
| One error format | pass | Extend reuses existing prefs statuses: `401` / `400` / `429` (+ `503`). Flat `{ error, code? }` via `lib/api-http` helpers + pre-existing bare 429 (A2). Design `403` is doc drift only (A1). |
| Validate at edges only | pass | Zod in `patchUserPreferences` (route service edge); `readJsonBounded` + `assertSameOriginStrict` on PATCH; unknown widget id → Zod fail → `400`. Max = `KIOSK_WIDGET_IDS.length` (10). No second Zod inside A/B loaders. Read path still `normalizeKioskWidgets` / `resolveKioskWidgets` for stored junk. |
| Lists paginated | N/A | Single prefs row; no new list REST. A/B payloads are page-composed loader DTOs. |
| Additive fields / no silent breaks | pass | New enum members only: `money.insights_stats_grid`, `money.insights_chart`. No remove/retype of existing prefs fields. Registry `defaultEnabled: false`. No new money HTTP route. |
| Naming matches repo | pass | Dotted `money.*` ids; camelCase `insightsStatsGrid` / `insightsChart` / `spendMinor` / `valueDisplay` beside existing kiosk widgets. |
| Idempotency for mutating endpoints | pass | Same-body upsert safe to retry; no `Idempotency-Key` (matches today’s prefs route). A3 Enhancement to spell it in design. |
| Contract matches `03-design.md` | pass | Auth + same-origin + `user:preferences` rate limit; enum grows both ids; array max = registry length; success returns resolved `kioskWidgets`; no new analytics REST; Has DB no (no invented DB contract). Residual: `403` wording (A1), missing idempotency prose (A3). |

## Round notes

- **Scope:** Design↔code for prefs Zod / PATCH enum extend + page-composed A/B widget DTOs vs `03-design.md` API contracts. Surfaces: `app/api/user/preferences/route.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, `lib/kiosk/widget-registry.ts`, `lib/kiosk/insights-stats-grid.ts`, `lib/kiosk/insights-chart.ts`, `lib/kiosk/load-kiosk-page.ts`.
- **Prefs PATCH:** Unknown id rejected at Zod (not silently stripped on write). Empty / omit / known-id arrays accepted; max length follows `KIOSK_WIDGET_IDS.length`. Unit tests lock accept new ids, reject unknown, max = registry length.
- **Defaults:** `resolve(null)` still weather + month_board + loans.payments; new ids absent (registry + tests).
- **Downstream:** Gated loaders only when enabled; no `/api/money/*` insights route.
- **Out of lens:** Schema/migration → db (Has DB no); OWASP deep-dive → security; CLS / skeleton → UI.
- **Do not fix here** — A1–A2 Nits / A3 Enhancement deferred.
- **Open Critical / Major:** none → **Result: clean**.
