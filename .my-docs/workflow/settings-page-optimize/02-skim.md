# Light repo skim: settings-page-optimize

**Result:** done

## Project shape

Next.js shell (`my-apps`) clean-minimal Settings. `/settings` composes section content into `SettingsClientLayout` → shared `SettingsPageLayout` (sidebar + search + section map). Same layout pattern is reused by Money / Investments / Loans settings.

## Related UI (paths)

| Path | Role |
|------|------|
| `app/(shell)/settings/page.tsx` | App Settings route; wires section bodies |
| `app/(shell)/settings/loading.tsx` | Settings skeleton |
| `components/settings/settings-client-layout.tsx` | Maps category → content slots |
| `components/settings/settings-page-layout.tsx` | Sidebar + search; **renders all matching sections** |
| `components/settings/settings-sidebar.tsx` | Category nav (scroll/select) |
| `components/settings/settings-types.ts` | `SETTINGS_CATEGORIES` + filter helper |
| `components/settings/settings-section.tsx` | Flat section chrome |
| `components/watch-pairing-settings.tsx` | Device pairing block (API tokens) |
| `components/api-token-settings.tsx` | Token list / revoke |
| `components/workspace-settings.tsx` | Workspaces (heavy) |
| Money/Investments/Loans `*/settings/*` | Consumers of same layout |

## Related APIs / data

| Path | Role |
|------|------|
| Session + prefs / tokens loaders in `page.tsx` | Server data for sections (no new API expected) |
| Watch pair / API token routes | Unchanged behavior this run (layout only) |

## Hard constraints

- DESIGN_GUIDE: flat `SettingsSection`, quiet/teal tokens, skeleton parity, no Card-around-settings.
- Hash deep links (`#settings-<id>`) must still open the right category.
- Search keywords live on `SETTINGS_CATEGORIES`.
- Prefer fix in shared `SettingsPageLayout` so other settings pages stay consistent (confirm in Design).

## Risks if ignored

- Keep stacking all sections → “too long” remains.
- Break hash/search → support links and bookmarks fail.
- Change only App Settings copy of layout → Money settings drift.

## Enough for UI concept / Analyze?

yes — primary surface is `/settings` with real chrome; concept should show single-pane vs today’s stacked scroll.
