# Review log: Pump L/R + care log parity + timer Tap-to-stop

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/baby-home-pump-amount.ts:27–31` · `lib/baby-home-pump-amount.test.ts:39–44` | **Adapter-2 mock theater.** `babyNapSleepUsesCareTimerStore` is dead production code (only imported by its own test). It returns `actionKind === "BREAST"` — a tautology. Asserting `SLEEP` → false / `BREAST` → true does **not** prove home Nap or sleep Start/End avoid `startBabyCareTimer` / care-timer writes. Sleep form has a source-scan (`baby-care-one-tap.test.ts:65–75`); **home Nap has no equivalent.** Suite can stay green while Nap wrongly starts a care-timer side. | fixed |
| Major | `lib/baby-quick-care-plan.test.ts:158–180` · `adoptFeedSessionAfterQuickCare` block ~192–261 · Task 2 `writesFeed` lock | **`PUMP_AMOUNT` feedSession / adopt failure mode untested.** Design lock: `writesFeed` includes `PUMP_AMOUNT` like `FORMULA`; adopt treats `createPumpAmount` like `createFormula`. Fixture table covers server **steps** + `localAfter`, but `feedSessionEventId` is only asserted for `FORMULA` / BREAST / DIAPER — **not** idle `PUMP_AMOUNT`. Adopt tests only exercise `saveBreast` / `createFormula` / empty steps — **never** `createPumpAmount`. Dropping `PUMP_AMOUNT` from `writesFeed` or the adopt feed-step filter would break night session merge while the suite stays green. | fixed |
| Major | `e2e/baby-home-option-b.spec.ts` · Task 3/6 TDD | **Home Pump L / Tap-to-stop / Pump amount e2e missing.** Zero matches for `pump_l`, `PUMP_AMOUNT`, Tap to stop, or Pump amount flows in home option-b e2e. Growth “no Pump capture” is covered in `e2e/baby-care.spec.ts`. Night-critical path (Pump L start → Tap to stop → Done → idle; amount picks ml) has no e2e guard. | fixed |
| Major | Task 4 TDD · `lib/baby-i18n.test.ts` · `components/baby-care-guidelines.test.ts` | **Guideline + Pump table i18n keys untested.** Task 4 requires unit: keys for four sections + Pump table rows. `baby-i18n.test.ts` has no `home.tapToStop` / `home.pumpL` / `home.guide.*` / `home.guide.pump.1`…`6` asserts. Guidelines component tests use hardcoded stub bodies — would not catch missing EN/VI or Pump table copy drift. | fixed |
| Enhancement | Task 1 · `features/baby/server/timeline.ts:155–157` · no matching `*.test.ts` | **Timeline / Insights label maps for `pump_l`/`pump_r`/`pump` untested.** Production maps exist; no unit locks `feed.pumpL` / `feed.pumpR` / ml path. Regression to raw method ids would pass today’s suite. | fixed |
| Enhancement | `lib/baby-home-pump-amount.ts:9–24` · `.test.ts:8–36` | **Dead “home press” wrapper.** `planBabyHomePumpAmountPress` is unused by `baby-home.tsx` (home calls `planBabyQuickCare` via `runQuick`). Tests re-hit planner already covered by `BABY_AUTO_FINALIZE_TABLE` pump-amount rows — false claim of home-wire coverage. | fixed |
| Enhancement | `components/baby-care-one-tap.test.ts` | **Source-text theater.** Feed/sleep/diaper contracts are regex greps on `.tsx` source (symbol names / string keys), not rendered chrome or press→payload behavior. Rename-safe regressions can pass; prefer DOM/planner asserts where critical (adapter-2, duration payload). | fixed |
| Enhancement | Task 3 TDD · `components/baby-home.test.ts` | **Icon slots on home care controls untested.** Layout/order and pump chip testid are covered; no markup/assert of icon slots (or icon keys) per Gate A2 / Task 3 TDD. | fixed |
| Enhancement | `lib/baby-quick-care-plan.test.ts:264–276` | **`babyQuickCareStepMessageKey` omits `createPumpAmount`.** Distinct-key list still only has saveBreast / endNap / startNap / createFormula / createDiaper — would not catch a missing or colliding `home.stepCreatePumpAmount` key. | fixed |
| Nit | `components/baby-home.test.ts:253` | Idle home asserts `/Tap to stop\|Tap to start/` — always matches idle “Tap to start”; does not prove a **running** pump chip shows Tap to stop (chip unit covers chrome; home mount of running state does not). | fixed |

**Round notes:**

- Mapped draft tests to `04-tasks.md` Tasks 1–6 + folded `04a` Fix ask 1–5.
- **Strong (real, keep):** Zod timed/amount pump accept+reject (`lib/validators/baby.test.ts`); care-timer migrate / corrupt `nope` / one-running-side (`lib/baby-breast-timer-store.test.ts`); auto-finalize fixtures + server step order for `PUMP_AMOUNT` / `pump_l` (`lib/baby-quick-care-order-fixture.ts` + `features/baby/server/quick-care.test.ts`); rollup/summary (`lib/baby-feed-session.test.ts`); TimedCareChip tapToStop (`components/baby-timed-care-chip.test.ts`); guidelines exclusive (`components/baby-care-guidelines.test.ts`); Growth chips exclude pump (`lib/baby-growth-page-chips.test.ts`); home/feed/sleep skeleton order (`components/baby-page-skeleton.test.ts`); Growth e2e no Pump capture.
- **Gaps that block clean:** adapter-2 false-green helper; `writesFeed`/adopt for `PUMP_AMOUNT`; home Pump e2e; guideline/Pump i18n keys.
- No flaky `Date.now()` / random in new unit suites reviewed; timer tests use fixed `now` / startedAt.
- Result: **needs fix** (not clean).

### Fix notes (adversarial-tests, round 1)

- **Adapter-2:** Deleted dead `lib/baby-home-pump-amount.ts` (+ test). Added home Nap section source-scan in `components/baby-care-one-tap.test.ts` — Nap presses `SLEEP` only; no care-timer start/write / `BREAST` / pump sides.
- **`PUMP_AMOUNT` writesFeed/adopt:** Extended `planBabyQuickCare` tests for idle `feedSessionEventId` + running `pump_r` clear/stop; adopt covers `createPumpAmount` update + insert-after-`saveBreast`.
- **Step message key:** `babyQuickCareStepMessageKey` distinct-key list includes `createPumpAmount` → `home.stepCreatePumpAmount`.
- **i18n:** `lib/baby-i18n.test.ts` locks `home.tapToStop` / pump labels / four guide titles + feed/sleep/diaper stubs + Pump rows 1–6 (EN+VI) + locked volume band on `home.guide.pump.1`.
- **Timeline labels:** `careSummary` unit for `pump_l`/`pump_r` duration + `pump`+ml (+ VI `pump_l`).
- **Home icons / Tap-to-stop:** Idle pump chip asserts Tap to start (not stop); markup `<svg>` per care section; source wires `tapToStop` + `IconBaby*` keys.
- **E2e:** `Pump L start → Tap to stop → Done → idle` and `Pump amount chip posts PUMP_AMOUNT with ml` in `e2e/baby-home-option-b.spec.ts`; helpers `pumpL` / `pumpAmountMlChip`; bottle helpers scoped to bottle section (avoid pump-amount chip collision).
- **Verify:** Unit suites above green (`tsx --test` on touched files). E2e not run in this Fix pass (smoke/full later).

### Round 2 Adversarial (re-check after Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/baby-care.spec.ts:1660–1668` · `:3476–3497` · `:1681–1731` · `:3500–3517` · Task 5/6 TDD | **Feed/sleep e2e still targets pre–TimedCareChip chrome; feed Pump L path still missing.** Round 1 home Pump L / amount e2e Fix is real (`baby-home-option-b`). Care log e2e was not updated: feed still clicks `/start timer\|bắt đầu đếm/` though `feed.timerStart` is unused and live chips use TimedCareChip + `home.tapToStart` / breast·pump labels; “3AM eye flow” still expects a separate Start timer **above** method chips. Sleep still asserts dual Start+End buttons at once while UI is one chip (`sleep.start`/`sleep.end` + Tap to stop). Task 5 notes + Task 6 “smoke paths in Task 3/5 notes” still lack feed Pump L start→stop→`createBabyFeed` `{ method, durationSec }` (distinct from home quick-care). Growth “no Pump” OK. | fixed |
| Enhancement | `components/baby-care-one-tap.test.ts:32–46` · Task 5 “duration payload” | **Feed `pump_l` stop → duration payload still source-scan only.** Asserts `method: side, durationSec` in `.tsx` text — no unit that exercises press→GraphQL input. Complements the Major: home e2e cannot red on a feed-only mutation shape bug. | fixed |

