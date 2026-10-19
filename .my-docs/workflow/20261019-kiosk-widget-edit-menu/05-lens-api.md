# Lens: api — 20261019-kiosk-widget-edit-menu

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-19  
**Verifier:** Senior Verifier (fresh context; did not author draft; did not change code)  
**Skill:** api-and-interface-design

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A1 | Nit | `app/api/user/preferences/route.ts` 429 branch | Prefs `429` still returns `{ error: "Too many requests" }` without `code`, while `badRequest` / `unauthorized` / `dbUnavailable` use `{ error, code }`. Pre-existing; design Errors row lists feature 401/400 only. | Optional: adopt `rateLimited()` from `lib/api-http.ts`. Out of scope for this extend. |
| A2 | Enhancement | `03-design.md` API Errors | Contract lists 401/400; route also returns 429 (rate limit) and 503 (`dbUnavailable`). Same gap noted in `03a-api-contract-review` Deferred. | Optional design wording only; do not change statuses. |
| A3 | Enhancement | `lib/validators/user-preferences.ts` `cells` | After parse, `kioskLayout.cells` stays `Record<string, unknown>` (superRefine); service casts to `KioskLayout["cells"]`. Runtime rules match Design; TS create-input is looser than success DTO. | Optional: typed refine output / branded map — not required for contract correctness. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | PATCH optional `kioskLayout.cells` via `kioskLayoutSchema` + editable Source/Resize shapes; success `{ data: SerializedUserPreferences }` with `resolveKioskLayout` (sanitized `cells`). A3 is typing polish only. |
| One error format | pass | Extend reuses prefs: `401` / `400` / `429` / `503`. Flat `{ error, code? }` via `lib/api-http` (+ bare 429 Nit A1). Zod failures → `badRequest(message)` (no stacks). |
| Validate at edges only | pass | Zod in `patchUserPreferences` (route service edge); same-origin + `readJsonBounded` on PATCH. Read path `sanitizeKioskLayoutCells` drops corrupt keys (Design lock) — not a second write Zod. |
| Lists paginated | N/A | Single prefs row; no new list REST. |
| Additive fields / no silent breaks | pass | Optional `cells` under `kioskLayout`; mode/columns/focus/`babyDefaultsInjected` unchanged. Omit `cells` preserves; present replaces whole map; widgets-only + baby-inject copy `cells`. |
| Naming matches repo | pass | camelCase `kioskLayout.cells` / dotted widget + signal ids; matches registry + ADR-005. |
| Idempotency for mutating endpoints | pass | Same-body upsert safe to retry; no `Idempotency-Key` (matches Design / today’s prefs; no new store). |
| Contract matches `03-design.md` | pass | Editable-set reject (no silent ignore); Source-enabled 1–3 same-topic + feature topic; Resize-only rejects `sources`; empty `{}` key → 400; clear-by-omit id; omit/preserve vs present/replace; GET/PATCH return extended layout. Auth/owner/same-origin unchanged. |

Skill: `api-and-interface-design`

## Round notes

- **Scope:** Design↔code for prefs extend (`kioskLayout.cells`, ADR-005) vs `03-design.md` API contracts. Surfaces: `app/api/user/preferences/route.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, `lib/kiosk/signal-catalog.ts`, `lib/kiosk/kiosk-layout.ts`, `lib/kiosk/cell-edit-save.ts`, `lib/kiosk/baby-defaults-inject.ts`.
- **Write semantics verified:** `"cells" in patch` → replace (empty map clears all); omitted → preserve; widgets-only branch + inject copy existing `cells`.
- **Zod lock verified:** non-editable keys, cross-topic / feature mismatch, Resize-only+sources, empty override object, sources length ∉ 1..3 → fail → route `400`.
- **Out of lens:** jsonb/migration → db; OWASP deep-dive → security; Edit UI / skeletons → UI.
- **Do not fix here** — A1–A3 deferred (Nit / Enhancement).
- **Open Critical / Major:** none → **Result: clean**.
