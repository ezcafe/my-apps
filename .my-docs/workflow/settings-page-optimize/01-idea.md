# Idea: Shorten App Settings (`/settings`)

## Problem

App Settings at `/settings` feels too long for daily use. The page already has a category sidebar and search, but the main column still mounts **every** section (Appearance, Date format, Kiosk, Account, Workspaces, API tokens / Device pairing, Danger zone). Sidebar clicks mostly **scroll** within one long page. Heavy sections (workspaces, device pairing + token list) add more length. Users scroll past rare controls to find the few they need.

## User / audience

Signed-in workspace owners who open shell Settings for theme, date format, kiosk, account, workspaces, API / device pairing, or danger-zone reset — often a quick change, not a full audit.

## Outcome

- Opening `/settings` shows a **short, focused** main pane for the active category (not a wall of all sections).
- Category nav + search still work; search can show matching sections only.
- Deep / rare controls use progressive disclosure (details, secondary steps) so frequent jobs stay short.
- Clean-minimal DESIGN_GUIDE look stays (tokens, flat `SettingsSection`, no invented chrome).
- Deep links / hashes (`#settings-appearance`, etc.) still land on the right category.

## Metric

With a normal viewport, the default Settings view needs little or no scroll to complete the most common jobs (theme / date / find a section via nav or search). “Show all sections at once” is not the default browsing mode.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** no — layout behavior change on a real multi-category page; Gate A2 needs real Settings chrome (screenshot preferred).
- **Copy/token-only?** no

## Project shape (scan)

Next.js shell app (`my-apps`) with clean-minimal Settings. `/settings` uses `SettingsClientLayout` → `SettingsPageLayout` + `SETTINGS_CATEGORIES`. Layout already has sidebar + search; empty search returns **all** categories and renders each section in one scroll column.

## 80/20 UI (day-to-day)

### Main user goals

1. Change theme or date format quickly.
2. Jump to one settings area (nav or search) without scrolling through unrelated blocks.
3. Pair a device / manage API tokens when needed.
4. Manage workspaces or open danger zone rarely, without those UIs dominating every visit.

### Vital few (high-impact ~20%)

- One active category in the main pane (sidebar = filter, not scroll-only).
- Search that lists only matching sections.
- Keep Appearance / Date format (and similar light panels) short and scannable.
- Keep Device pairing + token list usable without stacking every other category below them.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Category list (sidebar / mobile equivalent) + which category is active.
- **Important info / action #2 (always visible):** Active category’s primary controls (e.g. theme radios; date format; pairing generate when on API tokens).
- **Core action placement:** Select category → see only that content; search → matching sections only; clear labels; immediate save/feedback as today.
- **Secondary actions:** Account subject / advanced identity; long help copy; full workspace member matrices if still long; danger-zone confirmations; “show all” only if we keep an explicit search or rare mode — not default.

### Top user journey to optimize

Open Settings → (optional search) → pick category → change one control → leave. No long scroll past Kiosk/Workspaces/Danger to reach Appearance.

### Sensible defaults

- Default category: Appearance (or last hash / last visited if already supported).
- Default view: **single category**, not all sections stacked.
- Search clears back to single-category mode.

### Biggest usability risks to fix first

1. Sidebar implies focus but content still shows everything (false progressive disclosure).
2. Heavy sections make the “all stacked” page feel endless.
3. Breaking hash deep links or search when switching to single-pane.

## Non-goals

- Baby Settings (`/baby/settings`), Money/Investments/Loans settings redesign (reuse shared layout only if cheap).
- New Settings IA product (extra apps, billing, etc.).
- API/auth/token behavior changes (mint/redeem/revoke stay; layout/disclosure only unless a tiny copy tweak).
- Mobile-native Settings app; Watch UI.
- Inventing a new visual brand (stay quiet/teal).

## Assumptions to attack

- Is “scroll to section while keeping all mounted” intentional for SEO/print, or leftover?
- Do users ever need side-by-side compare of two categories? (Assume no for day-to-day.)
- Should Money settings that reuse `SettingsPageLayout` get the same single-pane fix in this pass?

## Success criteria

- [ ] Default `/settings` does not render all category bodies at once.
- [ ] Selecting a sidebar category shows that category only (search exception clear).
- [ ] Hash URLs open the correct category.
- [ ] Search still finds categories by label/keywords.
- [ ] Skeletons / loading stay in parity if layout chrome changes.
- [ ] Light and dark still look correct.

## Open questions

- Apply the same single-pane behavior to Money / Investments / Loans settings that share `SettingsPageLayout` in this run, or App Settings only first?
- Within API tokens / Workspaces, how aggressive should in-section collapse be vs layout-only fix?

## Blocking questions

None — Gate A can review with Open questions left for Design.
