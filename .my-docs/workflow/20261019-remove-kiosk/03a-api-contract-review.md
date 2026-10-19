# API contract review: 20261019-remove-kiosk

**Result:** clean
**Round:** 2
**Updated:** 2026-10-19

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | practice | Deleted App Router paths usually return framework HTML 404, not prefs `{ error, code }` JSON. | Accept status 404; no need for a JSON error body on a gone route. |

**API checklist:** typed I/O · one error shape · edge validation · pagination · additive fields · naming · idempotency · matches repo patterns

**Checklist notes (pass / gap):**

- **Typed I/O:** pass — resource retired; no post-cut success shape; ThemeSettings stays client-only.
- **One error shape:** pass for remaining surfaces; retired prefs/city-search → **404**.
- **Edge validation:** N/A after delete (no PATCH body).
- **Pagination:** N/A.
- **Additive fields:** N/A — intentional full retire + DROP TABLE; documented break.
- **Naming:** pass — existing paths removed; redirects match repo `next.config.ts` pattern.
- **Idempotency:** N/A — no mutate surface left.
- **Auth / ownership:** pass — no authenticated prefs mutate left (404).
- **Sequence failures:** pass — `/kiosk*` → 308 `/money`; prefs + city-search → 404.
- **Tasks catch mistakes:** pass — Task 1 route 404; Task 2 city-search 404; Task 7 smoke prefs 404 + theme client.
- **Repo patterns:** pass — delete routes/services; schema confirms prefs columns are kiosk/weather only.

## Fix ask for my-dev-flow-design

(none — clean)

## Deferred Enhancements (do not block clean)

- (prior R1) Sequence alts for 401/429/same-origin — moot after full route retire.
- Optional: note HTML vs JSON 404 body (Nit above).

## Round notes

- Re-verified `03-design.md` + `04-tasks.md` after design-update R1 against live `route.ts`, validators/service, and `db/schema/user-preferences.ts` (PK + six kiosk/weather columns only).
- **R1 Major 1 closed:** Chose **retire** GET/PATCH `/api/user/preferences` (+ validators/service); rejected empty `{}` bag; no false theme/account keep language.
- **R1 Major 2 closed:** Task 1 acceptance = route **404**; theme save = client ThemeSettings; no “PATCH theme/account succeeds.”
- Zero Critical / Major → **clean**.
