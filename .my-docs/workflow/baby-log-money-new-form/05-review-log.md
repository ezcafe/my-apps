# Review log: Baby log forms + vaccines on Growth

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-growth-page.test.ts` + `lib/baby-growth-page-save.ts` | **Source / helper theater for Growth save wiring** (round 1). Round 2: extract `runBabyGrowthPageSaveThenStay` locks `afterSave: BABY_CARE_AFTER_SAVE.growth`; success units use mock mutate / onSuccess / router — vaccine → vaccines scope + no `/baby` push; weight → growth scope + no `/baby` push; page must call extract (not diaper afterSave). Maps Task 2 / 04a Majors. | fixed |
| Enhancement | `components/baby-care-one-tap.test.ts` | **One-tap “no extra Save” weak source theater** (round 1). Round 2: asserts GraphQL mutate inside primary `log` / `start` / `end` handlers; feed/diaper ban Button Save import; sleep start/end mutate path has no Button. Maps Task 5 / 04a Enhancement. | fixed |
| Enhancement | `components/baby-page-skeleton.test.ts` | **Feed / diaper / sleep skeleton parity untested** (round 1). Round 2: `renderToStaticMarkup` locks timer 2 → method 4, diaper 3, sleep 2 + concentric radii. Maps Task 6. | fixed |
| Nit | `BABY_VACCINE_CAPTURE_HREF` / redirects | Constant + `next.config` destinations aligned in `baby-growth-redirects.test.ts`. | fixed |
| Nit | `lib/baby-care-save-navigate.test.ts` | Success stay case with `afterSave: BABY_CARE_AFTER_SAVE.growth`. | fixed |
| FYI | — | **Round 2 solid:** Task 1 chips; Task 3 redirect unit; care-save growth stay; e2e vaccine stay+reset Weight. Helper-unit `resetChip` is still set inside the test onSuccess (self-fulfilling) — page calls `resetForm()` and e2e locks stay+reset; not worth a new Enhancement. One-tap remains source-scan (not mount) but now fails if mutate leaves the primary handlers or a Button Save is added on feed/diaper. | — |

**Result:** clean

**Round notes:**

### Round 1
- Needs fix (1 Major, 2 Enhancement). Fix agent remediated (see Fix notes).

### Round 2 (re-check after Fix)
- Re-read `00-run.md`, `04-tasks.md`, `04a`, Fix notes; inspected `lib/baby-growth-page-save.ts`, `components/baby-growth-page.test.ts`, `baby-care-one-tap.test.ts`, `baby-page-skeleton.test.ts`, care-save-navigate + redirects, page wire to extract.
- Prior Major + both Enhancements + Nits: **closed**. No new Critical / Major / Enhancement.
- No mock theater on Growth success path (real async through extract + fake router). No flaky time/random in these units.
- Adversarial test review: clean.

### Round 3 (re-check after merged-spm Fix)
- Scope: new/changed test only — `lib/validators/baby.test.ts` “rejects forged kind vaccine…”.
- Asserts `createBabyGrowthSchema.safeParse({ kind: "vaccine", valueNum: 3.4, unit: "kg" })` fails — real Zod parse, no mocks; otherwise-valid fields so fail is on kind, not missing value; locks design abuse / SPM S1.
- Spot-check prior clean suite still sound (Growth save extract + stay; chips sentinel ≠ DB; one-tap / skeleton / redirects unchanged in intent).
- No new Critical / Major / Enhancement.
- Adversarial test review: clean.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-growth-page.tsx` (`useEffect` on `searchParams` + `resetForm`) | **Post-save Weight reset fights sticky `?kind=vaccine`.** Design lock: stay + toast + reset to Weight. Round 1: `resetForm()` only flipped local `kind`; URL kept `?kind=vaccine`; effect always re-applied param. Round 2: `babyGrowthChipWhenKindParamChanges` + ref apply param only when value changes; success and chip-pick-that-fights-URL call `router.replace(BABY_GROWTH_CAPTURE_HREF)` and clear applied ref. Sequence unit + page source asserts lock it. | fixed |
| Enhancement | `components/baby-growth-page.tsx` save path vs `lib/baby-growth-recent.ts` | **Vaccine mutate bypasses `growthVaccineCreateInput`.** Round 1: gate via helper, mutate built `{ name, dose }` inline. Round 2: mutate uses `growthVaccineCreateInput` → `mapped.input`; page test bans inline input pattern. | fixed |
| Enhancement | `messages/baby/en.ts` + `vi.ts` (`vaccine.title`, `vaccine.logOnGrowth`, `vaccine.readOnlyHint`) | **D3 leftover / unused capture copy.** Round 1: `vaccine.title` was “Log vaccines”; unused `logOnGrowth` / `readOnlyHint`. Round 2: title → “Vaccine” / “Vắc-xin”; unused keys removed; i18n tests lock both. | fixed |
| Nit / FYI | `lib/baby-growth-list-state.ts`, `mergeBabyGrowthRecentEntries`, `BabyGrowthListSkeleton` | Dead Recent-list plumbing after create-only Growth (tests-only). **Accepted deferred** this pass — not an open Enhancement. Ask before delete later. | deferred (accepted) |
| Nit / FYI | `lib/app-section-nav.ts` `babyVaccine` + `IconBabyVaccine` / tab map | Unused after Vaccines nav drop. **Accepted deferred** this pass. Ask before delete later. | deferred (accepted) |
| Nit | `lib/baby-growth-kind-chips.ts` | Comment said “Measure page”; now “Growth page”. `babyMeasureKindFilter` name left as-is. | fixed (comment only) |
| FYI | Tasks 1–7 spot-check | Chip order + UI sentinel; `?kind=vaccine`; permanent vaccines→Growth redirect; vaccines route/page deleted; feed/sleep/diaper one-tap chrome; static 8-chip Growth skeleton; D3 capture copy cleaned; Growth stay + extract save helper; sticky-kind clear on save/chip fight. | — |

