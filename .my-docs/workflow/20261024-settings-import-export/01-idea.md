# Idea / framing

## Intent

Add an **import / export** section on each feature settings surface (Money, Baby, Loans, Investments, and other matching feature settings) so users can move that feature’s matching data types in and out of the current workspace.

Known codebase today (facts, not guesses):

- **Money** already has per-entity CSV import under `app/(shell)/money/(tabs)/settings/*/import/` and a shared wizard (`components/money-settings/money-csv-import-wizard.tsx`, `lib/money-import-*`, `app/api/money/import/*`). Kinds include accounts, categories, merchants, tags, budgets, rules, recurrence, transactions.
- **Investments** already has statement import at `investments/settings/import` + `lib/investment-services/import-statement.ts`.
- **Baby** settings (`BabySettingsPage`) today cover profile, language, telegram only — no import/export UI.
- **Loans** settings today cover notifications only — no import/export UI.
- **Foods** has no settings route under `app/(shell)/foods/`.
- Shell categories live in `components/settings/settings-types.ts`.
- Architecture / feature rules: `docs/ARCHITECTURE.md`, `docs/ADDING_A_FEATURE.md`, `docs/DESIGN_GUIDE.md`.
- No general **export** download path found for Money / Baby / Loans (import-heavy today).

## Goals

- On each in-scope feature settings page, expose a clear **Import / Export** area for that feature’s matching entity types.
- Reuse existing Money (and Investments where relevant) import patterns where they already fit; extend with **export** where missing.
- Keep workspace scoping, auth, and feature boundaries consistent with the shell registry.

## Non-goals

- Global “backup whole app” or cross-feature single archive (unless user later asks).
- Changing Foods (no feature settings page today) unless scope expands.
- Redesigning unrelated settings categories (theme, workspace members, Apple Wallet, etc.) on core `/settings`.

## Anti-goals

- Silent overwrite of live data without preview / confirm (Money already uses preview → commit).
- Hard-coded UI tokens or layouts that break light/dark / skeleton parity (`docs/DESIGN_GUIDE.md`).

## Constraints

- Mode **full**, review profile **full**; Has UI / API / DB / auth-PII-schema all **yes**.
- Follow workspace feature patterns (`WorkspaceAppKey`, thin `app/api` routes, scoped providers).
- Money amounts / PII stay workspace-scoped; import must stay authenticated.
- Skeleton parity required for any new settings section UI.

## Has UI (tentative)

**yes** — settings pages gain import/export UI; APIs and likely DB/preview storage follow.

## Shared understanding

- [x] User confirmed (brainstorm hard-gate)

### Playback (confirmed)

You want each **feature settings** page to host import/export for **that feature’s own data types**, not a single global dump. Scope from user: **all records** + **all child settings pages** (Money, Baby, Loans, Investments, and every nested settings child that owns data). Money already imports many ledger entities; Investments imports statements; Baby and Loans need both import and export for domain data. Core `/settings` (theme, workspace) stays out of scope unless later expanded.

### User answer (Parent-relay)

> all records + all child settings pages
