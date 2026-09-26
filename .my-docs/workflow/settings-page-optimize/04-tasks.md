# Tasks: settings-page-optimize

**TDD:** Red tests first per task. Prefer unit; e2e only if needed for hash/nav wiring.

## Task 1 — Visibility helper + tests (S)

**Acceptance:**
- Pure helper `resolveVisibleSettingsCategories` (name OK to adjust) in `components/settings/` (types or small util)
- Rules: not searching → single active concrete category; searching → matching list; unknown active falls back safely
- Exported for unit tests

**TDD (red first):**
- Unit: empty query + active `appearance` → only appearance
- Unit: query `token` → api-tokens (existing filter) as visible list
- Unit: active `all` while not searching → treat as default/first or last concrete (match Design: browse never leaves multi-pane)
- Unit: after search then clear, restore previous concrete category (e.g. workspaces) — not all sections

## Task 2 — Wire `SettingsPageLayout` (S)

**Acceptance:**
- Main column maps `visibleCategories` only (not always all matches)
- Category select updates hash; no reliance on siblings in DOM
- Clear search restores concrete category (not stuck on `all` with empty query)
- Hash on load still selects category

**TDD:**
- Source/contract test: layout uses visibility helper / does not always map full `matchingCategories` when not searching
- Keep existing `filterSettingsCategories` tests green
- Unit or source: hash id `api-tokens` (with idPrefix) resolves active category to api-tokens

## Task 3 — Skeleton parity (S)

**Acceptance:**
- `app/(shell)/settings/loading.tsx` shows sidebar + search + **one** section skeleton (Appearance-shaped)
- Check Money/Investments/Loans settings `loading.tsx` if they stack all categories — trim to one pane for parity

**TDD:**
- Source test or snapshot assertion on loading: not multiple section title skeletons for Account+Workspaces+API in App Settings loading (match repo style)

## Task 4 — Light UI verify / ui-refs note (S)

**Acceptance:**
- Manual or e2e smoke: `/settings` default short; switch category; search then clear
- After Build: replace concept `ui-refs/03-…` with real screenshot when auth available (before Gate C)

**TDD:**
- Optional Playwright: settings hash `#settings-appearance` shows Appearance heading and does not show Danger zone heading in main (skip if auth-blocked in CI — document)

## Task order

1 → 2 → 3 → 4
