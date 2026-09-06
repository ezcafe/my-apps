# Tasks: Baby pages Money layout pattern

**Chosen design:** Option B (Gate 2) — per-page `SHELL_*` composition + capped multi-page last-of-type.  
**Skip Task 4** (`BabyPageBody`). In Task 5 walk timeline pages with a cap; each surface task composes `SHELL_*` tokens directly.

**Order:** shell-layout rename → SettingsSection move → last-of-type helper → home → capture ×3 → growth → timeline → settings → e2e.  
Skeletons update **in the same task** as each live surface (CLS rule).

---

## Task 1: Move layout tokens to `lib/shell-layout.ts`

**Description:** Create `lib/shell-layout.ts` with `SHELL_FULL_SPAN` and `SHELL_DASHBOARD_STACK` (same string values as today’s Money exports). Update every `@/lib/money-layout` caller (Money, Baby, Loans, Investments, Kiosk, settings, docs). Remove `lib/money-layout.ts` (or leave one-release re-export aliases only if something outside the grep set breaks — prefer delete).

**Acceptance:**

- [x] No production imports of `@/lib/money-layout`
- [x] `SHELL_FULL_SPAN` / `SHELL_DASHBOARD_STACK` values match prior Money constants
- [x] `docs/DESIGN_GUIDE.md` points at `lib/shell-layout.ts`

**Tests (TDD — what turns red first):**

- [x] If any existing unit test imports `money-layout`, update it first so typecheck/tests fail on old path, then fix imports
- [x] `pnpm exec tsc --noEmit` (or project typecheck) clean for renamed imports

**Files likely touched:** `lib/shell-layout.ts`, delete `lib/money-layout.ts`, all prior money-layout importers, `docs/DESIGN_GUIDE.md`

**Scope:** M

**Dependencies:** none

---

## Task 2: Move `SettingsSection` to `components/settings/`

**Description:** Move `SettingsSection` and `SettingsSubsectionHeading` from `components/money-settings/money-settings-shared.tsx` to `components/settings/settings-section.tsx`. Update all callers (Money settings, Investments, Loans, global settings, api-help, workspace reset, etc.). Prefer no long-lived shim; delete unused exports from the old file or delete the file if empty of other exports.

**Acceptance:**

- [x] Baby (and Money) can import from `@/components/settings/settings-section`
- [x] No broken imports of the old shared path for these two symbols
- [x] Visual behavior unchanged (flat heading + body)

**Tests (TDD — what turns red first):**

- [x] Any test importing `money-settings-shared` for SettingsSection fails on path → fix imports
- [x] Smoke: settings pages still typecheck

**Files likely touched:** `components/settings/settings-section.tsx`, `components/money-settings/money-settings-shared.tsx`, callers listed in analysis

**Scope:** M

**Dependencies:** none (can parallel with Task 1 if careful; prefer after Task 1 to reduce merge noise)

---

### Checkpoint A (after Tasks 1–2)

- [x] Typecheck / focused tests pass
- [x] Money + Baby pages still render with new layout import (manual or existing e2e smoke)
- [x] Human glance: DESIGN_GUIDE links not stale

---

## Task 3: Pure helper `lastCareStatusByType` (TDD)

**Description:** Add `lib/baby-last-care-status.ts` that, given newest-first timeline items, returns the first `feed`, `sleep`, and `diaper` item (or null). Ignore growth / unknown types. Document sleep `endedAt == null` as “in progress” for UI consumers.

**Acceptance:**

- [x] Pure function with typed input/output
- [x] Unit tests cover: all three present; missing type → null; sleep open; growth-only list; empty list; first wins when duplicates

**Tests (TDD — what turns red first):**

- [x] Write `lib/baby-last-care-status.test.ts` **first** (red: module missing)
- [x] Implement until green: `pnpm test` (node:test / tsx — project stack)

