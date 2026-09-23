# Tasks: Multi-app personal API tokens (Money + Baby)

## Task 1: Schema — `api_token.apps` + backfill

**Description:** Add `apps` jsonb on `api_token`. Backfill `money`/`baby` rows from `app_key`. Drizzle schema + migration. Read helper: `tokenApps(row) => apps ?? [appKey]` (shareable only).

**Acceptance:**

- [ ] Migration applies cleanly
- [ ] Existing money tokens resolve grants `["money"]`
- [ ] sav/inv rows unchanged in behavior

**Tests (TDD — what turns red first):**

- [ ] Unit: `tokenApps` backfill/legacy cases

**Files likely touched:** `db/schema/api-token.ts`, `drizzle/*` migration, helper in `lib/api-auth.ts` or `lib/api-token-grants.ts`

**Scope:** M

**Dependencies:** none

---

## Task 2: Create/list/PATCH API + validators

**Description:** POST `/api/tokens` accepts `apps: ("money"|"baby")[]` (min 1) via `parseShareableWorkspaceAppKeys`. Assert membership for **each** app. Persist `apps` + set `app_key` for prefix (`money` if included else `baby`). List returns `apps`. Optional PATCH grants. Fix hardcoded money-only assert.

**Acceptance:**

- [ ] Create with `[baby]` requires baby membership
- [ ] Create with `[money,baby]` requires both
- [ ] Legacy `appKey: "money"` still works → apps `["money"]`
- [ ] Invalid/empty apps → 400

**Tests (TDD — what turns red first):**

- [ ] Validator unit tests
- [ ] Service create membership per app (mock/assert)

**Files likely touched:** `lib/validators/api-token.ts`, `lib/api-token-service.ts`, `app/api/tokens/**`

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: GraphQL gates — Money + Baby

**Description:** Bearer bind: Money GQL if grant has money; Baby GQL if grant has baby (`resolveBabyWorkspaceId` no longer nulls all api_key). Reject missing grant. Write scope unchanged. Investment still rejects non-allowed keys (baby-only `mny_` with only baby grant must not open investment).

**Acceptance:**

- [ ] Token apps `[baby]` → Baby query OK; Money GQL FORBIDDEN
- [ ] Token apps `[money,baby]` → both OK
- [ ] Token apps `[money]` → Baby FORBIDDEN
- [ ] Session Baby/Money unchanged

**Tests (TDD — what turns red first):**

- [ ] Unit resolveMoney/BabyWorkspaceId grant matrix
- [ ] Yoga/context tests for Baby Bearer

**Files likely touched:** `lib/api-auth.ts`, `lib/graphql/baby-context.ts`, `lib/graphql/context.ts`, `lib/api-baby.ts`, tests

**Scope:** M

**Dependencies:** Task 1

---

## Task 4: Settings UI — app toggles

**Description:** Replace App select with Money/Baby checkboxes (labels from members panel). Wire create payload `apps`. Show grants on list. Update blurb. Skeleton parity if row layout changes.

**Acceptance:**

- [ ] Can create Baby-only, Money-only, or both
- [ ] Create disabled without ≥1 app + workspace
- [ ] Matches Gate A2 chrome otherwise

**Tests (TDD — what turns red first):**

- [ ] Component/unit for apps payload builder if extracted; else e2e later optional

**Files likely touched:** `components/api-token-settings.tsx`, skeleton if any

**Scope:** M

**Dependencies:** Task 2

---

## Task 5: Docs / Help

**Description:** Update `docs/BABY_API.md`, `docs/API.md`, `lib/api-help-content.ts` — one token, app toggles, Bearer examples (no `bby_`).

**Acceptance:**

- [ ] Docs match Option 2
- [ ] Session-only / separate Baby token language removed

**Tests:** content assert if pattern exists

**Scope:** S

**Dependencies:** Decision 4 prefix string

---

## Checkpoints

After 1–3: unit auth matrix green; curl Money+Baby with one secret.  
After 4–5: Settings toggles + docs match.
