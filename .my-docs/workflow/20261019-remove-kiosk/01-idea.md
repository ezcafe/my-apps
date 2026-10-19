# Idea: Remove kiosk feature (full teardown)

## Problem map (diagnose before framing)

**Mode:** full

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?
- Product call: remove kiosk entirely (Decision N Option 2 — not page-only).
- Core shell nav `/kiosk` (+ weather), `components/kiosk/*`, `lib/kiosk/*` still ship.
- Prefs store `kiosk_widgets` / `kiosk_layout`; Settings exposes widget/layout/weather UI.
- In-flight kiosk WIP and e2e/ADRs/docs still extend or document the feature.

#### What is missing / wrong?
- No remaining product job for the glance board.
- Page-only delete leaves prefs, Settings, tests, docs as dead weight.
- Direction conflict with paused kiosk workflows; weather keep-vs-drop unclear.
- Keep/delete/discard inventory for uncommitted WIP not listed yet.

#### What are the consequences?
- Maintenance cost and review noise for an unused surface.
- Incomplete cut → broken nav/Settings, ghost prefs fields, schema/docs/e2e drift.
- Other kiosk runs confuse direction; dropping columns loses saved layouts (OK if retired).

### Step 2 — Real core problem

- **Surface symptoms:** Kiosk still in nav/Settings; code still grows around it.
- **Root cause:** Feature retired in product intent but still deep in UI + prefs + schema + tests.
- **Core problem (one sentence):** The app still ships, persists, and tests a full kiosk feature that the product no longer wants.

### Mind map (visual text)

```text
Remove kiosk
├── Happening: nav + routes + prefs + Settings + WIP
├── Missing: full teardown + weather keep/drop
├── Consequences: dead code / broken Settings / drift
├── Core: still ship/persist/test retired feature
└── ★ Top priority: end-to-end teardown (no kiosk product path)
```

## Problem

The app still ships, persists, and tests a full kiosk feature that the product no longer wants.

## User / audience

- **Primary:** app owner / operators who no longer use the kiosk board.
- **Secondary:** developers maintaining shell, Settings, prefs API, and migrations.

## Outcome

After teardown, there is no kiosk in shell nav or routes; Settings has no kiosk widget/layout UI; prefs no longer store or accept kiosk layout/widget fields; related e2e/docs/ADRs match; Money/Baby and other features stay intact. Aligns with ★ full end-to-end removal.

## Metric

- **Signal:** No shell nav item or route under `/kiosk`; prefs schema/validators/API have no `kioskWidgets` / `kioskLayout`; kiosk e2e gone; `npm test` + targeted e2e green for remaining app.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Kiosk is core shell nav at `/kiosk` | `lib/features/registry.ts` | `kind: "core"`, `order: -1` |
| Core vs feature layering | `docs/ARCHITECTURE.md` | Core (Kiosk, Settings) has no `WorkspaceAppKey` |
| Routes | `app/(shell)/kiosk/page.tsx`, `app/(shell)/kiosk/weather/page.tsx` | Dashboard + weather day |
| UI widgets / Settings | `components/kiosk/*`, `app/(shell)/settings/page.tsx` | Widget settings + weather city |
| Loaders / layout helpers | `lib/kiosk/*` | Page load, layout, registry |
| Prefs schema columns | `db/schema/user-preferences.ts` | `kiosk_widgets`, `kiosk_layout` (+ weather_* ) |
| Migrations adding columns | `db/migrations/0036_kiosk_widgets.sql`, `0048_kiosk_layout.sql` | Drop targets for teardown |
| Prefs validators / service | `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts` | PATCH shape |
| Prefs HTTP API | `app/api/user/preferences/route.ts` | Authenticated preferences |
| Layout ADR | `docs/decisions/ADR-003-kiosk-layout-in-user-preferences.md` | Accepted storage choice |
| Cell overrides ADR | `docs/decisions/ADR-005-kiosk-cell-overrides-in-layout.md` | `kioskLayout.cells` |
| Baby inject ADR | `docs/decisions/ADR-004-baby-kiosk-default-inject.md` | Default-on baby widgets |
| UI product rules | `docs/DESIGN_GUIDE.md` (kiosk status board) | Board chrome / Edit mode |
| Glossary terms | `GLOSSARY.md` | Kiosk-specific entries |
| E2E coverage | `e2e/kiosk-layout.spec.ts`, `e2e/kiosk-edit-menu.spec.ts`, `e2e/kiosk-baby.spec.ts` | Remove with feature |
| Weather library (shared?) | `lib/weather/*`, `components/weather/*` | Used via kiosk path today |
| Run scope / Option 2 | `.my-docs/workflow/20261019-remove-kiosk/00-run.md` | Full teardown decision |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** Remove Kiosk from shell nav; delete `/kiosk` (+ weather) pages and skeletons; strip Settings kiosk section (widget/layout) and decide weather-city Settings block; no new screens — teardown of existing chrome only. Follow DESIGN_GUIDE for remaining Settings/shell.

