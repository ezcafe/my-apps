# Analysis: E2E for Money, Investments, and Loans

## What exists today

Playwright is wired for Baby Care only: `e2e/baby-care.spec.ts`, `e2e/helpers/auth.ts`, `playwright.config.ts` (Chromium, `workers: 1`, optional `E2E_STORAGE_STATE`), and `pnpm test:e2e`. Money / Investments / Loans have rich UI and GraphQL (`/api/graphql`, legacy `/api/graphql/loans`, `/api/graphql/investment`) but **no e2e specs**.

Unlike `/baby*` (not in the proxy matcher — shell can render without a session), `/money`, `/investments`, and `/loans` are **auth-required** via `proxy.ts` + `auth.ts` `authorized` → unauthenticated visits redirect to `/login`. So “optional auth like Baby” here means: **skip the money suite without storage** (CI stays green with no secrets); meaningful coverage only runs when `E2E_STORAGE_STATE` is set locally.

Money UI copy is **English-only** today (`messages/` has baby EN/VI only). Headers come from `resolveMoneyAppHeader` / `resolveInvestmentAppHeader` / `resolveLoanAppHeader` (stable titles like “Spending”, “Insights”, “Add transaction”, “Loans”). Almost no `data-testid` on money surfaces (Baby has several); Baby e2e prefers **role + name** (EN/VI regexes) and adds testids only where needed.

## Dependencies

