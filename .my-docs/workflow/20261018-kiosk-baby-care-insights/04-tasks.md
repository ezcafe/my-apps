# Tasks: Baby-care e-ink kiosk widgets

**Design pick (recommended):** Option 1 — three systemic widgets + baby workspace + write-back inject (ADR-004).  
**Has API:** yes · **Has DB:** no  
**Verify commands** (from `00-run.md`): cwd `/Users/ptquang86/ws/my-apps` · `npm run build` · `npm test` · `npm run test:e2e`  
**Automated tests:** planned (unit + e2e) — parent should run 04a when Gate B path requires it.

## Task 1: Registry + Zod + Baby Settings group

**Description:**
Add `baby.funny_time`, `baby.next_care`, `baby.nursery` to `KIOSK_WIDGET_IDS` / registry with `feature: "baby"`, `defaultEnabled: true`, labels/descriptions. Extend `KioskFeatureGroup` + Settings group label “Baby”. Prefs Zod `kioskWidgets` max follows registry length. Optional `kioskLayout.babyDefaultsInjected: boolean` on layout type + Zod; **`resolveKioskLayout` must pass the flag through** (not drop when rebuilding mode/columns/focus).

**Acceptance:**

- [ ] Three ids in registry and `DEFAULT_KIOSK_WIDGETS`; Settings shows Baby group.
- [ ] PATCH accepts new ids; rejects unknown; max = registry length.
- [ ] Design UI lock: three independent toggles under Baby.
- [ ] `resolveKioskLayout({ mode, columns, focusWidgetId, babyDefaultsInjected: true })` keeps the flag; Zod accepts it.

**Tests (TDD — what turns red first):**

- [ ] Unit: `resolveKioskWidgets(null)` includes the three baby ids.
- [ ] Unit: prefs Zod accepts arrays with baby ids; rejects unknown; max = registry length.
- [ ] Unit: layout schema accepts `babyDefaultsInjected: true`.
- [ ] Unit: `resolveKioskLayout` round-trips `babyDefaultsInjected: true` with mode/columns/focus intact.

**Files likely touched:** `lib/kiosk/widget-registry.ts`, `widget-registry.test.ts`, `lib/kiosk/kiosk-layout.ts`, `lib/validators/user-preferences.ts`, `user-preferences.test.ts`, `components/kiosk/kiosk-widget-settings.tsx` (if labels need feature map only)

**Scope:** S

**Dependencies:** none

---

## Task 2: Baby default inject (ADR-004) + money no-inject stays

**Description:**
Implement one-time write-back: non-empty stored list missing any baby default id + `babyDefaultsInjected !== true` → merge three ids (registry order), set flag, persist via preferences service. **Layout write-back = full merge:** keep existing `mode` / `columns` / `focusWidgetId` and set `babyDefaultsInjected: true` in one `kioskLayout` object (never flag-only or mode-only rebuild that drops fields). Null widgets → defaults. `[]` → empty (no inject). Keep `resolveKioskWidgets` money behavior (no money inject). Wire inject on `/kiosk` load (or prefs read used by kiosk) so day-one board appears without Settings.

**Acceptance:**

- [ ] Inject rules match Design / ADR-004 / Grill edge table + full `kioskLayout` merge.
- [ ] After inject + user offs all three, flag true → no re-inject.
- [ ] Persist round-trip: flag still true after `resolveKioskLayout` / get prefs (no infinite re-inject).
- [ ] Money “stored set without injecting …” tests still green.
- [ ] Security: inject only for signed-in prefs owner (existing service authz).

**Tests (TDD — what turns red first):**

- [ ] Unit: non-empty list omitting baby → merge widgets + flag true on **full** layout (mode/columns/focus preserved) (pure helper and/or service).
- [ ] Unit: `injects all baby defaults when any one id missing` — money-only + only one baby id absent → all three baby ids + flag + mode/columns/focus kept.
- [ ] Unit: `[]` stays empty; null → defaults including baby.
- [ ] Unit: flag already true + missing baby → no merge.
- [ ] Unit: money no-inject cases unchanged.
- [ ] Unit: write-back then resolve/get → `babyDefaultsInjected` still true (round-trip).

**Files likely touched:** `lib/kiosk/widget-registry.ts` (or `baby-defaults-inject.ts`), `lib/user-preferences-service.ts`, matching tests, `lib/kiosk/load-kiosk-page.ts`

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: Pure mappers — Funny Time quotes, next-care, nursery activity

