# Analysis: Baby-care e-ink kiosk widgets

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows.
**Updated:** 2026-10-18
**Has API:** yes (tiny) — expand existing `kioskWidgets` Zod enum on `GET/PATCH /api/user/preferences`; **no** new baby HTTP routes
**Has DB:** no — reuse baby loaders + existing `user_preferences.kiosk_widgets`; **no** migration / new tables
**Grill recommended?** done — Result `frontier-empty` in `02b-grill.md`
**Verify commands (confirm for 00-run):** cwd `/Users/ptquang86/ws/my-apps`; build `npm run build`; unit `npm test`; e2e `npm run test:e2e` (extend `e2e/kiosk-layout.spec.ts` for baby ids / inject)

---

## Deep dive (required)

### Overall

#### What is this?
Wire Baby Care into the `/kiosk` status board as **three e-ink widgets** matching `refs/funny-time.png`, `refs/next-event.png`, `refs/nursery-dashboard.png` at **100% fidelity**, with `defaultEnabled: true` and **one-time inject** into saved lists that omit those ids (Gate A). Aligns with Core problem: parents cannot glance baby insights on the board in those layouts, on by default.

#### Why do we need this?
Without this, `/kiosk` stays money/context-only; parents leave for `/baby`. Skipping fidelity or inject breaks the Outcome (screenshot match + day-one board for returning users). Consequences from Problem map: no glance, fidelity risk, stored-prefs miss, booking copy confusion.

#### How to do this?
Extend registry + Settings Baby group; baby-scoped inject in resolve (money no-inject tests stay); load baby data via **`getActiveWorkspaceId(userSub, "baby")`** (kiosk money path is `"money"` only today — do not reuse it); map home-quick-status / timeline / profile into three cells; reuse `.kiosk-eink*` + footer; local time-keyed Funny Time quotes; hide schedule capsule when no SoT.
- **Other ways:** (a) one mega nursery cell only — fails 1:1 refs; (b) new schedule API / Huckleberry sync — Non-goal; (c) Settings-only enable without inject — fails Top journey.
- **Best practices:** Repo — widget-gated `load*IfEnabled`, pure mappers (`lib/kiosk/insights-*.ts`), ADR-003 prefs, DESIGN_GUIDE § Kiosk glance-only, skeleton parity. Industry — e-ink monochrome, quiet empty, no in-cell write.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Registry + Zod + Baby Settings group; Funny Time local quotes; hide schedule; soft-empty cells | Low / low | yes — early tasks |
| **2. Systemic fixes** ★ | Three widgets + e-ink chrome; baby workspace in `load-kiosk-page`; one-time inject rule; next-care mapper without booking copy | Med / med (workspace + inject vs money tests) | yes — Design Option 1 |
| **3. Creative / lateral** | Fake schedule from guidelines; invent bed-time prefs; live third-party sync | Low–high / fidelity or Non-goal risk | later / Non-goals |

- **★ Priority branch:** **2 Systemic** (matches idea ★: ship three widgets + defaults/inject).
- **Map to Design (Mode full):** Option 1 = systemic (registry + load + three cells + inject). Option 2 = creative lean only if Grill picks schedule approximation; else Option 2 = “nursery without schedule + next-care from last-feed heuristic” as thinner data path. Quick wins → early Build tasks.

### Solution pieces

#### 1. Registry, prefs inject, Settings

##### What is this?
Add three baby widget ids under feature `baby`; `defaultEnabled: true`; Zod/prefs max follow registry; one-time inject missing ids into non-empty stored lists (`[]` stays empty).

##### Why do we need this?
Without registry + Zod, PATCH breaks. Without inject, saved boards never show baby day-one.

##### How to do this?
- Approach: extend `KIOSK_WIDGET_IDS` / `KioskFeatureGroup` / labels; baby-only inject helper beside `resolveKioskWidgets` (or resolve flag) so money “no inject” tests stay true; Decision on **resolve-merge vs write-on-read persist**.
- Other ways: migrate all users’ prefs once via SQL — heavier; Settings banner “enable baby” — fails zero-step journey.
- Best practices: keep money no-inject tests; empty `[]` = cleared board (Gate A).

