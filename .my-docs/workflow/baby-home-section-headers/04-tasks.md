# Tasks: Baby home section headers + bottle chips + cleaner status

**Design:** Option B preferred (server `recentBottleMl` + section stacks). Confirm at Gate 2 after design review.

**Order:** pure helpers → API field → birth prompt → UI headers/chips/status → skeleton → e2e.

**Locked layout:** breast → bottle → nap → diaper (live, skeleton, e2e).

**Commands (typical):**
- Unit: `pnpm exec vitest run <path>`
- E2E: `pnpm exec playwright test e2e/baby-home-option-b.spec.ts` (adjust if project script differs)

---

## Task 1: Sleep guide bands + one-line blend helper — **S**

**Description:** Extend `lib/baby-age-guide.ts` with sleep bands from Gate 1 / design `maxDay` table and a helper that returns a blend key/params (or null when `ageDays` is null). Past 1–3y keeps the last toddler band. No fake blend without birth age.

**Acceptance criteria:**
- [x] `babySleepGuideForAge(null)` → `null`
- [x] Inclusive `maxDay` matches design: 30, 60, 122, 183, 365, 1095 (then keep last band for `ageDays` &gt; 1095)
- [x] Boundary tests: e.g. day 30 → 0–1 mo; 31 → 1–2 mo; 122 → 3–4 mo; 123 → 5–6 mo; 365 → 7–12 mo; 366 → 1–3 y; 1096 → still 1–3 y band
- [x] Each band maps to total + naps + typical length facts matching EN/VI blend table in `03-design.md`

**Test notes (TDD — red first):**
- Add failing tests in `lib/baby-age-guide.test.ts` for `null` age, each `maxDay` boundary, and post-1095 keep-last before implementation.

**Dependencies:** None  
**Files likely touched:** `lib/baby-age-guide.ts`, `lib/baby-age-guide.test.ts`  
**Scope:** S

---

## Task 2: Bottle chip fill helper (history + snaps) — **S**

**Description:** Pure `buildBabyBottleChipMls({ recentBottleMl, snaps, limit })` — history first, distinct, fill from snaps skipping duplicates, max 3. Callers pass age-band snaps when birth set, or fixed `[60, 90, 120]` when unset (not labeled recommended).

**Acceptance criteria:**
- [x] `[90]` + snaps including 90 → three chips, 90 first, no duplicate 90
- [x] Empty history → first 3 snaps
- [x] Already 3 history → unchanged (no snap fill)
- [x] Non-positive / non-finite ml ignored if present in input
- [x] No-birth path documented: snaps = `[60, 90, 120]`; empty history → those three; not presented as recommended guide in UI (asserted in Task 8)

**Test notes (TDD — red first):**
- New tests in `lib/baby-age-guide.test.ts` (or small sibling test file) fail until helper exists; include fixed-snap fill case.

**Dependencies:** None (can parallel Task 1)  
**Files likely touched:** `lib/baby-age-guide.ts`, `lib/baby-age-guide.test.ts`  
**Scope:** S

---

## Checkpoint A (after Tasks 1–2)

- [x] New age-guide unit tests green
- [x] No UI yet — helpers only
- [x] Confirm EN/VI blend keys match design table for Task 7

---

## Task 3: Extract formula ml from feed payload — **S**

**Description:** Pure helper for one event. Algorithm (locked): if `legs` is a **non-empty** array → formula leg `amountMl` only (null if no formula leg; **no** top-level fall-through). Else (missing/empty legs) → legacy top-level when formula ml present. One value per event.

**Acceptance criteria:**
- [x] Legs with formula 90 → 90
- [x] Legacy top-level formula 120 (no / empty legs) → 120
- [x] Breast-only non-empty legs → **null** (even if top-level `amountMl` exists)
- [x] Merged breast + formula legs → formula ml only (once)
- [x] Non-empty legs with no formula leg → null (no silent top-level fall-through)

**Test notes (TDD — red first):**
- Failing unit tests for legs vs top-level vs breast-only vs “legs present but no formula” before wiring into status.

**Dependencies:** None  
**Files likely touched:** e.g. `lib/baby-formula-ml.ts` or `features/baby/server/` helper + `.test.ts`  
**Scope:** S

---

## Task 4: `recentBottleMl` on home quick status — **M**

**Description:** Add `recentBottleMl: number[]` (max 3 distinct, newest by **`occurredAt`** then `id`) to server status + GraphQL type/resolver + **client query** in `lib/baby-query-options.ts`. Workspace-scoped scan of recent feeds; cap scan size.

**Acceptance criteria:**
- [x] Schema + TypeScript types include `recentBottleMl: [Int!]!`
- [x] Empty history → `[]`
- [x] Distinct ml order = newest **logged** (`occurredAt`) first; max length 3
- [x] Editing an older feed’s `updatedAt` alone does **not** jump it ahead of a newer `occurredAt`
- [x] Authz same as existing status (other workspace cannot read)
- [x] Unit/db test seeds feeds and asserts list
- [x] `lib/baby-query-options.ts` (and related client types) request `recentBottleMl`
- [x] E2E GraphQL helper fixtures include `recentBottleMl` when status is mocked

