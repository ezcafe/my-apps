# Tasks: E2E for Money, Investments, and Loans

Recommended design: **Option B** — split specs + thin shared helpers. No product UI redesign. No new seed helper. No auth bypass.

## Task 1: Auth skip + E2E docs

**Description:**
Document and centralize the Pocket ID / `E2E_STORAGE_STATE` pattern for finance e2e. Extend `e2e/helpers/auth.ts` notes for Money/Investments/Loans (auth-required unlike Baby public shell). Add `E2E_*` comments to `.env.example` if missing. Export or share `hasAuthStorage` for specs.

**Acceptance:**

- [x] Contributor can learn how to save storage and set `E2E_STORAGE_STATE` from `auth.ts` and/or `.env.example`
- [x] Docs state money routes need a real session; no bypass
- [x] `e2e/.auth/` remains gitignored

**Tests (TDD — what turns red first):**

- [x] N/A for product — verification: read docs; `grep E2E_ .env.example` / auth helper exports exist

**Files likely touched:** `e2e/helpers/auth.ts`, `.env.example`

**Scope:** S

**Dependencies:** none

---

## Task 2: Shell helper (`openAppMenu`, `uniqueNote`)

**Description:**
Add `e2e/helpers/shell.ts` with `openAppMenu(page)` (button `/open .+ menu/i`), `uniqueNote()`, and re-export or wrap `hasAuthStorage` for finance specs. Keep helpers tiny — no page objects.

**Acceptance:**

- [x] Helper functions are importable from money/investments/loans specs
- [x] `uniqueNote()` returns distinct strings across calls

**Tests (TDD — what turns red first):**

- [x] Optional tiny unit assert on `uniqueNote` uniqueness, or first consuming e2e fails to compile until helper exists

**Files likely touched:** `e2e/helpers/shell.ts`

**Scope:** S

**Dependencies:** Task 1

---

### Checkpoint A (after Tasks 1–2)

- [x] Docs + helpers land; no finance specs yet (or only skipped stubs)
- [x] Baby Care e2e still importable / unchanged in behavior
- [x] Human skim: no secrets committed

---

## Task 3: Money home smoke + skip without storage

**Description:**
Create `e2e/money.spec.ts`. Skip describe/tests when no `E2E_STORAGE_STATE`. Goto `/money`, assert h1 “Spending” (or stable Money home title). Optional: open app menu and confirm Money link.

**Acceptance:**

- [x] Without storage → skipped (not failed)
- [x] With storage → `/money` shows expected heading landmark
- [x] No exact balance/currency asserts

**Tests (TDD — what turns red first):**

- [x] New test fails until `/money` heading assertion matches live UI with valid storage

**Files likely touched:** `e2e/money.spec.ts`

**Scope:** S

**Dependencies:** Task 2

---

## Task 4: Money `/money/new` write with unique note

**Description:**
With auth: open `/money/new`, fill minimum fields (amount, type via existing aria-labels), click **Notes & extras**, set Notes to `uniqueNote()`, click “Save transaction”. Soft-assert toast title **Transaction added**. No balance checks.

**Acceptance:**

- [x] Steps include expand **Notes & extras** before filling Notes
- [x] Submit path runs against real GraphQL
- [x] Unique note used on each run
- [x] Soft-assert toast **Transaction added**
- [x] Failure surfaces if workspace lacks required account/category seed

**Tests (TDD — what turns red first):**

- [x] Test red on missing Notes & extras / Save control / toast / failed mutation before form wiring is correct

**Files likely touched:** `e2e/money.spec.ts`

**Scope:** M

**Dependencies:** Task 3

---

## Task 5: Money Insights + More teasers

**Description:**
Goto `/money/insights`, assert Insights heading. Click ATF “More” teaser buttons (Budget vs actual, Top merchants, Recurring spend — match live copy). Soft assert expanded More region appears. No GraphQL route mocks in v1; no chart series asserts. Seed must allow More teasers to render (Money Insights dashboard section present).

**Acceptance:**

- [x] Insights page loads with heading
- [x] At least one More teaser expands content
- [x] Seed noise does not cause hard failures on chart numbers

**Tests (TDD — what turns red first):**

- [x] Test red if More teaser labels or expand behavior drift

**Files likely touched:** `e2e/money.spec.ts`

**Scope:** M

**Dependencies:** Task 3

---

### Checkpoint B (after Tasks 3–5)

- [x] `pnpm test:e2e -- e2e/money.spec.ts` skips without storage; green with storage for home/new/insights
- [x] Unique-note write left a soft trail only
- [x] Human review selectors before settings sweep

---

## Task 6: Money Settings hub + every settings child

**Description:**
From `/money/settings`, visit each child: Accounts, Categories, Recurrence, Budgets, Rules, Merchants, Tags. Assert each child’s heading from `resolveMoneyAppHeader` labels. Hub links from `money-workspace-settings.tsx`.

**Acceptance:**

- [x] All seven children load with expected h1
- [x] No deep CRUD on settings entities
- [x] Import sub-routes under settings children are out of scope unless already linked as entry (main import is Task 7)

**Tests (TDD — what turns red first):**

- [x] Parametrized or listed gotos fail on first missing child heading

**Files likely touched:** `e2e/money.spec.ts`

**Scope:** M

**Dependencies:** Task 3

---

## Task 7: Money Import entry

**Description:**
Goto `/money/import` (or navigate via menu). Assert “Import data” heading. No full wizard completion.

**Acceptance:**

- [x] Import entry page renders key landmark
- [x] No file upload / commit import in v1

**Tests (TDD — what turns red first):**

- [x] Test red if import route or title drifts

**Files likely touched:** `e2e/money.spec.ts`

**Scope:** S

**Dependencies:** Task 3

