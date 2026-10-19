# Tasks: README cron setup (all features)

**Has API:** no · **Has DB:** no · **Automated tests:** none planned (docs-only; skip `04a`)

## Task 1: Fix local + env `CRON_SECRET` wording

**Description:**
Update README local Recurrence section and local/prod env tables so `CRON_SECRET` is required in all environments (match `lib/cron-auth.ts`). Local verify curls must send `Authorization: Bearer $CRON_SECRET`. Note unset secret → `503` with `CRON_SECRET not configured`.

**Acceptance:**

- [ ] No “optional locally” / “accepted without a secret” claims remain
- [ ] Prod table does not claim only money-recurrence or “401 if unset” for missing secret
- [ ] Local curl example includes Bearer header

**Tests (TDD — what turns red first):**

- [ ] **N/A — no automated tests** (docs-only)

**Files likely touched:** `README.md`

**Scope:** S

**Dependencies:** none

---

## Task 2: Replace §5 with all-features cron runbook

**Description:**
Replace production “### 5. Recurring transactions” with “### 5. Cron jobs (all features)” per `03-design.md` Build locks: shared auth, inventory of four routes, suggested crontab (four lines), short per-job notes (keep Money no-backfill behavior), troubleshooting table, links to `docs/API.md` / `docs/PERFORMANCE.md` (and feature READMEs only as light pointers).

**Acceptance:**

- [ ] All four paths documented: money-recurrence, loan-reminders, investment-quotes, db-housekeeping
- [ ] Shared Bearer + host-crontab pattern; no in-app cron claim
- [ ] Suggested schedules labeled as examples
- [ ] Money recurrence behavior notes preserved
- [ ] Troubleshooting covers 401, 503 (secret / DB), and job-specific empty results
- [ ] Deep detail linked out (not pasted)

**Tests (TDD — what turns red first):**

- [ ] **N/A — no automated tests** (docs-only)

**Files likely touched:** `README.md`

**Scope:** S

**Dependencies:** Task 1 (same file; can be one commit)

---

## Task 3: Manual operator check (no CI)

**Description:**
Human skim: a new operator can schedule every cron from README alone; auth matches code; links resolve.

**Acceptance:**

- [ ] Inventory matches `app/api/cron/*/route.ts`
- [ ] Auth wording matches `lib/cron-auth.ts` and `docs/API.md`
- [ ] Optional: one local Bearer curl succeeds when secret set

**Tests (TDD — what turns red first):**

- [ ] **N/A — no automated tests**

**Files likely touched:** none (verify only)

**Scope:** S

**Dependencies:** Task 2

---

## Checkpoints

After Task 2:

- [ ] README alone covers all four crons + auth
- [ ] No production code / OpenAPI / route changes
- [ ] Confirm again: Has API **no**, Has DB **no**
