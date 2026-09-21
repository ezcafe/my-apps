# Idea: Per-member app grants on shared workspaces

## Project shape (quick scan)

Shell + feature apps (Money, Baby, etc.) share one workspace table and **workspace-wide** membership. Cookies and defaults are already per `WorkspaceAppKey`. Settings can create a shared workspace and pick defaults; there is **no add/invite member UI** today, and access is not limited by app.

## Problem

Inviting someone to a shared workspace today (when membership exists) means they can use that workspace for **every** product app once they select it. Owners also lack a simple Settings path to **add a member** and then give a partner Money + Baby while giving an accountant Money only — without opening the **whole** workspace to every app.

## User / audience

- **Owners** of shared workspaces (couples, family, household money + baby care)
- **Members** who should only see the apps they were granted
- Secondary: anyone adding a future shareable feature who must not inherit “whole workspace = all apps”

## Outcome

1. Owner can **add a member** to a shared workspace from Workspaces settings (minimal: identify user by the account identifier this app already uses — e.g. email or user id — no fancy invite-email product).
2. On that same shared workspace, the owner sets **which apps each member may use** (Money, Baby this pass).
3. A member without a grant for an app cannot activate that workspace for that app (list, cookie, API, GraphQL). Owners keep full access. Personal workspaces stay personal.

Locked product choice: **per-member app grants** (not “one workspace = one app only”).

## Metric

Owner adds a member with a non-empty app subset; that member reaches granted apps and is blocked (UI + API) on ungranted apps for that workspace — proven by unit + e2e.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — one primary surface: shared workspace **members + app grants** in Workspaces settings
- **Copy/token-only?** no

## 80/20 UI (day-to-day)

### Main user goals

- Add a person to a shared workspace
- Give each person only the apps they need (not the whole workspace)
- See at a glance who can use Money vs Baby

### Vital few (high-impact ~20%)

- **Add member** to a shared workspace (minimal identifier)
- Edit that member’s **app grants** (Money, Baby)
- Enforce grants on access (not labels-only)
- Clear empty / blocked states when a workspace is not granted for the current app

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Member list + **apps each person can use** (Money, Baby)
- **Important info / action #2 (always visible):** **Add member** (identifier + grant checkboxes) and Save / confirm
- **Core action placement:** Workspaces settings → shared workspace members surface; labels like “Apps this person can use”
- **Secondary actions:** Remove member, role display, owner “All apps” read-only row, advanced copy — expand / modal / quieter areas

### Top user journey to optimize

Open Settings → Workspaces → pick shared workspace → **Add member** (identifier + apps) → save → member opens a **granted** app and uses the workspace; an **ungranted** app does not list / activate that workspace

### Sensible defaults

- New member: require **at least one** app; no silent “all apps”
- Owner: full access (show read-only “All apps” so the rule is obvious)
- **Migration:** existing `workspace_member` rows get grants for **all shareable apps in this pass (Money + Baby)** so nothing breaks; owners tighten later
- notes / tasks: **not** shareable this pass (out of grant UI)

### Biggest usability risks to fix first

- Dead-end grants UI with no way to add members
- Thinking “shared” still means whole workspace (all apps)
- Member sees a workspace in the wrong app’s picker
- Grant change with no feedback / silent API forbid

## Non-goals

- Building a Swole/fitness app (typo was “whole”)
- Fancy invite-by-email product (magic links, pending invites queue, resend) — only minimal add-by-existing-account identifier
- Per-workspace “apps scoped forever” without per-member variance (rejected Decision 2 Option 1)
- Labels-only / seed-only UX without enforcement (rejected Decision 2 Option 3)
- Changing personal workspace behavior
- Fine-grained permissions inside an app (e.g. read-only Money categories)
- Sharing **notes** or **tasks** this pass
- Zero-app membership (grants must be non-empty)

## Assumptions to attack

- Membership stays one row per user/workspace; grants are an allow-list of apps on that membership
- Owners always have all shareable apps on workspaces they own
- Enforcement must hit list + active/default + feature APIs, not only Settings UI
- Shareable apps this pass: **Money + Baby** only; registry grows later
- Existing members migrate to Money + Baby grants (then owners can remove)

## Success criteria

- [ ] Owner can add a member to a shared workspace from Settings
- [ ] Owner can set/update per-member app grants (Money, Baby)
- [ ] Member cannot use an ungranted app with that workspace (UI + server)
- [ ] Same workspace can grant Money to A and Money+Baby to B
- [ ] Personal workspaces unchanged
- [ ] Existing members keep working after migration (Money + Baby grants)
- [ ] Automated tests cover grant check + e2e: add member → grants → access / block
- [ ] Settings UI matches clean-minimal shell; skeleton parity if layout changes

## Open questions

1. Exact **identifier** for add member (email vs user id) — pick what auth/users table already supports in Analyze
2. Should remove-member live in the same surface this pass? (lean yes if cheap)

## Blocking questions

None for Gate A re-check.
