/**
 * E2E auth notes (Pocket ID / NextAuth — no insecure bypass).
 *
 * Baby Care UI routes under `/baby` render without a session (shell layout
 * loads session but does not redirect). GraphQL writes still need a real
 * cookie session.
 *
 * Money, Investments, and Loans routes ARE auth-required (`proxy.ts` +
 * `auth.ts`). Without a session they redirect to `/login`. Specs live in:
 *   - `e2e/money.spec.ts`
 *   - `e2e/investments.spec.ts`
 *   - `e2e/loans.spec.ts`
 * Those suites call `test.skip` when `E2E_STORAGE_STATE` is unset so CI stays
 * green without secrets. When storage is set but the app lands on `/login`,
 * the test must hard-fail (expired fixture) — do not soft-skip.
 *
 * Optional authenticated runs (local disposable workspace only):
 * 1. Sign in once in a real browser against a local/dev Pocket ID.
 * 2. Save cookies with Playwright:
 *      pnpm exec playwright codegen http://localhost:3000/money \
 *        --save-storage=e2e/.auth/user.json
 *    (Baby: use `/baby` the same way.)
 * 3. Set E2E_STORAGE_STATE=e2e/.auth/user.json (see `.env.example`).
 *    Do not commit `e2e/.auth/` — it holds session cookies.
 * 4. Run finance smoke:
 *      E2E_STORAGE_STATE=e2e/.auth/user.json pnpm test:e2e -- e2e/money.spec.ts
 *
 * Mutating Money/Loans e2e writes real rows — use a disposable local workspace,
 * never shared/prod storage.
 *
 * There is no TEST_USER password grant in this repo. Multi-caregiver
 * (second storageState) is not wired yet — shared timeline stays blocked.
 */

export const AUTH_DOCS =
  "Use E2E_STORAGE_STATE from a Pocket ID sign-in; no auth bypass.";

/** True when Playwright should load a saved session jar. */
export function hasAuthStorage(): boolean {
  return Boolean(process.env.E2E_STORAGE_STATE?.trim());
}