**Round 2 notes:**

- **Round 1 Majors — verified fixed:** dead `baby-home-pump-amount` gone; Nap adapter-2 source-scan present; `PUMP_AMOUNT` idle `feedSessionEventId` + running finalize + `createPumpAmount` adopt; guideline/Pump i18n keys; home Pump L + amount e2e; `careSummary` pump labels; step key `createPumpAmount`; home icon/`tapToStop` wires.
- **Round 1 Enhancements — mostly held:** timeline labels, dead wrapper, step key, icons addressed. Source-text theater only partly addressed (Nap scan added; feed duration still regex).
- **Nits left open:** idle-home Tap to stop (running still chip-unit only) — does not block.
- Result: **needs fix** (not clean).

### Fix notes (adversarial-tests, round 2)

- **Feed/sleep e2e TimedCareChip:** Capture-navigate + 3AM eye-flow specs in `e2e/baby-care.spec.ts` now use chip testids (`baby-feed-method-*`, `baby-sleep-start`/`end`) and Tap to start / Tap to stop copy — no legacy Start timer / dual Start+End.
- **Feed Pump L path:** New e2e `feed Pump L stop posts createBabyFeed duration` asserts GraphQL `createBabyFeed` input `{ method: "pump_l", durationSec ≥ 1 }` then home land (distinct from home quick-care).
- **Duration payload unit:** Extracted `babyCareTimerStopFeedInput` in `lib/baby-breast-timer-store.ts`; feed form uses it on stop; `baby-care-one-tap.test.ts` + store unit assert `pump_l` → `{ method, durationSec }` (not source-scan only).
- **Verify:** Unit suites on touched files green. E2e not run in this Fix pass (smoke/full later).

