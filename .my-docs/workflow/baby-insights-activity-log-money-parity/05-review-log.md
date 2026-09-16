# Review log: Baby Insights Activity log Money interaction parity

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/baby-care.spec.ts:2190-2292` · Task 7 | **Full multi-delete success path missing.** Spec covers cancel + mixed mutations + partial-fail Alert only. No case where both deletes fulfill → selection empty, bar gone, **no** panel Alert, busy cleared. A regression that always keeps keys or always shows Alert after success can still pass today’s test. Task 7 lists happy-path confirm e2e. | fixed |
| Major | `e2e/baby-care.spec.ts:2271-2274` · Task 7 / 04a cancel | **Cancel confirm is a weak no-op assert.** After `dialog.dismiss()`, test only polls `deletes.length === 0` and bar still visible. It does **not** assert both row checkboxes stay checked / selection count unchanged. Mutations-not-fired is necessary but not sufficient for “cancel = no-op.” | fixed |
| Major | `lib/baby-insights-activity-log.test.ts:103-111` vs `components/baby-insights-dashboard.tsx:543-551` | **“Still on screen” prune rule is unit-only; wiring untested.** Unit proves failed keys drop when `stillVisible` omits them. Dashboard builds `stillVisible` from closure `visibleSelectionKeys` **before** post-invalidate rows re-render, and no e2e/integration drives a failed delete whose row leaves the list. Helper can stay green while product lock “keep failed **only if** still present” is never exercised end-to-end (false confidence). | fixed |
| Enhancement | `e2e/baby-care.spec.ts` · Task 5 / 9 · design lock #12 | **Filter-apply clear selection untested.** Retention/clear e2e covers show-more keep + panel close clear only. `handleApply` also clears selection; no named assert for Apply filters → bar gone. (04a allowed OR; panel close satisfies minimum — still a locked clear path with zero coverage.) | fixed |
| Enhancement | `e2e/baby-care.spec.ts` · Task 3 / 5 | **Bar Clear and header select-all (visible window only) have no e2e/unit.** Clear is a primary bar action; select-all must not pull unloaded history. 04a left these as optional; still open after Build. | fixed |
| Enhancement | `lib/baby-i18n.test.ts:156-176` · Task 7 | **`insights.selectionDeleteAllFail` (+ all-reject delete UX) untested.** Partial-fail copy is covered; all-fail message key and UI path (every settle rejected → all-fail Alert, not partial copy) are not. | fixed |
| Nit | `e2e/baby-care.spec.ts:2278` | `expect.poll(() => deletes.sort())` mutates the shared `deletes` array each poll. Sort-for-order is fine for races; prefer `[...deletes].sort()` to avoid shared mutation. | fixed |
| FYI | Units in `lib/baby-insights-activity-log.test.ts` | Selection keys, Edit-enable, prune happy/invisible, mixed delete-target routing are **not** mock theater — they call real helpers the dashboard imports. E2E GraphQL route mocks are appropriate. | — |

**Round notes:**

- Read: `04-tasks.md`, `04a-tdd-test-review.md`, `03-design.md` locks, draft units + `e2e/baby-care.spec.ts` selection/delete specs, `baby-activity-selection-bar.tsx`, dashboard delete/prune wiring.
- 04a required items mostly landed: prune unit, partial-fail Alert e2e, Edit disabled-visible, show-more retention, panel-close clear, mixed care+growth mutations, cancel mutations===0.
- Strongest gaps now: success-path delete e2e, stronger cancel no-op, and end-to-end proof of “failed but not visible” prune (unit vs stale `stillVisible` wiring).
- Result: **needs fix** (3 Major + Enhancements). Do not treat as clean.
- **Fix round (adversarial):** see Fix notes below. All Critical/Major/Enhancement (and cheap Nit) addressed → re-run Adversarial next.

### Round 2 (re-verify after Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `e2e/baby-care.spec.ts` · Task 7 / design lock #2 / 04a | **Busy / double-submit still untested.** Bar passes `busy={actionBusy}` and disables Edit/Delete/Clear while deletes run; cleared in `finally`. No e2e (or unit) holds a delayed delete fulfill and asserts Delete disabled mid-flight, then re-enabled after partial/all-fail settle (bar stays up). A stuck-`actionBusy` regression after partial/all-fail would still pass today’s suites. | fixed |
| Nit | `e2e/baby-care.spec.ts` · Task 7 | **Single-row bar Delete path.** All delete e2e select 2 rows; `selectionDeleteConfirmOne` / count===1 confirm→mutation never exercised (shared handler — low risk). | fixed |
| FYI | Round 1 closures | Full success, cancel no-op (count + both checkboxes), failed-key prune e2e + post-invalidate `stillVisible` wiring, filter-apply / Clear / select-all cap, all-fail Alert + i18n, `[...deletes].sort()` — **verified closed** against draft + tests. | — |
| FYI | Fix remaining risks | `force: true` checkbox clicks; select-all proves visible-cap count (not a separate beyond-cap Set probe) — acceptable residual, not reopened as Enhancement. | — |

**Round 2 notes:**

- Re-read: Round 1 table + Fix notes, `04-tasks.md` Task 7, design lock #2, dashboard delete/`stillVisible` block, new e2e specs (~2307–2708), prune unit post-refresh case, i18n `selectionDeleteAllFail`.
- Round 1 Critical/Major/Enhancement claims match real coverage (not mock theater). Strongest remaining hole is busy disable while destructive work runs — still listed optional in 04a but locked in Task 7 acceptance and design.
- Result: **needs fix** (1 Enhancement). Not clean.
- **Fix round (adversarial Round 2):** see Fix notes below. Enhancement + cheap Nit closed → re-run Adversarial next.

### Round 3 (re-verify after busy / double-submit Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| FYI | `e2e/baby-care.spec.ts:2582-2670` · Task 7 / design lock #2 | **Busy / double-submit closed.** Spec gates `deleteBabyEvent` fulfill, asserts Delete + Clear `toBeDisabled` mid-flight, then reject settle → all-fail Alert + Delete/Clear `toBeEnabled` (stuck-`actionBusy` would fail). Not mock theater — real bar `disabled={busy}` wiring. | — |
| FYI | Same spec · confirmOne Nit | Single-row confirm message matches `selectionDeleteConfirmOne` (EN/VI) before accept — Round 2 Nit closed. | — |
| FYI | Round 1 + Round 2 closures | Full success, cancel no-op (count + checkboxes), failed-key prune e2e + post-invalidate `stillVisible`, filter-apply / Clear / select-all cap, all-fail Alert + i18n, `[...deletes].sort()` — still present and mapped to real helpers/UI. | — |
| Nit | Busy e2e | Mid-flight does not also assert Edit disabled; Edit shares `busy` with Delete/Clear (`disabled={busy || !editEnabled}`). Residual only. | — |

**Round 3 notes:**

- Re-read: Round 2 Enhancement + Fix notes, Task 7 acceptance (busy disable + clear on settle), design lock #2, `BabyActivitySelectionBar` `busy` props, dashboard `setActionBusy` / `finally`, busy e2e (~2582–2670).
- Round 2 failure mode (stuck busy after fail while bar stays) is covered; fail-path `finally` is the same clear used on success.
- No new Critical / Major / Enhancement. Residual: Edit mid-flight Nit; documented gate-race FYI from Fix notes.
- Result: **clean.**

### Round 4 (re-verify after Quality Fix — skeleton / prune / busy chrome)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| FYI | Quality Fix closures vs tests | **Skeleton mount:** e2e expand → gated lists → `role=status` + table + `.size-4` checkbox placeholders → empty after release (`e2e/baby-care.spec.ts` ~1240). **Loaded-key prune:** unit drops sync-orphan keys (`pruneActivityLogSelectionToLoadedKeys`); dashboard effect on `activityRows`; show-more retention e2e still proves grow does not over-clear. **Busy row chrome:** busy e2e asserts bar Delete/Clear + row checkbox + row Edit disabled mid-flight and re-enabled after fail settle. | — |
| FYI | Prior Adversarial R1–R3 | Full success, cancel no-op, failed-key prune e2e, filter-apply / Clear / select-all, all-fail Alert, busy bar path — still present; not mock theater. | — |
| Nit | Busy e2e · header select-all | Mid-flight does not also assert header select-all disabled; it shares `disabled={actionBusy}` with row checkboxes (already asserted). | — |
| Nit | Sync truncate | Orphan prune remains helper-unit + thin effect; no Playwright sync-interval shrink drive (heavy). Residual only. | — |

**Round 4 notes:**

- Re-read: Quality Round 2 clean + Quality Fix notes (skeleton mount, `pruneActivityLogSelectionToLoadedKeys` effect, busy row chrome, invalidate-throw prune), matching units + e2e, dashboard wiring.
- Quality Fix did not reopen prior delete/selection coverage holes; new behaviors have real helper/UI asserts (not mock theater).
- No new Critical / Major / Enhancement.
- Result: **clean.**

### Round 5 (re-verify after Merged SPM Fix — concurrency pool + scoped invalidate)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| FYI | `lib/baby-insights-activity-log.test.ts` · P1 | **Concurrency pool covered by real helper units.** Peak in-flight ≤ limit (n=12, limit=3), reject settle at index, empty input, constant in 4–8 band. Not mock theater — calls `mapAllSettledWithConcurrency`. Dashboard wires pool via `ACTIVITY_LOG_DELETE_CONCURRENCY` (6). | — |
| FYI | `lib/baby-insights-activity-log.test.ts` · P2 | **Invalidate scope covered.** care-only → `"care"`; growth-only → `"growth"`; mixed → `"growth"`. Matches `invalidateBabyQueries` care/growth key sets already unit-tested in `lib/baby-query-options.test.ts`. Dashboard passes `activityLogDeleteInvalidateScope(targets)` into invalidate. | — |
| Nit | Concurrency / scope e2e | Multi-delete e2e still uses 1–2 rows; does not prove max parallel GraphQL POSTs or that invalidate is not `"all"`. Acceptable — pool + scope are pure helpers; e2e would be timing-fragile / overkill. | — |
| Nit | Result-order assert | Peak test spot-checks `results[0]` / `results[7]` by index; does not assert every `results[i]` value. Residual only. | — |

**Round 5 notes:**

- Re-read: Merged SPM Fix notes (P1 pool, P2 scoped invalidate, P3 deferred), helper + units, dashboard `handleSelectionBarDelete` call sites.
- SPM Fix did not reopen prior Adversarial R1–R4 coverage; new helpers have failure-mode units (peak fan-out, wrong scope mapping).
- No new Critical / Major / Enhancement.
- Result: **clean.**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-page-skeleton.tsx` (`BabyInsightsListSkeleton`) · Task 8 / design lock #10 / idea success #4 | **Selectable list skeleton is dead code.** Helper was updated to checkbox → event → recorded → actions (+ mobile), but it is never mounted. `BabyInsightsPageSkeleton` / `loading.tsx` correctly mirror **collapsed** Activity log (e2e asserts zero tables). Expanding the panel still goes empty-copy → live table with no selectable placeholders, so CLS for the new checkbox/actions chrome is not covered. Task 8 / lock #10 marked done without a loading path that renders the new chrome. Wire `BabyInsightsListSkeleton` into panel loading, or stop claiming skeleton parity for selectable columns. | fixed |
| Major | `components/baby-insights-dashboard.tsx` sync interval (~363–394) vs selection Set · idea “visible window” / locks #6 + #12 | **Sync truncate can orphan selection.** Periodic `applyBabyTimelineSyncTruncate` drops multi-page care cache to the first page and does **not** prune/clear `selectedKeys`. Bar can show N selected while on-screen checkboxes reflect fewer (or none of those keys); Delete still runs mutations for invisible care ids. Lock #12 lists clear triggers and omits sync — still a correctness hole vs visible-window selection. Prune selection to keys still in loaded `activityRows` after truncate (or clear on truncate). | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` (~1375 LOC) · Option 1 | **Dashboard absorbs full selection + multi-delete orchestration.** Matches chosen Option 1 (Money untouched), but file is past the skill’s large-file bar with delete loop, post-invalidate stillVisible rebuild, and table/cards inlined. Extract Activity log table + delete runner in a follow-up if a third surface needs the pattern. | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` table/cards checkboxes + row Edit · lock #2 busy | **Busy only disables the selection bar.** While `actionBusy`, row checkboxes and per-row Edit stay active, so selection can change mid-delete and Edit can open during destructive work. Bar busy is correct; consider disabling row select/Edit for the same window. | fixed |
| Enhancement | `handleSelectionBarDelete` catch (~589–590) | **Invalidate throw after settled deletes.** If `Promise.allSettled` succeeds but `invalidateBabyQueries` throws, catch shows all-fail Alert and skips prune — selection/UI can disagree with server. Rare; still worth pruning from settle results before/despite invalidate failure. | fixed |
| Nit | `components/ui/checkbox.tsx` + e2e `force: true` | Shared Checkbox visual marker still forces Playwright `force: true` (adversarial residual). Prefer `pointer-events-none` on the decorative span if touching shared Checkbox later. | open |
| FYI | Money files / helpers / bar fork | `transaction-selection-bar.tsx` / `analytics-transactions-table.tsx` untouched. Composite keys, Edit-enable-iff-1, prune+stillVisible, Baby bar portal+i18n, panel/filter/Clear retention match 01/03/04. Adversarial Round 3 coverage is solid for delete paths. | — |

