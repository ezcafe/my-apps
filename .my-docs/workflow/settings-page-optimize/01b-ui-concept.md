# UI concept: settings-page-optimize

**Result:** done

## Primary surface

App Settings `/settings` — sidebar category nav + search + **one active category pane** (not all sections stacked).

## Align with Gate A (80/20)

| Item | From 01a / idea | How concept honors it |
|------|-----------------|------------------------|
| #1 always visible | Category nav + active category | Left sidebar (desktop) / chip row (mobile); Appearance selected |
| #2 always visible | Active category primary controls | Appearance: System / Light / Dark chips only |
| Secondary | Other categories, advanced, danger | Not rendered until selected; search for multi-match |
| Journey | Open → pick category → change → leave | Short main pane; no scroll through Workspaces/API |

## Chrome source of truth

| Element | Real labels / behavior |
|---------|------------------------|
| Categories | Appearance, Date format, Kiosk, Account, Workspaces, API tokens, Danger zone |
| Search placeholder | Search settings (e.g. appearance, tokens, workspaces)… |
| Appearance chips | System, Light, Dark |
| Tokens | Flat `SettingsSection`; quiet/teal; no Card wrap |

## Proposed delta (vs today)

| Today | Proposed |
|-------|----------|
| Sidebar select **scrolls** within a page that still mounts **all** sections | Sidebar select **filters** main pane to **one** category body |
| Scroll past Account → Workspaces → API tokens (see today dark shot) | Appearance visit shows only Appearance (+ search chrome) |
| Search already switches toward “all matches” | Keep: search → matching sections only; clear → single category |

## ui-refs

| File | Source | Notes |
|------|--------|-------|
| `ui-refs/01-today-settings-api-tokens-dark.png` | prior-ui-ref (screenshot) | From `baby-external-apis` — live `/settings` dark; Account + Workspaces + API tokens stacked (length problem) |
| `ui-refs/02-today-workspaces-light.png` | prior-ui-ref (concept draft of Workspaces block) | Heavy Workspaces content; keep in its own category pane |
| `ui-refs/03-proposed-single-pane-appearance-light.png` | concept-draft (HTML mock screenshot) | Sidebar + search + **Appearance only**; replace with real `/settings` screenshot after Build |

**Fidelity:** Proposed image uses exact category labels and Appearance copy from live components. Shell hamburger / page heading may differ until post-Build screenshot. Marked CONCEPT DRAFT banner on image.

## Replace-after-build

Capture signed-in `/settings#settings-appearance` (and optionally `#settings-api-tokens`) after single-pane lands; replace `03-…` before Gate C.

## Out of concept

- API mint/redeem behavior
- Baby / Money settings redesign beyond shared layout consumers
- New visual brand
