# TDD test plan review

**Result:** clean  
**Updated:** 2026-10-26 (design-backloop settle-gen:1 — Export all / Import all)

**04a unpaid / dirty** when planned tests present ∧ ¬Notes `04a skipped` ∧ (missing **or** Result ∉ {`clean`}) — incl. **`pending`**. ¬ planned tests → **04a ok** (no Prefer). Waiver Notes `04a skipped` = **parent-only** named yes.

## Planned cases (delta this round)

| Case | Verdict |
|------|---------|
| Prior Round 1–2 cases in `04-tasks.md` | Keep — still cover per-kind import/export |
| `moneyExportAll returns zip of kind csv members` | Keep — Export-all package |
| `moneyExportAll returns 413 export_too_large when any kind over cap` | Keep — no partial ZIP |
| `moneyImportKinds never includes all` | Keep — static `/all` vs `[kind]` |
| `moneyImportAllPreview rejects unknown filenames` | Keep — Import-all validation |
| `moneyImportAllPreview skips missing kind with warning` | Keep — missing optional |
| `moneyImportAllCommit runs kinds in dependency order` | Keep — commit order |
| `moneyImportAllCommit stops on first fail keeps earlier kinds` | Keep — partial failure |
| `babyLoansExportImportAll mirror money zip and order` | Keep — peer parity |
| `investmentExportAll zip contains instruments and trade-journal only` | Keep — Investments Export all |
| `investmentImportAll has no zip preview commit routes` | Keep — statement-only Import all |
| `featureImportExportHub shows exportAll and importAll actions` | Keep — hub UI |

## Gaps

None blocking. Coverage matches Grill R2 locks + API Isolated Enhancements (route guard, ZIP members, fail-stop).

## Fix ask

None — Result **clean**.