**Test notes (TDD — red first):**
- Failing test in `features/baby/server/home-quick-status.test.ts` (and/or GraphQL yoga test) expecting `recentBottleMl` before field exists.
- Failing client query / options test (or fixture assert) until `recentBottleMl` is in the home status document.

**Dependencies:** Task 3  
**Files likely touched:** `features/baby/server/home-quick-status.ts`, `lib/graphql/baby-typeDefs.ts`, `baby-resolvers.ts`, `lib/baby-query-options.ts` (+ `.test.ts`), validators if needed, `e2e/helpers/baby-home-graphql.ts`, tests  
**Scope:** M

**Security:** Confirm workspace filter on the new query path (A01).

---

## Checkpoint B (after Tasks 3–4)

- [x] Status tests green with `recentBottleMl` ordered by `occurredAt`
- [x] Client query document includes the field
- [x] No schema migration (read-only)
- [x] Manual GraphQL sanity optional

---

## Task 5: Birth prompt visit-only dismiss — **S**

**Description:** Change `lib/baby-birth-date-prompt.ts` (+ home wire-up) so unset birthday always prompts until set; “Not now” dismisses via **`sessionStorage`** (survives refresh in the same tab; clears when the browser session ends). **Ignore** old 7-day `localStorage` key `baby.birthDatePrompt.dismissedUntil` on the show path; stop writing it.

**Acceptance criteria:**
- [x] `birthDate` set → never show
- [x] Unset + no `sessionStorage` dismiss flag → show
- [x] After dismiss → hide; same-tab refresh still hidden
- [x] New browser session (no flag) → show again
- [x] Leftover 7-day `localStorage` snooze value does **not** block show

**Test notes (TDD — red first):**
- Update/fail `lib/baby-birth-date-prompt.test.ts` for `sessionStorage` visit-only vs long snooze before changing production helper.

**Dependencies:** None (can parallel earlier)  
**Files likely touched:** `lib/baby-birth-date-prompt.ts`, `.test.ts`, `components/baby-home.tsx`  
**Scope:** S

**Security:** Visit dismiss is UX only — not an auth bypass.

---

## Task 6: Clean feed status line — **S**

**Description:** In `baby-home.tsx` `statusLine("feed")`, render only `summary · when` (or empty). Remove leading `lastMl ·` and `feedsToday` / `n/N today` from status.

**Acceptance criteria:**
- [x] Formula feed shows `Feed (Formula 90 ml) · Just now` style — no leading `90 ml ·`
- [x] No `7/8 today` / `feedsTodayNoGuide` on status
- [x] Empty feed status has no progress suffix
- [x] Unit test asserts cleaned string/structure

**Test notes (TDD — red first):**
- Fail `components/baby-home.test.ts` (or extract pure formatter test) that still expects progress / lastMl prefix.

**Dependencies:** None for logic; UI polish with Task 7  
**Files likely touched:** `components/baby-home.tsx`, `components/baby-home.test.ts`  
**Scope:** S

---

## Checkpoint C (after Tasks 5–6)

- [x] Birth-prompt + status unit tests green
- [x] Spot-check: unset birthday still usable for logging without fake `n/N` on status

---

## Task 7: Section headers (breast, diaper, nap, bottle) — **M**

**Description:** Add 3AM-short headers above each quick-care group in locked order **breast → bottle → nap → diaper**. Breast/diaper = label + next-due tip. Nap = sleep blend when age known (EN + VI keys from design table). Bottle = recommended ml via `babySuggestedBottleMl({ ageDays, weightKg: latestWeightKg })` + `n/N` (`n` = all feeds today) when guide max exists; label-only when no birth date.

**Acceptance criteria:**
- [x] DOM / test ids follow order breast → bottle → nap → diaper
- [x] Four headers visible in **EN and VI** (blend strings match design table facts)
- [x] Nap blend hidden/absent when no birth date; past 3y still shows toddler blend
- [x] Bottle shows `0/N` + recommended ml on empty day with guide; uses `latestWeightKg` when present
- [x] Tips use next-due / overdue / empty fallbacks (short)
- [x] Guide caveat still present; no medical-certainty wording

**Test notes (TDD — red first):**
- Fail home unit tests looking for header test ids / text / section order before markup exists.
- Message keys for EN + VI blends required in acceptance (not improvised later).

**Dependencies:** Tasks 1, 5  
**Files likely touched:** `components/baby-home.tsx`, `messages/baby/en.ts`, `messages/baby/vi.ts`, tests  
**Scope:** M

**UI/mobile:** Contrast for muted tips; short lines; thumb-friendly spacing (8px grid).

---

