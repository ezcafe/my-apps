# Analysis: Baby personal API tokens for external / Watch

**Result:** done
**Updated:** 2026-09-22
**Size:** Prefer bullets. ≤5 solution pieces.
**Has API recommendation:** yes
**Has DB recommendation:** no — reuse `api_token` (`app_key` text); no migration

## Deep dive (required)

### Overall

#### What is this?
Enable caregivers to create a **Baby-scoped Bearer token** in Settings and call `POST /api/graphql/baby` from Watch / scripts — same personal-token pattern as Money.

#### Why do we need this?
Session-only Baby GraphQL blocks Watch and automation. Money `mny_` tokens must not unlock Baby (cross-app leak). Without this, `docs/BABY_API.md` cannot ship a working auth path.

#### How to do this?
Extend existing personal API tokens: add `baby` prefix + create UI option; bind Baby GraphQL context to the token’s workspace (mirror Money); reject wrong-app tokens; update docs/Help.

##### Decision 1 — Auth approach (for Design)

###### Option 1 — Extend personal API tokens (Money pattern)
- **What it is:** Add `baby` to prefix map + Settings App select; Baby GraphQL uses token `workspaceId` when `apiTokenAppKey === "baby"`.
- **Example:** `Authorization: Bearer bby_…` → `babyProfile` / `babyQuickCare`.
- **Pros:** Matches repo; Settings/Help already exist; CSRF skip already works for Bearer.
- **Cons:** Must wire several auth sites carefully (create assert, context bind, reject `mny_`).

###### Option 2 — Companion iPhone session proxy only
- **What it is:** Watch talks to iPhone; iPhone uses cookies to Baby GraphQL.
- **Example:** WatchKit → phone relay → `/api/graphql/baby` with session.
- **Pros:** No token surface.
- **Cons:** No scripts/Postman; fails idea metric; weaker for standalone Watch.

###### Recommendation
**Option 1** — matches idea + Money pattern; Option 2 alone does not meet Outcome.

### Solution pieces

#### 1. Token prefix + create/list surface

##### What is this?
Make Baby a creatable token app key with its own secret prefix.

##### Why do we need this?
Caregivers need a copyable secret; wrong prefix must not parse as Baby.

##### How to do this?
- Approach: Add `baby` to `API_TOKEN_PREFIX_BY_APP` and `API_TOKEN_APP_KEYS`; Settings select picks up Baby; Zod create uses same enum.
- Other ways: Reuse `mny_` for Baby (rejected — cross-app).
- Best practices: Prefix length/style like `mny_` / `sav_` / `inv_` (Design picks exact string).
- **Bug to fix:** `createApiTokenForUser` hardcodes `assertWorkspaceAppAccess(…, "money")` — must use token’s `appKey` → workspace app (`baby`).

#### 2. Baby GraphQL auth bind

##### What is this?
Bearer callers get a verified Baby workspace from the token.

##### Why do we need this?
Today `createBabyGraphQLContext` sets `workspaceId = null` for `api_key` → always FORBIDDEN.

##### How to do this?
- Approach: Mirror Money — `resolveBabyWorkspaceId`: if `api_key` and `apiTokenAppKey === "baby"` return `auth.workspaceId`; else session via `getBabyWorkspaceIdForUser`. Verify with `verifyBabyWorkspaceAccess` + require write scope on mutations (`requireBabyWriteWorkspace` already exists).
- Other ways: Thin REST only for Watch (extra surface; GraphQL already covers logging).
- Best practices: Reject non-baby tokens on Baby routes (unlike Investment, which also accepts money keys).

#### 3. Docs / Help

##### What is this?
Document Baby Bearer + examples.

##### Why do we need this?
Watch AI + caregivers need a correct contract; current `docs/BABY_API.md` says session-only.

