# Code review log

**Overall Result:** clean  
(file-top alone never pays Review clean)

## Adversarial (settle-gen:1 — Export all / Import all)

**Result:** clean  
**Updated:** 2026-10-26

Hunt: breakages, security holes, missing edges for ZIP export/import-all.

### Critical

None.

### Major

None.

### Optional / Nit

| ID | Finding | Note |
|----|---------|------|
| A10 | Import-all commit deletes preview even when `failedKind` set (200 + partial) | Intentional — avoids re-committing earlier kinds; client re-previews remainder |
| A11 | STORE-only ZIP; deflated members rejected | Matches Design; Export all writes STORE |
| A12 | Money merchants/tags Import-all uses `executeMoneyCsvImport` (not MoneyImportType schema) | Correct for kinds outside `moneyImportTypes` |
| A5–A9 | Prior Optionals from settle-gen:0 | Unchanged; out of Export-all scope |

### Security notes

- Export all: read context + rate limit + workspace RLS — OK.
- Import all preview/commit: write + same-origin CSRF for cookie + Idempotency-Key on commit — OK.
- ZIP size cap env-tunable; unknown filenames rejected — OK.
- Investments: no ZIP import API — OK.

## Quality (settle-gen:1)

**Result:** clean

- Hub top-row Export all / Import all above per-kind lists; children unchanged.
- Shared `FeatureImportAllWizard` + thin feature pages.
- `lib/export-zip.ts` STORE ZIP shared across features.
- Docs `API.md` lists new routes.
- Planned tests cover ZIP, caps, order, fail-stop, hub UI, Investments asymmetry.

## Prior settle-gen:0 review

Retained intent: A1–A4 closed; Optionals A5–A9 deferred. See git history / prior Run-log for full tables.