## Task 8: Bottle Kind-like chips replace face/± — **M**

**Description:** Replace `BabyQuickValueCard` bottle face+± with flush chips (up to 3 ml from `buildBabyBottleChipMls` + Custom). Birth set → age-band snaps fill. Birth unset → history + `[60, 90, 120]` (not labeled recommended). Custom opens existing modal. Chip tap saves formula via existing quick-care. Selected = primary fill on last saved formula ml; ~2s done flash keeps that chip primary.

**Acceptance criteria:**
- [x] No face/± on home bottle control
- [x] Exactly up to 3 ml chips + Custom
- [x] Selected/done-flash: primary on matching last saved ml (and during ~2s flash); no other selected chip
- [x] Hit targets ≥44×44; `fx-ripple` like Kind
- [x] Uses `recentBottleMl` from status query (`lib/baby-query-options.ts`) + snaps fill
- [x] No-birth: chips still usable via fixed snaps; header stays label-only (no recommended / `n/N`)
- [x] Custom confirm-sets-ml only (no behavior change to modal contract)

**Test notes (TDD — red first):**
- Fail home / new bottle-chip component tests for chip labels, selected state, and absence of stepper buttons.
- Assert client receives `recentBottleMl` (query options / fixture).

**Dependencies:** Tasks 2, 4, 7 (header layout)  
**Files likely touched:** `components/baby-home.tsx`, new small chip control optional, `lib/baby-query-options.ts`, `baby-diaper-kind-control` as visual reference, tests  
**Scope:** M

**UI/mobile:** Kind flush pattern; light + dark; no hover-only.

**Security:** ml comes from server list or snaps — still validated by existing formula validators on mutate.

---

## Checkpoint D (after Tasks 7–8)

- [x] Home unit tests for headers + chips green
- [x] Manual narrow (~320) thumb check: four sections in locked order
- [x] Light + dark quick look

---

## Task 9: Skeleton parity for headers + chips — **S**

**Description:** Update `BabyHomeSkeleton` so order, section headers placeholders, and bottle chip row match live UI (**breast → bottle → nap → diaper**, zero CLS).

**Acceptance criteria:**
- [x] Skeleton element order matches live sections (breast → bottle → nap → diaper)
- [x] Radii: outer `rounded-[var(--radius-md)]`, nested `rounded-[var(--radius-sm)]` where applicable
- [x] Unit/smoke test or structural assertion if project has skeleton tests

**Test notes (TDD — red first):**
- Fail `components/baby-page-skeleton.test.ts` expecting header/chip placeholders in locked order.

**Dependencies:** Tasks 7–8  
**Files likely touched:** `components/baby-page-skeleton.tsx`, `.test.ts`  
**Scope:** S

---

## Task 10: E2E — headers, chips, status, birth prompt — **M**

**Description:** Rewrite/extend `e2e/baby-home-option-b.spec.ts` (and related) for: section headers in locked order; bottle chips not face/±; feed status without progress/leading ml; bottle header progress; birth prompt on unset with `sessionStorage` dismiss (not 7-day snooze); chips from fixture `recentBottleMl`.

**Acceptance criteria:**
- [x] Section order breast → bottle → nap → diaper asserted
- [x] Status assert does **not** require `n/N today` or leading last-ml on feed line
- [x] Chips visible with fixture ml values (`e2e/helpers/baby-home-graphql.ts` includes `recentBottleMl`)
- [x] Unset birth → prompt on load; dismiss hides for visit (refresh still hidden); no fake bottle `n/N`
- [x] Set birth → nap blend + bottle `0/N` or `n/N` visible

**Test notes (TDD — red first):**
- Update e2e to new expectations so old asserts fail/red, then implement remaining UI gaps if any.

**Dependencies:** Tasks 4–9  
**Files likely touched:** `e2e/baby-home-option-b.spec.ts`, `e2e/helpers/baby-home-graphql.ts`, possibly `e2e/baby-care.spec.ts`  
**Scope:** M

---

## Checkpoint E (after Tasks 9–10)

- [x] Unit + targeted e2e green
- [x] No reopen of merge/nap/Kind sheet scope
- [x] Ready for my-review-workflow after build

---

## Task index

| # | Title | Size | Depends |
|---|-------|------|---------|
| 1 | Sleep guide + blend helper | S | — |
| 2 | Bottle chip fill helper | S | — |
| 3 | Extract formula ml | S | — |
| 4 | `recentBottleMl` API + client query | M | 3 |
| 5 | Birth prompt `sessionStorage` | S | — |
| 6 | Clean feed status | S | — |
| 7 | Section headers | M | 1, 5 |
| 8 | Bottle chips UI | M | 2, 4, 7 |
| 9 | Skeleton parity | S | 7, 8 |
| 10 | E2E coverage | M | 4–9 |

**Checkpoints:** A (1–2), B (3–4), C (5–6), D (7–8), E (9–10).