**Result:** clean

**Round notes:**

### Round 1
- Needs fix (1 Major, 2 Enhancement + deferred dead code). Fix agent remediated Majors/Enhancements (see Fix notes quality).

### Round 2 (re-check after Fix)
- Re-read `01-idea` / `03-design` / `04-tasks` / Fix notes (quality); inspected `baby-growth-page.tsx`, `baby-growth-page-chips.ts` (+ tests), messages en/vi, `baby-i18n.test.ts`, kind-chips comment.
- Prior Major (sticky kind) + both Enhancements (createInput wire, D3 copy): **closed** in current code.
- Deferred dead Recent-list helpers / `BabyGrowthListSkeleton` / unused `babyVaccine` icon: **accepted deferred** → Nit/FYI only; do not block clean.
- No new Critical / Major / Enhancement.
- Checklist: Context ✓ · Correctness (sticky `?kind=` vs Weight reset) ✓ · Security (fixed redirect; no new API) ✓ · Architecture (Option 1; sentinel ≠ DB; shared vaccine create helper) ✓ · Readability ✓ · Performance no new N+1 · Deps untouched.
- Verdict: **Approve** — Quality review: clean.

---

## Merged SPM (Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-security.md`, `05-lens-performance.md`, `05-lens-memory.md`.

### Round 1

**Round:** 1
**Lenses this round:** security + performance only (no memory)
**Result:** needs fix

#### Winners (Fix these)

| Severity | Sources (security/perf/memory) | Finding | Decision |
|----------|--------------------------------|---------|----------|
| Enhancement | security S1 | Design abuse case “forge `kind: vaccine` on `createBabyGrowth`” is blocked by Zod enum + DB enum, and UI chips assert sentinel ≠ DB kind — but there is no Zod unit that asserts `createBabyGrowthSchema` rejects `"vaccine"`. | **Keep.** Real CI lock for a design abuse case. Security lens labeled itself “clean” while listing this Enhancement — treat as open. Add `safeParse({ kind: "vaccine", … })` expect fail in `lib/validators/baby.test.ts`. |

#### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| (none) | — | No Security vs Perf clash. Perf had no open Critical/Major/Enhancement. |

