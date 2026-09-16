# TDD test-case review: baby-insights-activity-log-money-parity

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-16

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | edge | Composite `activityLogSelectionKey` care ≠ growth for same uuid | yes (planned) |
| 1 | edge | Parse returns `{ source, id }` or null for garbage | yes (planned) |
| 2 | real / edge | `activitySelectionBarEditEnabled` true only when count === 1 (0 and 2+ false) | yes (planned) |
| 2 / existing | real | `activityEditMutationFor` care/growth **update** routing | yes (existing unit) |
| 2 / existing | edge | Care delete never maps to growth delete mutation | partial (existing; growth→care delete positive under-named) |
| 3 | real | EN/VI selection bar + confirm / partial-fail keys present | partial (i18n “if applicable”; keys not named) |
| 3 | real | Bar Edit **disabled but visible** when count ≠ 1 | partial (acceptance yes; no named unit/component assert) |
| 4 | real | E2E: checkbox + per-row Edit + bar Edit/Delete/Clear with 1 selected | yes (planned red) |
| 4 | real / edge | E2E: 2 selected → Edit “not available” | partial (soft wording; risk of hide assert vs `toBeDisabled`) |
| 5 | real | Select-all = visible window only; row Edit opens modal; no whole-row open-edit | partial (acceptance + e2e turns green; no named unit for visible-window key set) |
| 5 / 9 | edge | Keep selection on show-more / load-more; clear on filter apply / panel close / Clear | partial (Task 9 acceptance; e2e cases not named) |
| 6 | real | Mobile cards checkbox + always-visible Edit | partial (“if fixtures allow” / manual) |
| 7 | real | E2E: select → Delete → `window.confirm` path | partial (planned but unnamed asserts) |
| 7 | real | Mixed care+growth multi-delete via per-row mutations | partial (acceptance; no named e2e mock assert) |
| 7 | edge | Cancel `window.confirm` → no mutations / busy stays off | **no** |
| 7 | edge | Partial settle: drop succeeded keys; **keep failed** if still visible; one panel `Alert` | **no** (acceptance only — intentional vs Money) |
| 7 | edge | Busy disables bar during delete (double-submit guard) | partial (acceptance; no named test) |
| 8 | real | Skeleton checkbox → event → recorded → actions same slice as live | partial (prefer structural; else manual) |
| 9 | real | Empty: no checkboxes / no bar | yes (acceptance + Task 9) |
| 9 | real | Light + dark smoke for chrome + bar | yes (manual / existing style) |
| Existing | real | Activity log care/growth edit save + validation fail e2e | yes (reuse; update to open via row Edit, not whole-row click) |
| Design | edge | Auth / workspace delete fail | n/a new API (server unchanged); UI partial-fail covers reject settle |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Critical | 7 | Partial multi-delete prune + panel `Alert` (Money divergence) | Pure unit: given selected keys + `PromiseSettledResult[]`, next Set drops fulfilled keys and keeps rejected keys still present; assert helper (or extract `pruneActivityLogSelectionAfterDeletes`) |
| Critical | 7 | User-visible partial-fail | E2E (mock one delete reject): after confirm, failed row stays selected; panel `Alert` (or role=alert) visible; succeeded row gone / deselected |
| Major | 7 | Cancel confirm = no-op | E2E or unit-wired: dismiss `window.confirm` → zero `deleteBabyEvent` / `deleteBabyGrowth` calls; selection unchanged |
| Major | 4 / 9 | Bar Edit disabled **visible** (not hidden) when 2+ | E2E: with 2 selected, Edit control `toBeVisible` + `toBeDisabled`; accessible name still present |
| Major | 5 / 9 | Selection retention vs clear | Named e2e (or strong unit+light e2e): select row → show-more/load-more → still selected; select → apply Insights filter (or close panel) → selection cleared / bar gone |
| Major | 7 | Mixed care+growth delete plan | Unit: two keys `care:…` + `growth:…` → delete plan maps to `deleteBabyEvent` then `deleteBabyGrowth` (order flexible); or e2e mock asserts both mutations fired once |
| Enhancement | 3 | Named i18n keys | Extend `lib/baby-i18n.test.ts`: selection count / Edit / Delete / Clear / confirm / partial-fail keys exist EN+VI and ≠ raw key |
| Enhancement | 5 | Visible-window select-all | Unit if helper extracted: select-all keys ⊆ visible window ids only (hidden/unloaded rows excluded) |
| Enhancement | 7 | Busy / double-submit | Light assert: while delete in flight, Delete control disabled (skip if hard in Playwright) |
| Enhancement | 8 | Skeleton structure | Optional structural assert; manual CLS OK per Checkpoint B |

