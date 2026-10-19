# Analysis: Remove kiosk (full teardown)

**Size:** Prefer bullets. ≤5 solution pieces. Stay within artifact size caps.

## Deep dive (required)

### Overall

#### What is this?
Full removal of the retired kiosk status board: routes, shell nav, Settings blocks, prefs fields, weather (kiosk-only), schema columns, e2e/docs/ADRs, and in-flight kiosk WIP — without breaking Money/Baby/Settings.

#### Why do we need this?
Product no longer wants the glance board. Skipping leaves dead nav/Settings, ghost prefs/API/schema, review noise, and conflict with paused kiosk workflows.

#### How to do this?
★ End-to-end delete + prefs/API strip + migration drop + redirect old URLs + docs/test cleanup. Honor Gate A: drop weather with kiosk; redirect `/kiosk` → Money; layout data loss OK.
- **Other ways:** page-only delete (leaves prefs/Settings debt — rejected Option 1); soft-deprecate / flag (still ships code — rejected).
- **Best practices:** repo redirects in `next.config.ts`; shared prefs PATCH keep theme/account; core nav without `WorkspaceAppKey` (`docs/ARCHITECTURE.md`); retire ADRs when storage choice dies.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Strip nav item only; hide Settings section | Low / leaves API+DB+routes | later → early tasks or Non-goals |
| **2. Systemic fixes** ★ | Full teardown: UI+API+DB+weather+e2e+docs; WIP keep/discard inventory | Med-high / Settings+prefs breakage if incomplete | yes → Design Option 1 |
| **3. Creative / lateral** | Soft-deprecate stub page; export layouts then drop; keep weather as future home | Med / fights Gate A / Option 2 | later → Option 2 only if product reopens |

- **★ Priority branch for this pass:** 2 Systemic (matches idea mind-map ★ and Decision N Option 2)
- **Map to Design:** Mode full → Option 1 = systemic full teardown; Option 2 = creative soft-path (document as rejected unless Gate B reopens). Quick wins → Non-goals or tiny early nav strip only if sequenced inside Option 1.

### Solution pieces

#### 1. Shell UI + Settings chrome

##### What is this?
Remove Kiosk from `shellNavItems`, `/kiosk` (+ weather) pages/skeletons, Settings `kiosk` category + widget/weather blocks; clean crumbs, chrome-path, CSS `.kiosk-*`.

##### Why do we need this?
Daily trust: no dead nav or Settings heading; no import crashes after `components/kiosk` delete.

##### How to do this?
- **Approach:** Delete `app/(shell)/kiosk/*`, `components/kiosk/*`; strip Settings props/`settings-types` kiosk category; remove registry + `core-app-header` kiosk branches; purge `globals.css` kiosk rules; redirect via `next.config.ts` (repo pattern).
- **Other ways:** Leave empty Settings section (clutter — no); hard 404 only (Gate A prefers redirect).
- **Best practices:** Gate A 80/20 — remaining nav + Settings hierarchy; DESIGN_GUIDE for leftover shell only (retire kiosk glance section).

#### 2. Prefs API + validators + weather

##### What is this?
Stop accepting/returning `kioskWidgets` / `kioskLayout` / `weatherCity` (+ lat/lon); delete city-search; drop `lib/weather` + `components/weather`.

##### Why do we need this?
Incomplete cut → ghost fields, dead geocode route, Settings PATCH errors.

##### How to do this?
- **Approach:** Trim Zod + `user-preferences-service` (remove kiosk/weather imports); delete `app/api/user/preferences/city-search`; drop weather packages. **Analyze confirmed:** weather consumers are only kiosk paths + Settings weather UI — no Money/Baby caller.
- **Other ways:** Keep weather prefs “for later” (no consumer — Gate A drop).
- **Best practices:** Additive-safe PATCH history → now subtractive; keep theme/account/date validators green; auth still on prefs route.

#### 3. Schema migration

##### What is this?
New migration dropping `kiosk_widgets`, `kiosk_layout`, and `weather_*` columns; update Drizzle schema + journal.

##### Why do we need this?
Ghost columns and typed schema/lib coupling (`db/schema/user-preferences.ts` imports kiosk types).

##### How to do this?
- **Approach:** Forward migration DROP COLUMN; schema remove fields; no export of layouts (Gate A OK).
- **Other ways:** Soft-null columns forever (debt); data export first (out of scope).
- **Best practices:** Drizzle migrate journal; never rewrite old `0036`/`0048` history.

#### 4. Tests, docs, auth cleanup

##### What is this?
Remove `e2e/kiosk-*.spec.ts` and kiosk unit tests; retire ADRs 003–005 / DESIGN_GUIDE kiosk / GLOSSARY terms; clean `auth.ts` kiosk matcher comment; fix chrome-path + settings keyword tests.

##### Why do we need this?
Drift and false green on a deleted feature.

##### How to do this?
- **Approach:** Delete kiosk tests; update settings category tests; ADR status “superseded/retired”; ARCHITECTURE drop “Kiosk” from core examples.
- **Other ways:** Leave ADRs as historical Accepted without note (confusing).
- **Best practices:** Verify with existing `npm run build` / `npm test` / `npm run test:e2e`.

#### 5. Uncommitted WIP keep vs discard

