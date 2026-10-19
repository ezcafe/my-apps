# Review log: 20261019-remove-kiosk

## Adversarial test review

**Result:** clean

**Round:** 2  
**Updated:** 2026-10-19  
**Scope:** Re-verify after fix-review (same-object permanent lock). Prior Major: kiosk-redirects permanent binding. Check for new Critical/Major only; Enhancements may stay Deferred. Do not fix.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/kiosk-redirects.test.ts:9-17` | **“permanently redirects” overclaims.** Regex is `source→destination→permanent:true` with `[\s\S]*?` across the whole `next.config.ts`. If `/kiosk` (or `:path*`) uses `destination: "/money"` with `permanent: false`, a **later** unrelated redirect’s `permanent: true` still satisfies the match. Proven with a bad fixture (temp `/kiosk` + later baby permanent) → both asserts still pass. Grill/Design lock is permanent bookmark redirect; this red does not fail when permanence is dropped. Tighten to one object (e.g. single-line / bounded `{…}` match, or parse `redirects()` return) so `permanent: true` is on the same `/kiosk` entry. | **closed** (R2) |
| Enhancement | `lib/user-preferences-retired.test.ts` | Route + city-search `existsSync` only. Does not lock deleted `lib/user-preferences-service.ts` / `lib/validators/user-preferences.ts` (or empty-bag re-export). Low risk while imports are gone; optional file-gone asserts would harden Task 1. | Deferred |
| Enhancement | Task 5 package delete | No unit that `components/kiosk`, `lib/kiosk`, `components/weather`, `lib/weather` are absent on disk. Teardown relies on delete + suite green. Optional dir/`existsSync` would catch silent WIP reintro. | Deferred |
| Nit | `lib/kiosk-redirects.test.ts` vs `lib/baby-growth-redirects.test.ts` | Same cross-object `permanent` pattern as baby redirects — fix kiosk lock first; baby can follow later. | Deferred |

### Re-verify (Round 2)

**Prior Major — permanence binding:** Closed.

- **Fix present:** `sameObjectRedirect` builds `\{\s*source…[^{}]*destination…[^{}]*permanent…[^{}]*\}` — `[^{}]*` cannot leave the object, so a later entry’s `permanent: true` cannot satisfy `/kiosk` or `/kiosk/:path*`.
- **Bad-fixture proof (verifier):** temp `{ source: "/kiosk", destination: "/money", permanent: false }` (+ `:path*` false) with a later `{ … permanent: true }` → both `sameObjectRedirect(..., true)` asserts **fail**. Same sources with `permanent: true` → **pass**. Multiline single-line objects OK.
- **Production:** `next.config.ts` lines 29–30 are same-object `{ source, destination: "/money", permanent: true }` for both entries; `doesNotMatch` `/money/new` kept on same-object bounds.
- **Residual (not Major):** comment-embedded `permanent: true` before `permanent: false` inside one `{…}` can still match; Enhancement/Nit only — outside Fix ask and not the cross-entry failure mode.

**New Critical/Major:** none.

### Lock / 04-tasks coverage check

| Lock / planned red | Proven? | Note |
|--------------------|---------|------|
| Task 1 prefs route file gone (no empty bag) | yes | `user-preferences-retired.test.ts` `existsSync` false |
| Task 1 prefs validator/service tests not expecting live bag | yes | suites deleted; no live-bag imports in remaining units |
| Task 2 city-search route gone | yes | same retired file |
| Task 2 no weather package imports in production | process | delete + Verify; no dedicated grep unit (OK per 04a non-goals) |
| Task 3 DROP TABLE / schema gone | process | migration + typecheck; no DB integration (planned) |
| Task 4 settings has no kiosk category; weather/widgets ≠ kiosk; appearance/theme remain | yes | `settings.test.ts` |
| Task 5 registry no kiosk; Money first | yes | `registry.kiosk.test.ts` |
| Task 5 permanent `/kiosk` (+ `:path*`) → `/money`, not `/money/new` | **yes** | destination + not-`/money/new` + **same-object `permanent: true`** (Major closed R2) |
| Task 5 chrome path ignores retired `/kiosk` | yes | `money-tabs-chrome-path.test.ts` |
| Task 5 core header no kiosk titles | yes | `core-app-header.test.ts` |
| Task 5 delete e2e/kiosk + kiosk/weather units with modules | yes | packages/specs absent on disk; runner collects only existing files |
| Task 5 keep Popover/MoreMenu tests | yes | `popover*.test.ts`, `more-menu.test.ts` present |
| Task 6 docs/ADR | N/A automated | checklist |
| Task 7 collateral green | Verify | outside this lens |

### Failure-mode / theater notes

- **Not mock theater:** Teardown reds hit real registry, chrome helper, settings categories, on-disk route paths, and config source — no spy-only “mocks are mocks.”
- **Deterministic:** No timers, random, or network in these units. Config/`existsSync` reads are stable.
- **Critical paths:** Prefs/city-search absence and Settings/nav strip locked. Redirect permanence now same-object bound (R2).
- **Explicit non-goals (OK per 04a):** HTTP-level 404 without route harness; DB integration for DROP; optional Playwright `/kiosk`→`/money`.

### Deferred Enhancements

Optional service/validator file-gone asserts; optional kiosk/weather package absence asserts; baby redirect regex same cross-object pattern (Nit); comment-inside-object permanence false-positive (residual).

### Round notes

- R1 Major closed by Fix; R2 bad-fixture re-proof confirms no cross-entry permanence. Zero open Critical/Major → **clean**. Quality may proceed.

## Fix (adversarial-tests)

**Result:** verify-pass

**Round:** 1  
**Updated:** 2026-10-19  
**Mode:** adversarial-tests

### Fixes applied

1. **Major — `lib/kiosk-redirects.test.ts`:** Rewrote permanence lock. Helper `sameObjectRedirect` matches `source` + `destination` + `permanent` inside one `{…}` using `[^{}]*` (no cross-object `[\s\S]*?`). Asserts `/kiosk` and `/kiosk/:path*` → `/money` with `permanent: true` on the same object. Kept same-object `doesNotMatch` for `/money/new`. Enhancements skipped (not trivial / out of Fix ask).

### Verify gate

| Command | Result |
|---------|--------|
| `npm run build` | pass |
| `npm test` | pass |
| `npm run test:e2e` | fail — 13 baby specs (`baby-care.spec.ts`, `baby-home-option-b.spec.ts`); unrelated to kiosk redirect test rewrite |

**Gate:** verify-pass per verify-and-fix (build + unit). E2e baby reds noted for parent.

### Round notes

- Tests/behavior changed: yes (unit test only; production `next.config.ts` unchanged).
- Major Status → fixed; Enhancements left open.

## Quality

**Result:** clean

**Round:** 1  
**Updated:** 2026-10-19  
**Scope:** Independent Quality review of worktree draft vs `01-idea` / `03-design` / `04-tasks` + Gate A #1/#2. Lens plan api+db — no deep API contract or schema/migration review here. Do not fix.

### Checklist

- [x] Context understood (Option 1 systemic teardown; prefs retire; DROP TABLE; permanent `/kiosk`→`/money`)
- [x] Correctness + tests adequate for teardown locks (registry, settings, redirects same-object, prefs/city-search gone, chrome-path, header)
- [x] Security (prefs mutate surface gone; city-search gone — light check only; API/DB lenses next)
- [x] Architecture (redirect pattern, core nav delete-only, no empty-bag stub, no WorkspaceAppKey invent)
- [x] Readability (acceptable for teardown)
- [x] Performance (N/A teardown; no new hot paths)
- [x] UI locks Gate A #1/#2 + Design UI
- [x] Verdict: Approve

### UI locks (Has UI)

| Lock | Draft | Status |
|------|-------|--------|
| Gate A #1 — shell nav without Kiosk; Money first useful | `registry.ts`: no kiosk; `shellNavItems[0]` = money `/money`; unit `registry.kiosk.test.ts` | pass |
| Gate A #2 — Settings without widgets/layout/weather; theme/account remain | No `kiosk` category; page uses client `ThemeSettings` + account/etc.; no kiosk/weather/prefs imports; skeleton 6 cats matches | pass |
| Permanent `/kiosk` (+ `:path*`) → `/money`, not `/money/new` | `next.config.ts` same-object `permanent: true`; unit locked | pass |
| No stub / empty “Kiosk” heading / orphan edit chrome | `/kiosk` pages gone; packages gone on disk; `.kiosk-*` CSS gone | pass |
| Keep Popover/MoreMenu (+ tests) | Present with tests | pass |

### Task / design alignment (light)

| Area | Note |
|------|------|
| Task 1–2 prefs + city-search | Routes absent on disk; `user-preferences-retired.test.ts`; validators/service gone |
| Task 3 DROP TABLE | `0049_drop_user_preferences.sql` + journal; schema file gone — deep review → DB lens |
| Task 4–5 UI/nav/redirects/modules | Matches Design UI + Pattern 1/3 |
| Task 6 docs | ADR-006 Accepted; 003–005 Superseded; DESIGN_GUIDE/GLOSSARY kiosk product terms purged; ARCHITECTURE notes redirect |
| Task 7 | Build/unit verify-pass per run; baby e2e collateral noted in Smoke (not teardown-linked) |

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `lib/money-services/analytics.ts` (`computeMoneyExpenseCumulativeSeries`, `computeMoneyDailyTransactionCounts`); `lib/loans-services/due.ts` (`listUpcomingLoanPayments`); `lib/investment-services/portfolio-series.ts` (`investmentInsightsSummary`) | Zero production callers after kiosk package delete; comments still say “kiosk”. Optional dead-export cleanup (ask before delete) or comment rewrite — not a live product path. | open |
| Enhancement | Git index vs worktree | Many kiosk/weather/prefs deletes are worktree-only (` D` / `MD` / `AD`) while index still lists blobs. Draft on disk matches teardown; before commit, stage all deletions so WIP adds are not resurrected. Merge/Gate C hygiene. | open |
| Nit | Same helpers’ JSDoc | “for kiosk…” wording stale once board is gone. | open |

### Architecture vs Design

- **System design / patterns:** Config permanent redirect to `/money` (not `/money/new`); prefs resource retired (no empty bag); core nav delete-only — honored.
- **Anti-patterns avoided:** No coming-soon stub; theme stays client ThemeSettings.
- **API/DB depth:** Deferred to dedicated lenses per Lens plan.

### New Critical/Major

none

### Round notes

- Zero open Critical/Major → **clean**. Conditional api∥db lenses may proceed.

## Merged lenses

**Result:** clean

**Updated:** 2026-10-19  
**Sources this round:** `05-lens-api.md` (clean) · `05-lens-db.md` (clean)  
**Arbiter:** Findings Arbiter (fresh context; did not run lenses; did not fix code)

### Winners table

| Severity | Sources | Finding | Decision |
|----------|---------|---------|----------|
| — | api · db | No open Critical / Major after merge | Drop from Fix ask — Result clean |

### Conflicts resolved

None — both lenses agree: prefs/city-search retire + 404 matches design; DROP TABLE + schema/journal remove match design; no Critical/Major; only Nit/Enhancement remain.

### Fix ask (Critical/Major only)

None.

### Deferred (Enhancements / Nits — non-blocking)

| Id | Severity | Sources | Finding |
|----|----------|---------|---------|
| A1 | Nit | api | Retired prefs / city-search return framework HTML 404, not prefs `{ error, code }` JSON — design “404 is enough”; accept status only |
| A2 | Enhancement | api · adversarial | `user-preferences-retired.test.ts` locks route + city-search `existsSync` only; optional asserts for deleted service/validators (already Deferred in Adversarial) |
| D-N1 | Nit | db | Repo keeps early meta snapshots only (`0000`–`0003`); journal tag `0049_drop_user_preferences` present and consistent with hand-written DROP style |

### Round notes

- Launched lenses this round: **api** + **db** only (security / perf / memory not launched).
- Deduped: A2 matches Adversarial Deferred Enhancement on the same retired-file lock — kept clearest wording; sources api · adversarial.
- Conflict priority unused (no Security/Perf/Memory clash; no correctness vs micro-opt clash).
- Zero Critical/Major → **Result: clean**. Safe to leave lens loop.
