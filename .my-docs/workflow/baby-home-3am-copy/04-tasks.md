# Tasks: Baby home 3AM full-sentence copy

**Design:** Option 1 (one-line sentence headers + one-sentence status) + **scan emphasis** (bold/foreground facts, muted glue). Gate 2 approved; emphasis addendum 2026-09-13.

**Order:** i18n + when/next-due strings → heading compose with emphasis → status sentences with emphasis → tests/e2e → skeleton check.

**Do not:** change chips, GraphQL, birth prompt, section order, or timeline page lists (unless a shared helper must move).

**Commands (typical):**
- Unit: `pnpm exec vitest run components/baby-home.test.ts lib/baby-format-care-when.test.ts lib/baby-next-due.test.ts lib/baby-i18n.test.ts`
- E2E: `pnpm exec playwright test e2e/baby-home-option-b.spec.ts` (adjust if needed)

---

## Task 1: Sentence i18n keys (EN + VI) — **S**

**Description:** Add/replace message keys for section header sentences and status sentences per `03-design.md` copy contract. Rewrite nap blend keys as full sentences. Soften `home.nextIn` / `home.overdue` (or add sentence-specific keys) and care-when tails so they fit mid-sentence. Remove reliance on middot `recommend · blend` / `recommend ~{ml} ml / times`.

**Acceptance criteria:**
- [ ] EN + VI keys exist for every header state in the design table
- [ ] EN + VI status empty / feed / sleep open / sleep ended / diaper patterns exist
- [ ] No telegram fragments left as the primary home header/status copy (`next in`, `/ times`, bare `recommend`)
- [ ] `lib/baby-i18n.test.ts` (or equivalent) asserts key presence / sample EN+VI strings

**Test notes (TDD — red first):**
- Failing i18n / home tests that expect new sentence substrings (e.g. `Next feed is in`, `Today {n} of`, `Last feed was`) before wiring UI.

**Dependencies:** None  
**Files likely touched:** `messages/baby/en.ts`, `messages/baby/vi.ts`, `lib/baby-i18n.test.ts`  
**Scope:** S

---

## Task 2: Care-when + next-due sentence tails — **S**

**Description:** Adjust `formatBabyCareWhen` / next-due label helpers (or home-only wrappers) so durations and “ago” phrases read as part of a sentence (“about 20 minutes ago”, “about 1 hour”). Keep pure helpers testable.

**Acceptance criteria:**
- [ ] Unit tests cover minutes/hours/justNow (and at least one calendar form) in sentence-friendly EN
- [ ] VI equivalents are full natural phrases, not English leftovers
- [ ] Existing compact duration used inside cards can stay compact if separate from header/status helpers

**Test notes (TDD — red first):**
- Extend `lib/baby-format-care-when.test.ts` and/or `lib/baby-next-due.test.ts` for new phrasing before changing production strings/helpers.

**Dependencies:** Task 1 (keys) can parallel if keys are named first  
**Files likely touched:** `lib/baby-format-care-when.ts`, `lib/baby-next-due.ts`, matching tests  
**Scope:** S

---

## Checkpoint A (after Tasks 1–2)

- [ ] New string/helper unit tests green
- [ ] No UI wiring required yet (or only key renames)

---

## Task 3: Section heading composition + scan emphasis — **S**

**Description:** Change `BabyHomeSectionHeading` (or call sites) so breast/bottle/nap/diaper render **one sentence** with **no middot join**, composed as nodes: section name + facts in `font-medium text-foreground tabular-nums`, glue in `text-muted`. Wire bottle guide / progress, nap blend, breast/diaper due into the sentence templates. Preserve `data-testid` / `headingId` / section `aria-labelledby`. Accessible name = full sentence text.

**Acceptance criteria:**
- [ ] Rendered headers match design patterns (birth set / unset / next / overdue / empty)
- [ ] No ` · ` between old label and tip for these four sections
- [ ] Important facts wrapped for emphasis (assert `font-medium` / strong around duration, ml, n/max, Left/Right, overdue as in design)
- [ ] Glue words use muted styling (not all-bold sentence)
- [ ] `components/baby-home.test.ts` asserts sentence copy + at least one emphasis marker per key state
- [ ] Skeleton still one header line per section (update if markup changes)

**Test notes (TDD — red first):**
- Update/fail `baby-home.test.ts` header assertions (breast tip, bottle ml/progress, nap recommend, diaper tip) to expect full sentences and emphasis classes/tags around facts.

**Dependencies:** Tasks 1–2  
**Files likely touched:** `components/baby-home.tsx`, `components/baby-home.test.ts`, `components/baby-page-skeleton.tsx` (+ test if any)  
**Scope:** S

---

## Task 4: Last-care status sentences + scan emphasis — **S**

**Description:** Replace status block title + `summary · when` with one sentence per kind, with the same scan-emphasis pattern (facts strong, glue muted). Add a small plain-detail helper for home (best-effort from summary / kind); fallback sentence still full and honest. Loading/error/empty per design.

**Acceptance criteria:**
- [ ] Feed / sleep / diaper rows are single sentence nodes (one visual line/block)
- [ ] Open nap uses “napping now” sentence with emphasis on that phrase + elapsed
- [ ] Unit tests cover empty, feed with formula summary (ml emphasized), open sleep, diaper kind emphasized
- [ ] E2E that scrape status text still find the row (update selectors/expectations if needed)

**Test notes (TDD — red first):**
- Fail home unit tests on `summary · when` / `Last feed` label pattern; assert new sentences + emphasis on when/ml/kind.

**Dependencies:** Tasks 1–2  
**Files likely touched:** `components/baby-home.tsx`, `components/baby-home.test.ts`, optional `lib/baby-home-status-sentence.ts` (+ test)  
**Scope:** S

---

## Checkpoint B (after Tasks 3–4)

- [ ] Home unit tests green for headers + status
- [ ] Skeleton parity checked
- [ ] Manual glance: light + dark, narrow width wrap OK

---

## Task 5: E2E expectations for sentence copy — **S**

**Description:** Update focused baby home e2e (option-b / care specs that assert header or status text) to expect full sentences. Do not expand into unrelated money e2e.

**Acceptance criteria:**
- [ ] Focused baby home e2e pass with new copy
- [ ] At least one assertion that a header or status line is a sentence (e.g. contains `Next feed` / `Last feed was` / VI equivalent)
- [ ] No new flake-prone full-page snapshots unless already used

**Test notes (TDD — red first):**
- Change expected strings so e2e fails on old fragments, then fix UI if not already done.

**Dependencies:** Tasks 3–4  
**Files likely touched:** `e2e/baby-home-option-b.spec.ts`, possibly `e2e/baby-care.spec.ts`  
**Scope:** S

---

## Checkpoint C (done for simple build)

- [ ] Unit + focused e2e green
- [ ] EN + VI both sentence-style
- [ ] Ready for my-review-workflow / my-test-workflow

---

## Notes for build agent

- Prefer **home-only** plain-detail mapping over changing timeline `summary` strings globally.
- Keep testids stable: `baby-home-header-breast|bottle|nap|diaper`, `baby-home-status`.
- Plain words only in new copy — no medical certainty beyond existing guide caveat.
