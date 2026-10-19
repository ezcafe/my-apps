# Tasks: Remove kiosk (full teardown)

**Automated tests planned:** yes (unit + e2e cleanup + prefs/redirect coverage) — parent should run 04a.

## Task 1: Retire prefs API (kiosk/weather-only resource)

**Description:** `/api/user/preferences` today only serves kiosk/weather (`SerializedUserPreferences` + six DB columns). Delete GET/PATCH route, validators, and `user-preferences-service` (and their tests). Do **not** leave an empty `{}` bag or claim theme/account live here — theme is client `ThemeSettings`.

**Acceptance:**

- [ ] `app/api/user/preferences/route.ts` gone → GET/PATCH **404**
- [ ] Validators + service + kiosk/weather type imports removed (no `lib/kiosk` / weather layout types left via prefs)
- [ ] No production code still calls prefs GET/PATCH for theme/account
- [ ] **Security:** no authenticated prefs mutate surface left (404, not silent strip)

**Tests (TDD — what turns red first):**

- [ ] Unit: delete or rewrite `lib/validators/user-preferences.test.ts` / `lib/user-preferences-service.test.ts` — suite must not expect a live prefs bag
- [ ] Unit: `it("user preferences route file is removed")` — `existsSync` false for `app/api/user/preferences/route.ts` (no empty-bag stub)