**Round notes:**

- Read: `01-idea.md`, `03-design.md` locks #1–#12, `04-tasks.md` Tasks 3–9, `code-review-and-quality` skill; inspected `baby-activity-selection-bar.tsx`, dashboard selection/delete wiring, `baby-insights-activity-log.ts` helpers, skeleton, EN/VI keys, focused e2e names.
- Axes: Correctness (sync orphan, skeleton claim), Architecture (dashboard size / Option 1), Readability (OK), Performance (N client deletes — accepted Money parity), Security (selection not authz; workspace-scoped mutations reused — OK).
- Result: **needs fix** (2 Major + Enhancements). Not clean.
- **Fix round (Quality):** see Fix notes below. All Critical/Major/Enhancement addressed → re-run Quality next.

### Round 2 (re-verify after Quality Fix)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| FYI | Round 1 closures | **Selectable list skeleton mounted** (`activityListsInitialLoading` → `BabyInsightsListSkeleton selectable` + expand e2e); **sync/load shrink prune** (`pruneActivityLogSelectionToLoadedKeys` effect on `activityRows` + unit); **busy gates row chrome** (header select-all, row checkboxes, row Edit + busy e2e mid-flight); **invalidate-throw prune** (settle prune with pre-refresh `stillVisible` + unit); **helper extracts** (`pruneActivityLogSelectionToLoadedKeys`, `activityLogDeleteSettleAlert`) — **verified closed** against draft + tests. | — |
| FYI | Dashboard size / Option 1 | Full Activity log table / delete-runner split remains deferred (Option 1 ownership; helpers extracted this Fix). Residual file size (~1422 LOC), not reopened. | — |
| Nit | `components/ui/checkbox.tsx` + e2e `force: true` | Shared Checkbox visual marker still forces Playwright `force: true` (unchanged; Round 1 Nit left open on purpose). | open |

