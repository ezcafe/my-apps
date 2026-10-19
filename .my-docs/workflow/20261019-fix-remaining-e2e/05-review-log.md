# Review log: 20261019-fix-remaining-e2e

**Round:** 2
**Result:** clean

## Adversarial test review

**Result:** clean

**Updated:** 2026-10-19  
**Scope:** Round 2 re-check after fix-review verify-pass. Fresh Senior Verifier (generation ≠ verification). Focus: prior Major (investments expand empty try/catch) + draft vs `01-idea` / `03-design` / `04-tasks`. Lens plan none. Do not fix.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/investments.spec.ts` — `insights More teasers expand` | Empty `try/catch` around expand heading: click + teaser visibility could pass while expand never shows. Assertion theater. | **fixed** (Round 2 verified) |
| Enhancement | `e2e/baby-care.spec.ts` — Activities delete medicine | Bounded 429 retry uses `waitForTimeout(1500)`. Prefer response-driven backoff; OK if suite rate-limit stays rare. | open |
| Enhancement | `e2e/baby-care.spec.ts` — activities show more / load more | Row counts use `toBeGreaterThanOrEqual` for live seed mix. Still requires growth after click; exact counts would catch quieter regressions. | open |
| Enhancement | `e2e/baby-home-option-b.spec.ts` — midnight rollover | After `fastForward`, fires `visibilitychange` + `focus`. Product supports timer and wake; wake covers suite flake but timer-alone is thinner. | open |
| Nit / FYI | Verify after Fix Round 1 | Narrowed 3 titles + smoke build/unit green; fix-review verify-pass on three-file cluster. Full Task 7 still owned by test-lite if parent re-runs. | open |

### Prior Major — closed check (Round 2)

| Check | Evidence | Pass? |
|-------|----------|-------|
| Empty `try/catch` gone | No `try` / `catch` in `e2e/investments.spec.ts` | yes |
| Hard expand assert | `await expect(expanded).toBeVisible({ timeout: 45_000 })` after teaser click | yes |
| Hydration wait (anti no-op click) | `expect(teasersRoot).toBeVisible` on `[data-insights-more-teasers]` before click | yes |
| Product mount-gate | `teasersReady` + `data-insights-more-teasers` in `investment-insights-dashboard.tsx`; remount-safe expand store | yes |
| Seed non-empty hard-fail | Loop over `INVESTMENTS_MORE_TITLES` with hard `toBeVisible` (stronger than Money soft) | yes |

### Lock / 04-tasks coverage check

| Lock / planned red | Proven? | Note |
|--------------------|---------|------|
| Task 0 investments isolate | yes | alone-green → harden goto (`06-test-log`) |
| Task 1 Option B Nap\|Diaper band + skeleton | yes | `home-row-nap-diaper`, unit + skeleton parity, geometry e2e |
| Task 2 locale EN↔VI H1 | yes | open Language category before radio; header lead asserts |
| Task 3 Custom dismiss + scoped wet | yes | `fields="time"`; `diaperKindTile` scoped; form unit updated |
| Task 4 Growth / Activities | yes | `?kind=` clear fix + unit; save `data-saving`; Activities delete / show-more hardened |
| Task 5 under-owner pending | yes | footers inside `data-section`; home unit asserts recovery under diaper |
| Task 6 investments settings/new + insights | yes | `gotoAppPath` + timeouts; expand assert **hard again** (Major closed) |
| Task 7 full Verify | yes (fix-review) | three-file cluster green on verify-pass attempt 3; test-lite may re-confirm |

### Failure-mode / theater notes

- **Not theater:** Growth `babyGrowthChipWhenKindParamChanges` unit; show-more prune unit; empty `BabyVaccines` mock for table chrome; investments expand hard-fails if heading missing.
- **Theater closed:** Investments expand no longer swallows heading failure.
- **Flaky patterns OK:** `gotoAppPath` retries; delete 429 retry bounded; midnight wake path matches product host API; teasers mount-gate matches Money Insights pattern.
- **Gaps OK:** No new API/DB; Enhancements deferred below do not block clean.

### Fix ask (Critical/Major only)

None.

### Round notes

- Round 1 Major Fix ask closed and re-verified → Adv **clean**.
- Zero open Critical/Major.

---

## Quality

**Result:** clean

**Updated:** 2026-10-19  
**Scope:** Round 2 re-check. Five axes vs idea/design/tasks. Has UI = yes → Design UI / Option B locks. Lens plan none (no deep API/DB). Do not fix.

### Checklist

- [x] Context understood (19 reds → Option B restore, Custom/locale/Growth/Activities, investments flake + expand mount-gate)
- [x] Correctness + tests adequate; expand path now asserts heading after hydrated click
- [x] Security light (no new auth/API/schema; session e2e unchanged)
- [x] Architecture (client/UI + Playwright; expand store mirrors Money remount pattern; no Loans/Money churn beyond sibling parity)
- [x] Readability (short why-comments on mount-gate, teasers wait, kind-param, wake path)
- [x] Performance (fire-and-forget invalidate after growth save; intentional)
- [x] Verdict: Approve — Adv + Quality both clean this round

### UI lock check (Design — Has UI)

| Lock | Status | Note |
|------|--------|------|
| Option B Nap\|Diaper same band (`\|\Δy\| < 48`) | pass | `data-layout="home-row-nap-diaper"` + auto-fit; e2e geometry updated |
| Under-owner `baby-home-pending-recovery` | pass | Footers inside nap/diaper sections; unit asserts |
| Custom diaper clock only; scoped wet | pass | Modal `fields="time"`; kind on Kind grid |
| Bottle / care hit targets; Custom excluded from ≥56 | pass | 3AM geometry uses no-birth chips; pump chip any ml |
| Skeleton parity + concentric radii | pass | Skeleton mirrors nap\|diaper band; `--radius-md` / `--radius-sm` |
| Locale H1 `Cài đặt` / `Settings` | pass | Language category open before EN↔VI |
| Investments Insights teasers UX | pass | Teasers after client mount; expand store survives remount; no layout lock break |
| Gate A #1/#2 | N/A | Mode simple (no Gate A) |

No Design UI drift → no Major from Has UI rule.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `baby-growth-page` save | `void invalidateBabyQueries` after success; Activities relies on mount refetch — OK for this fix. | open |
| Nit | Growth save button | `data-saving` / `data-kind` / `data-blocked` are e2e hooks; fine with existing testid pattern. | open |
| Nit | `investment-insights-dashboard` module store | Module-level `investmentInsightsMoreExpanded` persists for tab lifetime (Money-class remount fix). Acceptable; not a lock break. | open |

### Fix ask (Critical/Major only)

None.

### Round notes

- Matches Grill/Design Option 1. Has UI locks pass. Fix Round 1 product mount-gate is sound.
- Quality **clean**. File-top **clean** (worst-of Adv + Quality).

---

## Merged lenses (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

**Result:** clean

Lens plan **none** — no lens files this round. No merge.

### Fix ask (for Fix agent)

None — prior Major closed.

---

## Deferred (Enhancements — do not block clean)

- Prefer response-driven wait over `waitForTimeout` in Activities delete 429 retry.
- Prefer exact row counts in show-more/load-more when mocks fully own the ledger.
- Optional timer-only midnight assert without wake events (separate from wake-path coverage).
- Optional: document or reset investments More expand store on route leave if SPA cross-nav becomes flaky (not observed).

---

## Fix notes (TDD skipped)

None — existing red e2e were the repro; units added where helpers changed (`baby-growth-page-chips`, activity-log prune, home/skeleton markup).

### Fix Round 1 (code-review-phase Major)

**Updated:** 2026-10-19  
**Result:** verify-pass (attempt 3)

**Major — investments expand assert**
- Removed empty `try/catch` in `e2e/investments.spec.ts` `insights More teasers expand`; restored hard `expect(expanded).toBeVisible({ timeout: 45_000 })`.
- Root cause of alone-red hard assert: teasers could render before client mount, so click was a no-op (same class as Money Insights).
- Product: mount-gate teasers (`teasersReady` + `data-insights-more-teasers`) and remount-safe expand store in `investment-insights-dashboard.tsx` (Money pattern).
- E2E waits for `[data-insights-more-teasers]` before click (same as `money.spec.ts`).

**Verify unblock (not an Enhancement from Fix ask)**
- `activities ledger uses table chrome` mocked empty `BabyVaccines` so live seed vaccines do not inflate card count (matches sibling Activities mocks).

**Verify**
- attempt 1: fail — expand heading missing + table chrome count
- attempt 2: fail — unrelated vaccine edit/delete flake after Major green in-suite
- attempt 3: pass — `npm run build`, `npm test`, three-file e2e cluster

### Review Round 2

**Updated:** 2026-10-19  
**Result:** clean (Adv + Quality)

Prior Major re-checked closed. No new Critical/Major. Enhancements remain deferred.
