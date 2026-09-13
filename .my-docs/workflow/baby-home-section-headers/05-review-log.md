# Review log: baby-home-section-headers

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `features/baby/server/home-quick-status.test.ts:263-276` | **Mock theater on `recentBottleMl` ordering.** Test name claims “newest by occurredAt (not updatedAt)” but injects `findRecentBottleMl: async () => [90, 120, 150]` and asserts the same array. That only proves the dep is forwarded. Real order lives in `defaultFindRecentBottleMl` (`orderBy(desc(occurredAt), desc(id))`) + `collectRecentBottleMlFromRows`. Collector is tested with **pre-sorted** rows (`:279-329`); nothing fails if SQL switches to `updatedAt` (Task 4 AC). Prefer a source/DB assert on `defaultFindRecentBottleMl` order (same style as `defaultCountFeeds` gte/lt scrape at `:203-214`) or drop the misleading passthrough test. | fixed (re-verify) |
| Major | `components/baby-home.test.ts` (chips / lastFeed) | **Selected chip from last saved formula ml untested on home.** Task 8: selected = primary on last saved formula ml (and during ~2s flash). `BabyBottleMlChips` unit tests pass `selectedMl` explicitly (`baby-bottle-ml-chips.test.ts:11-30`), but home never asserts `data-selected` / primary when `lastFeed` has formula ml (`extractFormulaMlFromPayload` → `selectedBottleMl` in `baby-home.tsx:248-254`). Wiring regression (always `null` selected) would stay green. | fixed (re-verify) |
| Major | `components/baby-home.test.ts` (headers) | **Breast / diaper tip fallbacks missing.** Task 7 AC: tips use next-due / overdue / empty fallbacks (`Tap Left or Right` / `Tap a kind`). Home renders `breastTip` / `diaperTip` (`baby-home.tsx:638-639`) but no unit asserts empty fallbacks or next-due / overdue copy in header markup. | fixed (re-verify) |
| Major | `components/baby-home.test.ts:313-321` + `messages/baby/{en,vi}.ts` | **EN/VI nap blend table under-covered.** Task 1 / 7: each band’s blend facts must match the design table (6 bands × EN + VI). Only `blend0to1Mo` (VI) and `blend1to3Y` (EN) are asserted. Wrong or missing strings for the other 10 keys would not fail. Age-guide tests only check `blendKey` mapping, not message facts. | fixed (re-verify) |
| Major | `e2e/baby-home-option-b.spec.ts` (Task 10) | **Set-birth nap blend not asserted in e2e.** Task 10 AC: “Set birth → nap blend + bottle `0/N` or `n/N` visible.” Bottle progress appears in the feed-status test (`:709-711` `7/`). No e2e checks nap header blend text (`Sleep ~` / VI) when `birthDate` is set. Unit covers a soft `/Sleep ~/` match; e2e gap remains for the locked success criterion. | fixed (re-verify) |
| Enhancement | `lib/baby-birth-date-prompt.test.ts:41-58` | **Legacy snooze “ignore” unit is theater.** Asserts constants + `visitDismissed: false` → show. Does not exercise a storage path where leftover `dismissedUntil` exists and show still happens (e2e `:714-732` does). Also no unit that `markBabyBirthDatePromptVisitDismissed` writes only the visit key / never writes the legacy localStorage key (Task 5 “stop writing it”). | fixed (re-verify) |
| Enhancement | `components/baby-page-skeleton.test.ts` | **Skeleton radii not asserted.** Task 9 AC: outer `rounded-[var(--radius-md)]`, nested `rounded-[var(--radius-sm)]`. Order + chip placeholders are checked; radii tokens are not. | fixed (re-verify) |
| Enhancement | `components/baby-home.test.ts:219-233` | **Live `Date.now()` for relative “10 min ago”.** Section-order test builds `lastFeed.at` and `nowMs` from separate `Date.now()` calls. Prefer fixed `now` + `at` (as in the cleaned-status test at `:24` / `:71`) so the relative label cannot drift. | fixed (re-verify) |
| Enhancement | `components/baby-home.test.ts` (past toddler) | **Past-3y nap blend only on helper.** Task 7: past 3y still shows toddler blend. `babySleepGuideForAge(1096)` is unit-tested; home UI never renders with an old `birthDate` to prove the nap header still shows the blend (not label-only). | fixed (re-verify) |
| Enhancement | `components/baby-home.test.ts:396-420` | **Home bottle header soft-asserts ml; weight wiring unpinned.** Task 7 AC: bottle shows recommended ml and **uses `latestWeightKg` when present**. Test passes `latestWeightKg: 4.2` (~45d → weight path yields **~90 ml**; mid-band without weight is **~120**) but only matches `/~?\d+ ml/`. Dropping `weightKg: status?.latestWeightKg` in `baby-home.tsx` stays green. Helper unit covers weight math; home does not lock the wired value. | fixed (re-verify) |
| Enhancement | `components/baby-home.test.ts` (headers / birth set) | **Guide caveat not asserted on live home.** Task 7 AC: “Guide caveat still present; no medical-certainty wording.” Caveat renders when `birthDate` is set (`baby-home.tsx` ~806). Skeleton reserves `guide-caveat` slot; no home unit/e2e asserts caveat copy appears (or is absent when birth unset). Removing the live caveat keeps all current tests green. | fixed (re-verify) |
| Nit | `components/baby-home.test.ts:139-149` | Source sniff for `BabyBottleMlChips` / absence of `BabyQuickValueCard` — render tests already cover chip layout. Prefer behavior markup over file text. | open |
| Nit | `e2e/baby-home-option-b.spec.ts` ~1056–1063 + home birth empty history | **Birth-set age-band chip fill soft.** Comment claims chips `90/100/110`; e2e only asserts `90` visible (also in no-birth snaps). Helper covers `buildBabyBottleChipMls` + snaps; home birth empty-history path does not pin `100`/`110` or absence of `60`. | open |
| FYI | Authz for `recentBottleMl` | Field rides the same workspace-scoped status path; no separate cross-workspace test needed beyond existing status authz. Collector + query-document coverage elsewhere is fine. | n/a |