**Round 2 notes:**

- Re-read: Round 1 Quality table + Quality Fix notes, design locks #2/#6/#10/#12, dashboard selection/delete/`stillVisible`/busy wiring, `BabyInsightsListSkeleton` mount path, prune helpers + units, skeleton + busy e2e.
- Axes re-check: Correctness (skeleton claim + sync orphan closed), Architecture (Option 1; extract deferred as documented), Readability (OK), Performance (N client deletes — accepted), Security (selection not authz — OK).
- No new Critical / Major / Enhancement. Residual: Checkbox `force: true` Nit only.
- Result: **clean.**

---

## Merged SPM (Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-security.md`, `05-lens-performance.md`, `05-lens-memory.md`.

**Round:** 1
**Result:** needs fix

### Winners (fix these)

| Severity | Sources (security/perf/memory) | Finding | Decision |
|----------|--------------------------------|---------|----------|
| Critical | perf **P1** (memory FYI aligns) | Multi-Delete uses uncapped `Promise.allSettled` over every selected key. Select-all alone is the visible window (**100**); design lock #12 keeps selection across show-more/load-more so N can grow. Baby GraphQL default **60 RPM** → burst ≥100 parallel delete POSTs → 429s, partial fail, slow busy. Money’s same shape is safer in practice (`PAGE_SIZE = 20`). | **Fix.** Cap concurrent deletes (pool ~4–8) or chunk under RPM; document select-all + Delete at 100 vs rate limit. Prefer measure with 100-row select-all under default RPM. Files: `components/baby-insights-dashboard.tsx` (~540–566); related caps in `lib/baby-insights-list-visible.ts`, `lib/graphql/baby-http-handler.ts`. |
| Major | perf **P2** (memory FYI aligns) | After multi-delete settle, `invalidateBabyQueries(queryClient)` defaults to **`"all"`** → full Baby cache storm (timeline, growth, series, homeQuick, vaccines, telegram, sync, profile, …). Edit modal already scopes care/growth. Extra active refetches add network + main-thread work right after a heavy mutation burst. | **Fix.** Scope invalidate: care-only → `"care"`; growth-only → `"growth"`; mixed → `"growth"` or care+growth. Avoid `"all"` on this path. File: `components/baby-insights-dashboard.tsx` (~575); contrast `components/baby-insights-edit-modal.tsx`. |
| Enhancement | perf **P3** | Every checkbox toggle / `actionBusy` flip re-renders the full Insights dashboard. When **More insights** is open, chart children remount work on selection clicks though chart props did not change. Parent ownership (Option 1) amplifies cost. | **Fix.** Extract Activity log table + selection state into a child (or isolate selection so chart subtrees do not subscribe). Optional: transition non-urgent selection UI updates. File: `components/baby-insights-dashboard.tsx`. |