## Real scenarios checked

- Happy path: Composite keys + Edit-enable units (Tasks 1–2) and red e2e for checkbox / row Edit / bar with one selected (Task 4→5/9) — **direction good**.
- Multi-Delete happy path: Task 7 mentions e2e confirm path but **does not name** mixed care+growth mutation asserts — **strengthen**.
- User-visible failures: Existing edit validation e2e stays useful. **Partial-delete keep-failed + panel Alert is the core new failure UX and is not in the TDD list** — must add.
- Empty / loading / permission: Empty quiet (Task 9) planned; skeleton mostly manual (OK as Enhancement); permission/authz stays server-side — **OK**.

## Edge scenarios checked

- Boundaries / invalid input: Selection key encode/parse garbage — **planned well**. Edit enable at 0 / 1 / 2+ — **planned well**.
- Concurrency / double-submit / idempotency: Busy disable in acceptance only — Enhancement. Cancel confirm no-op — **missing (Major)**.
- Offline / partial data / race: Partial `allSettled` prune (keep failed) is locked product behavior vs Money — **Critical gap** until named unit + e2e.

## Fix ask for Build

Concrete tests to add or strengthen in `04-tasks.md` (still Red before product code where possible). Prefer few strong tests:

1. **Task 7 — partial-delete prune unit (required):**  
   - Name: `pruneActivityLogSelectionAfterDeletes` (or equivalent) drops fulfilled keys and keeps rejected keys still on screen.  
   - Assert: with 2 selected, one fulfilled + one rejected → Set size 1 equals failed key; fulfilled key absent.

2. **Task 7 — e2e partial fail + Alert (required):**  
   - Mock mixed deletes: one care delete OK, one growth delete reject (or reverse).  
   - After confirm settles: failed row still selected; panel shows alert/error; succeeded row removed or deselected.

3. **Task 7 — cancel confirm (required):**  
   - `window.confirm` returns false → no delete mutations; selection and bar unchanged.

4. **Task 4 / 9 — Edit disabled visible (required):**  
   - Two rows selected → bar Edit `toBeVisible()` and `toBeDisabled()` (do **not** assert hidden).  
   - One selected → Edit enabled and opens modal (existing happy path).

5. **Task 5 / 9 — retention vs clear (required):**  
   - Keep selection across show-more or load-more.  
   - Clear selection on Insights filter apply **or** panel close (at least one automated; prefer both if cheap).

Optional (Enhancement): named EN/VI keys for bar/confirm/Alert; visible-window select-all unit; busy-disabled Delete during flight.

Do **not** drop Task 1–2 key/Edit-enable units — those lock the collision and multi-Edit rules well.

## Round notes

- Read: `03-design.md`, `04-tasks.md`, `03a` Result **clean**; skim `lib/baby-insights-activity-log.test.ts` (merge only — no selection keys yet), `lib/baby-insights-activity-edit.test.ts` (update routing + care delete ≠ growth), `e2e/baby-care.spec.ts` (table chrome, show-more, edit via **whole-row click**, no checkbox/bar/delete yet), Money delete loop in `analytics-transactions-table.tsx` (clears all selection then Alert — Baby must **not** copy that prune rule).
- Strongest planned coverage: composite keys + Edit-enable pure helpers + red e2e for chrome.
- Weakest: intentional partial-fail retention + Alert, cancel confirm, named retention/clear e2e, and soft “Edit not available” wording.
- Result **needs more tests** until Fix ask items 1–5 are in the Red plan.
- No product code written in this review.
- **Parent fold (2026-09-16):** Fix ask items 1–5 folded into Tasks 4, 5, 7, 9 acceptance/test lists in `04-tasks.md` before Gate B.
