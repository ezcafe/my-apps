# Analysis: Per-member app grants on shared workspaces

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

**Has API recommendation:** yes  
**Has DB recommendation:** yes

## Deep dive (required)

### Overall

#### What is this?
Add members to a shared workspace and grant them **Money** and/or **Baby** (not the whole workspace for every app). Enforce grants on list/active/feature access. Extend Settings → Workspaces UI.

#### Why do we need this?
Today membership is all-or-nothing: a member can pick the shared workspace for any app. Owners cannot share Money with an accountant while keeping Baby with a partner only. Skipping leaves a privacy gap and blocks the Gate A journey.

#### How to do this?
- Store per-member app allow-list; owner role bypasses grants.
- Filter workspace list + active resolve by app; tighten `assertWorkspaceMember` (or app-aware helper) used by Money/Baby.
- Add member APIs + Settings UI (grants + minimal add).
- Migrate existing shared members → Money + Baby grants.
- **Other ways:** workspace-scoped apps only (rejected Decision 2); labels-only (rejected); per-member grants via JSON column vs junction table (see Decision below).
- **Best practices:** reuse `WORKSPACE_APP_KEYS` + cookie architecture (`docs/ARCHITECTURE.md`); enforce on server; Zod validators; Drizzle `inArray` not PG array binds.

### Solution pieces

#### 1) Schema — member app grants

##### What is this?
Persist which apps each member may use on a shared workspace.

##### Why do we need this?
Without durable grants, UI checkboxes cannot be trusted.

##### How to do this?
- **Approach (recommended):** `workspace_member_app` (`workspace_id`, `user_sub`, `app_key`) PK; FK to membership; migrate insert money+baby for existing shared members.
- **Other ways:** `apps text[]` / jsonb on `workspace_member` — fewer joins, weaker indexing/query ergonomics with Drizzle.
- **Best practices:** explicit rows; cascade with membership; owners may omit rows (role=owner ⇒ all shareable apps).

#### 2) Enforcement — list / active / feature APIs

##### What is this?
Every path that treats someone as a member for an app must require membership **and** grant (unless owner).

##### Why do we need this?
UI-only grants leak via `/api/workspace/list`, cookies, GraphQL, Money REST.

##### How to do this?
- **Approach:** `assertWorkspaceAppAccess(userSub, workspaceId, appKey)`; filter `fetchWorkspacesForUser` / `getActiveWorkspaceId`; wire Money (`verifyMoneyWorkspaceAccess` / `requireMoneyContext`) and Baby (`createBabyGraphQLContext` / `assertWorkspaceMember` callers).
- **Other ways:** filter only list UI — insufficient.
- **Best practices:** one helper; personal workspaces unchanged (owner personal always allowed); shared + member ⇒ need grant.

#### 3) Member directory + add member API

##### What is this?
Resolve “email” to `user_sub` and insert membership + grants. Repo has **no** users table — only OIDC `user_sub` (session email is not queryable).

##### Why do we need this?
Gate A requires Add member; paste-only opaque sub is poor day-to-day UX.

##### How to do this?
- **Approach (recommended):** on sign-in/bootstrap, upsert `user_directory(user_sub, email_normalized, …)`; add-member looks up email among users who have signed in; reject unknown emails clearly.
- **Other ways:** add by raw `user_sub` only; pending invites for never-signed-in emails (out of scope / heavier).
- **Best practices:** normalize email; owner-only mutate; rate-limit; same-origin CSRF like other workspace POSTs.

#### 4) Settings UI — members + grants

##### What is this?
Extend `workspace-settings.tsx` per `01b` (member rows, grant checkboxes, add form).

##### Why do we need this?
Owners need a visible path for the Gate A journey.

##### How to do this?
- Reuse `SettingsSection`, `Field`, `Input`, `Checkbox`, `Button`; skeleton parity; toast on success/error.
- **Other ways:** separate page — extra nav cost.
- **Best practices:** DESIGN_GUIDE tokens; #1/#2 always visible.

#### 5) Shareable app allow-list

##### What is this?
Which `WorkspaceAppKey` values appear in grant UI and are valid in APIs this pass.

##### Why do we need this?
Avoid offering notes/tasks until opted in.

##### How to do this?
- Constant e.g. `SHAREABLE_WORKSPACE_APP_KEYS = ["money","baby"]` used by validators + UI + migration.
- **Other ways:** all `WORKSPACE_APP_KEYS` — out of idea Non-goals.
- **Best practices:** single source of truth next to schema keys.

## What exists today

Workspace + `workspace_member` (role only); per-app cookies/defaults; Settings create shared WS + Money default; **no** members API; list/active use membership only (`lib/workspace-list.ts`, `lib/workspace-context.ts`). Auth: Pocket ID → `session.user.id` = OIDC sub.

## Dependencies

- Money + Baby access helpers must adopt app-aware check.
- Investments/Loans stay on `money` app key (same grant).
- Migration must not lock out existing shared members.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `db/schema/workspace.ts` | Member + keys |
| `lib/workspace-context.ts` | Active resolve + assert |
| `lib/workspace-list.ts` | List filter |
| `lib/api-auth.ts` / `lib/api-money.ts` | Money access |
| `lib/graphql/baby-context.ts` | Baby membership |
| `components/workspace-settings.tsx` | UI surface |
| `app/api/workspace/*` | New member routes |
| `lib/bootstrap.ts` / `auth.ts` | Directory upsert on sign-in |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Per-app workspace cookie | `workspace-context.ts` | Do not invent second isolation model |
| Zod + `assertSameOriginStrict` | workspace API routes | New member endpoints |
| SettingsSection + Field/Checkbox | workspace-settings | Match 01b |
| Owner vs member role | `workspace_member.role` | Owner bypass for grants |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives (repo or known name) | Why Design should teach it |
|-----------------|-------------------------------------|----------------------------|
| Capability / grant check at boundary | extend assert helpers | Single enforcement gate |
| Directory for identity lookup | new small table | Email → sub without IdP admin API |

## Constraints and risks

- No email→sub map today — add directory or degrade to sub-only add.
- Miss one enforcement path → privacy leak.
- Cookie pointing at ungranted workspace must fail closed and clear/fallback.
- notes/tasks must not appear in grants this pass.

## Settled decisions (do not relitigate)

- Per-member app grants (Decision 2 Option 2)
- Not whole-workspace sharing; “swole” = typo for whole
- Money + Baby shareable; migrate existing → both
- Minimal add member in scope; no fancy invite product
- Has UI lean concept approved Gate A2

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Email lookup | Need add-by-email | No users table; only OIDC sub in DB | Keep — need `user_directory` upsert on sign-in |

## Blocking questions

None for Design — recommend email via `user_directory` (users must have signed in once). If Product prefers sub-only add, say so before Build.