### Round 3 Adversarial (re-check after Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No open Critical / Major / Enhancement | clean |

**Round 3 notes:**

- **Round 2 Major — verified fixed:** Capture-navigate feed/sleep use TimedCareChip testids + Tap to start/stop; 3AM eye flow asserts no legacy Start timer and single sleep chip; `feed Pump L stop posts createBabyFeed duration` locks GraphQL `{ method: "pump_l", durationSec ≥ 1 }` then home land.
- **Round 2 Enhancement — verified fixed:** `babyCareTimerStopFeedInput` used by feed `pressTimedSide` stop; unit + store tests assert `pump_l` → `{ method, durationSec }` (floor ≥1); call-site wire still asserted in one-tap; e2e covers mutation shape.
- **Prior rounds still held:** home Pump L/amount e2e; Nap adapter-2 scan; `PUMP_AMOUNT` writesFeed/adopt; i18n guide/Pump keys; timeline `careSummary` pump labels; Growth no Pump capture.
- **Nits left open (do not block):** idle-home Tap to stop (running still chip-unit / home Pump L e2e); sleep-page Done flash not asserted in capture-navigate (End navigates home; home Nap Done flash covers adapter-2).
- Result: **clean**.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-home.tsx:546–551,887–914` · `components/baby-sleep-form.tsx:133–135,225–232` · `lib/baby-home-done-flash.ts:43–46` · `components/baby-quick-value-card.tsx:196–226` | **Nap/Sleep shows Done while session is still running.** Gate A / TimedCareChip lock: running → elapsed + Tap to stop; Done only after stop. Home arms `sleepDone` on every confirmed `SLEEP` (start and end). After Start, `napOpen`/`hasOpenSleep` is true (`running`) **and** `doneText="Done"`. `BabyQuickSimpleCard` prefers `doneText` over value/subtitle → ~2s false Done covering Tap to stop. Sleep form Start stays on page (same overlap). Breast/Pump L·R correctly gate Done on `stopBreastSession` only — Nap/Sleep do not. | fixed |
| Enhancement | `components/baby-timed-care-chip.tsx:46–68` · `.test.ts:31–63` | **Chrome contract not enforced.** Docs say never Done while running, but chip forwards both `running` and `doneText` to `BabyQuickSimpleCard`. Unit never renders `running=true` + `doneText` together — Nap start regression stays green. Prefer suppress `doneText` when `running` (or refuse both). | fixed |
| Enhancement | `components/baby-feed-form.tsx:145–163` · `lib/baby-care-save-navigate.ts:10–18,53–55` · `components/baby-sleep-form.tsx:171–182` | **Feed stop / Sleep End Done flash is unreachable.** After stop, forms set Done then `afterSave: "home"` navigates immediately — flash never paints. Task 5 “Done-flash” on those paths is dead; only home (stay) shows real Done. | fixed |
| Enhancement | `components/baby-diaper-form.tsx:72–84` · Task 5 description | **Diaper log parity thin.** One-tap kinds OK, but no on-chip Done flash (toast + navigate only) and chips use `min-h-11` vs home/design `min-h-14` / night hit targets. | fixed |
| Enhancement | `components/baby-home.tsx` (~1190 lines) · Design D7 Option 2 | **Home not a thin shell yet.** TimedCareChip extracted, but home still owns planner, pending, bottle/pump amount, guidelines wiring, status — large single file after Option 2 “layout shell” claim. Follow-up extract OK; watch CLS/skeleton drift. | deferred |

**Round notes:**

- Mapped draft to `01-idea` / `03-design` / `04-tasks` (Tasks 1–6) + five quality axes.
- **Held (correct):** `pump_l`/`pump_r` validators + duration-only stop; `PUMP_AMOUNT` → `createPumpAmount` / `writesFeed` parity; widened care-timer + migrate; TimedCareChip on home/feed/sleep; home Rows 1–4 + exclusive guidelines + Pump table copy; Growth chips exclude `pump`; skeleton Rows 1–4 + four guideline headers; timeline labels; EN/VI Tap to stop / Pump strings.
- **Blocks clean:** Nap/Sleep Done-while-running (Major) — same class of false-Done bug the idea locked for timers.
- Result: **needs fix** (not clean).

### Checklist

- [x] Context understood
- [x] Correctness + tests adequate — Nap/Sleep Done only after End; TimedCareChip suppresses Done while running
- [x] Security (secrets, bounds, authz, injection) — no new issues in this Quality pass (SPM Security next)
- [x] Architecture (patterns, size, no complexity relocate) — TimedCareChip OK; home thinness deferred (Enhancement)
- [x] Readability — acceptable
- [x] Performance — no Quality blockers (SPM Perf next)
- [x] Deps/lockfile if touched — none for this slug
- [x] Verdict: **clean** (Round 2) — Round 1 Fix verified; home thinness Nit/FYI deferred

### Fix notes (quality, round 1)

- **MAJOR Nap/Sleep Done-while-running:** `babyHomeSleepDoneFlash` now takes `{ endedSleepSession }` (true only after End/stop). Home arms Done only when SLEEP steps include `endNap`. Sleep form Start no longer sets Done; End still does. Home unit: running + `sleepDoneSeed` must show Tap to stop, not Done. E2e: Start → running/no Done; End → Done ~2s.
- **TimedCareChip:** Suppresses `doneText` while `running` (chrome contract); unit covers `running=true` + `doneText="Done"` → Tap to stop only.
- **Feed stop / Sleep End / Diaper Done before navigate:** `runBabyCareSaveThenNavigate` optional `homeNavigateDelayMs` (+ injectable `delayFn`). Forms pass `BABY_CARE_DONE_BEFORE_NAV_MS` (450) so Done can paint before home push without changing stay contracts.
- **Diaper log parity:** On-chip Done flash via `babyHomeDiaperDoneKind` + `min-h-14` hit target.
- **Home thinness (D7):** Deferred — not a quick win this Fix round; TimedCareChip extract already landed; further shell split is follow-up.
- **Verify:** Unit suites on touched files green. E2e not run in this Fix pass (smoke/full later).

### Round 2 Quality (re-check after Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No open Critical / Major / Enhancement | clean |

**Round 2 notes:**

- **Round 1 Major — verified fixed:** Home SLEEP Done arms only when steps include `endNap` (`endedSleepSession`); sleep form Start no longer sets Done; End still does. Unit: running Nap + `sleepDoneSeed` → Tap to stop, not Done. E2e: `nap Start stays running (no Done); End shows Done then idle`. TimedCareChip still suppresses `doneText` while `running` (belt-and-suspenders).
- **Round 1 Enhancements — verified fixed:** TimedCareChip `showDone = doneText && !running` + unit; feed stop / sleep End / diaper pass `homeNavigateDelayMs: BABY_CARE_DONE_BEFORE_NAV_MS` (450) so Done can paint before home push; diaper log uses `babyHomeDiaperDoneKind` + `min-h-14`.
- **Deferred home thinness (D7):** TimedCareChip extract (locked Option 2 chrome) is in place on home/feed/sleep; further shell split remains follow-up. Recorded as Nit/FYI only — does not break Gate A / Tap-to-stop / row locks this pass.
- **Held vs 01-idea / 03-design / 04-tasks:** Rows 1–4 + exclusive guidelines; `pump_l`/`pump_r` duration + `PUMP_AMOUNT`→`pump`+ml; widened care-timer; Growth no pump chips; EN/VI Tap to stop / Pump copy; skeleton Rows 1–4.
- Result: **clean**.

---

## Merged SPM (Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-security.md`, `05-lens-performance.md`, `05-lens-memory.md`.

