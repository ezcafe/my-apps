# Tasks (TDD-ready)

Each task: behavior, failing test name first, files allowed, done evidence.

## Planned tests

| Case | Failing test name | Covers |
|------|-------------------|--------|
| Money settings categories include searchable Import/Export | `MONEY_SETTINGS_CATEGORIES includes import-export category` | settings IA hub |
| Baby/Loans/Investments settings categories include Import/Export | `BABY_LOANS_INVESTMENT_SETTINGS include import-export category` | settings IA hub |
| Money child settings deep-link Import and Export | `moneyChildSettings deepLink import and export for accounts` | Grill IA child entry |
| Money CSV export columns match import field defs for accounts | `moneyExportCsv accounts headers match moneyImportFieldDefs keys` | Money round-trip shape |
| Money export rejects unknown kind | `moneyExport rejects non MoneyImportKind` | Money export API guard |
| Money export over row/byte cap returns export_too_large | `moneyExportGet returns 413 export_too_large when over cap` | buffered export size lock |
| Money export has no query-kind alternate | `moneyExportGet ignores kind query and uses path param only` | single export path |
| Baby export has no query-kind alternate | `babyExportGet ignores kind query and uses path param only` | peer Hyrum path lock |
| Loans export has no query-kind alternate | `loansExportGet ignores kind query and uses path param only` | peer Hyrum path lock |
| Baby profile import upserts by workspace natural key | `babyImportCommit profile upserts existing workspace profile` | merge policy upsert |
| Baby care import appends and never upserts by id alone | `babyImportCommit care appends new rows without replace` | merge policy append |
| Baby export omits telegram link secrets | `babyExport kinds never include telegram token fields` | PII denylist |
| Baby export omits quick-care replay rows | `babyExport kinds never include quickCare rows` | Grill exclude quick-care |
| Baby commit Idempotency-Key replay | `babyImportCommit idempotencyReplay same key one side effect` | Money-parity idempotency |
| Baby commit Idempotency-Key body mismatch | `babyImportCommit idempotency_body_mismatch 409` | Money-parity idempotency |
| Loans kind appends (no upsert by loan name) | `loansImportCommit loans kind appends without upsert by name` | Loans natural key append |
| Loans installments upsert on (loan, installmentNumber) when loan resolved | `loansImportCommit installment upserts by loan and number` | Loans natural key |
| Loans commit sequence schedule then status then preview delete | `loansImportCommit upserts schedule status then deletes preview` | commit integrity |
| Loans commit Idempotency-Key replay | `loansImportCommit idempotencyReplay same key one side effect` | Money-parity idempotency |
| Loans commit Idempotency-Key body mismatch | `loansImportCommit idempotency_body_mismatch 409` | Money-parity idempotency |
| Loans commit requires preview confirm | `loansImportCommit rejects missing previewId` | anti-goal silent overwrite |
| Loans export omits push subscription endpoints | `loansExport never serializes push subscription rows` | device-secret denylist |
| Investment export instruments CSV excludes quote cache tables | `investmentExportInstruments does not read quote tables` | Investments exclude |
| Investment export trade journal is workspace scoped | `investmentExportTradeJournal filters by workspaceId` | workspace isolation |
| Export API requires read scope / denies other workspace | `moneyExportGet denies foreign workspace` | auth/workspace |
| Import commit requires preview confirm (no silent replace) | `babyImportCommit rejects missing previewId` | anti-goal silent overwrite |
| Housekeeping prunes baby and loans import previews | `dbHousekeeping prunes baby_import_preview and loans_import_preview` | preview TTL prune |
| Settings filter finds Import/Export via keywords | `filterSettingsCategories import finds import-export` | searchable settings |
| Money Export all returns ZIP of per-kind CSVs | `moneyExportAll returns zip of kind csv members` | Export-all package |
| Money Export all fails whole when any kind over cap | `moneyExportAll returns 413 export_too_large when any kind over cap` | no partial ZIP |
| `all` is not a MoneyImportKind | `moneyImportKinds never includes all` | route vs [kind] guard |
| Money Import all rejects unknown ZIP member names | `moneyImportAllPreview rejects unknown filenames` | Import-all validation |
| Money Import all skips missing kind with warning | `moneyImportAllPreview skips missing kind with warning` | missing optional |
| Money Import all commit order accounts before transactions | `moneyImportAllCommit runs kinds in dependency order` | commit order |
| Money Import all stops on first hard-fail keeping earlier | `moneyImportAllCommit stops on first fail keeps earlier kinds` | partial failure |
| Baby/Loans Export all ZIP + Import all ordered commit | `babyLoansExportImportAll mirror money zip and order` | peer parity |
| Investment Export all ZIP instruments + trade-journal only | `investmentExportAll zip contains instruments and trade-journal only` | Investments Export all |
| Investment Import all has no ZIP API (statement deep-link only) | `investmentImportAll has no zip preview commit routes` | Investments Import all lock |
| Hub settings expose Export all and Import all above per-kind list | `featureImportExportHub shows exportAll and importAll actions` | hub UI |

## Build tasks (order)

1. **Failing tests first** — add Planned tests above (red) before production routes/UI (incl. Export all / Import all cases).
2. **Settings IA** — `import-export` category metas + hub sections + **Export all / Import all top row** + Money child Import/Export deep-links; skeleton parity.
3. **Money export** — serializers + **only** `GET /api/money/export/[kind]` (no query-kind); buffered CSV + hard max rows/bytes → `413`/`export_too_large`; wire hub/children downloads; keep existing import.
4. **Money Export all / Import all** — `GET /api/money/export/all` ZIP; `POST …/import/all/preview|commit`; `all` ∉ kind enum; ordered commit + stop-on-fail; Idempotency-Key on all-commit.
5. **DB preview tables** — migrations + schema + RLS for `baby_import_preview` and `loans_import_preview` (mirror Money `0015`/`0034`); multi-kind preview envelope in existing `rows` jsonb; extend `db-housekeeping` prune.
6. **Baby import/export + all** — kinds, preview store, preview→commit→abandon, export GETs, Export all / Import all (order profile→care→growth→vaccines).
7. **Loans import/export + all** — kinds, commit sequence, Export all / Import all (order loans→installments); exclude push.
8. **Investments** — settings links; fixed-path exports; **Export all** ZIP; **Import all** = statement wizard deep-link only (no ZIP import API).
9. **Docs** — `docs/API.md` for new routes incl. `/export/all` + `/import/all/*`, `export_too_large`, Idempotency-Key; ARCHITECTURE + PERFORMANCE.
10. **E2E** — settings Import/Export + Export all / Import all visible per feature; one smoke where feasible.
11. **Verify bar** — typecheck, lint, unit, nearby e2e green.

## Done evidence

- Planned tests green; settings hubs show Import/Export **and** Export all / Import all top row; Money children deep-link one wizard/export.
- CSV export/import behavior matches Grill merge + kind locks; secrets and quote cache absent from dumps.
- Export path is path-kind only; Export all ZIP; oversize → `413`/`export_too_large`; Baby/Loans (+ Money all) commit Idempotency-Key matches Money.
- Preview tables + housekeeping documented; Loans/Baby commit integrity matches Design sequence.
- `docs/API.md` lists new routes; no JSON archive; Investments non-statement / instruments CSV import absent.
