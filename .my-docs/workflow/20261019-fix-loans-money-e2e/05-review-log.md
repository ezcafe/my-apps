# Review log: 20261019-fix-loans-money-e2e

**Round:** 1
**Result:** clean

## Adversarial test review

**Result:** clean

**Updated:** 2026-10-19  
**Scope:** Fresh Senior Verifier (generation ≠ verification). Draft vs `04-tasks` + Option 1: `e2e/loans.spec.ts`, `lib/money-query-options.ts` (+ invalidate unit), `lib/investment-query-options.ts`, Pay/add-tx toast ordering. Lens plan none. Do not fix.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `loan-pay-modal` / `money-transaction-form` | No unit locks toast-before-invalidate order; Depth C e2e covers toast. OK to add later if order regresses. | open |
| Nit | `e2e/loans.spec.ts` Pay toast | Success toast stays `expect.soft` (pre-existing). Hard expect would fail faster. | open |

### Lock / 04-tasks coverage check

| Lock / planned red | Proven? | Note |
|--------------------|---------|------|
| Task 1 Loans cold nav → `gotoAppPath` | yes | home / insights / settings / `openPayFlow`; helper from `./helpers/shell` |
| Task 2 Pay toast `Payment recorded in Money` | yes | product: toast + close before background invalidate; e2e assert kept |
| Task 3 Money add-tx `Transaction added` + no cascade | yes | same invalidate/`active` fix; e2e money.spec unchanged; Verify 9/9 |
| Task 4 Verify green | yes | `06-test-log` verify-pass (build/unit/e2e) |
| Unit: money+investment invalidate `refetchType: "active"` | yes | `money-query-options.invalidate.test.ts` — would fail on `"all"` |

### Failure-mode / theater notes

- **Not theater:** Unit calls real `invalidateMoneyWorkspaceQueries` → real investment twin; mock only records `invalidateQueries` opts. Reverting either key to `"all"` fails the unit.
- **Root cause locked:** Inactive refetch storm (`refetchType: "all"`) before toast — matches Build notes / e2e “Saving…”.
- **Flaky:** Loans uses shared `gotoAppPath` (not sleep loops). Soft toast asserts pre-existed; suite green on Verify.
- **Gaps OK:** No new toast-markup unit (Design: only if role/copy changes — neither changed).

### Fix ask (Critical/Major only)

None.

**Deferred Enhancements:** optional unit for toast-before-invalidate order; harden Pay toast to hard expect.

### Round notes

- Option 1 honored: nav harden then product write path.
- Zero Critical/Major → **clean**.

---

## Quality

**Result:** clean

**Updated:** 2026-10-19  
**Scope:** Fresh Senior Verifier. Five axes vs `01-idea` / `03-design` / `04-tasks`. Has UI = yes → Design UI lock checked. Lens plan none (no deep API/DB). Do not fix.

### Checklist

- [x] Context understood (Loans/Money e2e red → gotoAppPath + active-only invalidate + toast-first)
- [x] Correctness + tests adequate (unit locks `active`; e2e Depth C green per `06-test-log`)
- [x] Security light (no new auth/API/schema; mutate-then-toast unchanged trust boundary)
- [x] Architecture (fix at shared invalidate helpers; investment twin aligned; fire-and-forget after success)
- [x] Readability (short comments state why `active` / toast-first)
- [x] Performance (less inactive refetch storm — intended)
- [x] Verdict: Approve

### UI lock check (Design — Has UI)

| Lock | Status | Note |
|------|--------|------|
| Success copy `Payment recorded in Money` / `Transaction added` | pass | Unchanged; e2e still filters those strings |
| Success `role=status` | pass | No toast markup/role change; notify path unchanged |
| Layout / skeleton / DESIGN_GUIDE tokens | pass | No visual structure change — timing/refetch only |
| Gate A #1/#2 | N/A | Mode simple (no Gate A) |

No Design UI drift → no Major.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | Pay / add-tx fire-and-forget invalidate | Brief stale lists until background refetch; by design. Swallow errors after write OK for this fix. | open |
| Nit | `lib/money-query-options.invalidate.test.ts` | Untracked in working tree at review time — ensure it ships with the draft. | open |

### Fix ask (Critical/Major only)

None.

### Round notes

- Matches idea/design: product-first write hang fix, not timeout-only.
- Has UI but no UI surface drift → Quality **clean**.

---

## Merged lenses (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

**Result:** clean

Lens plan **none** — no lens files this round. No merge.

### Fix ask (for Fix agent)

None.

---

## Deferred (Enhancements — do not block clean)

- Optional unit for toast-before-invalidate ordering on Pay / add-tx.
- Consider hard (non-soft) Pay toast expect.
- Confirm `lib/money-query-options.invalidate.test.ts` is committed with the fix.

---

## Fix notes (TDD skipped)

N/A — unit added for invalidate contract; e2e repro reused (04a skipped per run).