**Description:**
Pure libs: local time-keyed Funny Time quote set (never blank on happy path); next-care title+timeLine from soonest feed|sleep via `lib/baby-next-due.ts` per **Next-care display rules** in Design (quiet empty when hidden); nursery activity map (formula→Bottle, breast→Nursing, diaper→Diaper+detail; optional sleep fill; omit Solids; ≤4 with quiet slots). ID capsule = name|age; status from open sleep. No schedule pill / bed time builders.

**Acceptance:**

- [ ] Next-care SoT = Grill Q1; **next** → title Next feed/nap + `timeLine` = 12h clock of `dueAt` only; **overdue** → same title + `Overdue · {duration}` from `overdueMs`; **hidden** → `{ empty: true }`; no invented start–end range.
- [ ] Activity map matches Grill Q5; no Solids.
- [ ] Funny Time always returns a line for any clock hour in happy path.

**Tests (TDD — what turns red first):**

- [ ] Unit: quotes by hour buckets (fixture clocks).
- [ ] Unit: next feed vs next nap picks soonest; `kind: "next"` → dueAt clock string; `kind: "overdue"` → Overdue · duration; hidden → empty DTO.
- [ ] Unit: `overdue keeps Next feed or nap title` — overdue fixture → title Next feed/nap; `timeLine` `Overdue · …`; no range/booking strings.
- [ ] Unit: `nursery capsule is name and age without bed time` — DTO capsule excludes bed time even if fixture has it.
- [ ] Unit: activity mapping cases + under-4 quiet slots; no Solids row.

**Files likely touched:** `lib/kiosk/baby-funny-time.ts`, `baby-next-care.ts`, `baby-nursery.ts` (names flexible) + `*.test.ts`

**Scope:** M

**Dependencies:** none (can parallel Task 1–2)

---

## Task 4: Load path — baby workspace + gated loaders

**Description:**
In `load-kiosk-page`, when any baby id enabled: resolve **baby** workspace (`getActiveWorkspaceId(…, "baby")`), not money. Call gated loaders wrapping home-quick-status / next-due / timeline / profile / Funny Time mapper. Soft-empty payloads when no workspace. Skip baby work when all three offs.

**Acceptance:**

- [ ] Never uses money workspace for baby cells.
- [ ] Disabled ids → matching loader not called / payload omitted.
- [ ] No baby workspace → soft-empty; page does not throw.
- [ ] Security: membership-scoped reads only.

**Tests (TDD — what turns red first):**

- [ ] Unit/integration-style: enabled → baby workspace spy called; money workspace not used for baby.
- [ ] Unit: all baby ids off → baby loaders not called.
- [ ] Unit: no workspace → soft-empty DTOs.

**Files likely touched:** `lib/kiosk/load-kiosk-page.ts` (+ tests if present / new focused test)

**Scope:** M

**Dependencies:** Task 3

---

## Task 5: E-ink CSS + shared footer for baby footers

**Description:**
Extend `.kiosk-eink*` / footer primitive for Funny Time dither accent, next-care centered chrome, nursery capsule + 2×2 + hero. Force monochrome ink/paper **inside** cell. Footer label pairs + **per-widget left mark modes** locked in Design (none / shutter / open-circle) — do not hardcode money’s always-on mark for all baby cells.

**Acceptance:**

- [ ] Design UI lock: dither (not solid grey); footer labels Parent|Funny Time; Baby Care|Updated; Huckleberry|Nursery.
- [ ] Footer mark API: `none` | shutter/spiral | open-circle; money path can keep default shutter.
- [ ] Outer Card uses shell tokens / `rounded-[var(--radius-md)]`; nested `rounded-[var(--radius-sm)]` where needed.

**Tests (TDD — what turns red first):**

- [ ] Unit/DOM: footer primitive — mark off (no mark node); shutter mark present; open-circle class/hook present.

**Files likely touched:** `app/globals.css`, `components/kiosk/kiosk-insights-footer.tsx` (+ test)

**Scope:** S

**Dependencies:** none (can parallel)

---

## Task 6: Funny Time card + skeleton

**Description:**
New card matching `refs/funny-time.png` at 100% fidelity. Wire dashboard render. Skeleton parity (centered line + dither stub + footer stubs).

**Acceptance:**

- [ ] Design UI lock vs Funny Time ref (hierarchy, dither, footer **labels only — no left mark**).
- [ ] Never blank quote on happy path payload.
- [ ] Skeleton mirrors live (zero CLS for this cell).

**Tests (TDD — what turns red first):**