---

## Task 8: Investments home + Insights More

**Description:**
Add `e2e/investments.spec.ts` with auth skip. Cover home heading and `/investments/insights` + More teaser expand. Live teaser titles: **Realized vs unrealized**, **P&L by symbol**, **Risk metrics**. Requires non-empty Investments Insights ATF seed (empty state has no More buttons). Soft asserts only — no exact P&L / currency.

**Acceptance:**

- [x] Skip without storage; storage set + `/login` → fail
- [x] Home + Insights More covered with pinned teaser titles
- [x] Empty Insights → hard fail (seed requirement documented in test comment)

**Tests (TDD — what turns red first):**

- [x] New investments file fails until headings/More match live UI and seed is non-empty

**Files likely touched:** `e2e/investments.spec.ts`

**Scope:** M

**Dependencies:** Task 2

**Build note:** Spec implemented; local workspace currently shows empty Insights (“No results yet”) so More hard-fails until instrument/activity seed exists (Data B — human seed).

---

## Task 8a: Investments import + settings + open new form

**Description:**
In `e2e/investments.spec.ts`: cover `/investments/import`, `/investments/settings` entry, and `/investments/new` **open-form only** (assert heading / landmark). **Write-B exception:** do **not** submit an investment activity in v1.

**Acceptance:**

- [x] Import + settings entry landmarks assert
- [x] `/investments/new` opens and shows expected heading — no mutation submit
- [x] No exact P&L / currency asserts

**Tests (TDD — what turns red first):**

- [x] Red if import/settings/new titles drift

**Files likely touched:** `e2e/investments.spec.ts`

**Scope:** S

**Dependencies:** Task 8

---

### Checkpoint C (after Tasks 6–8a)

- [x] Money settings + import green with storage
- [ ] Investments home/More + entry routes green with storage (no Investments submit) — blocked on empty Insights seed for More only; home/import/settings/new green
- [x] Baby Care suite still passes when run together

---

## Task 9: Loans home + Insights More + settings entry

**Description:**
Add `e2e/loans.spec.ts` with auth skip. Cover `/loans` home, `/loans/insights` + More teasers, `/loans/settings` entry. Live More titles: **Combined payoff progress**, **Collateral LTV**, **Per-loan payoff**. Non-empty Loans Insights usually follows the Pay seed (active loan); if empty-state → fail. Soft asserts on headings / landmarks.

**Acceptance:**

- [x] Skip without storage
- [x] Home, Insights More (pinned titles), settings entry covered
- [x] No schedule amount exact asserts

**Tests (TDD — what turns red first):**

- [x] Loans smoke red until titles match `resolveLoanAppHeader` / live More copy

**Files likely touched:** `e2e/loans.spec.ts`

**Scope:** M

**Dependencies:** Task 2

---

## Task 10: Loans list Pay submit (unique note)

**Description:**
With storage and user-seeded payable installment: on `/loans`, click the **first visible** compact **Pay** button (list shows Pay when `nextScheduleInstallmentId` is set). If none on list, open a detail and use **Add payment to Money**. Open modal, set Notes to `uniqueNote()`, submit **Record payment**. Soft-assert toast **Payment recorded in Money**. **Hard fail** if no Pay / Add payment control (no soft-skip).

**Acceptance:**

- [x] Discovery prefers list **Pay**, else detail **Add payment to Money**
- [x] Pay happy path mutates via existing GraphQL
- [x] Unique note applied
- [x] Soft-assert **Payment recorded in Money**
- [x] Missing Pay → hard fail (seed requirement in test title/comment)

**Tests (TDD — what turns red first):**

- [x] Test red when Pay absent or modal submit fails — drives seed + selector correctness

**Files likely touched:** `e2e/loans.spec.ts`

**Scope:** M

**Dependencies:** Task 9

---

### Checkpoint D (after Tasks 9–10)

- [ ] Full finance trio green with storage: `pnpm test:e2e` — 20/21 green; Investments Insights More awaits non-empty ATF seed
- [x] Without storage: finance specs skip; Baby unauth smoke still runs
- [x] Human confirms Pay seed + Investments Insights non-empty still present in local workspace — Pay OK; Investments Insights empty locally

---

## Task 11: Docs polish + suite hygiene

**Description:**
Final pass: auth helper comments mention all three finance files; optional one-line pointer in README or existing e2e comment if the repo already documents Playwright. Ensure no committed `.auth` jars. Confirm Baby Care tests untouched in intent. Remind: disposable local workspace only.

**Acceptance:**

- [x] Docs path clear for “how to run money e2e”
- [x] No secrets in git status
- [x] `pnpm test:e2e` behavior documented: skip finance without storage

**Tests (TDD — what turns red first):**

- [x] Manual doc check; full suite run listed in verification

**Files likely touched:** `e2e/helpers/auth.ts`, maybe README / `.env.example` only if needed

**Scope:** S

**Dependencies:** Tasks 3–10

---

## Task index

| # | Title | Scope | Depends |
|---|-------|-------|---------|
| 1 | Auth skip + E2E docs | S | — |
| 2 | Shell helper | S | 1 |
| 3 | Money home smoke | S | 2 |
| 4 | Money new write | M | 3 |
| 5 | Money Insights More | M | 3 |
| 6 | Money Settings children | M | 3 |
| 7 | Money Import entry | S | 3 |
| 8 | Investments home + Insights More | M | 2 |
| 8a | Investments import + settings + open new | S | 8 |
| 9 | Loans smoke | M | 2 |
| 10 | Loans Pay submit | M | 9 |
| 11 | Docs polish | S | 3–10 |

**Parallel-safe after Task 2:** Money (3–7), Investments (8–8a), and Loans (9–10) can proceed on separate tracks if needed.