#### 2. Load path + baby workspace

##### What is this?
Gate-load nursery / next-care payloads in `load-kiosk-page` when ids enabled; resolve **baby** workspace, not money.

##### Why do we need this?
Wrong workspace → empty/wrong data. No gate → wasted queries.

##### How to do this?
- Approach: `getActiveWorkspaceId(userSub, "baby")` + `runInWorkspace`; call `getBabyHomeQuickStatus` / timeline / `ensureBabyProfile` (or thin kiosk mappers wrapping them); soft-empty when no baby workspace.
- Other ways: HTTP GraphQL loopback from kiosk — slower, against money insights SSR pattern.
- Best practices: mirror `loadInsights*IfEnabled`; fail soft like money `noWorkspace`.

#### 3. Three e-ink UI cells (+ skeletons)

##### What is this?
Funny Time (centered quote + dither + Parent \| Funny Time); Next-care (centered label + time range + baby footer — **no** booking/investor copy); Nursery (ID capsule → hero status → 2×2 activity → optional schedule pill → footer).

##### Why do we need this?
Outcome = 100% ref fidelity; theme-token restyle fails user hard rule.

##### How to do this?
- Approach: new cards/skeletons; generalize `KioskInsightsFooter` (left/right labels + optional mark); extend `.kiosk-eink*` CSS; monochrome only.
- Other ways: reuse money cells with props — layout mismatch (chart/grid ≠ these refs).
- Best practices: DESIGN_GUIDE kiosk; CLS skeleton parity; concentric radii tokens.

#### 4. Data mappers (next-care, activity, quotes)

##### What is this?
Pure libs: time-keyed quotes; next-care title+range from available baby facts; activity rows (Bottle/Nursing/Diaper from feed/diaper — **no Solids type** in schema); status Sleeping/Awake from `openSleep`.

##### Why do we need this?
Refs need labels the DB does not store 1:1 (schedule, bed time, Solids).

##### How to do this?
- Approach: quotes module; next-care Decision (below); activity map formula→Bottle, breast→Nursing, diaper kinds→details; omit Solids until typed; hide bed time / schedule when missing.
- Other ways: invent schedule table now — Non-goal / Has DB yes (out of scope).
- Best practices: pure functions + unit tests like `insights-chart.ts`.

#### 5. E2E / verify coverage

##### What is this?
Extend kiosk prefs e2e for Baby group + inject; unit tests for resolve inject and mappers.

##### Why do we need this?
Inject and registry are easy to regress against money no-inject locks.

##### How to do this?
- Approach: unit first; e2e toggle + `/kiosk` visibility when auth/DB available.
- Other ways: visual-only manual — fails Verify bar.
- Best practices: `widget-registry.test.ts` + `e2e/kiosk-layout.spec.ts` patterns.

---

## What exists today

`/kiosk` is a registry board (`widget-registry.ts`) with prefs (ADR-003). Money e-ink cells ship dither/footer; **no baby ids**. `resolveKioskWidgets` defaults on null only — **stored lists never inject**. `load-kiosk-page` uses **money** workspace only. Baby Care has profile, `home-quick-status` (open sleep, last feed/diaper/sleep), timeline summaries — care types `feed|diaper|sleep` only; **no** timed schedule / bed-time columns; guidelines are prose, not clocks.

## Dependencies

