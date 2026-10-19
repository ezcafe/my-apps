# Lens: api — 20261015-kiosk-money-insights-heatmap

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-15  
**Verifier:** Senior Verifier (fresh context; did not author draft; did not change code)  
**Skill:** api-and-interface-design

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A1 | Nit | `03-design.md` Errors row vs `app/api/user/preferences/route.ts` | Design lists `401` / `403` / `400` Zod / rate-limit. Route uses `401` / `400` / `429` (+ `503` db). No `403` on this surface. | Align design wording with route (drop `403`, name `429`). Pre-existing; not introduced by this enum extend. Same Nit as `03a-api-contract-review.md`. |
| A2 | Nit | `03-design.md` Success response vs route | Contracts say “Prefs JSON”; route returns `{ data: SerializedUserPreferences }`. | Mirror existing envelope wording so readers do not invent a bare prefs body. |
| A3 | Nit | `route.ts` 429 branch | Prefs `429` returns `{ error: "Too many requests" }` without `code`, while `badRequest` / `unauthorized` use `{ error, code }`. Design locks “existing” statuses. | Out of scope unless route adopts shared `rateLimited()` helper. |
| A4 | Enhancement | `03-design.md` API contracts | No idempotency one-liner for PATCH (same-body upsert is safe to retry today). | Optional contract line; behavior already matches prefs upsert. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | PATCH `kioskWidgets?: KioskWidgetId[]` via `userPreferencesPatchSchema` + `kioskWidgetIdSchema` enum (includes `money.insights_heatmap`). Success `{ data: SerializedUserPreferences }` with resolved `kioskWidgets`. Page DTO typed: `KioskInsightsHeatmapWidget` (`hero`, 4 `kpis` with `valueDisplay`, `cells` with `date`/`level`/`txCount`, `range`) on `KioskPageData.widgets.insightsHeatmap` — matches design conceptual table; not new REST. |
| One error format | pass | Extend reuses existing prefs statuses: `401` / `400` / `429` (+ `503`). Flat `{ error, code? }` via helpers + pre-existing bare 429 (A3). Design `403` is doc drift only (A1). |
| Validate at edges only | pass | Zod in `patchUserPreferences` (route service edge); `readJsonBounded` + `assertSameOriginStrict` on PATCH; unknown widget id → Zod fail → `400`. Max = `KIOSK_WIDGET_IDS.length` (11). No second Zod inside heatmap loaders. Read path still `normalizeKioskWidgets` / `resolveKioskWidgets` for stored junk. |
| Lists paginated | N/A | Single prefs row; no new list REST. Heatmap payload is page-composed loader DTO. |
| Additive fields / no silent breaks | pass | New enum member only: `money.insights_heatmap`. No remove/retype of existing prefs fields. Registry `defaultEnabled: true` (fresh/null prefs via `resolveKioskWidgets(null)` only; stored sets not injected — unit-locked). No new money HTTP route. Cell `txCount` is additive page-DTO detail beyond design table — fine. |
| Naming matches repo | pass | Dotted `money.insights_heatmap` id; camelCase `insightsHeatmap` beside `insightsChart` / `monthBoard`. |
| Idempotency for mutating endpoints | pass | Same-body upsert safe to retry; no `Idempotency-Key` (matches today’s prefs route). A4 Enhancement to spell it in design. |
| Contract matches `03-design.md` | pass | Auth + same-origin + `user:preferences` rate limit; enum gains `money.insights_heatmap`; array max = registry length; success returns resolved `kioskWidgets`; no new analytics REST; Has DB no (no invented DB contract). Downstream: gated `loadInsightsHeatmapIfEnabled` + Money services only. Residual: `403` / envelope wording (A1–A2), missing idempotency prose (A4). |

## Round notes

- **Scope:** Design↔code for prefs Zod / PATCH enum extend + page-composed heatmap widget DTO vs `03-design.md` API contracts. Surfaces: `app/api/user/preferences/route.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, `lib/kiosk/widget-registry.ts`, `lib/kiosk/insights-heatmap.ts`, `lib/kiosk/load-kiosk-page.ts`.
- **Prefs PATCH:** Unknown id rejected at Zod (not silently stripped on write). Empty / omit / known-id arrays accepted; max length follows `KIOSK_WIDGET_IDS.length`. Unit tests lock accept new id, reject unknown, max = registry length.
- **Defaults:** `resolve(null)` includes `money.insights_heatmap` **and** `money.month_board`; A/B insights stay off. Stored sets without heatmap stay without heatmap.
- **Downstream:** Gated loader only when enabled; no `/api/money/*` heatmap route; internal grain `{ date, txCount }[]` stays service-scoped.
- **03a carry-forward:** Round-1 API contract review was clean; deferred Enhancements (sequence failure alts, idempotency prose, typed page I/O) — page I/O is now typed in code (`KioskInsightsHeatmapWidget`); remaining A1–A4 are doc/shape nits only.
- **Out of lens:** Schema/migration → db (Has DB no); OWASP deep-dive → security; CLS / skeleton → UI / Quality.
- **Do not fix here** — A1–A3 Nits / A4 Enhancement deferred.
- **Open Critical / Major:** none → **Result: clean**.
