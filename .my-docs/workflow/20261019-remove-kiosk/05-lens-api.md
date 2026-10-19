# Lens: api — 20261019-remove-kiosk

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-19  
**Verifier:** Senior Verifier (fresh context; did not author draft; did not change code)  
**Skill:** api-and-interface-design

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A1 | Nit | Deleted App Router paths | Retired prefs / city-search return framework HTML 404, not prefs `{ error, code }` JSON. Matches design “404 is enough” and prior `03a-api-contract-review` Nit. | Accept status 404; no JSON body required on a gone route. |
| A2 | Enhancement | `lib/user-preferences-retired.test.ts` | Locks route + city-search `existsSync` only. Does not assert deleted `lib/user-preferences-service.ts` / `lib/validators/user-preferences.ts` (empty-bag re-export guard). | Optional file-gone asserts; low risk while imports and packages are already gone. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | Resource retired — no post-cut success shape. No empty `{}` bag stub. Theme stays client `ThemeSettings` (`components/theme-settings.tsx` + Settings embed); not prefs HTTP. |
| One error format | pass | Remaining surfaces unchanged. Retired `GET`/`PATCH` `/api/user/preferences` and city-search → **404** (A1 HTML vs JSON Nit only). |
| Validate at edges only | N/A | No PATCH body / Zod surface left (`lib/validators/user-preferences.ts` deleted). |
| Lists paginated | N/A | No list REST; resource gone. |
| Additive fields / no silent breaks | pass | Intentional full retire + `DROP TABLE` (documented break). Rejected empty-bag alternative not shipped. |
| Naming matches repo | pass | Paths removed; `next.config.ts` permanent `/kiosk` (+ `:path*`) → `/money` matches existing redirect pattern. |
| Idempotency for mutating endpoints | N/A | No prefs mutate surface left (404). |
| Contract matches `03-design.md` | pass | Route files gone (`app/api/user/preferences/route.ts`, `…/city-search/route.ts`); service + validators deleted; unit `user-preferences-retired.test.ts` locks absence; no live production `fetch("/api/user/preferences")`; Settings theme = client only; redirects permanent to `/money`. |

Skill: `api-and-interface-design`

## Round notes

- **Scope:** Design↔code for prefs/city-search **retire** vs `03-design.md` API contracts (not an extend). Surfaces checked: missing prefs + city-search routes; deleted service/validators/schema; `lib/user-preferences-retired.test.ts`; Settings → `ThemeSettings`; `next.config.ts` kiosk redirects; migration `0049_drop_user_preferences.sql` presence (deep DROP → db lens).
- **Contract locks verified:** No empty `{ data: {} }` / `z.object({}).strict()` stub; callers of gone paths → 404; theme not claimed on prefs API; no Open-Meteo city-search path left under `app/api`.
- **Out of lens:** `DROP TABLE` / journal / schema exports → db; OWASP deep-dive → security; shell/Settings UI strip → quality/UI.
- **Do not fix here** — A1 Nit / A2 Enhancement deferred.
- **Open Critical / Major:** none → **Result: clean**.