**Files likely touched:** `lib/baby-last-care-status.ts`, `lib/baby-last-care-status.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 4: `BabyPageBody` wrapper (Option A) — **SKIPPED (Option B)**

**Description:** Add `components/baby-page-body.tsx` applying `SHELL_FULL_SPAN` + `SHELL_DASHBOARD_STACK` once. No nested full-span. Optional `className` for `@container` etc.

**Acceptance:**

- [x] ~~Export `BabyPageBody` used by later surface tasks~~ — skipped; pages compose `SHELL_*` directly
- [x] ~~Nested children must not re-apply `SHELL_FULL_SPAN`~~ — N/A (no shared body)

**Tests (TDD — what turns red first):**

- [x] Skipped with Option B

**Files likely touched:** _(none — not built)_

**Scope:** S

**Dependencies:** Task 1

---

## Task 5: Home status strip + CTAs + skeleton + i18n

**Description:** Wire home to unbounded timeline (`from`/`to` empty), walk pages with cap (3×50) via `fetchBabyLastCareStatus`, reduce with `lastCareStatusByType`, show last feed / nap / diaper **above** existing CTAs. Empty state per missing type. Open sleep → “in progress”. Compose `SHELL_FULL_SPAN` + `SHELL_DASHBOARD_STACK` directly (Option B — no BabyPageBody). Update `BabyHomeSkeleton` + `app/(shell)/baby/loading.tsx` for status rows. Add EN/VI strings.

**Acceptance:**

- [x] Status above primary CTAs
- [x] Timeline query key shares empty bounds; care invalidation refreshes home
- [x] Skeleton matches status + CTA layout (zero CLS)
- [x] EN + VI copy for labels / empty / in progress

**Tests (TDD — what turns red first):**

- [x] Extend or add unit/UI test expectations for status presence (or helper already green + component test if present)
- [x] Skeleton export still used by `loading.tsx`

**Files likely touched:** `components/baby-home.tsx`, `components/baby-page-skeleton.tsx`, `messages/baby/en.ts`, `messages/baby/vi.ts`, maybe `lib/baby-query-options.ts`

**Scope:** M

**Dependencies:** Tasks 1, 3, 4 (A)

---

### Checkpoint B (after Tasks 3–5)

- [x] `baby-last-care-status` tests green
- [x] Open `/baby`: status strip + CTAs; skeleton flash matches
- [x] Light + dark glance on home

---

## Task 6: Feed capture — Field stack, post-save home, skeleton

**Description:** Refactor `baby-feed-form` to Money-like Field + Input/Select/Button; `router.push("/baby")` after successful save (keep invalidate care). Update `BabyFeedSkeleton` + feed `loading.tsx`.

**Acceptance:**

- [x] Flat form stack; large primary CTA
- [x] Success → `/baby` not timeline
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] Update any unit/e2e expectations that assert timeline redirect (red) → expect `/baby`

**Files likely touched:** `components/baby-feed-form.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/feed/loading.tsx`

**Scope:** M

**Dependencies:** Tasks 1, 4

---

## Task 7: Sleep capture — Field stack, post-save home, skeleton

**Description:** Same pattern as feed for start/end sleep flows; navigate to `/baby` on success; skeleton parity.

**Acceptance:**

- [x] Field-based flat form
- [x] Start and end success → `/baby`
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] Redirect assertions fail until updated to `/baby`

**Files likely touched:** `components/baby-sleep-form.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/sleep/loading.tsx`

**Scope:** M

**Dependencies:** Tasks 1, 4

---

## Task 8: Diaper capture — Field stack, post-save home, skeleton

**Description:** Same as feed for diaper; navigate to `/baby`; skeleton parity.

**Acceptance:**

- [x] Field-based flat form
- [x] Success → `/baby`
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] Redirect assertions → `/baby`

**Files likely touched:** `components/baby-diaper-form.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/diaper/loading.tsx`

**Scope:** M

**Dependencies:** Tasks 1, 4

---

### Checkpoint C (after Tasks 6–8)

- [x] Log feed / sleep / diaper → land on home; status chips update
- [x] Capture skeletons match live forms
- [x] Focused unit tests green

---

## Task 9: Growth — flatten add form, keep order, skeleton

**Description:** Keep **add → chart → list**. Flatten add form (no border+shadow card); Cards only for charts. Compose `SHELL_*` + stack. Update growth skeletons.

**Acceptance:**

- [x] Order unchanged (add first)
- [x] Form flat; chart Cards OK; no Card+shadow combo on panels
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] Existing growth tests stay green; add assertion only if structure helpers exist

**Files likely touched:** `components/baby-growth-page.tsx`, `components/baby-growth-chart.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/growth/loading.tsx`

**Scope:** M

**Dependencies:** Tasks 1, 4

---

## Task 10: Timeline — flat day list chrome + skeleton

**Description:** Keep day browse, filters, load more, sync. Replace Card+shadow rows with flat / border-only rows per DESIGN_GUIDE. Compose `SHELL_*` + stack. Update `BabyTimelineSkeleton`.

**Acceptance:**

- [x] Day browse still works
- [x] Row chrome matches flat list rules
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] Existing timeline behavior tests stay green

**Files likely touched:** `components/baby-timeline.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/timeline/loading.tsx`

**Scope:** M

**Dependencies:** Tasks 1, 4

---

## Task 11: Settings — `SettingsSection` + Field + skeleton

**Description:** Replace Card sections with moved `SettingsSection`; use Field for controls where Money would. Compose `SHELL_*`. Update `BabySettingsSkeleton` (keep `telegramEnabled` env behavior).

**Acceptance:**

- [x] Language + Telegram sections flat (heading + divider + body)
- [x] Locale / Telegram behavior unchanged
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] Settings-related unit tests / i18n tests stay green

**Files likely touched:** `components/baby-settings-page.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/settings/loading.tsx`

**Scope:** M

**Dependencies:** Tasks 1, 2, 4

---

### Checkpoint D (after Tasks 9–11)

- [x] All seven surfaces use shell-layout tokens (per-page composition)
- [x] Side-by-side Money vs Baby layout language check
- [x] Light + dark on growth / timeline / settings

---

## Task 12: e2e — home status + post-save home

**Description:** Update `e2e/baby-care.spec.ts` (and helpers if needed) for: home shows last-status region (or labels after a log); feed/sleep/diaper save ends on `/baby`; existing happy paths still pass.

**Acceptance:**

- [x] e2e asserts home redirect after capture
- [x] e2e covers status visibility after at least one care log (or empty-state then log)
- [x] Suite green in CI/local Playwright config

**Tests (TDD — what turns red first):**

- [x] Change e2e expectations for redirect/status first (red against old UI) → implement already done in prior tasks should then go green; if not, fix gaps

**Files likely touched:** `e2e/baby-care.spec.ts`, maybe `e2e/helpers/*`

**Scope:** M

**Dependencies:** Tasks 5–8

---

### Checkpoint E (after Task 12)

- [x] Unit + e2e green
- [x] No leftover `money-layout` / old SettingsSection imports
- [x] Ready for review / test workflow

---

## Task index

| # | Title | Scope | Depends |
|---|-------|-------|---------|
| 1 | shell-layout rename | M | — |
| 2 | SettingsSection move | M | — |
| 3 | lastCareStatusByType | S | — |
| 4 | BabyPageBody (A) | S | 1 |
| 5 | Home + skeleton + i18n | M | 1,3,4 |
| 6 | Feed + skeleton | M | 1,4 |
| 7 | Sleep + skeleton | M | 1,4 |
| 8 | Diaper + skeleton | M | 1,4 |
| 9 | Growth + skeleton | M | 1,4 |
| 10 | Timeline + skeleton | M | 1,4 |
| 11 | Settings + skeleton | M | 1,2,4 |
| 12 | e2e | M | 5–8 |

**Checkpoints:** A (1–2), B (3–5), C (6–8), D (9–11), E (12).

**No XL tasks.** No production code until Gate 2 approval.