**Round notes:**

- **Mapped to tasks:** Sleep bands + chip fill (T1–2) helpers look solid; formula extract (T3) matrix good; birth visit dismiss e2e good; status cleanup (T6) unit + e2e good; skeleton order (T9) good; bottle chip save e2e good.
- **Weak spots (round 1):** T4 ordering mock theater + missing SQL order guard; T7 tips + full blend i18n; T8 home selected-chip wiring; T10 set-birth nap blend e2e.
- **Fix (adversarial-tests):** Replaced `recentBottleMl` passthrough mock with `defaultFindRecentBottleMl` source scrape for `orderBy(desc(occurredAt), desc(id))`. Home unit: selected chip from last formula ml; breast/diaper empty + next-due + overdue tips; full 12 EN/VI blend strings; fixed clock for “10 min ago”; past-3y toddler blend on nap header. Birth-prompt unit: leftover snooze path + `mark…` writes visit key only. Skeleton radii tokens asserted. E2E set-birth path asserts nap blend. Nit left open (non-blocking).
- **Re-verify (after Fix):** All 5 Major + 4 prior Enhancement confirmed closed in code/tests (SQL order scrape; home selected chip; tip empty/next/overdue; 12 blend strings; e2e nap blend; birth leftover + mark-only-visit; skeleton radii; fixed clock; past-3y home blend). **New open Enhancements:** (1) bottle header soft ml regex does not pin weight-affected `~90` vs mid `~120`; (2) live guide caveat unasserted despite Task 7 AC. Nit still open (non-blocking).
- **Fix (adversarial-tests, re-verify Enhancements):** Home bottle header asserts `~90 ml` (and not `~120 ml`) when `latestWeightKg: 4.2`; birth-set markup asserts guide caveat copy; no-birth asserts caveat absent. Production already wired — tests only. Nit still open (non-blocking).
- **Re-verify (after Enhancement Fix):** Both remaining Enhancements **closed**. (1) Weight-aware: `baby-home.test.ts` bottle header with `latestWeightKg: 4.2` asserts `~90 ml` and `doesNotMatch(/~120 ml/)` — dropping `weightKg: status?.latestWeightKg` fails. (2) Guide caveat: birth-set markup matches EN caveat copy; no-birth `doesNotMatch` same copy. No new Critical/Major/Enhancement. Nits remain open (source sniff; soft age-band chip e2e) — non-blocking. **Adversarial test review: clean.**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-home.tsx` + `BabyBottleMlChips` flash gate | **Done-flash primary can miss the chip just saved.** On FORMULA success the home clears `formulaOverride` / `formulaFromCustom` then sets `bottleDone`, while chip primary + `Logged` text require `selectedMl` from `extractFormulaMlFromPayload(lastFeed)`. Until softInvalidate refetches (and if invalidate fails — by design it must not undo Done), selection stays on the **previous** formula ml or **null** when `lastFeed` was breast/pump. Diaper already uses dedicated `doneKind` for flash; bottle should keep the saved `amountMl` for the ~2s flash (Task 8 / design “that same chip keeps primary”). | closed |
| Enhancement | `components/baby-home.tsx` selection policy | **Steady-state selected chip = lastFeed formula only.** After a breast (or non-formula) lastFeed, no ml chip is primary even when `recentBottleMl[0]` is the last formula amount. Design copy says “last saved formula ml”; design-review Nit already flagged the ambiguity. Prefer explicit policy: last formula from status (`recentBottleMl[0]` or last successful save), not “only if lastFeed is formula.” | closed |
| Enhancement | `components/baby-home.tsx` orchestration | **Orchestration density.** Option B extracted `BabyBottleMlChips`, but header strings, tip wiring, chip fill, selection/flash policy, status, and birth prompt still live in one mega component. Further pure helpers (bottle/nap header builders + flash-ml state mirroring Kind `doneKind`) would cut concept load and make the Major flash bug harder to reintroduce. | closed |
| Enhancement | `components/baby-home.tsx` + Custom modal seed | **No-birth Custom seed still uses feed FALLBACK mid (~120).** Bottle header correctly stays label-only without birth, but `initialMl={formulaMl}` can open Custom on the fallback suggested value. Prefer a neutral seed (e.g. first no-birth snap / last chip / fixed 90) so “not recommended” stays honest end-to-end. | closed |
| Nit | `components/baby-bottle-ml-chips.tsx:20-22` | Local `fill()` duplicates the same `{var}` replace pattern used on home. Share one tiny helper if touched again. | open |
| Nit | `components/baby-home.tsx` ~212–213 + `:743` | Stale comment says Custom confirm “show[s] Custom selected,” but `customSelected={false}` is hard-coded; `formulaFromCustom` now drives ml-chip selection via `resolveBabyHomeSelectedBottleMl` + `ensureMlInBottleChips`. Comment/prop drift only. | open |
| FYI | `features/baby/server/home-quick-status.ts` `defaultFindRecentBottleMl` | 40-row workspace-scoped scan + `collectRecentBottleMlFromRows` matches design; existing `(babyId, type)` / workspace+occurred indexes are adequate for this additive read. No Quality perf blocker. | n/a |

**Round notes:**

- **Axes:** Correctness (Major flash wiring), Architecture (Enhancement file density), Readability (Nit fill dup), Performance (FYI scan OK). Security deep-dive deferred to Security section; Option B field rides existing workspace gate.
- **Mapped to design/tasks:** T1–4 helpers/API and T5–7 headers/status/birth look aligned with Option B contracts; T8 selected/done-flash wiring is the weak spot vs Kind pattern and design wording.
- **Verdict:** Request changes — fix the Major done-flash selection before merge.
- **Fix (quality):** `bottleDoneMl` mirrors Kind `doneKind` (`babyHomeBottleDoneMl` + arm clear). `resolveBabyHomeSelectedBottleMl` = flash → Custom override → lastFeed formula → `recentBottleMl[0]`. `ensureMlInBottleChips` keeps flash/custom ml visible. `babyHomeCustomInitialMl` seeds Custom with first chip / safe snap 90 when birth unset (not FALLBACK ~120). Home unit: flash seed + breast+recent selection. Nit left open (non-blocking).
- **Re-verify (after Fix):** All 1 Major + 3 Enhancements **closed** in code/tests. (1) Flash: `setBottleDoneMl(babyHomeBottleDoneMl(...))` + timer arm; resolve prefers `bottleDoneMl`; `ensureMlInBottleChips`; home test `bottleDoneMlSeed: 150` with stale breast lastFeed. (2) Steady-state: resolve → `recentBottleMl0`; home test breast + `recentBottleMl: [110, 90]` selects 110. (3) Density: `lib/baby-home-bottle-selection.ts` + `babyHomeBottleDoneMl` extract flash/selection/custom-seed policy. (4) No-birth Custom: `babyHomeCustomInitialMl` → first chip or snap `90`, not FALLBACK ~120. Walked headers/chips/status/skeleton vs Option B — no new Critical/Major/Enhancement. Nits remain (fill dup; stale Custom-selected comment / hard-coded `customSelected={false}`) — non-blocking. **Quality review: clean.**

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | n/a |

**OWASP coverage (A01–A10):**

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 | pass | `recentBottleMl` / `defaultFindRecentBottleMl` filter `workspaceId` + `babyId` from `ensureBabyProfile(workspaceId)`; GraphQL uses `requireBabyWorkspace` — no client baby id. |
| A02 | N/A | No new secrets, crypto, or sensitive-at-rest changes; ml ints are care data already on timeline. |
| A03 | pass | Drizzle parameterized queries; `extractFormulaMlFromPayload` numeric-only; React text children for headers/status/chips; no `dangerouslySetInnerHTML`. |
| A04 | pass | No fake guide/`n/N` without birth; `sessionStorage` visit dismiss is UX only (not auth); server owns history; scan cap 40; fixed no-birth snaps not labeled recommended. |
| A05 | N/A | No CORS, security-header, or debug-flag changes. |
| A06 | pass | No new npm deps in this change set. |
| A07 | pass | Reuses existing GraphQL auth / workspace membership; no new login or session surface. |
| A08 | pass | Additive read-only field; mutations unchanged (existing quick-care / lock / idempotency). |
| A09 | pass | No new payload/secret logging on status or chip paths; errors stay on existing mapServiceError path. |
| A10 | N/A | No server fetch of user-controlled URLs. |

**Round notes:**

- **Source:** Manual Senior Verifier review (security-review subagent unavailable — usage limit). Scope: uncommitted section-headers surface (`home-quick-status`, GraphQL type/resolver, bottle chips, birth visit dismiss, age-guide, formula-ml extract). Primary OWASP ref: https://owasp.org/Top10/
- **Design ↔ code:** Matches `03-design.md` Security / OWASP table — workspace-scoped `recentBottleMl`, scan cap, React escaping, visit-only `sessionStorage` key as specified, no new deps/mutations/SSRF. No design↔code security gaps.
- **Abuse cases (design):** IDOR blocked by workspace gate; scan DoS bounded by `BABY_RECENT_BOTTLE_ML_SCAN`; summary notes XSS remains existing React-escaped path; client cannot invent server guide without `birthDate`.
- **Verdict:** **Security review: clean.**

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | n/a |

**Round notes:**

- **Source:** Senior Verifier Performance Review (skills: `performance-optimization`, `vercel-react-best-practices`). Scope: Option B draft — `recentBottleMl` status path, bottle chips UI, section headers, birth visit dismiss, age-guide helpers.
- **N+1 / queries:** `getBabyHomeQuickStatus` keeps profile-then-`Promise.all`; `findRecentBottleMl` is one extra **parallel** dep (`async-parallel`), not a serial waterfall. No per-row follow-up queries.
- **Bounds:** `BABY_RECENT_BOTTLE_ML_SCAN = 40`; collector stops at 3 distinct ml; GraphQL field is `[Int!]!` (tiny). No unbounded list / missing pagination on this path.
- **Indexes:** Uses existing `baby_care_event` `(babyId, type)` + `(workspaceId, occurredAt)`; select is `{ id, payload, occurredAt }` only (not full row). Baby-scale limit-40 scan is fine without a new index (no `EXPLAIN` evidence to justify DDL).
- **Client / React:** `recentBottleMl` rides the existing `babyHomeQuickStatus` document — no second fetch. Pure chip/header helpers are O(1); parent clock stays ≥30s; 1 Hz breast elapsed stays in `BabyBreastElapsedText` (isolated). Direct imports; new UI (~100-line chips + small helpers); no new deps / barrel / heavy dynamic surface.
- **Hot path after save:** softInvalidate refetches the same status query (slightly heavier by one capped scan) — expected Option B cost, not a regression pattern.
- **Verdict:** **Performance review: clean.**


## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |

**Result:** Round 1 — clean. **Memory review: clean.**

**Round notes:**

- Round 1 (2026-09-13) — Senior Verifier Memory lens vs stages checklist. Draft only — no Fix this round.
- **Scope:** Option B section-headers draft — home timers/listeners, done-flash (`bottleDoneMl` + Kind `doneKind`), `sessionStorage` birth visit dismiss, `recentBottleMl` scan + collector.

**Timers / listeners / cleanup**

- **Done / Logged flash:** `createBabyHomeDoneFlashTimer` — clear-before-rearm + generation guard; home keeps bottle + diaper refs; unmount effect calls both `.dispose()`. Bottle flash arms on FORMULA success with `babyHomeBottleDoneMl`; same dispose path as diaper. No stacked timeouts from re-arm.
- **Breast elapsed:** `BabyBreastElapsedText` — `setInterval(1s)` + `visibilitychange` / `focus`; cleanup clears all three. Mounted only while `breast` is set.
- **Home clock:** `setInterval(30s)` + same wake pair; cleaned on unmount / when `nowMs` injected.
- **Day roll:** `attachBabyLocalDayRoll` dispose clears midnight timeout and removes wake listeners; `BabyHome` effect returns that dispose.

**Birth prompt / client stores**

- **Visit dismiss:** one `sessionStorage` key (`baby.birthDatePrompt.dismissedThisVisit` = `"1"`); show path ignores legacy 7-day `localStorage` snooze (design: ignore, not migrate). Bounded; no growing list or module cache.
- **Chip selection helpers:** pure (`resolveBabyHomeSelectedBottleMl`, `ensureMlInBottleChips` capped at 3); no retained module state.

**Server / recentBottleMl / casts**

- **Scan:** `BABY_RECENT_BOTTLE_ML_SCAN = 40`; select `{ id, payload, occurredAt }` only; `collectRecentBottleMlFromRows` stops at 3 distinct ml. Response field is tiny `[Int!]!` — no full feed history held in QueryClient.
- **Request scope:** row buffer lives only for the status query; collector does not retain payloads after extract.
- **SQL casts:** `count(*)::int` for feedsToday only (day-scale counts). No money / `SUM` → int4 casts on this path.

**FYI (not filed)**

- Leftover legacy snooze key in `localStorage` is ignored and left in place (Gate 1 / design). Tiny browser storage, not process growth.
- `scheduleBabyHomeDoneClear` remains for tests; production home uses the dispose-capable timer host.

**Verdict:** Memory review: clean.
