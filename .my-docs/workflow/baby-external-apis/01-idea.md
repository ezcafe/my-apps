# Idea: Baby APIs for external apps

## Problem

An external app cannot reliably call Baby Care over HTTP with a personal API token today.

- Money already supports Bearer tokens (`mny_…`) and documents GraphQL/REST for automation.
- Baby has GraphQL at `/api/graphql/baby`, but token prefixes and Settings token creation do not include `baby`.
- Baby GraphQL context does not bind an API-token workspace the way Money does, so Bearer callers cannot get a verified workspace.
- Without this, caregivers and automation cannot sync or log Baby data from another app.

## User / audience

- **Primary:** Developers of an external app (or scripts) that need to read/write Baby Care data for a signed-in caregiver’s workspace.
- **Secondary:** Caregivers who create/revoke tokens in Settings and paste them into that external app.

## Outcome

Done means:

1. A caregiver can create a **Baby-scoped** personal API token (workspace-bound, read/write scopes) in Settings.
2. An external client can call Baby GraphQL (and any agreed thin REST) with `Authorization: Bearer baby_…` (or chosen prefix).
3. Docs (`docs/API.md`, Help content, OpenAPI/schema export if applicable) show how to authenticate and call Baby.
4. Session cookie callers keep working; API tokens cannot manage other apps’ data.

## Metric

One successful end-to-end call from an external client: create Baby token → `POST /api/graphql/baby` with Bearer → authenticated query or mutation against the token’s workspace returns data (not `UNAUTHORIZED` / `FORBIDDEN`).

## Has UI

**yes** — extend existing **Settings → API tokens** (and Help) so Baby is a selectable app; no new primary product screen.

## Lean / skip hints

- **Lean UI concept?** yes — one surface: Settings API tokens with Baby app option (screenshot of real settings preferred).
- **Copy/token-only?** no — behavior + docs + auth wiring, not copy alone.

## 80/20 UI (day-to-day)

### Main user goals

- Create a Baby API token for one workspace.
- Copy the secret once and paste it into an external app.
- See which tokens exist; revoke a compromised token.

### Vital few (high-impact ~20%)

- Create token (app = Baby, workspace, scopes).
- Copy secret once.
- Revoke token.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Create token (app + workspace + scopes).
- **Important info / action #2 (always visible):** Token list with revoke.
- **Core action placement:** Same Settings → API tokens pattern as Money; Baby appears in the app selector.
- **Secondary actions:** Help/docs link, prefix display, scope explanation — already secondary in today’s UI.

### Top user journey to optimize

Open Settings → API tokens → choose Baby → pick workspace → choose scopes → Create → copy secret → use in external app.

### Sensible defaults

- App selector can default to last-used or Money (existing); when Baby is selected, list Baby workspaces.
- Prefer offering **read** + **write** scopes with clear labels (same as Money).

### Biggest usability risks to fix first

- Creating a Money token and expecting it to work on Baby (wrong app).
- Missing Baby in the app dropdown.
- Secret only shown once — must stay clear.

## Non-goals

- OAuth / third-party “app registration” marketplace.
- Public anonymous Baby API (no auth).
- Rewriting Baby domain model or new care features.
- Telegram as the external-app path (already separate).
- Full OpenAPI catalog of every Baby REST resource if GraphQL covers the need (thin REST only if Analyze proves a gap).
- Multi-workspace tokens in one secret.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| External app wants the same GraphQL surface the web app uses | Mostly | Ask which operations the external app needs | Add thin REST for a small vital set instead of/in addition to GraphQL |
| Extending existing personal API tokens is enough (no OAuth) | Yes for MVP | Confirm external app is user-owned automation | Need OAuth client credentials later |
| Caregivers will use Settings → API tokens | Yes | Check if tokens UI is discoverable | Add Baby-specific help entry only |
| Baby GraphQL already covers needed ops | Likely | List external app’s required reads/writes | Prioritize missing mutations/queries |

## What we should not build

- New standalone “Developer portal” UI.
- Per-endpoint API keys separate from workspace tokens.
- Changing Money/Investment token prefixes.

## Success criteria

- [ ] Caregiver can create and revoke a Baby-scoped API token in Settings.
- [ ] External client with Bearer Baby token can call `/api/graphql/baby` successfully for that workspace.
- [ ] Wrong-app tokens (e.g. `mny_`) are rejected for Baby routes.
- [ ] Docs + Help describe Baby auth and at least one example query/mutation.
- [ ] Session-based Baby UI auth still works unchanged.

## Open questions

- Exact prefix string (`baby_` vs `bby_`) — decide in Design to match existing 3-letter style (`mny_` / `sav_` / `inv_`).
- Must-have operations for the first external app (read timeline only vs log feed/diaper/sleep/etc.).
- Whether Help + `docs/API.md` alone are enough for Gate A2 lean UI (Settings screenshot), or we need a dedicated developer page (recommend: no).