### Conflicts resolved

| What lost | Why |
|-----------|-----|
| — | No Security Critical/Major vs Perf/Memory clash (security lens **clean**). |
| Memory “same shape as Money; peak is transient” vs Perf P1 concurrency cap | **No real conflict.** Memory says N concurrent settles are not an unbounded retain; Perf still needs RPM-bounded fan-out. Cap/chunk **wins** (measured/bounded: visible cap 100 vs RPM 60). Memory does not ask to keep uncapped parallelism. |
| Memory FYI “scoped care/growth would churn fewer keys” vs Perf P2 | **Merged into P2.** Same ask; Perf severity (Major) wins wording. Not a leak per Memory — still a Fix for refetch storm. |

### Deferred / losers (do not fix unless promoted)

| Severity | Source | Finding | Why deferred |
|----------|--------|---------|--------------|
| Nit | perf **P4** | Table + cards both map `activityListWindow.visible` (up to 100+) with checkbox + Edit in each branch → ~2× interactive nodes while CSS hides one. Pre-existing dual layout; selection chrome makes cost clearer. | Vague/micro for this round; accept Option 1 dual layout unless list interaction lag shows up. Later: render only active layout (container-query / matchMedia). |
| FYI | memory | Soft-capped N concurrent GraphQL settles; transient peak not a growing retain. | Covered by winner P1 (chunk/cap). Not a separate Fix. |
| FYI | memory | Scoped `"care"` / `"growth"` invalidation = fewer unrelated keys; temporary refetch peak only. | Covered by winner P2. |
| — | security | No Critical / Major / Enhancement. | Nothing to merge. |

