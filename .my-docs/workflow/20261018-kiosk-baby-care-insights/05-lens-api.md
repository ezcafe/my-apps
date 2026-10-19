# Lens: api — 20261018-kiosk-baby-care-insights

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-19  
**Verifier:** Senior Verifier (fresh context; did not author draft; did not change code)  
**Skill:** api-and-interface-design

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A1 | Nit | `03-design.md` Errors row vs `app/api/user/preferences/route.ts` | Design lists `401` / `403` / `400` Zod / rate-limit. Route uses `401` / `400` / `429` (+ `503` db). No `403` on this surface. | Align design wording (drop `403`, name `429`). Pre-existing; not introduced by baby enum/flag. |
| A2 | Nit | `route.ts` 429 branch | Prefs `429` returns `{ error: "Too many requests" }` without `code`, while `badRequest` / `unauthorized` use `{ error, code }`. Design locks “existing” statuses. | Out of scope unless route adopts `rateLimited()` from `lib/api-http.ts`. |
| A3 | Enhancement | `03-design.md` API contracts vs `user-preferences-service.ts` | Design spells inject write-back + full layout merge. Service also sets `babyDefaultsInjected: true` on widgets-only PATCH (Settings offs stick). Behavior matches ADR-004; contract prose omits it. | Optional one-liner under Request fields: widgets-only PATCH marks inject done. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | PATCH `kioskWidgets?:` via `kioskWidgetIdSchema` enum including `baby.nursery` / `baby.next_care` / `baby.funny_time`; max = `KIOSK_WIDGET_IDS.length` (14). `kioskLayout` Zod + type optional `babyDefaultsInjected?: boolean`. Success `{ data: SerializedUserPreferences }` with resolved widgets/layout. Page DTOs are loader-composed (not new REST). |
| One error format | pass | Reuses prefs statuses: `401` / `400` / `429` (+ `503`). Flat `{ error, code? }` + pre-existing bare 429 (A2). Design `403` is doc drift (A1). |
| Validate at edges only | pass | Zod in `patchUserPreferences`; `readJsonBounded` + `assertSameOriginStrict` on PATCH; unknown widget id → Zod → `400`. No second Zod in baby loaders. Read path: `normalizeKioskWidgets` / `resolveKioskLayout` pass flag through. |
| Lists paginated | N/A | Single prefs row; no new list REST. Baby payloads are page-composed. |
| Additive fields / no silent breaks | pass | New enum members only + optional `babyDefaultsInjected`. No remove/retype of existing prefs fields. Nested layout still requires mode/columns/focus when present (never flag-only). |
| Naming matches repo | pass | Dotted `baby.*` ids; camelCase `babyDefaultsInjected` beside `kioskWidgets` / `kioskLayout`. |
| Idempotency for mutating endpoints | pass | Same-body upsert safe to retry; inject PATCH sends full layout + widgets. No `Idempotency-Key` (matches today’s prefs route). |
| Contract matches `03-design.md` | pass | Existing `GET`/`PATCH` `/api/user/preferences` only; no new baby routes. Enum + max + optional flag; inject plan full merge `{ mode, columns, focusWidgetId, babyDefaultsInjected: true }`; `resolveKioskLayout` keeps flag; `[]` no inject; money path unchanged. Residual: `403` wording (A1), widgets-only flag prose (A3). |

## Round notes

- **Scope:** Design↔code for prefs Zod / PATCH enum + `babyDefaultsInjected` + inject write-back vs `03-design.md` API contracts (tiny-contract-tweak). Surfaces: `app/api/user/preferences/route.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, `lib/kiosk/widget-registry.ts`, `lib/kiosk/kiosk-layout.ts`, `lib/kiosk/baby-defaults-inject.ts`, `lib/kiosk/load-kiosk-page.ts`.
- **Prefs PATCH:** Unknown id rejected at Zod. Baby ids accepted; max follows registry. Layout schema accepts `babyDefaultsInjected: true`. Unit tests lock accept/reject/max/flag.
- **Inject:** `planBabyDefaultsInject` + load-path `patchUserPreferences` with full layout; flag round-trip via `resolveKioskLayout`. Widgets-only PATCH sets flag so Settings offs stick (A3).
- **Downstream:** No `/api/baby/*`; gated baby loaders under baby workspace only.
- **Out of lens:** Schema/migration → db (Has DB no); OWASP deep-dive → security; CLS / skeleton → UI.
- **Do not fix here** — A1–A2 Nits / A3 Enhancement deferred.
- **Open Critical / Major:** none → **Result: clean**.