- **Same app repo** — no second package. Money, Investments, and Loans share the `money` workspace app key and GraphQL bootstrap.
- **Auth / Pocket ID** — real session cookies only; no test-user bypass (repo policy).
- **Local DB + signed-in workspace** (Gate 1: Data B) — asserts assume seed data / empty-state chrome already present; no new seed script in this pass.
- **Baby e2e must keep passing** — reuse helpers/config; do not rewrite Baby scope.
- **CI** (Gate 1: CI A) — no requirement to inject secrets in CI this pass; local-first with optional storage.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `e2e/baby-care.spec.ts` | Patterns: `hasAuthStorage` + `test.skip`, hamburger `open .+ menu`, role+name, GraphQL `page.route` mocks, no wall-clock currency asserts |
| `e2e/helpers/auth.ts` | Pocket ID / `E2E_STORAGE_STATE` docs; no bypass |
| `playwright.config.ts` | `baseURL`, storageState, webServer, workers=1, Chromium-only |
| `.env.example` (E2E_* comments) | Documented `E2E_BASE_URL`, `E2E_STORAGE_STATE`, `E2E_WEB_SERVER_COMMAND` |
| `.gitignore` (`e2e/.auth/*`) | Keep session jars uncommitted |
| `proxy.ts` + `auth.ts` | Matcher + `authorized` — money/investments/loans need session |
| `lib/app-section-nav.ts` | Menu labels/hrefs for Money / Investments / Loans |
| `lib/money-app-header.ts` | Expected h1 titles for Money routes + settings children |
| `lib/investment-app-header.ts` | Investments titles (home, insights, new, import, settings) |
| `lib/loan-app-header.ts` | Loans titles; detail uses override (“Loan” / dynamic) |
| `components/money-section-tabs.tsx` | `MoneyAppMenu` — `Open … menu` aria-label |
| `components/analytics-dashboard.tsx` | Money Insights ATF + “More” teaser buttons (Budget vs actual, Top merchants, Recurring spend) |
| `components/investment-insights-dashboard.tsx` | Investments Insights + More teasers |
| `components/loans-insights-dashboard.tsx` | Loans Insights + More teasers |
| `components/money-workspace-settings.tsx` | Settings hub + links to Accounts/Categories/… |
| `components/money-transaction-form.tsx` | `/money/new` — “Save transaction”, amount/type aria-labels |
| `components/loan-pay-actions.tsx` + `loan-pay-modal.tsx` | Detail **Pay** / “Add payment to Money” → modal write |
| `components/loan-detail-page.tsx` | Loan detail layout + pay placement |
| `app/(shell)/money/(tabs)/…` | Money routes: home, new, insights, settings/*, import |
| `app/(shell)/investments/…` | Home, new, insights, import, settings |
| `app/(shell)/loans/…` | Home, new, insights, settings, `[id]` detail |
| `lib/gql-client.ts` / `loans-gql-client.ts` / `investment-gql-client.ts` | Client hits `/api/graphql` (not baby path) |
| `docs/DESIGN_GUIDE.md` (Money nav / Insights More) | Product intent for surfaces in Gate 1 scope |

## Constraints and risks

- **Auth wall** — Without `E2E_STORAGE_STATE`, money routes never reach UI. Default CI/`pnpm test:e2e` without storage will **skip** (or fail if we forget skip). Do not expect Baby-style unauthenticated smoke for finance.
- **Seeded workspace (Data B)** — Depth C includes Insights More, settings/import entry, loan Pay. Pay and Add transaction **mutate** real data unless Design limits to “open form/modal only”. Prefer unique notes / avoid exact balance asserts; fragile locale/currency strings are out of scope per idea.
- **Payable installment required for Pay** — If the signed-in workspace has no active loan with a next installment, the Pay happy path cannot run; Design documents **hard fail** (assume Pay exists after user seed). List compact **Pay** is preferred over detail.
- **Investments Insights More** — More teasers render only when Insights ATF is non-empty; empty Insights shows CTAs only. Seed must include enough investment activity, or More cases fail.
- **Selectors** — Prefer heading/link/button names from headers + nav. Add `data-testid` only for ambiguous controls (like Baby). Money is EN-only → simpler than Baby bilingual regexes.
- **File layout** — Not settled; Design should pick one vs split specs without overbuilding page objects.
- **Workers=1** — Keep; parallel soft-nav was flaky historically.
- **Tribal** — Baby can mock GraphQL for unauth chart UI; money pages never load without session, so mocks are optional (useful for deterministic Insights More charts if seed is noisy).
- **qan / local HTML-CSS-JS notes** — Front-end routing skill lookup was attempted; context-mode SQLite bind failed in this environment. Grounding for this pass is the in-repo Baby e2e + Money UI conventions above.

## Settled decisions (do not relitigate)

From Gate 1 (`00-run.md` / `01-idea.md`):

- **Depth:** C — Broader happy paths (Insights “More”, settings/import entry, loan detail Pay, etc.).
- **Money surfaces:** C — Home + `/money/new` + `/money/insights` + Settings tabs.
- **Test data:** B — Existing seeded workspace (no new seed/reset helper this pass).
- **CI:** A — Local-first; optional auth like Baby (`test.skip` without `E2E_STORAGE_STATE`).
- **Stack:** Playwright only; Chromium; no auth bypass; no visual regression; do not expand Baby scope.
- **Non-goals stay:** No product UI redesign; no committed `.auth` cookies; no multi-browser matrix.

From Analyze Q&A:

- **Write:** B — Submit mutating paths with unique note / soft asserts.
- **Pay seed:** User seeds payable installment first; then **A** — assume Pay target exists (fail if missing).
- **Settings:** B — Every Money settings child.

**Design clarification (do not reopen as a silent fork):**

- **Write B mutating submits in v1:** Money `/money/new` + Loans Pay only.
- **Investments Write-B exception:** open `/investments/new` + assert heading; no activity submit (form needs instruments/open lots; no new seed helper).
- **Insights More seed:** Keep Investments/Loans More; require non-empty Investments Insights ATF; Loans Insights non-empty usually follows Pay seed.

## Blocking questions

None remaining — Design may proceed.

Non-blocking (Design can choose with a recommendation):

- One `e2e/money-finance.spec.ts` vs `money.spec.ts` + `investments.spec.ts` + `loans.spec.ts`.
- Whether to GraphQL-mock Insights More for determinism or rely on seed.
- Shared helper extract (`e2e/helpers/shell.ts` for hamburger) vs copy small snippets from Baby.