- [ ] Unit: renders quote + Parent|Funny Time; asserts footer mark absent.
- [ ] Unit: skeleton structure parity assert.

**Files likely touched:** `components/kiosk/kiosk-funny-time-card.tsx` (+ test), `kiosk-dashboard.tsx`, `kiosk-dashboard-skeleton.tsx` / insights skeletons (+ tests)

**Scope:** M

**Dependencies:** Task 4, Task 5

---

## Task 7: Next-care card + skeleton

**Description:**
New card matching `refs/next-event.png` chrome remapped to baby next care (no booking/investor copy). Empty state = quiet chrome. Skeleton parity.

**Acceptance:**

- [ ] Design UI lock: centered title + time; footer **shutter mark + Baby Care** | Updated; **no** “Next booking” / investors.
- [ ] Empty due → quiet empty, not error.
- [ ] Skeleton parity.

**Tests (TDD — what turns red first):**

- [ ] Unit: renders title/time/footer from fixture; shutter mark present; forbidden booking strings absent.
- [ ] Unit: empty payload quiet render; skeleton parity.

**Files likely touched:** `components/kiosk/kiosk-next-care-card.tsx` (+ test), dashboard + skeletons

**Scope:** M

**Dependencies:** Task 4, Task 5

---

## Task 8: Nursery dashboard card + skeleton

**Description:**
New card matching `refs/nursery-dashboard.png`: ID capsule → hero status → 2×2 activity → **no** schedule pill. Footer Huckleberry | Nursery. Skeleton parity.

**Acceptance:**

- [ ] Design UI lock vs nursery ref (capsule, dither hero, 2×2, footer **open-circle mark + Huckleberry** | Nursery); schedule/bed time hidden.
- [ ] Soft-empty activity slots OK; no Solids.
- [ ] Skeleton parity.
- [ ] Mobile: readable hierarchy in narrow cell (container queries / existing kiosk grid).

**Tests (TDD — what turns red first):**

- [ ] Unit: renders status + up to 4 activity rows from fixture; open-circle mark + Huckleberry; no schedule node.
- [ ] Unit: skeleton parity.

**Files likely touched:** `components/kiosk/kiosk-nursery-card.tsx` (+ test), dashboard + skeletons

**Scope:** M

**Dependencies:** Task 4, Task 5

---

## Task 9: E2E — Baby group, inject, board visibility

**Description:**
Extend `e2e/kiosk-layout.spec.ts` (or sibling): Settings Baby toggles; inject path so a non-empty saved list missing baby ids ends with baby cells on `/kiosk` after load; empty `[]` stays empty.

**Acceptance:**

- [ ] E2E covers toggle and/or inject → visible baby widgets when auth/DB harness allows.
- [ ] Design UI lock: at least one assertion on baby cell content or test id per widget when stable selectors exist.
- [ ] Security: runs as authenticated user only (existing e2e auth).

**Tests (TDD — what turns red first):**

- [ ] E2E: `baby defaults inject on kiosk load` — non-empty saved list without baby ids → three baby cells (or test ids) visible after `/kiosk` load.
- [ ] E2E: `empty kiosk widgets stays empty` — prefs `kioskWidgets: []` → board stays empty (no baby inject).

**Files likely touched:** `e2e/kiosk-layout.spec.ts` (or new `e2e/kiosk-baby.spec.ts`)

**Scope:** M

**Dependencies:** Tasks 2, 6–8

---

## Task 10: Docs polish — DESIGN_GUIDE kiosk list + glossary check

**Description:**
Add the three baby default-on cells to DESIGN_GUIDE § Kiosk glance list (brief). Confirm glossary terms already match shipped names (no rewrite unless drift).

**Acceptance:**

- [ ] DESIGN_GUIDE mentions Funny Time / next care / nursery as default-on e-ink cells.
- [ ] No contradictory booking language.

**Tests (TDD — what turns red first):**

- [ ] None — docs only (say so clearly).

**Files likely touched:** `docs/DESIGN_GUIDE.md`, optionally `GLOSSARY.md` if drift

**Scope:** S

**Dependencies:** Task 1 (ids locked)

---

## Checkpoints

After Tasks 1–2:

- [ ] Registry/Zod/inject unit tests green; money no-inject still green

After Tasks 3–5:

- [ ] Mapper + load path tests green; soft-empty verified

After Tasks 6–8:

- [ ] Side-by-side visual check vs three refs (structure/dither/footer)
- [ ] Skeleton parity; light/dark shell ok (monochrome inside cells)

After Task 9:

- [ ] `npm test` + targeted e2e; `npm run build`
