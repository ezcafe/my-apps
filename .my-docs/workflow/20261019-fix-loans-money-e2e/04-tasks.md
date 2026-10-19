# Tasks: Fix Loans / Money e2e

## Task 1: Align Loans e2e cold nav to gotoAppPath

**Description:** Replace bare `page.goto` in `e2e/loans.spec.ts` (home, insights, settings, Pay `openPayFlow`) with `gotoAppPath`. Keep `expectMoneyWorkspaceReady` and assertions.

**Acceptance:**

- [ ] Loans home / insights no longer fail on `waitUntil: load` timeout alone
- [ ] Settings still passes
- [ ] Helper import from `./helpers/shell` only (no duplicate goto logic)

**Tests (TDD — what turns red first):**

- [ ] Existing e2e (already red): `e2e/loans.spec.ts` home + insights — reproduce first, then change goto; no new unit required for helper reuse
- [ ] Note: 04a skipped — e2e repro already exists

**Files likely touched:** `e2e/loans.spec.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Diagnose and fix Pay success toast path

**Description:** After Task 1, run Pay case alone. If mutation errors → fix product path (`loan-pay-modal` / GraphQL client). If success but toast missing → fix `useNotify` toast to expose `role=status` with copy `Payment recorded in Money` (keep e2e assert).

**Acceptance:**

- [ ] `Pay records payment with unique note` passes (toast visible; no error alert)
- [ ] No silent drop of success toast assert

**Tests (TDD — what turns red first):**

- [ ] Existing e2e: Pay case must fail for same reason before product/toast change
- [ ] Optional unit: toast/`useNotify` renders `role=status` with success text — only if Build changes toast markup

**Files likely touched:** `components/loan-pay-modal.tsx`, notify/toast UI, `e2e/loans.spec.ts` (only if selector must track intentional copy change)

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: Diagnose and fix Money add-tx (stop cascade)

**Description:** Run add-tx alone after Loans green. Fix hang/crash on save or toast `Transaction added` so later Money routes are not `CONNECTION_RESET`/`REFUSED`.

**Acceptance:**

- [ ] `add transaction with unique note` passes
- [ ] Insights / settings hub / import cases run without connection refused (same Verify command)
- [ ] Full Verify e2e line exits 0

**Tests (TDD — what turns red first):**

- [ ] Existing e2e: `e2e/money.spec.ts` add-tx (and follow-ons if server dies)
- [ ] Optional unit only if form/toast production code changes

**Files likely touched:** `components/money-transaction-form.tsx`, notify/toast UI, `e2e/money.spec.ts` only if justified

**Scope:** M

**Dependencies:** Task 1 (nav stability helps isolation); can parallel Task 2 once Loans home green

---

## Task 4: Verify Loans + Money e2e green

**Description:** Run full Verify commands from `00-run.md`.

**Acceptance:**

- [ ] `npm run build` pass
- [ ] `npm test` pass (or unchanged failures unrelated — call out if so)
- [ ] `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/loans.spec.ts e2e/money.spec.ts` exits 0

**Tests (TDD — what turns red first):**

- [ ] N/A — verification gate (no new tests)

**Files likely touched:** none expected

**Scope:** S

**Dependencies:** Task 2, Task 3

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused e2e slice green (Loans alone after Task 1–2; Money alone after Task 3)
- [ ] Full Loans+Money Verify command green after Task 4

## Flags (confirm)

- **Has API:** no
- **Has DB:** no
- **Has auth/PII/schema:** no

## Verify commands (confirm)

- **cwd:** `/Users/ptquang86/ws/my-apps`
- **build:** `npm run build`
- **unit:** `npm test`
- **e2e:** `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/loans.spec.ts e2e/money.spec.ts`
