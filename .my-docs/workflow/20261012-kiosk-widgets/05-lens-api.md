# Lens: api — 20261012-kiosk-widgets

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-13  
**Verifier:** Senior Verifier (fresh context; did not author draft; did not change code)  
**Skill:** api-and-interface-design

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A1 | Nit | `app/api/user/preferences/route.ts` 429 branch | Prefs `429` still returns `{ error: "Too many requests" }` without `code`, while `badRequest` / `unauthorized` use `{ error, code }`. Design locks “same as today.” | Out of scope for this extend unless the route adopts `rateLimited()` from `lib/api-http.ts`. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | PATCH adds optional nested `kioskLayout` via `kioskLayoutSchema` + `userPreferencesPatchSchema`. Success `{ data: SerializedUserPreferences }` includes resolved `kioskWidgets` + `kioskLayout`. Module I/O `KioskMonthBoardWidget` matches `03-design.md` field list; re-exported on `KioskPageData.widgets.monthBoard`. |
| One error format | pass | Extend reuses existing prefs statuses: `401` / `400` / `429`. Flat `{ error, code? }` via `lib/api-http` helpers + pre-existing bare 429 (A1 Nit). |
| Validate at edges only | pass | Zod in `patchUserPreferences` (route-only service edge); `readJsonBounded` + `assertSameOriginStrict` on PATCH; unknown `focusWidgetId` rejected by `kioskWidgetIdSchema` → `400`. No second Zod pass inside board loaders. |
| Lists paginated | N/A | Single prefs row; no new list REST. Month board is server loader DTO, not a list API. |
| Additive fields / no silent breaks | pass | Optional `kioskLayout` only; omit key leaves stored layout; present key requires `mode` + `columns` + `focusWidgetId` (full replace). Existing `kioskWidgets` / `weatherCity` unchanged. |
| Naming matches repo | pass | camelCase `kioskLayout` / `focusWidgetId` beside `kioskWidgets`; DB `kiosk_layout`; month-board `*Minor` / `budgetChart` mirror `KioskNetWidget` style. |
| Idempotency for mutating endpoints | pass | Same-body upsert safe to retry; no `Idempotency-Key` (matches design / today’s prefs route). |
| Contract matches `03-design.md` | pass | Auth + same-origin + `user:preferences` rate limit; nested replace + layout-only write key in `applyPreferencesPatch`; focus SoT (Zod unknown → 400; disabled may store; board `resolveFocusWidgetId`); defaults `{ mode: "grid", columns: 1, focusWidgetId: null }`; month-board Field SoT (`MONEY_LEDGER_BILLS` expense; `loansInsightsSummary.monthlyObligationMinor`; workspace budget → `budgetChart` or null). |

## Round notes

- **Scope:** Design↔code for prefs extend + month-board module I/O vs `03-design.md` API contracts. Surfaces: `app/api/user/preferences/route.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, `lib/kiosk/kiosk-layout.ts`, `lib/kiosk/month-board.ts`, `lib/kiosk/load-kiosk-page.ts`.
- **Prefs PATCH:** `hasLayout` is a write key with `hasWeather` / `hasKiosk`; layout-only upsert persists `kiosk_layout` (service tests). Incomplete nested object rejected (validator tests). Known-but-disabled `focusWidgetId` may persist.
- **Success serialize:** `resolveKioskLayout(null|stored)` on GET/PATCH response; null/missing → grid-1 defaults.
- **Month board:** Optional `widgets.monthBoard` only when `money.month_board` enabled; loaders gated; `savingsRatePct` undefined → null; no loans ledger preset.
- **Out of lens:** Schema/migration → db; OWASP deep-dive → security; CLS / skeleton → UI.
- **Do not fix here** — A1 Nit deferred (pre-existing; design-accepted).
- **Open Critical / Major / Enhancement:** none → **Result: clean**.
