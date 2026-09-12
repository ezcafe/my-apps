# Idea: E2E coverage for Money, Investments, and Loans

## Problem

Finance UI under `/money`, `/investments`, and `/loans` has no Playwright coverage today. The only e2e suite is Baby Care smoke (`e2e/baby-care.spec.ts`). Regressions in auth-gated money flows (ledger, add, insights, loans, investments) can ship unnoticed until manual click-through.

## User / audience

- **Primary:** Maintainers of this repo who need a fast, repeatable check that core Money / Investments / Loans routes still load and key happy paths still work after UI or API changes.
- **Secondary:** Anyone running `pnpm test:e2e` locally or in CI before merge.

## Outcome

What “done” looks like:

1. **Playwright specs** exist for Money, Investments, and Loans (same stack as Baby Care: `playwright.config.ts`, `e2e/`, `pnpm test:e2e`).
2. **Auth-aware runs** work with the existing Pocket ID / `E2E_STORAGE_STATE` pattern (money routes are proxy-matched and need a real session — unlike public Baby shell pages).
3. **Critical paths** for the three features are covered at an agreed depth (see Open questions): at least nav + home render; preferably one write happy path per area if auth + seed allow.
4. **Docs / env notes** stay aligned with Baby Care (`e2e/helpers/auth.ts`, `.env.example` if missing `E2E_*` docs) so a new contributor can run the suite.
5. **Full my-workflow** completes through design → build → review → test → merge gates for this work only.

## Metric

**Primary signal:** `pnpm test:e2e` (with a valid `E2E_STORAGE_STATE` when writes/auth pages are required) passes green and exercises at least one meaningful assertion on `/money`, `/investments`, and `/loans` (not just “page returned 200”).

## Non-goals

What we will **not** build in this pass:

- New product features or UI redesign on Money / Investments / Loans.
- Auth bypass, fake login, or Test User password grant (repo policy: real Pocket ID session only).
- Full visual regression / Percy / screenshot baselines.
- Exhaustive coverage of every settings subpage, import wizard, or edge error.
- Baby Care e2e rewrites (reuse patterns; do not expand Baby scope here).
- Unit/integration test suites beyond what e2e needs to stay green.
- Multi-browser matrix (Chromium-only, matching current Playwright config, unless we explicitly expand later).

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Maintainers can produce `E2E_STORAGE_STATE` via Pocket ID + Playwright save-storage | Yes for auth pages | Try one signed-in goto `/money` without storage → redirect/login | Limit to whatever unauthenticated surface exists (likely none) or block until auth fixture exists |
| Smoke + a few happy paths is enough for v1 (not full CRUD matrix) | Likely | User wants full CRUD for every entity | Expand scope / more fixtures / longer CI |
| Existing local DB + signed-in workspace has enough seed data (or empty states are assertable) | Prefer yes | Empty workspace fails “list has rows” asserts | Add seed script or assert empty-state copy instead |
| One worker / Chromium config stays as-is | Prefer yes | Parallel flakes or need Firefox | Keep workers=1; only add browsers if asked |
| Write tests that mutate data are acceptable if idempotent or clearly isolated | Unclear | User forbids DB writes in e2e | Read-only smoke only (load, filters, empty/error chrome) |

## What we should not build

- A second e2e framework (Cypress, etc.).
- Committed session cookies under `e2e/.auth/` (already gitignored).
- Fragile wall-clock or exact currency-string asserts that break on locale/seed.
- Duplicate GraphQL contract tests that belong in unit/API tests.
- Over-specified page-object frameworks before we have 2–3 stable specs.

## Success criteria

- [ ] Playwright specs cover **Money**, **Investments**, and **Loans** entry routes with real UI assertions (heading / key landmark / empty-or-data state).
- [ ] Auth path documented and usable via `E2E_STORAGE_STATE` (same spirit as Baby Care writes).
- [ ] Agreed critical flows pass under `pnpm test:e2e` (depth set at Gate 1).
- [ ] No secrets committed; `.auth` stays ignored.
- [ ] Design + tasks from this workflow drive the build; `06-test-log.md` maps criteria → e2e cases.
- [ ] Existing Baby Care e2e still passes (no accidental breakage).

## Settled at Gate 1

| Topic | Choice | Meaning |
|-------|--------|---------|
| Depth | **C** | Broader happy paths: homes + Insights “More”, settings/import entry, loan detail Pay, etc. |
| Money surfaces | **C** | Spending home, `/money/new`, `/money/insights`, and Settings tabs |
| Test data | **B** | Assert against the signed-in user’s existing seeded workspace (no new seed/reset helper in v1) |
| CI | **A** | Local-first; skip without `E2E_STORAGE_STATE` (same spirit as Baby) |

## Settled after Analyze Q&A

| Topic | Choice | Meaning |
|-------|--------|---------|
| Write paths | **B** | Submit mutating paths; unique note / soft asserts (no exact balances) |
| Loan Pay seed | **Seed then A** | User seeds a payable installment; specs **assume Pay exists** (fail if missing) |
| Money Settings | **B** | Visit every settings child (Accounts, Categories, Recurrence, Budgets, Rules, Merchants, Tags as applicable) |

## Settled in Design (Write-B clarification)

| Topic | Choice | Meaning |
|-------|--------|---------|
| Investments mutate | **Exception** | Write B applies to **Money `/money/new`** and **Loans Pay** submits. Investments v1: open `/investments/new` + heading only (no activity submit). |
| Insights More seed | **Keep More** | Investments Insights must be non-empty ATF so More teasers show; Loans Insights non-empty usually follows Pay seed. |

## Open questions

**Non-blocking (Design can recommend):**

- Exact selectors / `data-testid` gaps vs role+name (EN).
- One vs split e2e files per feature.
- Idempotent write strategy details (unique note suffix vs delete-after).
- GraphQL mock Insights More vs seed.
