# Light repo skim: per-app-workspace-share

**Result:** done
**Updated:** 2026-09-21
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js shell with per-app workspace cookies; membership is workspace-wide in `workspace_member` with no app grants column. Settings Workspaces UI creates shared workspaces and sets Money default; no member-management UI or invite API exists yet.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/workspace-settings.tsx` | List WS, create shared, Money default | **Extend** — members + grants surface |
| `components/settings/*` | Settings section chrome | Reuse `SettingsSection`, Field, Checkbox, Button |
| `docs/DESIGN_GUIDE.md` / `app/globals.css` | Tokens, radii, motion | Mandatory |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `db/schema/workspace.ts` | `workspace`, `workspace_member` (role only), `user_workspace_default`, `WORKSPACE_APP_KEYS` |
| `app/api/workspace/*` | create, list, default, active, currency, timezone, reset — **no members route** |
| `lib/workspace-context.ts` | `assertWorkspaceMember` / active resolve — membership only, no app filter |
| `lib/features/registry.ts` | Feature nav ↔ `workspaceAppKey` |

## Hard constraints (do not fight)

1. Membership + cookies already per architecture in `docs/ARCHITECTURE.md` — extend, don’t fork a second workspace model.
2. UI must use semantic tokens / `components/ui/*` (clean-minimal); skeleton parity on layout change.
3. Server must enforce grants on list/active/feature APIs — Settings UI alone is insufficient.
4. No add-member API today — this pass must add one (minimal identifier via existing auth user identity).

## Risks if we ignore the repo

- Grants in UI but `assertWorkspaceMember` still allows all apps → privacy leak.
- Extending only Money settings copy while Baby list/resolve stays unfiltered.
- Inventing invite-email product instead of reusing how `user_sub` is stored elsewhere.

## Enough for UI concept / Analyze?

yes — primary surface is Workspaces settings members+grants; Analyze must lock identifier + schema for grants.
