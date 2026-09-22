# Light repo skim: baby-external-apis

**Result:** done
**Updated:** 2026-09-22
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js monorepo with Money, Investment, Savings, and Baby Care workspaces. External automation uses personal Bearer API tokens (`mny_` / `sav_` / `inv_`) plus GraphQL/REST; Baby GraphQL exists at `/api/graphql/baby` but has no Baby token prefix and does not bind API-token workspaces yet.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/api-token-settings.tsx` | Create/list/revoke tokens | yes — add Baby to app keys |
| Settings / Help (`docs/API.md`, `lib/api-help-content.ts`) | Token docs | yes — document Baby |
| `/baby` shell | Caregiver UI (session) | no change for MVP |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `POST /api/graphql/baby` | Baby GraphQL; session works; api_key path incomplete |
| `GET/POST/DELETE /api/tokens` | Session-only token CRUD |
| `db/schema/api-token.ts` | `app_key` text; no Baby prefix in `API_TOKEN_PREFIX_BY_APP` |
| `lib/api-token-app-keys.ts` | UI create list is `["money"]` only today |

## Hard constraints (do not fight)

1. Tokens are workspace-bound + `appKey`; session-only for token management.
2. Bearer skips CSRF Origin check; session mutations need CSRF.
3. Design system / Settings chrome — lean UI must match real Settings tokens screen.
4. Do not invent a second auth system when personal tokens already exist.

## Risks if we ignore the repo

- Leaving `createBabyGraphQLContext` with `api_key → workspaceId null` blocks all Bearer Baby calls.
- Allowing `mny_` on Baby routes would cross-app leak risk.
- Skipping Settings Baby option = caregivers cannot create usable secrets.

## Enough for UI concept / Analyze?

yes — lean UI concept on Settings API tokens; Analyze can map Money token + GraphQL patterns onto Baby.
