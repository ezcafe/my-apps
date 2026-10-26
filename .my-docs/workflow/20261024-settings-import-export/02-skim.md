# Skim

**Result:** done

## Findings

### Settings surfaces (in scope)
- **Money:** `app/(shell)/money/(tabs)/settings/` — hub + entity editors under `/money/settings/{accounts,categories,merchants,tags,budgets,rules,recurrence}`; category ids in `MONEY_SETTINGS_CATEGORIES` = `ledger` | `menu` | `clone` (`components/settings/settings-types.ts`).
- **Investments:** `app/(shell)/investments/settings/` — categories `instruments` | `ledger`; legacy `settings/import` redirects to `/investments/import`.
- **Baby:** `app/(shell)/baby/settings/` → `BabySettingsPage` — categories `profile` | `language` | `telegram` only; **no** import/export UI.
- **Loans:** `app/(shell)/loans/settings/` — notifications only (`LOANS_SETTINGS_CATEGORIES`); **no** import/export UI.
- **Core `/settings`:** appearance, account, workspaces, api-tokens, apple-wallet, danger-zone — **out of scope** per ideation (unless later expanded).
- **Foods:** no `app/(shell)/foods/` settings route — out of scope.

### Existing import (reuse candidates)
- **Money CSV wizard:** `components/money-settings/money-csv-import-wizard.tsx`; kinds in `lib/money-import-kinds.ts` — accounts, categories, merchants, tags, budgets, transactions, rules, recurrence.
- **Money UI routes:** `/money/import` + `/money/import/[kind]`; settings `*/import` pages redirect into those.
- **Money API:** `POST /api/money/import/preview|commit|abandon`, `POST /api/money/import/[kind]` (Bearer + write — `docs/API.md`, `docs/ARCHITECTURE.md`).
- **Money preview store:** `lib/money-import-preview-store.ts` + DB `money_import_preview` (workspace RLS; cron prune).
- **Investments:** statement import UI `/investments/import`; API `POST /api/investment/import/preview|commit`; `lib/investment-services/import-statement.ts`.
- **Money clone structure:** settings category `clone` + `lib/money-clone-workspace.ts` (workspace→workspace copy of structure — related but not file export).

### Export gap
- **No** `app/api/**/export/**` routes found.
- No general download/export path for Money / Baby / Loans in skim (import-heavy today). Investments import is statement-oriented, not a full domain dump.

### Domain tables (entity hints for Analyze)
- **Baby:** `babyProfile`, `babyCareEvent`, `babyGrowthEntry`, `babyVaccineEntry`, `babyTelegramLink`, `babyQuickCareRequest` (`db/schema/baby.ts`).
- **Loans:** `loan`, `loanScheduleInstallment`, `loanInstallmentStatus`, `loanPushSubscription` (`db/schema/loans.ts`).
- **Investments:** instruments, quotes, trade journal (+ statement import already) (`db/schema/investment.ts`).

### Patterns / constraints to keep
- Feature registry / workspace cookies: `docs/ARCHITECTURE.md`, `docs/ADDING_A_FEATURE.md`, `lib/features/registry.ts`.
- Settings chrome: `SettingsPageLayout` + category metas in `settings-types.ts`; skeleton parity for any new Import/Export section (`docs/DESIGN_GUIDE.md`).
- Auth: session / Bearer write scope already gates Money/Investment import.

### Verify bar (guess → Design)
- Unit: import/export parsers, auth/workspace scoping, preview→commit.
- E2E: settings Import/Export section visible per feature; round-trip smoke where feasible.
