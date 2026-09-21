# Tasks: Per-member app grants on shared workspaces

## Task 1: Schema + migration + shareable keys

**Description:** Add `workspace_member_app` and `user_directory`; migrate existing shared members → money+baby grants; export `SHAREABLE_WORKSPACE_APP_KEYS`.

**Acceptance:**

- [ ] Tables + Drizzle schema match Design contracts (composite FK cascade)
- [ ] Migration backfills member grants; owners need no rows
- [ ] Check/validation rejects non-shareable app keys in app code
- [ ] Grant inserts use scalar binds / multi-row insert (no JS array `::text[]`)

**Tests (TDD — what turns red first):**

- [ ] Unit: shareable key helper accepts money/baby, rejects notes/tasks
- [ ] Migration/integration smoke: member of shared WS has money+baby rows after migrate (if test DB harness exists) or schema unit for insert shape

**Files likely touched:** `db/schema/workspace.ts`, `db/migrations/*`, maybe `lib/workspace-shareable-apps.ts`

**Scope:** M

**Dependencies:** none

---

## Task 2: user_directory upsert on sign-in

**Description:** On auth sign-in / bootstrap, upsert `user_sub` + normalized email from session.

**Acceptance:**

- [ ] Sign-in updates directory when email present
- [ ] Lookup by normalized email returns sub

**Tests (TDD — what turns red first):**

- [ ] Unit: normalize email helper
- [ ] Unit/integration: upsert then findByEmail

**Files likely touched:** `auth.ts` events / `lib/bootstrap.ts`, directory helper module

**Scope:** S

**Dependencies:** Task 1

---

## Task 3: assertWorkspaceAppAccess + list/active filter

**Description:** Implement app-aware access; filter `fetchWorkspacesForUser` / `getActiveWorkspaceId`; keep personal + owner behavior.

**Acceptance:**

- [ ] Member without grant cannot activate/list WS for that app
- [ ] Owner and personal still work for all apps they use
- [ ] Cookie to ungranted shared WS fails closed

**Tests (TDD — what turns red first):**

- [ ] Unit: access matrix (owner / member+grant / member-no-grant / personal)
- [ ] Unit: list filter for money vs baby

**Files likely touched:** `lib/workspace-context.ts`, `lib/workspace-list.ts`

**Scope:** M

**Dependencies:** Task 1

---

## Task 4: Wire Money + Baby + active enforcement

**Description:** `verifyMoneyWorkspaceAccess` / Baby membership verify / `POST /api/workspace/active` use app-aware assert (`money` / `baby` / request `app`).

**Acceptance:**

- [ ] Money/Loans/Investments require money grant
- [ ] Baby GraphQL/API require baby grant
- [ ] Setting active workspace for an app requires grant (403 otherwise)
- [ ] Existing authorized paths still pass with grants

**Tests (TDD — what turns red first):**

- [ ] Unit/mock: verifyMoneyWorkspaceAccess false without grant
- [ ] Baby context: membershipVerified false without baby grant
- [ ] Active route/service: forbidden when member lacks app grant

**Files likely touched:** `lib/api-auth.ts`, `lib/graphql/baby-context.ts`, `app/api/workspace/active/route.ts`, related helpers

**Scope:** M

**Dependencies:** Task 3

---

## Task 5: Members API (list/add/patch/remove)

**Description:** Owner-only REST routes per Design contracts (`GET`/`POST`/`PATCH` members + `POST …/members/remove`); Zod; rate-limit; same-origin; errors `{ error, code }`.

**Acceptance:**

- [ ] Operations match contracts
- [ ] Unknown email → 404; duplicate → 409; non-owner → 403
- [ ] Apps min 1, shareable only

**Tests (TDD — what turns red first):**

- [ ] Validator unit tests
- [ ] Route/handler tests for happy + error cases (or service-layer tests)

**Files likely touched:** `app/api/workspace/members/route.ts`, `app/api/workspace/members/remove/route.ts`, `lib/validators/workspace.ts`, services

**Scope:** M

**Dependencies:** Task 2, Task 3

---

## Task 6: Settings UI members + grants + remove + skeleton

**Description:** Extend `workspace-settings.tsx` per `01b`; wire APIs including secondary Remove; skeleton parity; toasts.

**Acceptance:**

- [ ] Owner sees members, toggles apps, adds by email
- [ ] Secondary Remove calls remove API
- [ ] Light/dark tokens; mobile stack OK
- [ ] Loading skeleton matches layout

**Tests (TDD — what turns red first):**

- [ ] Component/unit where practical (grant toggle payload)
- [ ] E2E (Task 7) covers UI path when auth available

**Files likely touched:** `components/workspace-settings.tsx`, settings loading/skeleton if any

**Scope:** M

**Dependencies:** Task 5

---

## Task 7: E2E — add member, grant split, access block

**Description:** Playwright: owner adds member with Money only; member sees Money WS, not Baby (or API assert). Skip cleanly if no `E2E_STORAGE_STATE` / second user — document blocked.

**Acceptance:**

- [ ] Spec exists; passes with dual auth fixtures when present
- [ ] Or marked blocked with clear reason + unit coverage of enforcement

**Tests (TDD — what turns red first):**

- [ ] E2E failing until UI+API wired (or unit matrix if e2e blocked)

**Files likely touched:** `e2e/*.spec.ts`, helpers

**Scope:** M

**Dependencies:** Task 4, Task 6

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused tests pass
- [ ] Slice works end-to-end where applicable