**Round:** 1
**Lenses this round:** security + performance only (no memory)
**Result:** clean

### Winners (Fix these)

| Severity | Sources (security/perf/memory) | Finding | Decision |
|----------|--------------------------------|---------|----------|
| — | security / perf | No open Critical / Major / Enhancement after merge. | No Fix ask. |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| Security S1 Enhancement: Zod still allows any positive `amountMl` / `durationSec` (no server hard max); client steppers cap Bottle/Pump UI only | Deferred Nit / optional follow-up | Security lens Result already **clean**; same pre-existing gap as FORMULA/breast; new `PUMP_AMOUNT` / `pump_l`/`pump_r` inherit it. Not privilege or cross-tenant. Demote — do not block SPM. Optional later: share server max with FORMULA. |
| Security note: `createPumpAmount` absent from Telegram notify filter (`saveBreast` / `createFormula` only) | — (not a finding) | Product parity gap; reduces fan-out. No security action. |
| Perf FYI: Feed form 1s `setInterval` → `setNowMs` on whole form while timed side runs | — (not a finding) | Small tree; better than prior 250 ms. Isolate only if measure shows jank. |
| Perf FYI: Feed elapsed tick lacks visibility/focus wake (home child has both) | — (not a finding) | UX wake; next ≤1s tick corrects. Not load. |
| Perf FYI: Home Nap elapsed rides ≥30s parent clock | — (not a finding) | Coarser = better re-render cost; pre-existing. |
| Perf FYI: `guidelineSections` rebuilt each `BabyHomeContent` render | — (not a finding) | Four tiny static sections; noise. Repo avoids default `useMemo`. |
| Perf FYI: Home LOC ~1.2k with Row 3–4 | — (not a finding) | Locked Option 2 packaging; measure before further splits. |

### Fix ask (for Fix agent)

_(empty — Result clean)_

**Round notes:**

- **Lenses this round:** security + perf (SPM plan); memory not in plan.
- Both lens files **Result: clean** — zero Critical / Major. Perf had no Enhancement; security S1 optional only → demoted above.
- No conflicts between security and perf (no overlapping Fix asks).
- Adversarial + Quality already clean upstream; no SPM Fix round.
