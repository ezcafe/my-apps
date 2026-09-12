# Review log: money-investments-loans-e2e

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/money.spec.ts` Insights More | Money Insights More teaser is **hard**-asserted (`expect(teaser).toBeVisible()`). Settled design seed contract (`03-design.md` DB table) says Money More teasers missing → **soft** assert / fix seed; Investments/Loans stay hard-fail. Thin Money ATF seed then looks like a product bug instead of soft seed noise. | fixed |
| Major | `e2e/money.spec.ts` settings children | Task 6 says visit each settings child **from** `/money/settings` (hub links in `money-workspace-settings.tsx`). Spec only `page.goto` deep paths. Broken hub links with intact deep routes would stay green. | fixed |
| Enhancement | money/investments/loans Insights More | Each app exercises only **one** pinned More title. Task/design pin three titles per surface; other teasers can drift with no coverage. | fixed |
| Enhancement | `e2e/money.spec.ts` write | Task 4 asks to fill type via existing aria-labels (`Transaction type` radiogroup). Spec only fills Amount and relies on default expense — type control regressions not touched. | fixed |
| Enhancement | `e2e/loans.spec.ts` Pay | Pay discovery uses `listPay.count()` then `first().click()`. List renders desktop + mobile Pay (one CSS-hidden). `count()` ignores visibility; prefer a visible web-first locator / `expect(listPay.first()).toBeVisible()` branch to avoid flake. | fixed |
| Enhancement | Insights More ATF wait | Insights More waits only on `expectMoneyWorkspaceReady` (bootstrap alert), not ATF/dashboard ready. Teaser hard wait can race a slow ATF query (15s expect) and flake. | fixed |
| Enhancement | money write + loans Pay | Mutating happy paths soft-assert success toast only. No paired check that an error toast/alert (`Couldn’t save…`) is absent — failed mutations burn the full expect timeout before soft-fail. | fixed |
| Nit | `e2e/helpers/shell.ts:15-22` | Task 2 optional uniqueness check for `uniqueNote()` not present (OK if consuming e2e is enough). | open |
| FYI | `e2e/investments.spec.ts` Insights More | Investments Insights More hard-fail when empty ATF matches design (seed prerequisite). Not a test bug. | n/a |
| FYI | `e2e/loans.spec.ts` Pay fallback | Detail fallback still walks `a[href^="/loans/"]` without `visible: true`. Primary path uses visible Pay filter; fallback is rare when Pay seed is correct. | n/a |

**Round notes:**

- Round 1 (2026-09-11) — Senior Verifier (did not author draft).
- Mapped specs to `04-tasks.md` + Option B contracts: skip without storage ✓; `/login` hard-fail via `expectAuthenticated` ✓; Notes & extras + toast **Transaction added** ✓; Pay list-first then **Add payment to Money** + toast **Payment recorded in Money** ✓; Investments open-form only ✓; Settings child headings ✓; no GraphQL mocks (not mock theater) ✓.
- Not clean: 2 Major + 5 Enhancement (plus Nit/FYI). Do not fix in this lens — Fix subagent next.
- Round 1 Fix (2026-09-11) — Senior Developer (adversarial-tests). Fixed 2 Major + 5 Enhancement in specs/helpers. Nit left optional. Awaiting Verifier re-run of adversarial lens (Fix does not self-approve).
- Round 2 (2026-09-11) — Senior Verifier re-run after Fix (did not author). Confirmed in code:
  - Money More: `expect.soft` on all three pinned titles; click/expand only if first visible; Investments/Loans stay hard.
  - Settings children: hub `/money/settings` → `getByRole("link", { name: title, exact: true })` (not deep `goto`).
  - Three pinned More titles per surface (Money / Investments / Loans).
  - Money write: radiogroup **Transaction type** → radio **Expense**.
  - Loans Pay: `getByRole(Pay).filter({ visible: true })` before click.
  - `expectInsightsAtfReady` in `shell.ts`; matches live skeleton labels (`Loading summary totals` / `analytics page|charts` / `insights`); used on all three Insights tests.
  - Mutating paths soft-assert absent error alert (`Couldn’t save` / `Payment failed`) before success toast.
- No new Critical / Major / Enhancement. Nit (`uniqueNote` uniqueness) still optional/open; FYI only.
- **Adversarial test review: clean.**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `e2e/helpers/shell.ts` `expectMoneyWorkspaceReady` | Ready helper only asserts bootstrap **error** alert is absent. On the success path that alert is never mounted, so the wait returns immediately while the page may still be loading. Money settings/import then lean on blunt `test.setTimeout(90_000–120_000)` instead of a positive ready signal (e.g. feature `role=status` loading chrome gone — same idea as loans Pay’s “Loading loans” wait). | fixed |
| Enhancement | `e2e/loans.spec.ts` Pay fallback | Fallback still walks `a[href^="/loans/"]` with no `visible: true` filter. Desktop table (`@md:block`) and mobile list (`@md:hidden`) both mount detail links; Playwright `click()` on a CSS-hidden first match times out instead of advancing to a visible link. Primary visible-Pay path is fine; fallback is fragile. | fixed |
| Enhancement | `e2e/loans.spec.ts` Pay discovery | `getByRole("button", /^Pay$/).filter({ visible: true }).first()` can hit `LoansDueBanner` compact Pay before list/table Pay. Still exercises the Pay modal, but diverges from Task 10’s “list Pay” preference — scope to the loans list region or exclude the banner. | fixed |
| Enhancement | `e2e/money.spec.ts` `SETTINGS_CHILDREN` | After hub-nav fix, each child only uses `title`; `path` is unused dead data. Drop `path` or assert `toHaveURL(path)` after the hub click. | fixed |
| Nit | `playwright.config.ts` | File header still says “Baby Care smoke e2e” only; finance trio specs now exist (Task 11 hygiene). | open |
| Nit | `e2e/helpers/shell.ts` `uniqueNote` | Task 2 uniqueness still has no tiny assert (same optional gap as adversarial Nit). | open |
| Nit | `e2e/helpers/shell.ts` `expectMoneyWorkspaceReady` | Name says Money-only but Investments/Loans specs use it for shared workspace bootstrap — rename or document as shared. | fixed |
| FYI | `playwright.config.ts` workers | `workers: 1` keeps Money write + Loans Pay from colliding on one workspace. Raising workers later needs stronger isolation. | n/a |

**Round notes:**

- Round 1 (2026-09-11) — Senior Verifier Quality lens (did not author draft).
- Context: Option B draft vs `01-idea` / `03-design` / `04-tasks`; adversarial lens already clean.
- Axes: correctness of helpers/selectors, architecture (thin shell vs page objects), readability, test performance/timeouts. Security/secrets: auth docs + skip gate OK; `.auth` gitignored.
- Mapped: skip without storage ✓; `/login` hard-fail via `expectAuthenticated` ✓; Money write Notes & extras + soft toast ✓; Investments open-form only ✓; Settings hub → child links ✓; Insights pinned titles + ATF wait ✓; no GraphQL mocks ✓.
- No Critical / Major. 4 Enhancement + 3 Nit + 1 FYI.
- Not clean under Quality (Enhancements open). Do not fix in this lens — Fix subagent next.
- Round 1 Fix (2026-09-11) — Senior Developer (quality). Fixed 4 Enhancement in specs/helpers. Nits left optional. Awaiting Verifier re-run of Quality lens (Fix does not self-approve).
- Round 2 (2026-09-11) — Senior Verifier Quality re-run after Fix (did not author). Confirmed in code:
  - `expectMoneyWorkspaceReady`: bootstrap alert absent + shell h1 visible; optional `loadingGone` via `getByLabel` for settings/import (`Loading settings content` / `Loading import wizard`); JSDoc documents shared Money/Investments/Loans use.
  - Loans Pay fallback: `a[href^="/loans/"].filter({ visible: true })`.
  - Loans Pay discovery: scoped to `getByRole("table")` + visible `/^Pay$/` (skips `LoansDueBanner`).
  - Settings children: hub list “Ledger and automation” → link click → `toHaveURL(path)` → child h1 (path no longer dead).
- No new Critical / Major / Enhancement. Open Nits only (`playwright.config.ts` Baby Care header; `uniqueNote` uniqueness assert) — do not block.
- **Quality review: clean.**

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| FYI | `e2e/*` mutating paths | Disposable-workspace warning is docs-only (auth helper + Money/Loans specs). No runtime guard that `E2E_BASE_URL` is localhost before Money write / Loans Pay. Same pattern as Baby writes; design accepted docs-only. | n/a |

**Round notes:**

- Round 1 (2026-09-11) — Senior Verifier Security lens (did not author draft).
- Scope: e2e draft (`auth.ts`, `shell.ts`, money/investments/loans specs) vs idea/design/tasks security contracts.
- Checked:
  - **Secrets:** `e2e/.auth/*` gitignored; only `.gitkeep` tracked; local `user.json` ignored; no cookies/tokens/passwords in specs or helpers. `test-results/` / `playwright-report/` / `blob-report/` ignored (retry traces stay out of git).
  - **Auth bypass:** None. Pocket ID storage only; no `TEST_USER` / password grant; `hasAuthStorage` is env presence only; Playwright loads real `storageState`.
  - **Auth gate:** All three finance describes `test.skip(!hasAuthStorage())`; storage set + `/login` → `expectAuthenticated` hard-fail (not soft-skip). Proxy still matches `/money`, `/investments`, `/loans`.
  - **Mutations:** Money add + Loans Pay documented disposable-local-only; Investments open-form only (no submit). Unique notes reduce collision, not a prod safety net.
  - **Injection / untrusted input:** No shell with user strings; form fills are test-owned markers; loan href parse used only to skip non-detail paths.
- No Critical / Major / Enhancement.
- **Security review: clean.**

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/money.spec.ts` settings children | Task 6 needs hub→child clicks, not seven cold boots. Each of 7 child tests (plus the hub-only test) does `page.goto("/money/settings")` + `loadingGone` wait + Money bootstrap. Every green run re-pays ~8 settings chunk loads. One serial sweep (goto hub once, click each hub link, soft-nav back to hub) keeps hub-link coverage and cuts redundant bootstraps. | fixed |
| Major | `e2e/money.spec.ts` Insights More soft | Three sequential `expect.soft(...).toBeVisible({ timeout: 15_000 })` for pinned More titles. Design softs Money More for thin seed — soft still waits the full expect budget per title (~45s) when teasers are missing before continuing. Shorter soft timeout or one batched presence check cuts waste on the documented soft path. | fixed |
| Enhancement | `e2e/money.spec.ts` settings hub test | Standalone “settings hub shows Money settings” cold-loads the same hub + h1 already asserted at the start of every child test. Fold into the children sweep or drop. | fixed |
| Enhancement | `e2e/money.spec.ts` `setTimeout(90_000–120_000)` | Settings/import still raise test timeout to 90–120s after positive `loadingGone` ready signals. Prefer default 60s unless measured need; long caps hide slow regressions. | fixed |
| Enhancement | money write + loans Pay soft error absence | `expect.soft(errorAlert).toHaveCount(0)` uses default expect timeout (15s). When an error alert *is* present, Playwright retries until that budget hoping count hits 0, then soft-fails — failed mutations still burn ~15s before the success-toast soft wait. Use a short timeout on the absence check (1–2s) or race success vs error. | fixed |
| FYI | `playwright.config.ts` workers | Pre-existing `workers: 1` (design keep). New finance depth adds wall-clock linearly under serial workers; not introduced by this draft. Raising workers needs workspace isolation (Quality FYI). | n/a |

**Round notes:**

- Round 1 (2026-09-11) — Senior Verifier Performance lens (did not author draft).
- Scope: Playwright e2e suite waste only (money / investments / loans / shell helpers). Product N+1 out of scope; no product UI in this change.
- Checked: `page.goto` / reload multiplication, soft-assert timeout burn, blunt `test.setTimeout`, loading waits, `waitForTimeout`/`networkidle` (none), workers.
- No Critical. 2 Major + 3 Enhancement + 1 FYI.
- Not clean under Performance (Majors/Enhancements open). Do not fix in this lens — Fix subagent next.
- Round 1 Fix (2026-09-11) — Senior Developer (performance). Fixed 2 Major + 3 Enhancement. Awaiting Verifier re-run of Performance lens (Fix does not self-approve).
- Round 2 (2026-09-11) — Senior Verifier Performance re-run after Fix (did not author). Confirmed in code:
  - Settings: one test `settings hub and every child from hub` — single cold `goto("/money/settings")`, hub link → child → Breadcrumb “Settings” soft-nav for remaining children; hub-only test folded in.
  - Money More soft: `moreSoftMs = 2_000` on teaser + expand soft expects (not 15s × 3).
  - Import: no `test.setTimeout`; default 60s + `loadingGone`.
  - Settings sweep: `setTimeout(120_000)` only on the seven-cycle serial test (measured need per Fix notes).
  - Money write + Loans Pay: error-alert `toHaveCount(0, { timeout: 2_000 })` before success toast soft.
- No new Critical / Major / Enhancement. FYI (workers: 1) unchanged / n/a.
- **Performance review: clean.**

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| FYI | design / mutating e2e | No delete-after cleanup for Money write / Loans Pay rows (design: unique notes only). DB growth is intentional disposable-workspace cost, not a process leak in helpers. | n/a |

**Round notes:**

- Round 1 (2026-09-11) — Senior Verifier Memory lens (did not author draft).
- Scope: Playwright e2e draft (`shell.ts`, `auth.ts`, money/investments/loans specs) + confirm no accidental product/DB code.
- Checked:
  - **Contexts / pages:** Specs use Playwright `{ page }` fixture only — no manual `browser.newContext` / `newPage` without close.
  - **Listeners / timers:** No `page.on`, `addListener`, `setInterval`, or uncleared timers in helpers/specs (`test.setTimeout` only).
  - **Module state:** Helpers are pure / env-read; fixed `as const` title arrays; `uniqueNote` returns ephemeral strings (no accumulation).
  - **Caches / lists:** No unbounded caches or growing in-memory collections across tests.
  - **Closures:** Nested `assertSettingsHub` / `openPayFlow` close over one test `page`; lifetime ends with the test.
  - **Product / SQL:** Diff is e2e-only (`auth.ts` docs + new specs/helpers). No money/`SUM`/`::int` casts or retained app-side state.
- No Critical / Major / Enhancement.
- **Memory review: clean.**

---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:

- None for this Fix round — all findings were e2e behavior/coverage; specs updated first (Red = weak/missing asserts), then helpers/asserts aligned to `03-design.md` / `04-tasks.md` (Green).

### Fix detail (adversarial Round 1)

1. **Money More soft** — `expect.soft` on all three Money teaser buttons; click only if first visible; Investments/Loans stay hard.
2. **Settings from hub** — each child test goes `/money/settings` then clicks hub `link` by title (not deep `goto`).
3. **Three pinned More titles** — Money / Investments / Loans each assert all three teaser buttons before expand.
4. **Transaction type** — write path clicks `radiogroup` “Transaction type” → radio “Expense”.
5. **Visible Pay** — `getByRole(Pay).filter({ visible: true })` before click.
6. **ATF ready** — new `expectInsightsAtfReady` in `shell.ts`; Insights tests wait on loading status chrome gone.
7. **Error alert absent** — money write soft-asserts no `/Couldn.?t save/i` alert; loans Pay soft-asserts no `/Payment failed|Couldn.?t save/i` before success toast.

### Fix detail (quality Round 1)

1. **Positive workspace ready** — `expectMoneyWorkspaceReady` now waits for shell h1 (not only bootstrap alert absent); optional `loadingGone` for settings/import chrome.
2. **Pay fallback visible** — detail-link fallback uses `a[href^="/loans/"].filter({ visible: true })`.
3. **List Pay over banner** — Pay discovery scoped to `getByRole("table")` so `LoansDueBanner` compact Pay is skipped (Task 10).
4. **Settings URL** — after hub click, `toHaveURL` asserts each child’s `path` (hub link scoped to “Ledger and automation” list).
5. **Shared ready docs** — JSDoc notes Money/Investments/Loans shared bootstrap (nit).

### Fix detail (performance Round 1)

1. **Settings serial sweep** — one test `settings hub and every child from hub`: cold `goto` hub once, click each Ledger hub link, soft-nav back via Breadcrumb “Settings” (Task 6 / Settings B). Hub-only test folded in. `setTimeout(120_000)` only on this sweep (seven cycles; measured need).
2. **Money More soft budget** — soft teaser / expand expects use `timeout: 2_000` (not 15s × 3).
3. **Import timeout** — dropped `setTimeout(120_000)`; default 60s + `loadingGone`.
4. **Error-alert absence** — money write + loans Pay `toHaveCount(0, { timeout: 2_000 })`.

**Tests run:** `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm exec playwright test e2e/money.spec.ts e2e/loans.spec.ts` → **9 passed** (~2.5m). Settings sweep ~57s.