### Fix ask

1. **Critical (P1):** Cap or chunk multi-delete concurrency so select-all / retained selection cannot blast past Baby GraphQL RPM (default 60). Target `handleSelectionBarDelete` / `Promise.allSettled` in `components/baby-insights-dashboard.tsx`; respect `BABY_INSIGHTS_LIST_VISIBLE_CAP` and design lock #12 retention. Document or measure 100-row select-all delete under default RPM.
2. **Major (P2):** After multi-delete settle, stop `invalidateBabyQueries(queryClient)` default `"all"`. Invalidate `"care"`, `"growth"`, or mixed (growth or care+growth) only — match edit-modal scoping. File: `components/baby-insights-dashboard.tsx` (~575).
3. **Enhancement (P3):** Isolate Activity log selection state (and/or table + bar) from the dashboard parent so KPI/chart subtrees do not re-render on every checkbox / busy flip. File: `components/baby-insights-dashboard.tsx`.

### Round notes

- **Inputs:** Security R1 clean (OWASP pass; write-scoped mutations). Performance R1 has findings (P1–P4). Memory R1 clean (selection Set bounded; portal/listeners OK; invalidate not a leak).
- **Dedup:** Memory FYIs on delete fan-out and scoped invalidate folded into Perf P1/P2 winners; no duplicate Fix lines.
- **Dropped/demoted:** P4 Nit only. No speculative cache-growth ask survived.
- **Prior Merged SPM:** was `pending` — this is first arbiter fill for Round 1.
- **Result:** **needs fix** — 3 Fix items (1 Critical, 1 Major, 1 Enhancement). Lens files left untouched; no production code in this step.
- **Fix round (Merged SPM Round 1):** see Fix notes below. Critical + Major closed; Enhancement P3 deferred (documented).

### Round 2 (re-verify after Merged SPM Fix)

**Round:** 2
**Result:** clean

### Winners (fix these)

| Severity | Sources (security/perf/memory) | Finding | Decision |
|----------|--------------------------------|---------|----------|
| — | — | No open Critical / Major / Enhancement after merge. | — |

