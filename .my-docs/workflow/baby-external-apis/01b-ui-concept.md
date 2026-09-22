# UI concept (UI/UX designer): baby-external-apis

**Result:** pending — waiting for real Settings screenshot
**Updated:** 2026-09-22
**Has UI:** yes

## Sources followed

| Source | Applied? | Notes |
|--------|----------|-------|
| Project `docs/DESIGN_GUIDE.md` / AGENTS.md UI rules | yes | Reuse Settings chrome; no new surface |
| `clean-minimal-ui` skill | yes | Existing tokens section tokens |
| `frontend-ui-engineering` skill | yes | Same forms/fields as today |
| Existing UI patterns in repo (list paths) | yes | `components/api-token-settings.tsx`, `app/(shell)/settings/page.tsx` |

## Concept depth

**lean** — small UI tweak: 1 primary surface + ≥1 image is enough.

## Align with Gate A (80/20)

| Item | From 01a / idea | How concept honors it |
|------|-----------------|------------------------|
| Important info/action #1 | Create token (Baby + workspace + scopes) | Same create form; App select gains **Baby** |
| Important info/action #2 | Token list + revoke | Unchanged list/revoke |
| Secondary (expand / modal / menu) | Help / tutorial link | Existing Help link in section description |
| Top user journey | Settings → API tokens → Baby → create → copy | Same page; only App options expand |
| Sensible defaults | Baby workspaces when Baby selected | Workspace fetch already keyed by `app` |

## Screen / surface map

| Surface | Purpose | Primary actions |
|---------|---------|-----------------|
| Settings → API tokens | Create/list/revoke personal tokens | Create; copy secret once; revoke |

## UI reference images (required for Gate A2; confirm at Gate B without re-show)

**Fidelity rule:** images must look **exactly like the real app**. Prefer screenshots of the running UI.

| Surface | Variant (light / dark / mobile) | File path | Source (screenshot / prior-ui-ref / concept-draft) | Shown at Gate A2? | Confirmed at Gate B? (text ok) |
|---------|---------------------------------|-----------|-----------------------------------------------------|-------------------|-------------------------------|
| Settings → API tokens | light | `.my-docs/workflow/baby-external-apis/ui-refs/01-settings-api-tokens-light.png` | **pending screenshot** | yes | |

**Blocker:** `localhost:3000` was not serving; no auth storage state found. Do **not** invent a mock with GenerateImage for this existing surface.

**Capture plan:** With app running and signed in, screenshot `#settings-api-tokens` on `/settings` (light). After Build, re-capture with Baby visible in the App select.

## Layout concept (plain words)

- **Hierarchy / eye flow:** Section title “API tokens” → create form (App, Name, Workspace, scopes) → token list.
- **Core vs secondary:** Create + list/revoke dominant; Help link secondary.
- **Only visual change for this feature:** App dropdown includes **Baby** (and keeps Money). No new page.

| Component / pattern | Where it already lives | Use for |
|---------------------|------------------------|---------|
| `ApiTokenSettings` | `components/api-token-settings.tsx` | Whole surface |
| `SettingsSection` | `components/settings/settings-section.tsx` | Section chrome |
| `Select` / `Field` / `Button` | `components/ui/*` | Form controls |

## States

| State | Behavior |
|-------|----------|
| Loading | Existing create/list loading |
| Empty | “No API tokens yet.” (existing) |
| Error | Existing notify / alerts |
| Success | Copy-secret modal (existing) |

## Notes

- External-app callers have **no** product UI in this pass — only Settings for caregivers creating tokens.
- Docs/Help text updates are copy alongside this surface (not a new UI screen).