- Registry ↔ validators ↔ Settings groups ↔ dashboard `renderWidgetCell` ↔ skeletons ↔ `load-kiosk-page`.
- Baby workspace cookie / membership (separate from money).
- Money insights widgets and their no-inject tests must stay green.
- DESIGN_GUIDE kiosk glance-only (no in-cell log/timers).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/kiosk/widget-registry.ts` (+ test) | Ids, defaults, inject vs money no-inject |
| `lib/kiosk/load-kiosk-page.ts` | Widget-gated load; add baby workspace branch |
| `lib/workspace-context.ts` | `getActiveWorkspaceId(…, "baby")` |
| `features/baby/server/{home-quick-status,timeline,profile}.ts` | Status / activity / name-age |
| `lib/baby-age-guide.ts`, `lib/baby-app-header.ts` | Age display |
| `components/kiosk/kiosk-insights-*.tsx`, `app/globals.css` `.kiosk-eink*` | E-ink chrome |
| `components/kiosk/kiosk-{dashboard,widget-settings,*-skeleton*}.tsx` | Render + Settings + CLS |
| `lib/validators/user-preferences.ts`, ADR-003 | Prefs contract |
| `e2e/kiosk-layout.spec.ts` | Prefs → board |
| `refs/*.png` | 100% fidelity SoT |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Widget-gated `load*IfEnabled` | `lib/kiosk/insights-*.ts` | Skip work when id off |
| Pure mapper + unit test | `buildInsightsChartWidget` etc. | Testable next-care / activity / quotes |
| E-ink footer + dither bars | `kiosk-insights-footer`, `.kiosk-eink-insights*` | Screenshot chrome without theme tint |
| Prefs resolve + normalize | `resolveKioskWidgets` / ADR-003 | Null defaults; extend with baby inject |
| Soft empty / unavailable cell | Insights unavailable cards | No crash when no baby workspace |
| Skeleton parity | `kiosk-insights-skeletons`, dashboard skeleton | Zero CLS |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Kiosk status board (core) | DESIGN_GUIDE § Kiosk | Glance cells; Settings toggles secondary |
| Feature-scoped workspace | `workspaceAppKey: "baby"` vs money | Kiosk must pick **baby** cookie for care data |
| Registry-driven prefs enum | `KIOSK_WIDGET_IDS` ↔ Zod | Single SoT for PATCH + Settings |
| Baby-scoped default inject | Gate A lean (new vs money) | Day-one board without Settings |

## Constraints and risks

- **100% ref fidelity** — hard; no grey fills instead of dither; no booking copy on next-care.
- **Baby ≠ money workspace** — Critical if ignored.
- Inject must not break money no-inject tests or empty `[]`.
- No Solids / bed time / rise-nap schedule SoT — hide or approximate carefully.
- Three default-on cells + money board may crowd (Enhancement — order in Design).
- Prefs enum change = tiny public contract (api-contract-review if parent sets Has API yes).

## Settled decisions (do not relitigate)

- Three widgets ↔ three refs; next-event = baby next-care (no booking language).
- Funny Time = local time-keyed quote set; never blank on happy path.
- `defaultEnabled: true` + one-time inject into stored lists that omit the three ids; `[]` stays empty.
- Prefer no new baby API/DB; schedule capsule may be empty/hidden.
- Glance-only; no in-cell timers/log buttons; no Home rebuild / Huckleberry sync.
- **Grill Q1:** Next-care SoT = soonest feed|sleep due from `lib/baby-next-due.ts`; quiet empty when hidden.
- **Grill Q2:** Hide nursery schedule pill + bed time when no SoT; hero + activity still ship.
- **Grill Q3:** Footers — Parent|Funny Time; Huckleberry|Nursery; Next-care Baby Care|Updated (no booking).
- **Grill Q4:** Write-back inject once + `kioskLayout.babyDefaultsInjected`; money no-inject stays (ADR-004).
- **Grill Q5:** Activity map Bottle/Nursing/Diaper; omit Solids; quiet empty slots.
- **Ids:** `baby.funny_time`, `baby.next_care`, `baby.nursery`.

## Design tree (frontier)

### Settled
- Gate A + skim + Grill Q1–Q5 (see `02b-grill.md`); ids above; ADR-004 inject.

### Open frontier
- (empty)

### Blocked
- none

**Grill recommended?** done — Result `frontier-empty` in `02b-grill.md`.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Baby workspace from kiosk | Confirm money vs baby cookie | `getWorkspaceIdForUser` = money only; need `"baby"` | Keep — Design must teach |
| Solids / bed time columns | Schema support for ref rows | Care types feed/diaper/sleep; profile has name+birthDate only | Keep — hide/map |
| QAN CSS/JS lookup | Front-end routing skill | context-mode MCP unavailable this run | Discard — use DESIGN_GUIDE + e-ink |

## Blocking questions

(none — Grill settled Q1–Q5)

## Clear to grill / design?

**yes** — frontier empty; Design may lock Mode-full options under Grill locks + ADR-004.