### Conflicts resolved

| What lost | Why |
|-----------|-----|
| — | No Security vs Perf/Memory clash (all three lenses **clean**). |
| Perf FYI “pool caps parallelism, not total RPM” vs Memory “no unbounded retain from pool” | **No conflict.** Same residual already in Merged SPM Fix notes; neither elevates to Critical/Major/Enhancement. Document only. |

### Deferred / losers (do not fix unless promoted)

| Severity | Source | Finding | Why deferred |
|----------|--------|---------|--------------|
| Enhancement | perf **P3** (memory FYI aligns) | Selection/`actionBusy` in dashboard parent re-renders KPI + dynamic chart tree. | Already **deferred** in Merged SPM Fix (Option 1 ownership; same as Quality Fix residual). Not reopened. |
| Nit | perf **P4** | Table + cards dual map (~2× checkbox/Edit nodes). | Round 1 loser; accept Option 1 dual layout unless list lag shows up. |
| FYI | security / perf / memory | Pool caps peak in-flight, not total RPM over a full 100-delete run; busy + partial/all-fail Alert remain the safety net. | Availability residual; measure in full test / manual if needed. Not a Fix item. |

### Fix ask

_(empty — clean)_

### Round notes

- **Inputs:** Security R2 clean (OWASP A01–A10; concurrency pool improves A04; scoped invalidate not a trust-boundary issue). Performance R2 clean (P1 Critical + P2 Major verified closed in code + units). Memory R2 clean (pool ≤6 workers; scoped invalidate smaller churn; selection Set still bounded).
- **Dedup:** Cross-lens FYIs on RPM pacing / transient pool peak folded into one deferred residual — not Fix lines.
- **Dropped/demoted:** P3 stays deferred Enhancement; P4 Nit unchanged. No new winners.
- **Prior Merged SPM Round 1:** needs fix → Fix closed P1+P2, deferred P3 → Round 2 re-verify.
- **Result:** **clean** — zero open Critical / Major / Enhancement after merge. SPM loop done. Lens files left untouched; no production code in this step.

---

## Fix notes

### Adversarial Fix (lens = adversarial-tests)

**What changed**

1. **Major — stillVisible wiring:** Dashboard no longer snapshots pre-delete `visibleSelectionKeys`. After `invalidateBabyQueries`, it rebuilds rows from the refreshed timeline/growth query cache + applied chips, then `activityLogStillVisibleSelectionKeys` → prune. Unit covers post-refresh prune; e2e `failed key pruned when row leaves list` drives reject + row omitted on refetch → bar gone + partial Alert.
2. **Major — full multi-delete success e2e:** Both deletes fulfill → bar count 0, no panel Alert, rows gone.
3. **Major — cancel no-op:** After dismiss, asserts count label still “2…”, both checkboxes checked, and `deletes.length === 0`.
4. **Enhancement — filter apply / Clear / select-all:** Combined e2e — header select-all selects only `BABY_INSIGHTS_LIST_VISIBLE_CAP` rows; bar Clear empties; Apply filters clears bar.
5. **Enhancement — all-fail Alert:** i18n asserts `selectionDeleteAllFail` EN/VI; e2e both rejects → all-fail copy (not partial) + selection kept.
6. **Nit (cheap):** `[...deletes].sort()` in polls; `checkActivityCheckbox(..., { force: true })` helper for sr-only Checkbox span interception.

**Tests run**

- `node --import tsx --test lib/baby-insights-activity-log.test.ts lib/baby-i18n.test.ts` → pass
- `pnpm exec playwright test e2e/baby-care.spec.ts -g "Activity log (selection bar|keeps selection|multi-delete|clears selection on filter)"` → 7 passed

**Remaining risks**

- Post-invalidate stillVisible depends on TanStack `invalidateQueries` finishing active refetches before cache read; if a future invalidate mode skips await/refetch, prune could see stale cache again.
- Select-all e2e asserts count + row cap, not that beyond-cap history IDs were never added to the Set (would need deeper instrumentation).
- Checkbox e2e needs `force: true` until the visual marker uses `pointer-events-none` (shared `Checkbox` — left untouched this pass).

### Adversarial Fix Round 2 (lens = adversarial-tests)

**What changed**