##### What is this?
Large kiosk WIP on `main` (edit menu, insights, baby widgets) plus shared UI touch-ups.

##### Why do we need this?
Blind discard may delete useful shared primitives; blind keep re-ships kiosk.

##### How to do this?
- **Approach:** **Delete** all `components/kiosk`, `lib/kiosk`, kiosk e2e, kiosk workflows as product. **Keep** shared UI already used outside kiosk: `components/ui/popover*`, `popover-dismiss`, `more-menu` (+ tests). Do not move kiosk widget logic into Money/Baby. Discard paused kiosk run Gate B work.
- **Other ways:** Cherry-move month-board into Money home (Non-goal / new product).
- **Best practices:** Inventory in Design tasks; supersede paused runs in Notes only (parent).

## What exists today

Next.js shell: Kiosk is core nav `order: -1` at `/kiosk` with weather child; Settings hosts widget/layout + weather city; prefs store `kiosk_*` + `weather_*`; loaders under `lib/kiosk`; weather only wired through kiosk. Shared prefs PATCH and UI primitives (Popover/MoreMenu) must survive.

## Dependencies

- Money/Baby bootstrap must stay untouched (no fake `WorkspaceAppKey` on removed core).
- Settings appearance/account/workspace sections stay.
- Migration must apply before schema types drop in deploy order.
- Redirect target must exist (`/money` feature item remains).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/features/registry.ts`, `lib/core-app-header.ts` | Nav + crumbs |
| `app/(shell)/settings/page.tsx`, `components/settings/settings-types.ts` | Strip kiosk section |
| `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, `app/api/user/preferences/*` | Prefs contract |
| `db/schema/user-preferences.ts`, `db/migrations/*` | Drop columns |
| `next.config.ts`, `auth.ts`, `app/globals.css` | Redirect, auth note, CSS purge |
| `e2e/kiosk-*.spec.ts`, ADRs 003–005, `docs/DESIGN_GUIDE.md`, `GLOSSARY.md` | Retire tests/docs |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Config redirects | `next.config.ts` (baby/money URL moves) | Same gone-URL story for `/kiosk` |
| Shared prefs PATCH | `app/api/user/preferences/route.ts` | Subtract fields without new API surface |
| Settings sections | `SettingsSection` + category layout | Remove one category; keep IA |
| Core vs feature nav | `lib/features/registry.ts` | Delete core item only |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Feature teardown (UI → API → DB → docs) | this run | Ordered cut avoids Settings/runtime breaks |
| Core shell without workspace key | `docs/ARCHITECTURE.md` | Removing Kiosk must not invent feature bootstrap |
| Prefs as single authenticated bag | user-preferences service | One contract shrink |

## Constraints and risks

- Settings still imports kiosk modules until stripped → runtime break.
- Shared prefs validators must stay green for theme/account.
- Orphan `city-search`, `.kiosk-*` CSS, glossary/ADR drift.
- WIP mix: keep shared Popover/MoreMenu; delete kiosk-only.
- Auth comment for omitted `/kiosk` matcher — remove with routes.

## Settled decisions (do not relitigate)

- Full teardown Option 2 (product).
- Gate A: drop weather with kiosk (Analyze: no non-kiosk consumer).
- Gate A / Grill: permanent redirect `/kiosk` + `/kiosk/:path*` → `/money` (not `/money/new`, not bare 404).
- Layout/widget data loss OK; no export.
- No replacement dashboard / stub page (Non-goals).
- Paused kiosk workflows superseded for product direction.
- ADRs 003–005 Superseded by ADR-006; kiosk glossary terms removed.
- Stale prefs PATCH with removed kiosk/weather keys → Zod `.strict()` 400.
- Keep shared `popover*` / `more-menu`; delete all `components/kiosk` + `lib/kiosk` + weather packages.

## Parent flags (copy to 00-run.md)

| Flag | Value | Why |
|------|-------|-----|
| **Has API** | **yes** | Prefs PATCH shape shrink; delete city-search route |
| **Has DB** | **yes** | Migration drops `kiosk_*` + `weather_*` columns |
| **Has auth/PII/schema** | **yes** | Authenticated prefs; weather city/coords are location PII; schema trust boundary |

**Verify commands (confirm):** cwd `/Users/ptquang86/ws/my-apps`; build `npm run build`; unit `npm test`; e2e `npm run test:e2e` — unchanged from skim.

## Design tree (frontier)

### Settled
- Full teardown ★; weather drop; layout loss OK; no stub page.
- Keep shared Popover/MoreMenu; delete `components/kiosk` + `lib/kiosk` + weather packages.
- Permanent redirect `/kiosk` + `/kiosk/:path*` → `/money` (ADR-006); ADRs 003–005 Superseded.
- Stale kiosk/weather PATCH keys → strict Zod 400.

### Open frontier
- (empty — Grill frontier-empty)

### Blocked
- (none)

**Grill recommended?** done — see `02b-grill.md`.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Weather consumers | Confirm Gate A drop | Only kiosk + Settings weather + prefs service | discard weather with kiosk |

## Blocking questions

1. ~~Redirect exact target~~ — settled: `/money`, permanent.
2. Are the instructions and reference files clear enough to design? Any gaps in What / Why / How? — yes, clear for Design.

## Clear to grill / design?

yes — frontier empty; ready for Design. No Critical/Major product gaps.