#### Deferred / Nit / FYI (do not Fix)

| Note | Source | Why not a Fix item |
|------|--------|--------------------|
| Activities still runs three parallel infinite queries (timeline + growth + vaccines) | perf FYI | Pre-existing list surface; not from this draft. Measure before batching. |
| Growth save invalidates `insightsSeries` while user stays on capture | perf FYI | Correct stale marking; no active observer on Growth → no refetch storm. |
| `saveBlockedReason()` on render | perf FYI | Tiny pure checks; speculative micro-opt. |
| Feed timer `setInterval` 250ms | perf FYI | Pre-existing; chrome restyle did not change it. |

#### Fix ask (for Fix agent)

1. **Enhancement (S1)** — In `lib/validators/baby.test.ts`, add a unit that `createBabyGrowthSchema.safeParse` with `kind: "vaccine"` (plus otherwise valid growth fields) **fails**. Locks the design abuse case “forge vaccine on createBabyGrowth” in CI. No production code change expected.

**Round notes:**

- Merged security + performance only (SPM plan; no memory lens file required).
- Security: no Critical/Major; one Enhancement (S1) kept as open despite lens Result “clean”.
- Performance: clean — no winners. FYI residuals documented above; not Fix ask.
- Dedup: nothing to merge across lenses.
- After Fix: re-run security + perf → Merge again.

### Round 2 (re-verify after Merged SPM Fix)

**Round:** 2
**Lenses this round:** security + performance only (no memory)
**Result:** clean

#### Winners (Fix these)

| Severity | Sources (security/perf/memory) | Finding | Decision |
|----------|--------------------------------|---------|----------|
| — | — | None. Prior S1 closed by Zod unit in `lib/validators/baby.test.ts`. | — |

#### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| (none) | — | No Security vs Perf clash. Both lenses report clean. |

#### Deferred / Nit / FYI (do not Fix)

| Note | Source | Why not a Fix item |
|------|--------|--------------------|
| Activities still runs three parallel infinite queries (timeline + growth + vaccines) | perf FYI | Same Round 1 residual; pre-existing; not from this draft. |
| Growth save invalidates `insightsSeries` while user stays on capture | perf FYI | Correct stale marking; no refetch storm on Growth. |
| `saveBlockedReason()` on render | perf FYI | Speculative micro-opt. |
| Feed timer `setInterval` 250ms | perf FYI | Pre-existing; chrome restyle did not change it. |

#### Fix ask (for Fix agent)

(none)

**Round notes:**

- Re-read Round 2 `05-lens-security.md` + `05-lens-performance.md` and Fix notes (merged-spm Round 1).
- **S1 closed:** Zod unit rejects forged `kind: "vaccine"` on `createBabyGrowthSchema` (49 pass). Security Result clean; no Critical/Major/Enhancement.
- **Perf:** clean — Fix was test-only; no new production perf surface. Round 1 FYIs remain deferred only.
- Dedup / conflicts: nothing open across lenses.
- **Result: clean** — zero open Critical / Major / Enhancement. SPM loop done. Lens files left untouched; no production code in this step.

---

## Fix notes (adversarial-tests)

**Round:** 1 · Fix agent · tests/behavior changed: **yes**

### What was fixed

1. **Major — Growth save success-path unit (extract-and-call)**
   - Added `lib/baby-growth-page-save.ts` → `runBabyGrowthPageSaveThenStay` (locks `afterSave: BABY_CARE_AFTER_SAVE.growth`, branches mutate target + invalidate scope).
   - Wired `components/baby-growth-page.tsx` through that helper.
   - Replaced theater in `components/baby-growth-page.test.ts` with mock mutate / onSuccess / router success units: vaccine → vaccines scope + no `/baby` push; weight → growth scope + no `/baby` push; page must call the extract (not diaper afterSave).
   - TDD: Red = page wiring assert failed until page used extract; Green after wire.

2. **Enhancement — one-tap tests**
   - `components/baby-care-one-tap.test.ts` now asserts mutate lives inside primary chip handlers (`log` / `start` / `end` + `babyGraphQLRequest`) and there is no required Save control on that path (sleep allows Button only for retry-check).