1. **Enhancement — busy / double-submit e2e:** New spec gates `deleteBabyEvent` fulfill. After confirm, asserts Delete + Clear **disabled** while the mutation is in-flight, then releases with reject so the bar stays. Asserts all-fail Alert and Delete/Clear **re-enabled** after settle (catches stuck `actionBusy`).
2. **Nit (cheap) — confirmOne:** Same single-row path asserts `window.confirm` message matches `selectionDeleteConfirmOne` (EN/VI), not the many-copy.

**Tests run**

- `pnpm exec playwright test e2e/baby-care.spec.ts -g "Activity log delete: busy disables Delete"` → 1 passed

**Remaining risks**

- Busy assert races on request arrival (`deletes.length === 1`) before UI paint; Playwright `toBeDisabled` retries cover normal lag, but an extremely fast local fulfill without a gate would skip the mid-flight window (gate is intentional).
- Production busy wiring unchanged this pass — coverage only.

### Quality Fix (lens = quality)

**What changed**

1. **Major — selectable list skeleton mounted:** Exported `BabyInsightsListSkeleton` and mount it in the Activity log panel while timeline/growth are initially loading (`activityListsInitialLoading`). Page-level skeleton stays collapsed (no list tables). E2E: expand → gated lists → status + table + checkbox placeholders → empty copy after release.
2. **Major — sync truncate / loaded-set prune:** Added `pruneActivityLogSelectionToLoadedKeys`; dashboard effect intersects `selectedKeys` with keys in loaded `activityRows` whenever rows change (covers sync truncate orphans; show-more retention unchanged because the loaded set only grows).
3. **Enhancement — small extracts only:** Extracted `pruneActivityLogSelectionToLoadedKeys` + `activityLogDeleteSettleAlert`. **Deferred** full Activity log table / delete-runner split (Option 1 dashboard ownership; too large for this Fix round).
4. **Enhancement — busy gates row chrome:** Header select-all, row checkboxes, and row Edit (table + mobile cards) use `disabled={actionBusy}`. Busy e2e now asserts row checkbox + Edit disabled mid-flight and re-enabled after fail settle.
5. **Enhancement — invalidate throw after settle:** Delete handler prunes from settle results even when `invalidateBabyQueries` throws (uses pre-refresh `stillVisible`); still shows all-fail Alert. Unit covers prune with pre-refresh stillVisible.

**Tests run**

- `node --import tsx --test lib/baby-insights-activity-log.test.ts` → 15 passed
- `pnpm exec playwright test e2e/baby-care.spec.ts -g "Activity log expand shows selectable|Activity log delete: busy disables"` → 2 passed

**Remaining risks**

- Nit left open: shared Checkbox decorative span still needs `force: true` in e2e.
- Full dashboard extract deferred — file size remains high until a follow-up split.
- Sync prune is keyed off `activityRows` identity (any shrink), not only the sync interval path — intentional safety net.

### Merged SPM Fix (Round 1)

**What changed**

1. **Critical (P1) — delete concurrency cap:** Extracted `mapAllSettledWithConcurrency` + `ACTIVITY_LOG_DELETE_CONCURRENCY = 6` (pool in 4–8). `handleSelectionBarDelete` no longer fires uncapped `Promise.allSettled` over every selected key (select-all / retention can hit 100+). Result order preserved; settle → prune / Alert unchanged. Documents select-all at visible cap vs default Baby GraphQL RPM 60.
2. **Major (P2) — scoped post-delete invalidate:** Added `activityLogDeleteInvalidateScope` — care-only → `"care"`; growth-only or mixed → `"growth"` (growth scope already refreshes timeline + series). Stops default `"all"` cache storm after multi-delete; matches edit-modal care/growth scoping.
3. **Enhancement (P3) — selection extract deferred:** Full Activity log table + selection-state split from the dashboard is **not** cheap (~1400 LOC Option 1 ownership; chart remount isolation needs a real child boundary). **Deferred** to a follow-up; same residual as Quality Fix. No partial extract this round.

**Tests run**

- `node --import tsx --test lib/baby-insights-activity-log.test.ts` → 21 passed (includes concurrency peak-in-flight + invalidate-scope units)

**Remaining risks**

- Pool caps parallelism, not total RPM: a very fast 100-delete run can still approach 60 RPM if each mutation returns in tens of ms; caregiver-visible busy window and partial-fail Alert remain the safety net. Measure 100-row select-all Delete under default RPM in full test / manual if needed.
- P3 dashboard re-render on checkbox / busy still open until a dedicated extract.