## 80/20 UI (day-to-day)

### Main user goals

- Move between remaining product areas (Money, Baby, Settings, etc.) without a dead Kiosk entry.
- Change non-kiosk preferences without seeing widget/layout controls for a removed board.
- Avoid bookmarks/deep links to `/kiosk` leading to a confusing half-removed experience (clean 404 or redirect policy — Design).

### Vital few (high-impact ~20%)

- Shell nav without Kiosk (correct active states for remaining items).
- Settings page still usable for real prefs after kiosk blocks are gone.
- No orphan kiosk chrome (edit strips, widget menus) left reachable.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Remaining shell nav destinations (first useful feature after Kiosk removed).
- **Important info / action #2 (always visible):** Settings sections that still matter (theme/account/etc. — not kiosk widgets).
- **Core action placement:** Teardown should leave Settings and shell with clear hierarchy; do not leave empty “Kiosk” headings.
- **Secondary actions:** Any weather-city control only if Design keeps weather prefs; otherwise remove with kiosk.

-

### Top user journey to optimize

Open app → use shell nav → land on a real feature (not `/kiosk`) → open Settings → see only relevant preference blocks.

### Sensible defaults

- Default/first nav focus should be the next core/feature item (today Money at `order: 0`) once Kiosk (`order: -1`) is gone.
- Prefs reads must not require kiosk fields after drop.

### Biggest usability risks to fix first

- Leftover “Kiosk” nav or Settings section after code delete.
- Settings import/runtime errors from deleted `components/kiosk` modules.
- Stale deep links to `/kiosk` without a deliberate gone/redirect behavior.
- Weather city UI left with no consumer (or removed while something still needs it).

## Non-goals

- Building a replacement dashboard or new home board in this run.
- Continuing paused kiosk feature workflows (edit menu, insights, baby kiosk widgets) as ship work.
- Reworking Money/Baby product features beyond what kiosk teardown forces.
- Unifying unrelated prefs or pagination work.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Full teardown (Option 2) is still the product call | Yes for this run | Reconfirm at Gate A | Shrink to page-only or pause |
| No other product surface needs kiosk widgets/layout prefs | Yes | Grep consumers outside `kiosk` | Keep shared helpers with a named keep list |
| Weather city prefs exist only for kiosk glance | Open | List callers of `weatherCity` / Settings weather UI | Keep weather Settings + columns, or drop with kiosk |
| Dropping `kiosk_*` columns and losing saved layouts is OK | Yes for retire | Confirm at Gate A / Gate B | Soft-deprecation or export first |
| In-flight kiosk WIP on main can be discarded for this direction | Likely | Inventory in Analyze/Design | Cherry-keep shared non-kiosk bits |

## What we should not build

- New kiosk widgets, edit menus, or layout modes.
- A “kiosk v2” or temporary stub page “coming soon.”

## Success criteria

- [ ] No Kiosk item in `shellNavItems`; `/kiosk` and `/kiosk/weather` removed (or deliberate redirect policy documented).
- [ ] `components/kiosk` and `lib/kiosk` gone unless Design lists named shared keepers moved out of kiosk.
- [ ] Settings has no kiosk widget/layout UI; prefs validators/service/API no longer accept `kioskWidgets` / `kioskLayout`.
- [ ] Migration drops kiosk layout/widget columns (and weather columns only if Gate A says drop weather too).
- [ ] Kiosk e2e removed; unit tests for deleted modules removed; remaining suites green.
- [ ] ADRs 003–005 / DESIGN_GUIDE kiosk section / GLOSSARY kiosk terms updated or retired.
- [ ] Paused kiosk workflow runs treated as superseded for product direction (do not Gate B them).

## Open questions

- Keep `weather_*` prefs + city Settings + `lib/weather` after kiosk removal, or drop as kiosk-only?
- Preferred behavior for old `/kiosk` URLs: hard 404 vs redirect to Money (or another home)?
- Any named code under `components/kiosk` / `lib/kiosk` that must move to shared (vs delete)?
- Confirm data loss on drop of `kiosk_widgets` / `kiosk_layout` is accepted (no export).
- How to treat large uncommitted kiosk WIP on `main` (discard vs selective keep) — Design inventory.