##### How to do this?
- Approach: Update `docs/BABY_API.md`, `docs/API.md`, `lib/api-help-content.ts` together (existing Help rule).
- Other ways: Docs-only without code (useless).
- Best practices: Same curl/Bearer examples as Money Help.

#### 4. Lean Settings UI

##### What is this?
App dropdown includes Baby (Gate A2 baseline).

##### Why do we need this?
No create path without UI.

##### How to do this?
- Approach: Driven by `API_TOKEN_APP_KEYS` — no new page.
- Other ways: Separate Baby developer portal (non-goal).
- Best practices: Match existing `ApiTokenSettings` labels/workspace fetch by `app`.

#### 5. Tests

##### What is this?
Prove Bearer Baby works; Money token on Baby fails; create with baby appKey checks baby membership.

##### Why do we need this?
Auth regressions are high blast radius.

##### How to do this?
- Approach: Unit tests on resolve/create/context; yoga/http tests with Bearer fixture if Money has them.
- Other ways: Manual only (rejected by repo debug rules).
- Best practices: Follow `lib/api-investment-auth.test.ts` / `lib/graphql/baby-yoga.test.ts` patterns.

## What exists today

Baby GraphQL works with session + CSRF. Personal tokens exist for Money (`mny_`); savings/investment prefixes exist in auth map but Settings create list is Money-only. Baby context and `lib/api-baby.ts` intentionally ignore API keys.

## Dependencies

- Workspace app access for `"baby"` already exists (`assertWorkspaceAppAccess`).
- Session Baby UI must stay unchanged.
- Investment must keep rejecting `baby` tokens (`isInvestmentApiTokenAppKeyAllowed`).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/api-auth.ts` | Prefix map, resolve auth, workspace resolve |
| `lib/api-token-app-keys.ts` | Settings + Zod create list |
| `lib/api-token-service.ts` | Create assert currently money-hardcoded |
| `lib/graphql/baby-context.ts` | api_key workspace bind |
| `lib/api-baby.ts` | Session-only comment / resolve |
| `components/api-token-settings.tsx` | App select |
| `docs/BABY_API.md`, `docs/API.md`, `lib/api-help-content.ts` | Docs/Help |
| `lib/validators/api-token.ts` | Create payload |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Personal Bearer token | `lib/api-auth.ts`, `/api/tokens` | Same create/hash/scopes |
| GraphQL context bind | `lib/graphql/context.ts` (Money) | Copy shape for Baby |
| App-key gate | `resolveMoneyWorkspaceId` / investment allowlist | Baby = baby-only |
| Settings tokens UI | `components/api-token-settings.tsx` | App enum drives UI |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Workspace-bound personal token | `api_token` + Bearer | External client auth without cookies |
| App-scoped GraphQL endpoint | `/api/graphql/baby` vs `/api/graphql` | Wrong-app token rejection |

## Constraints and risks

- Do not accept `mny_` on Baby routes.
- Fix create membership check to use token `appKey` (else Baby create fails or checks wrong app).
- Prefix choice (`bby_` vs `baby_`) — Design Decision.
- No OAuth / anonymous API (idea non-goals).

## Settled decisions (do not relitigate)

- Personal tokens (not OAuth).
- Lean Settings UI only (Gate A / A2).
- GraphQL primary surface (thin REST only if gap proven — not needed for Watch MVP).
- Session callers keep working.

## Open questions

1. Exact prefix string: `bby_` (3-letter family) vs `baby_` (readable) — Design Decision 2.
2. Display label in App select: `"baby"` vs `"Baby Care"` — match existing Money label style in UI.

## Clarity check

Instructions + skim + Gate A2 UI are enough to design. No blockers beyond prefix/label Decision in Design.

## Spike notes

| Spike | Finding |
|-------|---------|
| Create path membership | `createApiTokenForUser` hardcodes `"money"` — must pass `input.appKey` |
| Baby context | `api_key` → `workspaceId` forced null — main bind fix |
| Investment | Already rejects `baby` string — keep |
