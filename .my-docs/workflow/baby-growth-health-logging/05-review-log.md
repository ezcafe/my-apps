# Review log: Baby Growth + health logging

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/baby-care.spec.ts:1673–1693` | **Task 3a E2E incomplete for vaccine write home.** Create via Growth is covered; **edit and delete from Growth Recent are not.** `BabyGrowthPage` wires `updateBabyVaccine` / `deleteBabyVaccine` (`components/baby-growth-page.tsx` ~305–318, ~385–394) but no e2e or component test exercises those paths. A regression that leaves Vaccines read-only while breaking Growth edit/delete would still pass today’s suite. | fixed |
| Major | Task 3a TDD · `components/baby-growth-page.tsx:244–256` · no matching `*.test.ts` | **Med/vitamin Save UI gate untested.** Server Zod covers trim/empty name (`lib/validators/baby.test.ts:323–349`). Vaccine UI gate has `growthVaccineSaveBlocked` unit tests (`lib/baby-growth-recent.test.ts:74–91`). Medication/vitamin only use private `medNameOk()` / `saveBlockedReason()` with **no** unit/component assertion that blank/`"   "` name disables Save or surfaces `growth.nameRequired`. Acceptance requires UI + server. | fixed |
| Major | `lib/validators/baby.ts:242–259` · `lib/validators/baby.test.ts` (create-only) | **`updateBabyGrowthSchema` health rules have zero tests.** Create covers med/vitamin/pump/temp. Update reuses `refineBabyGrowthKindFields` only when `kind` is present; if `kind` is omitted, refine is skipped (comment admits callers “should send kind”). No negative cases for update med without name, empty temperature, invalid notes, or the kind-omit bypass — edit Save / API failure modes for this slice are unverified. | fixed |
| Enhancement | `components/baby-vaccines-page.test.ts:12–18` · `components/baby-growth-health-logging.test.ts:23–34,57–65` | **Source-text theater.** Vaccines “read-only” unit only greps `baby-vaccines-page.tsx` for mutation names / strings — does not render the page or assert absence of edit/delete controls in the DOM. Insights “date-only” unit greps for `multiSelectFilters={` / `triggerCount={1}` in source rather than rendered chrome. E2E partially compensates (no Care types button; Vaccines deep link + no create button) but units alone would still pass if write UI returned under different symbols. Prefer render/DOM (or keep e2e as the sole contract and drop brittle greps). | fixed |
| Enhancement | `lib/validators/baby.test.ts:377–415` | **Create schema temperature notes: free-text/legacy path untested.** Unknown symptom id is asserted; helpers cover free-text decode (`lib/baby-growth-symptoms.test.ts:35–39`). No `createBabyGrowthSchema.safeParse` case with `notes: "felt warm…"` (or invalid JSON) proving Zod rejects with `invalid symptoms notes`. Thin integration risk if refine stops calling decode. | fixed |
| Nit | Task 5 · `messages/baby/en.ts` `home.growth` / `insights.logMeasure` | Nav/header/`growth.title` covered; **no** unit asserting Home/Insights CTA copy stays “Growth” (keys still named `logMeasure` / `measure.*`). Low risk while values say Growth. | open |
| Nit / FYI | `04a` optional · Recent empty / partial fetch | Empty Recent quiet copy and one-list-fails UX remain untested (Enhancement in 04a, not Gate B required). `listState` uses `growthQuery.isError && vaccinesQuery.isError` — partial success intentional; still no assert. | open |

**Round notes:**

- Mapped draft tests to `04-tasks.md` Tasks 1–5 + folded 04a Fix ask 1–5.
- **Strong:** redirects (`lib/baby-growth-redirects.test.ts`); Growth chips vs Insights chips (`lib/baby-growth-page-chips.test.ts`); Recent merge N=50 + vaccine create input/block (`lib/baby-growth-recent.test.ts`); symptoms encode/decode/re-pick/hasContent (`lib/baby-growth-symptoms.test.ts`); create Zod med/vitamin/pump/temp (`lib/validators/baby.test.ts`); nav/header Growth href; e2e Growth capture, med+temp+pump, vaccine create + Vaccines deep link, Insights no Care types; skeleton order + emptyTimeline date-only copy.
- **Gaps that block clean:** vaccine edit/delete coverage; med/vitamin UI Save gate; update Zod health rules / kind-omit.
- No flaky `Date.now()` / random in new unit suites; merge times use fixed UTC ISO strings.
- No pure mock-theater of fakes asserting call counts without behavior — main weak pattern is **source greps** (Enhancement above).
- Result: **needs fix** (not clean).

### Fix notes (adversarial-tests)

- **E2E Task 3a:** Added `vaccine edit and delete from Growth Recent` in `e2e/baby-care.spec.ts` (create → edit name/dose → delete; asserts Recent updates).
- **Med/vitamin UI Save gate:** Extracted `growthMedNameSaveBlocked` (same pattern as vaccine gate) in `lib/baby-growth-recent.ts`; wired in `BabyGrowthPage`; unit coverage in `lib/baby-growth-recent.test.ts`.
- **`updateBabyGrowthSchema`:** Added health negative tests (med/vitamin name, empty/invalid temp). Closed kind-omit bypass: health field patches without `kind` now fail with `kind is required`; `recordedAt`-only updates may still omit kind.
- **Source-text theater:** Vaccines units render `BabyVaccinesReadOnlyCue` / `BabyVaccineReadOnlyRow` (no Edit/Delete buttons). Insights skeleton asserts one `h-11 w-20` trigger placeholder vs Activities’ two; Insights date-only chrome renders `InsightsDateRangeFiltersBar` with empty multi-selects (no Care types) vs with Care types.
- **Create temp notes:** Added `createBabyGrowthSchema` cases for free-text / invalid JSON / wrong `v` → `invalid symptoms notes`.
- **Nits left open** (not in Fix ask): Home/Insights CTA copy; Recent empty/partial.
- **Tests run:** `lib/baby-growth-recent.test.ts`, `lib/validators/baby.test.ts`, `components/baby-vaccines-page.test.ts`, `components/baby-growth-health-logging.test.ts` — all pass. E2E not executed in this Fix pass (added; parent smoke/full will run).

### Round 2 (re-check) — 2026-09-19

Re-verified Fix claims against current tests + production wiring (fresh context; did not write this code). Mapped again to `04-tasks.md` Tasks 1–5 + folded 04a.

| Round 1 finding | Re-check |
|-----------------|----------|
| Major · vaccine edit/delete e2e | **Closed.** `e2e/baby-care.spec.ts` ~1695–1727: create unique vaccine on Growth → Edit name/dose → assert Recent → Delete → count 0. Create path still covered ~1673–1693. |
| Major · med/vitamin UI Save gate | **Closed.** `growthMedNameSaveBlocked` in `lib/baby-growth-recent.ts`; wired for `medication`/`vitamin` in `saveBlockedReason` (`baby-growth-page.tsx` ~250–252); units blank/`"   "` vs named (`lib/baby-growth-recent.test.ts` ~95–101). Same helper-level bar as vaccine gate. |
| Major · `updateBabyGrowthSchema` health rules | **Closed.** Negatives for med/vitamin name, empty/invalid temp; kind-omit on health patches fails `kind is required`; `recordedAt`-only may omit kind (`lib/validators/baby.test.ts` ~449–527). Production refine matches (`lib/validators/baby.ts` ~252–271). |
| Enhancement · source-text theater | **Closed.** Vaccines: render `BabyVaccinesReadOnlyCue` / `BabyVaccineReadOnlyRow` — no Edit/Delete/Save buttons; page composes those leaves only (+ Load more). Insights: skeleton trigger placeholder count 1 vs Activities 2; bar render with empty `multiSelectFilters` omits Care types / Growth kinds; live Insights omits `multiSelectFilters` prop; e2e asserts no Care types button (~1811–1814). |
| Enhancement · create temp free-text notes | **Closed.** `createBabyGrowthSchema` rejects free-text / invalid JSON / wrong `v` with `invalid symptoms notes` (`lib/validators/baby.test.ts` ~418–446). |
| Nit · Home/Insights CTA copy | **Open** (non-blocking). EN `home.growth` / `insights.logMeasure` say Growth; no dedicated unit lock. VI keeps “Cân đo” (matches locked `growth.title` vi). |
| Nit / FYI · Recent empty / partial | **Open** (non-blocking). Still untested; not Gate B required. |

**Also spot-checked (still real, not weakened):** Growth chip catalog vs Insights chips; Recent N=50 merge; vaccine create input/block; symptoms encode/decode; create Zod med/vitamin/pump/temp; redirects; Vaccines deep link e2e; Growth skeleton kinds→form→recent order.

**Tests run:** `npx tsx --import ./scripts/test-env.mjs --test lib/baby-growth-recent.test.ts lib/validators/baby.test.ts components/baby-vaccines-page.test.ts components/baby-growth-health-logging.test.ts` — 60 pass. E2E not re-run this re-check (suite present; parent full test will execute).

**Result:** Adversarial test review: clean. Zero Critical / Major / Enhancement.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `lib/validators/baby.ts` `updateBabyGrowthSchema` (~252–268) · `components/baby-insights-edit-modal.tsx` `saveGrowth` (~161–170) | **Activities growth edit broken by kind-required refine.** Update now rejects any health-field patch without `kind`. Activities/Insights edit modal still sends `{ id, valueNum, unit, notes, recordedAt }` with **no `kind`** — same shape the suite documents (`lib/baby-insights-activity-edit.test.ts`, e2e `Activities growth edit save hits updateBabyGrowth`). Against a real server this fails `kind is required` for every growth edit from Activities (weight/height/head included). E2E mocks GraphQL success so it stays green. Growth page itself always sends `kind` (OK). Fix must re-wire Activities save (send `row.growthKind` / existing kind) **and** keep med/vitamin/temp rules coherent (modal has no name field; free-text `notes` fights D5 symptoms JSON). | fixed |
| Major | `components/baby-growth-page.tsx` update branch (~351–360) · `features/baby/server/growth.ts` (~217–219) | **Growth edit always nulls `notes` / `valueText` the UI did not load.** Update input uses `notes: notes ?? null` and `valueText: valueText ?? null`. For non-temperature kinds `notes` stays `undefined` → sent as `null` → server clears DB notes. Measure-only kinds leave `valueText` undefined → cleared too. Old Measure update omitted those keys (partial update). Any pre-existing notes (or incidental `valueText`) are wiped on Edit→Save from Growth Recent. Prefer omit-undefined like the server already supports. | fixed |
| Enhancement | `lib/baby-insights-activity-log.ts` `activityLogRowTitleKey` (~202–215) | **New growth kinds lack Activities i18n titles.** `vitamin` / `pump` fall through to `row.title` (raw kind id). Design allows Activities chip chrome unchanged but still asks for Growth label consistency; once parents log vitamin/pump, Activities ledger shows machine ids instead of `growth.vitamin` / `growth.pump`. | fixed |
| Enhancement | `lib/baby-growth-recent.ts` `formatGrowthSummary` (~77–94) · `03-design.md` Recent row display | **Symptoms-only Recent rows lack symptom summary.** Temp with only symptoms (no `valueNum`) summarizes as the kind id (`temperature`), so the row reads like “Temperature · temperature”. Design prefers time + short summary with symptom labels. | fixed |
| Enhancement | `components/baby-insights-edit-modal.tsx` growth notes field (~306+) · D5 lock | **Activities free-text notes vs symptoms JSON.** Modal exposes raw `notes` for all growth kinds. After Critical #1 is fixed with `kind: temperature`, saving free-text / legacy notes hits Zod `invalid symptoms notes`, and a successful encode path would replace structured symptoms. Growth owns temp±symptoms this pass — Activities edit should not fight D5 (block, strip notes field for temperature, or deep-link to Growth). | fixed |
| Nit | `messages/baby/vi.ts` `growth.pump` vs `feed.pump` | Both are “Hút sữa” — Gate A pump-vs-Feed confusion risk on VI. EN “Pumping” is clearer. | open |
| Nit | `messages/baby/en.ts` `measure.*` · `BabyMeasurePage` alias | Legacy `measure.title` / `measure.entries` and deprecated `BabyMeasurePage` export remain. Low risk while values say Growth. | open |
| FYI | `components/baby-growth-page.tsx` (~690 lines) · Decision 1 Option 1 | Page owner grew as designed; helpers extracted (`chips` / `recent` / `symptoms`). No further split required this pass unless Fix work touches the file. | — |
| FYI | Locks spot-check | Held: `/baby/growth` capture + measure→growth redirect; vaccine facade on Growth; Vaccines read-only + deep link; Insights date bar without `multiSelectFilters` (styles kept); Growth-only chips; symptoms `v:1` JSON; Insights/Activities chip catalogs not extended with vitamin/pump/vaccine. | — |

**Round notes:**

- Fresh Quality pass against `01-idea.md` / `03-design.md` / `04-tasks.md` + uncommitted Growth draft (not the author).
- Adversarial suite is clean; it did not cover Activities edit vs the new update refine (mocked e2e).
- **Blocks clean:** Critical Activities edit regression + Major Growth update null-wipe.
- Result: **needs fix** (not clean).

### Fix notes (quality)

- **Critical · Activities kind:** Added `buildActivityGrowthUpdateInput` — always includes `kind` from the row. Wired in `BabyInsightsEditModal.saveGrowth`. Unit: weight edit with kind passes `updateBabyGrowthSchema`; old no-kind shape still fails.
- **Major · Growth update wipe:** Added `buildBabyGrowthUpdateInput` — omits `notes` / `valueText` when unset. Growth page Edit→Save uses it. Unit asserts omit vs explicit null.
- **Enhancement · vitamin/pump titles:** `activityLogRowTitleKey` maps `vitamin` → `growth.vitamin`, `pump` → `growth.pump`.
- **Enhancement · symptoms-only summary:** `formatGrowthSummary` joins decoded symptom ids when temperature has no `valueNum`.
- **Enhancement · D5 notes:** Activities modal hides notes field for `temperature`; save preserves `existingNotes` (symptoms JSON) and never takes free-text. Med/vitamin preserve `existingValueText` (modal has no name field).
- **Nits left open:** VI pump copy; legacy `measure.*` / `BabyMeasurePage`.
- **Tests run:** `lib/baby-insights-activity-edit.test.ts`, `lib/baby-growth-recent.test.ts`, `lib/baby-insights-activity-log.test.ts` — 44 pass.
- **Behavior changed:** yes (Activities growth edit sends kind + preserves temp/med fields; Growth update no longer null-wipes unset notes/valueText; Recent/Activities labels for vitamin/pump/symptoms-only).

### Round 2 (re-check) — 2026-09-19

Re-verified Quality Fix claims against current code + tests (fresh context; did not write this draft). Checked against `01-idea.md` / `03-design.md` / `04-tasks.md`.

| Round 1 finding | Re-check |
|-----------------|----------|
| Critical · Activities growth edit missing `kind` | **Closed.** `buildActivityGrowthUpdateInput` always includes `kind` from the row (`lib/baby-insights-activity-edit.ts`); wired in `BabyInsightsEditModal.saveGrowth`. Unit: weight+kind passes `updateBabyGrowthSchema`; old no-kind shape fails (`lib/baby-insights-activity-edit.test.ts`). |
| Major · Growth Edit→Save null-wipes unset notes/valueText | **Closed.** `buildBabyGrowthUpdateInput` omits unset `notes`/`valueText`; Growth page update uses it. Server already supports partial omit (`features/baby/server/growth.ts` ~217–219). Units: omit vs explicit null (`lib/baby-growth-recent.test.ts`). |
| Enhancement · vitamin/pump Activities titles | **Closed.** `activityLogRowTitleKey` maps `vitamin` → `growth.vitamin`, `pump` → `growth.pump`; EN/VI keys present; unit covers both. |
| Enhancement · symptoms-only Recent summary | **Closed.** `formatGrowthSummary` joins decoded symptom ids when temperature has no `valueNum` (no longer falls through to kind id). Prefer-temp-value when present still holds. |
| Enhancement · Activities free-text notes vs D5 | **Closed.** Modal hides notes for `temperature`; save preserves `existingNotes` (never form free-text). Med/vitamin preserve `existingValueText`. Units cover both paths. |
| Nit · VI `growth.pump` vs `feed.pump` | **Open** (non-blocking). Both “Hút sữa”. |
| Nit · legacy `measure.*` / `BabyMeasurePage` | **Open** (non-blocking). |

**Also spot-checked (locks still held):** `/baby/growth` chip catalog (incl. UI-only vaccine); Insights omits `multiSelectFilters`; Vaccines deep link only (no write mutations); Growth Recent owns vaccine path; D5 symptoms JSON ownership on Growth.

**Nit (new, non-blocking):** symptoms-only Recent summary uses allowlist ids (`cough, rash`) not `growth.symptom.*` labels — page already has `symptomLabelKey` for the form. Acceptable this pass.

**Tests run:** `npx tsx --import ./scripts/test-env.mjs --test lib/baby-insights-activity-edit.test.ts lib/baby-growth-recent.test.ts lib/baby-insights-activity-log.test.ts` — 44 pass.

**Result:** Quality review: clean. Zero Critical / Major / Enhancement.

---

## Merged SPM (Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-security.md`, `05-lens-performance.md`, `05-lens-memory.md`.

**Round:** 1
**Result:** clean

### Winners (fix these)

| Severity | Sources (security/perf/memory) | Finding | Decision |
|----------|--------------------------------|---------|----------|
| — | security / perf | No open Critical / Major / Enhancement after merge. | No Fix ask. |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| Security S1 Enhancement: Zod still accepts free-text `notes` (max 2000) on non-`temperature` growth kinds; Insights may show notes for non-temp rows | Deferred Nit / optional follow-up | Security lens Result already **clean**; labeled optional beyond D5 symptoms-only for this pass. Not Critical/Major. Demote — do not block SPM. Future pass may reject/strip `notes` unless `kind === "temperature"`. |
| Perf FYI: Dual GraphQL HTTP (growth + vaccines) vs one batched op | — (not a finding) | Parallel RQ; each capped at 50. Design Option 1 + D6. Measure before batching. |
| Perf FYI: `mergeBabyGrowthRecentEntries` (+ temp `JSON.parse`) on form re-renders | — (not a finding) | ≤100 mapped → top 50; noise at this size. Repo avoids default `useMemo`. |
| Perf FYI: Recent waits until both queries finish (`isLoading` OR) | — (not a finding) | Simple list-state; progressive reveal is polish only. |
| Perf FYI: No Load more on Growth Recent | — (not a finding) | Explicit design: top-50 merge window. |
| Perf FYI: `InsightsDateRangeFiltersBar` from large `analytics-filters.tsx` | — (not a finding) | Pre-existing coupling; this pass only drops extra FilterMenus. |
| Perf FYI: Growth client page ~2× prior Measure LOC | — (not a finding) | Locked Option 1 packaging; no heavy deps. |
| Security note: Vaccines UI read-only vs GraphQL vaccine mutations still exposed | — (not a finding) | Intentional D3 Growth facade; authz unchanged. Do not remove mutations. |

### Fix ask (for Fix agent)

_(empty — nothing to fix)_

**Round notes:**

- **Lenses this round:** security + perf (SPM plan); memory not in plan.
- Both lens files **Result: clean** — zero Critical / Major. Perf had no Enhancement; security S1 optional only → demoted above.
- No conflicts between security and perf (no overlapping Fix asks).
- Adversarial + Quality already clean upstream; no SPM Fix round.

---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:

- None this round (quality Fix used TDD / behavior tests).
