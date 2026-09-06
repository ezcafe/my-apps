/**
 * E2E auth notes (Pocket ID / NextAuth — no insecure bypass).
 *
 * Baby Care UI routes under `/baby` render without a session (shell layout
 * loads session but does not redirect). GraphQL writes still need a real
 * cookie session.
 *
 * Optional authenticated runs:
 * 1. Sign in once in a real browser against a local/dev Pocket ID.
 * 2. Save cookies with Playwright:
 *      pnpm exec playwright codegen http://localhost:3000/baby \
 *        --save-storage=e2e/.auth/user.json
 * 3. Set E2E_STORAGE_STATE=e2e/.auth/user.json (see `.env.example`).
 *    Do not commit `e2e/.auth/` — it holds session cookies.
 *
 * There is no TEST_USER password grant in this repo. Multi-caregiver
 * (second storageState) is not wired yet — shared timeline stays blocked.
 */

export const AUTH_DOCS =
  "Use E2E_STORAGE_STATE from a Pocket ID sign-in; no auth bypass.";
