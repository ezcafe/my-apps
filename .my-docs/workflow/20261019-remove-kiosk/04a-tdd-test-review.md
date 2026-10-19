# TDD test-case review: 20261019-remove-kiosk

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-10-19

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Delete/rewrite prefs validator + service tests — no live bag | yes — planned |
| 1 | real | Retired prefs GET/PATCH → 404 (route gone) | **partial** — “optional”; no named positive assert |
| 2 | real | Remove weather/city-search unit imports; no leftover `@/lib/weather` | yes — planned (delete + grep) |
| 2 | real | City-search route retired (404 / file gone) | **no** — acceptance only |
| 3 | edge | Migration DROP TABLE; typecheck until schema imports gone | yes — process/typecheck OK |
| 4 | real | Settings categories/keywords — strip kiosk | **partial** — “update tests”; no named absence reds |
| 5 | real | Registry / chrome-path — no kiosk entries | **partial** — planned rewrite; chrome `/kiosk` asserts not named |
| 5 | real | Permanent `/kiosk` (+ `:path*`) → `/money` (not `/money/new`) | **no** — soft “if redirect tests / else manual” |
| 5 | real | Delete `e2e/kiosk-*.spec.ts` + `components/kiosk` / `lib/kiosk` units | yes — planned |
| 5 | real | Keep Popover/MoreMenu tests | yes — leave existing |
| 6 | — | Docs/ADR checklist | N/A automated |
| 7 | real | Build/unit/e2e green; collateral (scripts, telegram, cold-path) | yes — Verify |

**Existing harness skim:** `lib/baby-growth-redirects.test.ts` (read `next.config.ts` for permanent redirects — reuse for kiosk). `lib/features/registry.kiosk.test.ts` (expects kiosk nav). `lib/money-tabs-chrome-path.test.ts` (`/kiosk` hides chrome). `components/settings/settings.test.ts` (`weather → kiosk`). Prefs `*.test.ts` expect live bag. No `app/api/**/*.test.ts`; other suites use `existsSync`/`readFileSync` on route paths. No kiosk redirect unit today.

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 5 | Bookmark redirect lock (`/kiosk` + children → `/money`, permanent, not `/money/new`) | Unit like baby redirects: read `next.config.ts`; match `/kiosk` and `/kiosk/:path*` → `/money` + `permanent: true`; `doesNotMatch` `/money/new`. Name: `permanently redirects /kiosk to /money`. |
| Major | 1 | Prefs resource retired (Design: 404, not empty bag) | Unit: `existsSync` false for `app/api/user/preferences/route.ts` (and no re-export stub). Name: `user preferences route file is removed`. |
| Major | 2 | City-search / geocode path gone | Unit: `existsSync` false for city-search route dir/file. Name: `preferences city-search route is removed`. |
| Major | 4 | Settings UI lock — no Kiosk category / weather keywords | Unit: `SETTINGS_CATEGORIES` has no `id === "kiosk"`; `filterSettingsCategories("weather"\|"widgets", …)` does not return kiosk; appearance/theme categories still present. Name: `settings has no kiosk category`. |
| Major | 5 | Chrome-path no longer treats kiosk as in-app chrome | Rewrite chrome-path unit: `/kiosk` / `/kiosk/weather` do **not** need hide-chrome special-case (or assert false after strip). Name: `chrome path ignores retired /kiosk`. |
| Enhancement | 5 | Money remains first useful shell item after kiosk drop | Optional assert on `shellNavItems` order / money present (registry rewrite already implies). |
| Enhancement | 7 | Playwright hit `/kiosk` → lands `/money` | Optional; next.config unit + manual Verify enough. |

## Real scenarios checked

- **Happy path:** Settings strip + registry without kiosk + delete kiosk modules/e2e — mostly planned as rewrite/delete. **Redirect to Money** not named (gap).
- **User-visible failures:** Prefs/city-search 404 — acceptance + optional; need file-gone units. Theme save stays client — manual Verify OK.
- **Empty / loading / permission:** No kiosk skeletons (acceptance). Skeleton CLS automation — Enhancement. Auth surface gone with route delete — covered by file-gone + suite green.

## Edge scenarios checked

- **Boundaries / invalid input:** Rejected empty `{}` prefs bag — enforced by deleting route (file-gone), not new Zod. Stale Settings keyword → kiosk — needs named absence test.
- **Concurrency / double-submit / idempotency:** N/A after mutate surface removed.
- **Offline / partial data / race:** DROP + API cut same release — process (Task 3/7); no automated race harness needed.

## Fix ask for Build

Fold into `04-tasks.md` TDD bullets (few strong reds):

1. **Task 5 (Major):** `it("permanently redirects /kiosk to /money")` — `next.config.ts` has `/kiosk` and `/kiosk/:path*` → `/money` with `permanent: true`; destination is not `/money/new`.
2. **Task 1 (Major):** `it("user preferences route file is removed")` — `app/api/user/preferences/route.ts` (and service/validators if asserted) absent; suite must not import a live prefs bag.
3. **Task 2 (Major):** `it("preferences city-search route is removed")` — city-search route path absent on disk.
4. **Task 4 (Major):** `it("settings has no kiosk category")` — no `kiosk` id; weather/widgets keywords do not resolve to kiosk; remaining categories (e.g. appearance) still filter.
5. **Task 5 (Major):** `it("chrome path ignores retired /kiosk")` — rewrite `money-tabs-chrome-path` asserts so `/kiosk` is not a special hide-chrome product path; keep money/baby/loans/etc.

**Keep as-is:** Task 1/2 delete obsolete prefs/weather unit imports; Task 3 typecheck/migration review; Task 5 delete kiosk units/e2e + invert `registry.kiosk.test.ts` to “no kiosk nav item”; Task 5 keep Popover/MoreMenu; Task 6 docs checklist; Task 7 collateral green.

**Explicit non-goals (OK):** HTTP-level 404 without route harness; DB integration for DROP TABLE; multi-tab races; full Settings skeleton CLS automation; optional e2e redirect (Enhancement).

## Round notes

- Teardown plan is strong on **delete** reds, weak on **positive** Design locks (redirect, route gone, Settings absence, chrome-path).
- Repo already proves redirect-via-config units (`lib/baby-growth-redirects.test.ts`) — do not leave kiosk redirect as manual-only.
- No production code in this stage. Parent: fold Fix ask into `04-tasks.md` → Gate B.
