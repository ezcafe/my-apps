# Tasks: drawer-nav-assessment

**TDD:** Red tests first per task. Prefer unit; e2e for hamburger structure when cheap.

## Task 1 — Grouping contract tests (S)

**Acceptance:**
- Unit tests assert `appSectionItemsByGroup` for baby (and one money case) yields non-empty groups in `APP_NAV_GROUP_ORDER` with expected hrefs per group
- Assert `APP_NAV_GROUP_LABELS` keys cover all `AppNavGroup` values

**TDD (red first):**
- Unit: baby groups = browse[Home], review[Insights,Activities], capture[feed…growth], configure[Settings]
- Unit: money with optional tabs hidden still groups remaining items without empty groups
- Unit: empty groups omitted (filter yields only groups with ≥1 item)

## Task 2 — Render groups + Other apps in `MoneyAppMenu` (M)

**Acceptance:**
- `AppSectionNavPanel` (or equivalent) renders `MenuSectionLabel` per non-empty group using `APP_NAV_GROUP_LABELS`
- Current-app panel does **not** also show the app title heading when groups are labeled (`showAppHeading` false / equivalent) — avoids double headers
- `OtherAppsJumpLinks` shows label **Other apps**
- Link labels/hrefs unchanged; `deferMenuClose` / Kiosk hard-nav unchanged
- Visual structure matches approved `ui-refs/_proposed-drawer-baby.html` (group order + Other apps + footer)

**TDD:**
- Source/contract test: `money-section-tabs.tsx` imports/uses `appSectionItemsByGroup` and `APP_NAV_GROUP_LABELS` (or string “Other apps”)
- Source/contract: current-app panel keeps `showAppHeading={false}` (or no app heading) when grouped
- Existing `lib/app-section-nav.test.ts` stays green

## Task 3 — DESIGN_GUIDE long-nav update (S)

**Acceptance:**
- Navigation assessment table no longer forbids intermediate group labels
- Item order / clean hierarchy prose matches browse → review → capture → configure and labeled groups
- Context-first + navigation budget + search-not-nav rules kept

**TDD:**
- Optional source assert DESIGN_GUIDE mentions group labels / `APP_NAV_GROUP` — or manual checklist in Task 4

## Task 4 — E2E / smoke structure (S)

**Acceptance:**
- Existing baby hamburger e2e still reach Home / Log feed / Activities
- Add one assert (or extend helper): open menu on `/baby` shows text Browse (or Review) and Other apps in the open panel
- Light/dark manual spot-check drawer once

**TDD:**
- Playwright: after `openAppMenu`, panel contains `/Other apps/i` and a group label; skip/document if auth-blocked
- Keep existing link-name asserts (`Log feed`, Activities, Home) green — group labels must not change accessible link names

## Task order

1 → 2 → 3 → 4