3. **Enhancement — feed/diaper/sleep skeleton parity**
   - `components/baby-page-skeleton.test.ts` asserts chip order/count + concentric radii (timer 2 → method 4; diaper 3; sleep 2).

4. **Nit — BABY_VACCINE_CAPTURE_HREF**
   - `lib/baby-growth-redirects.test.ts` asserts next.config vaccine redirect destinations match `BABY_VACCINE_CAPTURE_HREF`. No separate Insights/Activities “log vaccine” capture CTA found to wire yet.

5. **Nit — Growth afterSave stay**
   - One-liner in `lib/baby-care-save-navigate.test.ts` with `afterSave: BABY_CARE_AFTER_SAVE.growth`.

### TDD skipped — no behavior

- (none)

### Tests run

```text
npx tsx --import ./scripts/test-env.mjs --test \
  components/baby-growth-page.test.ts \
  components/baby-care-one-tap.test.ts \
  components/baby-page-skeleton.test.ts \
  lib/baby-care-save-navigate.test.ts \
  lib/baby-growth-redirects.test.ts
→ 29 pass / 0 fail
```

---

## Fix notes (quality)

**Round:** 1 · Fix agent · tests/behavior changed: **yes**

### What was fixed

1. **Major — sticky `?kind=vaccine` vs post-save Weight reset**
   - Added `babyGrowthChipWhenKindParamChanges` + `BABY_GROWTH_CAPTURE_HREF` in `lib/baby-growth-page-chips.ts`.
   - Growth page: apply `?kind=` only when the kind param *value* changes (ref + helper); on save success and when chip pick fights sticky URL → `router.replace(BABY_GROWTH_CAPTURE_HREF)`.
   - TDD: Red = page source asserts + sequence unit failed; Green after page wire.

2. **Enhancement — vaccine mutate via shared helper**
   - Page mutate path uses `growthVaccineCreateInput` (same as gate) instead of inline `{ name, dose }`.

3. **Enhancement — D3 vaccine capture copy**
   - `vaccine.title` → “Vaccine” / “Vắc-xin” (no “Log vaccines”).
   - Removed unused `vaccine.logOnGrowth` / `vaccine.readOnlyHint`.
   - Capture deep link remains `BABY_VACCINE_CAPTURE_HREF` (`/baby/growth?kind=vaccine`).

4. **Nit (cheap) — Measure comment**
   - `lib/baby-growth-kind-chips.ts` comment now says Growth page (`babyMeasureKindFilter` name left as-is).

### Deferred this round (left in place)

- Dead Recent-list helpers / `mergeBabyGrowthRecentEntries` / `BabyGrowthListSkeleton`.
- Unused `babyVaccine` icon id + glyph + tab map.

### TDD skipped — no behavior

- (none for deferred / comment-only)

### Tests run

```text
npx tsx --import ./scripts/test-env.mjs --test \
  components/baby-growth-page.test.ts \
  lib/baby-growth-page-chips.test.ts \
  lib/baby-i18n.test.ts \
  lib/baby-growth-recent.test.ts
→ 36 pass / 0 fail
```

---

## Fix notes (merged-spm)

**Round:** 1 · Fix agent · tests/behavior changed: **yes** (test only)

### What was fixed

1. **Enhancement S1 — Zod rejects forged `kind: "vaccine"` on createBabyGrowth**
   - Added unit in `lib/validators/baby.test.ts`: `createBabyGrowthSchema.safeParse({ kind: "vaccine", valueNum: 3.4, unit: "kg" })` expects fail.
   - Locks design abuse case: UI sentinel must not pass as a growth DB kind.
   - No production schema change — `babyGrowthKindSchema` enum already excludes `"vaccine"`.

### TDD

- Red not observed: schema already rejected; test alone is Green (per Fix ask).

### Tests run

```text
npx tsx --import ./scripts/test-env.mjs --test lib/validators/baby.test.ts
→ 49 pass / 0 fail
```