**Files likely touched:** `app/api/user/preferences/route.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, matching `*.test.ts`, any Settings callers of prefs for kiosk/weather only

**Scope:** M

**Dependencies:** none

---

## Task 2: Delete city-search + weather packages

**Description:** Remove geocode API and kiosk-only weather UI/lib once prefs no longer need them.

**Acceptance:**

- [ ] `app/api/user/preferences/city-search` gone (404)
- [ ] `components/weather/*` and `lib/weather/*` deleted (or empty dirs gone)
- [ ] No remaining imports of weather packages from Settings/prefs
- [ ] **Security:** no outbound geocode path left for prefs

**Tests (TDD — what turns red first):**

- [ ] Remove or rewrite any unit tests that imported weather/city-search; suite must not reference deleted modules
- [ ] Grep/CI: no production import of `@/lib/weather` or city-search from remaining app code
- [ ] Unit: `it("preferences city-search route is removed")` — city-search route path absent on disk

**Files likely touched:** `app/api/user/preferences/city-search/**`, `components/weather/**`, `lib/weather/**`, related tests

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: Migration DROP TABLE + remove Drizzle schema

**Description:** Live `user_preferences` is PK + six kiosk/weather columns only. Forward migration `DROP TABLE user_preferences`; remove `db/schema/user-preferences.ts` (and exports); update `_journal.json`. Do not rewrite old `0036`/`0048`. No “keep other columns” / no PK-only leftover.

**Acceptance:**

- [ ] New migration `DROP TABLE` (not six `DROP COLUMN` leaving empty table)
- [ ] Drizzle schema file/exports for `userPreferences` gone; no kiosk type imports remain
- [ ] Journal/meta updated; layout data loss accepted (no export)
- [ ] Service/route already gone (Task 1) — no SELECT/INSERT on dropped table
- [ ] **Security / schema:** destructive drop documented; deploy with API cut

**Tests (TDD — what turns red first):**

- [ ] Typecheck/build fails until schema imports removed (drive from Task 1 delete)
- [ ] No automated DB integration required if repo has none — migration reviewed in design-review DB lens

**Files likely touched:** `db/migrations/00xx_*.sql`, `db/migrations/meta/_journal.json`, `db/schema/user-preferences.ts`, schema barrel exports if any

**Scope:** M

**Dependencies:** Task 1

---

## Task 4: Settings UI strip (before deleting kiosk components)

**Description:** Remove Settings kiosk category, widget settings, weather city block, and props/defaults. Leave remaining Settings hierarchy clear (Gate A #2).

**Acceptance:**

- [ ] **UI lock:** No `settings-kiosk` section, no “Kiosk” heading, no widget/layout/weather controls
- [ ] **UI lock #2:** Theme/account/other sections still visible and usable (theme via client ThemeSettings — not retired prefs API)
- [ ] Settings page compiles with zero imports from `components/kiosk` / weather / prefs service for kiosk
- [ ] settings-types / keyword search tests updated (no kiosk category)
- [ ] **Mobile:** Settings still scannable on narrow viewports; no empty category gap that looks broken
- [ ] Skeleton/loading parity: any Settings skeleton that mirrored kiosk block updated in same change

**Tests (TDD — what turns red first):**

- [ ] Unit: `it("settings has no kiosk category")` — no `id === "kiosk"`; `filterSettingsCategories("weather"|"widgets", …)` does not return kiosk; appearance/theme still present

**Files likely touched:** `app/(shell)/settings/page.tsx`, `components/settings/settings-types.ts`, settings tests, related skeletons if any

**Scope:** M

**Dependencies:** Task 1 (safe to parallelize with Task 2 after Task 1)

---

## Task 5: Shell nav, redirects, delete kiosk routes/modules

**Description:** Remove kiosk from registry/crumbs/chrome-path; add permanent redirects; delete `app/(shell)/kiosk/**`, `components/kiosk/**`, `lib/kiosk/**`; purge `.kiosk-*` CSS; clean `auth.ts` kiosk note. Keep Popover/MoreMenu.

**Acceptance:**

- [ ] **UI lock #1:** Shell nav has no Kiosk; remaining items (Money first useful) show correct active states
- [ ] **UI lock:** `/kiosk` and `/kiosk/weather` permanently redirect to `/money` (not `/money/new`, not bare 404)
- [ ] No reachable kiosk edit strips / widget menus
- [ ] `components/ui/popover*`, `more-menu` remain and still tested
- [ ] `globals.css` has no `.kiosk-*` rules; auth matcher comment cleaned
- [ ] **Mobile / a11y:** Shell nav usable on phone without dead item

**Tests (TDD — what turns red first):**

- [ ] Unit: registry / chrome-path / core-app-header tests — no kiosk entries
- [ ] Unit: `it("permanently redirects /kiosk to /money")` — `next.config.ts` has `/kiosk` and `/kiosk/:path*` → `/money` with `permanent: true`; not `/money/new` (reuse baby redirect test pattern)
- [ ] Unit: `it("chrome path ignores retired /kiosk")` — rewrite money-tabs-chrome-path asserts so `/kiosk` is not a special hide-chrome product path
- [ ] Delete `e2e/kiosk-*.spec.ts` and all `components/kiosk` / `lib/kiosk` unit tests with the modules

**Files likely touched:** `lib/features/registry.ts`, `lib/core-app-header.ts`, `next.config.ts`, `auth.ts`, `app/globals.css`, `app/(shell)/kiosk/**`, `components/kiosk/**`, `lib/kiosk/**`, e2e + unit tests

**Scope:** M

**Dependencies:** Task 4 (Settings must not import kiosk before delete)

---

## Task 6: Docs, ADRs, glossary, DESIGN_GUIDE

**Description:** Align docs with teardown: ADR-006 Accepted; 003–005 Superseded; remove DESIGN_GUIDE kiosk glance section; ARCHITECTURE examples without Kiosk as live core and without `user_preferences` table row; glossary already purged — verify.

**Acceptance:**

- [ ] ADR-006 present and points supersession; 003–005 status Superseded
- [ ] DESIGN_GUIDE has no live kiosk glance product rules
- [ ] ARCHITECTURE / GLOSSARY do not describe shipping kiosk; `user_preferences` removed/updated in table list
- [ ] No “build kiosk widgets” guidance left as current

**Tests (TDD — what turns red first):**

- [ ] N/A automated — doc review checklist; optional link/grep in Verify

**Files likely touched:** `docs/decisions/ADR-003*.md` … `ADR-006*.md`, `docs/DESIGN_GUIDE.md`, `docs/ARCHITECTURE.md`, `GLOSSARY.md`

**Scope:** S

**Dependencies:** Task 5 (or parallel after redirects decided — content already settled)

---

## Task 7: Verify remaining suites + smoke path

**Description:** Run build/unit/e2e; fix collateral breaks (settings keywords, telegram mocks, scripts listing kiosk tests). Confirm Money/Baby untouched.

**Acceptance:**

- [ ] `npm run build` green
- [ ] `npm test` green (no kiosk/prefs-bag test files left failing)
- [ ] `npm run test:e2e` green without kiosk specs
- [ ] Manual: nav → Money; Settings save theme (client ThemeSettings); `/kiosk` → `/money`; prefs URL 404
- [ ] **Security:** no live prefs mutate path (retired route 404)

**Tests (TDD — what turns red first):**

- [ ] Fix any red collateral unit/e2e discovered in Verify (not new product tests)

**Files likely touched:** `scripts/run-unit-tests.mjs` (if lists kiosk), collateral test fixes

**Scope:** M

**Dependencies:** Tasks 1–6

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused tests pass
- [ ] Settings loads without kiosk imports
- [ ] Slice works end-to-end where applicable (Settings → nav/redirect; prefs gone)
