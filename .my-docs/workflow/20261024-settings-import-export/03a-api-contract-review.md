# API contract review

**Result:** clean

**Round:** 3 (design-backloop settle-gen:1 — Export all / Import all)

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | routing | Money already has `POST /api/money/import/[kind]`. Static `import/all/{preview\|commit}` must win; `all` must **never** be a `MoneyImportKind` (same for Baby/Loans kind enums). | Build: add `app/api/{feature}/import/all/preview|commit/route.ts` and `export/all/route.ts`; unit-assert `all` ∉ kind enums. |
| Enhancement | contracts | Import-all preview request body (ZIP multipart field name / max ZIP bytes) cited by pattern, not an inline field table. | Clone Money multipart style; name `file` + max ZIP bytes env in Build acceptance / API.md. |
| Enhancement | contracts | Import-all commit response shape for partial success (committed kinds + `failedKind`) not tabulated. | Lock flat `{ error?, code?, committedKinds, failedKind? }` (or equivalent) in API.md at Build. |
| Nit | http | Shared ZIP helper + `413` envelope still optional in `lib/api-http` / feature export libs. | Reuse `export_too_large` for Export-all; no second error code. |

**Prior Majors (settle-gen:0) — still cleared**

| Was | Status |
|-----|--------|
| Money export dual path | Cleared — `[kind]` only; Export all = static `/export/all` |
| Large export stream vs buffer | Cleared — buffered; per-kind caps; whole Export-all fails on any over |
| Baby/Loans commit idempotency | Cleared — extends to Import-all commit |

**New locked contracts (from `03-design.md` Grill R2) — verified present**

- `GET /api/{money\|baby\|loans\|investment}/export/all` → `application/zip`; no partial ZIP; `413 export_too_large`
- `POST /api/{money\|baby\|loans}/import/all/preview|commit`; Investments Import all = UI→statement only (no ZIP import API)
- Ordered commit lists; stop on first hard-fail; earlier kinds stay
- Idempotency-Key on all-commit routes
- Missing ZIP member = skip+warn; unknown filename = reject preview

**API checklist:** typed I/O · one error shape · edge validation · pagination · additive fields · naming · idempotency · matches repo patterns — **pass** (intent); residual Enhancements only.

## Fix ask for my-dev-flow-design

None required for advance (Result **clean**).

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)
