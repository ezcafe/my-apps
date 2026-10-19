# Review log: 20261019-kiosk-widget-edit-menu

## Adversarial test review

**Result:** clean

**Round:** 2 (re-entry after Fix)  
**Updated:** 2026-10-19  
**Scope:** Fresh verifier (generation ≠ verification). Re-checked prior Critical (Done/PATCH mock theater) and Major (Source cross-topic overclaim) against Fix. Mapped remaining draft unit/e2e to `04-tasks.md` + `04a`. Do not fix.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `lib/kiosk/cell-edit-timing.ts` + `cell-edit-timing.test.ts` | **Save-timing lock was mock theater** (helper unused by production; Done = `setEditMode` only). | **Done** — closed by Fix |
| Major | `components/kiosk/kiosk-edit-strip.test.ts` | **“picker blocks cross-topic” overclaimed** (closed-menu SSR only). | **Done** — closed by Fix |
| Enhancement | `components/kiosk/kiosk-edit-strip.test.ts:38-41` | **Weather “has no menu”** is catalog-only (`isEditableWidgetId`). No dashboard/`editMode` HTML assert. E2e covers weather menu count 0 — OK to strengthen unit later. | open |
| Enhancement | `e2e/kiosk-edit-menu.spec.ts:169-173` | Done quiet UI asserted; **no negative wait** that prefs PATCH does not fire on Done. | open |
| Enhancement | `components/kiosk/kiosk-dashboard.test.ts` | Compose helpers unit-tested; **board HTML** with `cells` sources → hidden APR / chart band not asserted via dashboard render. | open |
| Nit | `lib/validators/user-preferences.test.ts:289-307` | Length>3 case uses **duplicate** `loan.remaining` twice — may fail uniqueness/other rules rather than pure max-length. Prefer four distinct same-topic ids if catalog grows, or three + one cross-topic separate. | open |

### Closure check (Round 1 → Fix → Round 2)

| Prior finding | Evidence | Closed? |
|---------------|----------|---------|
| **Critical — Done vs apply PATCH** | Production: `kiosk-dashboard.tsx` imports `createKioskEditSession`; strip `onToggle` → `onEditToggle`; cell `onApply` → `onCellApply`. Session routes apply through `layoutPatchForChromeEvent({ type: "apply" })` → `patchLayout`; Done asks helper for patch and skips when null (`cell-edit-timing.ts:86-93`). Tests: `cell-edit-timing.test.ts` — (1) `patchLayout` spy: apply once, Done no second call; (2) `fetch` spy on `/api/user/preferences` PATCH: apply once, Done quiet. Unit green. | **yes** |
| **Major — Source picker same-topic** | Production: `KioskCellSourcePanel` uses `signalsForTopic(topic)` (`kiosk-cell-edit-menu.tsx:37-38`); menu mounts panel when `panel===source`. Test renamed overclaim to “shows Source action”; new case SSR-opens panel for `loans.summary` and asserts all `LOAN_SIGNAL_IDS` testids present and all `MONEY_SIGNAL_IDS` / `BABY_SIGNAL_IDS` absent (`kiosk-edit-strip.test.ts:85-117`). Unit green. | **yes** |

### Lock / 04-tasks coverage check

| Lock / planned red | Proven? | Note |
|--------------------|---------|------|
| Task 1 catalog membership / same-topic / sets | yes | `signal-catalog.test.ts` |
| Task 2 Zod Source-enabled + Resize-only happy | yes | `user-preferences.test.ts` |
| Task 2 rejects sources on Resize-only; cross-topic; unknown; non-editable keys | yes | same |
| Task 2 `{}` empty override; sources length ∉ 1..3 | yes | 04a Majors folded — present |
| Task 2 omit/preserve/replace/clear; widgets-only copy `cells` | yes | `user-preferences-service.test.ts` (DB-gated) |
| Task 2 resolve keeps cells + drops corrupt keys | yes | `kiosk-layout.test.ts` |
| Task 3 S–XL footprint; unknown → M | yes | `cell-size.test.ts` |
| Task 4 compose three ids; untuned; Resize-only ignore | yes | `cell-compose.test.ts` |
| Task 5 Edit ↔ Done strip labels | yes | `kiosk-edit-strip.test.ts` SSR |
| Task 5 weather / Resize-only / Source visibility | partial | Resize-only + Source flag via attr; weather catalog-only; e2e opens menus |
| Task 5 save payload shapes + sibling preserve | yes | `cell-edit-save.test.ts` |
| Task 5 **apply PATCH; Done no PATCH** | yes (session+fetch spy) | Fixed — `createKioskEditSession` wired in dashboard |
| Task 5 UI cross-topic picker block | yes (Source panel SSR) | Fixed — `KioskCellSourcePanel` loan-only assert |
| Task 6 fullscreen ignore size display | yes (helper) | `shouldApplyCellSizeDisplay`; HTML class absence not locked |
| Task 6 off widget keeps override; Settings omit `cells` | yes | service tests (DB-gated) |
| Task 6 baby-inject preserves `cells` | yes | `baby-defaults-inject.test.ts` |
| Task 7 e2e Resize+Source persist + quiet Done + Resize-only no Source + weather | yes (persist/UI) | Done-no-PATCH unasserted; cross-topic e2e skipped (04a Enhancement) |

### Failure-mode / theater notes

- **Strong real reds:** Zod cells contracts, resolve corrupt drop, compose maps, payload builders, baby-inject `cells` copy, e2e persist reload of size L, session apply/Done patchLayout+fetch spies.
- **Theater (closed Round 2):** Was `layoutPatchForChromeEvent` without production wire / fetch spy. Now `createKioskEditSession` in dashboard + patchLayout/fetch spies. Would fail if Done PATCHed or apply stopped.
- **Flaky:** e2e source toggle via `textContent` + `✓` is order-sensitive but bounded; no sleep loops. DB-gated prefs service tests skip when no Postgres — expected harness, not Adv block.
- **Explicit non-goals (OK per 04a):** 401/429 prefs re-test; multi-tab race; full skeleton CLS automation; optional multi-override e2e negatives.

### Fix ask (Critical/Major only)

None — no open Critical or Major.

**Deferred Enhancements:** weather menu unit via dashboard editMode; e2e Done negative PATCH wait; dashboard HTML compose wiring; Zod four-id fixture without duplicates.

### Round notes

- **Round 1:** needs fix — Critical theater + Major overclaim.
- **Fix (adversarial-tests):** wired session into dashboard; session+fetch spies; Source panel extract + loan-only SSR assert; renamed overclaim.
- **Round 2:** re-verified production wire + tests; unit `cell-edit-timing` + `kiosk-edit-strip` green. Zero open Critical/Major → **clean**. Safe to advance to Quality.

### Fix notes (adversarial-tests Round 1)

**Updated:** 2026-10-19  
**Mode:** adversarial-tests  
**Tests/behavior changed:** yes

1. **Critical — Done vs apply PATCH:** Wired `createKioskEditSession` + `layoutPatchForChromeEvent` into `kiosk-dashboard.tsx` (Edit/Done strip + cell apply). Replaced theater-only helper test with session spies: apply → `patchLayout` once; Done → no second call; plus `fetch` PATCH spy on `/api/user/preferences` (apply once, Done quiet).
2. **Major — Source same-topic UI:** Extracted `KioskCellSourcePanel` (menu mounts it when `panel=source`). Unit opens that panel for `loans.summary` and asserts all `loan.*` signal testids present and money/baby signal testids absent. Renamed overclaiming “blocks cross-topic” case to “shows Source action”.

**Deferred Enhancements:** unchanged (weather menu unit; e2e Done negative PATCH wait; dashboard HTML compose; Zod four-id fixture).

## Quality

**Result:** clean

**Round:** 4 (after Popover sync Escape dismiss fix)  
**Updated:** 2026-10-19  
**Scope:** Fresh Senior Verifier (generation ≠ verification). Focus: `attachPopoverDocumentDismiss` sync Escape (no `setTimeout` race) + Gate A menus still work. Full axes vs 01/03/04; Lens plan api+db → no deep API/DB. Do not fix.

### Checklist

- [x] Context understood (fix-tests Escape sync dismiss; Last Verify verify-pass `2026-10-19T01:15Z`)
- [x] Correctness + tests adequate (`popover-dismiss` sync Escape unit; Popover wiring guard; MoreMenu `onOpenChange` forward; e2e Escape → resize 0 → loans Resize/Source → Done)
- [x] Security light (document dismiss UX only; no new trust boundary)
- [x] Architecture (Pattern 2 MoreMenu→Popover; Escape/outside extracted to `popover-dismiss`; kiosk menu `applyKioskCellMenuOpenChange` unchanged)
- [x] Readability (helper + comments state sync Escape race; capture keydown)
- [x] Performance (listeners only while open; sync register; cleanup on effect teardown)
- [x] Verdict: Approve

### UI lock check (Gate A #1/#2 + Design) — Round 4

| Lock | Match? | Evidence |
|------|--------|----------|
| #2 Edit / Done board strip | yes | Labels, primary Done, `justify-end` unchanged by dismiss helper |
| #1 top-right edit-mode menu | yes | `KioskCellEditMenu` → MoreMenu → Popover; menus only in edit mode |
| Escape must not break menus | yes | Sync Escape closes panel; e2e then opens unique `loans.summary` Resize/Source |
| Resize / Source / sizes / Source topic | yes | Post-Escape e2e still applies L + same-topic sources + Done quiet |
| PATCH on apply; Done quiet | yes | Session wiring untouched by dismiss extract |
| Skeleton parity | yes | No layout/chrome change from dismiss helper |

### Escape sync dismiss re-confirm

| Change | Still correct? | Note |
|--------|----------------|------|
| `attachPopoverDocumentDismiss` registers keydown **immediately** | yes | Unit: listener count 1 before Escape; same-turn Escape → `onClose` |
| Popover effect uses helper (not `setTimeout`→keydown) | yes | Source guard in `popover.test.ts`; effect returns helper cleanup |
| Escape capture + outside mousedown | yes | Capture Escape; outside still gated by `shouldIgnoreOutside` |
| MoreMenu forwards `open` / `onOpenChange` | yes | `more-menu.test.ts`; cell menu clears open+panel on false |
| Gate A journey after Escape | yes | e2e heatmap Escape → loans Resize L + Source → Done → reload |

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `e2e/kiosk-edit-menu.spec.ts` | Does not assert `data-kiosk-edit-ready="true"` (enabled wait only). | open |
| Enhancement | Round 1 carry | XL vs L span; Resize-only `Size · cell`; Adv deferred tests | open |
| Nit | Round 1 carry | `createKioskEditSession` rebuilt each render | open |
| Enhancement | Prior R3 | Popover Escape had e2e-only coverage | **Done** — `popover-dismiss.test.ts` + wiring guard |

### Fix ask (Critical/Major only)

None — no open Critical or Major.

**Deferred Enhancements:** e2e ready-attr assert; XL span; Resize-only header; Adv deferred.

### Round notes

- **Round 1–3:** clean (hydrate + Escape path; R3 post `01:05Z` verify-pass).
- **Round 4:** Focused re-check after sync Escape extract. Race fixed: Escape binds in the same turn as open (no `setTimeout(0)` gap). Gate A #1/#2 menus still work after dismiss. Unit + e2e evidence green. Zero Critical/Major → **clean**.

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

None — both lenses agree: Zod write edge + jsonb nest integrity hold; no Critical/Major; only Nit/Enhancement remain.

### Fix ask (Critical/Major only)

None.

### Deferred (Enhancements / Nits — non-blocking)

| Id | Severity | Sources | Finding |
|----|----------|---------|---------|
| A1 | Nit | api | Prefs `429` still `{ error }` without `code`; optional `rateLimited()` — pre-existing, out of extend scope |
| A2 | Enhancement | api | Design Errors row lists 401/400 only; route also 429/503 — design wording only (same as `03a` Deferred) |
| A3 | Enhancement | api | After parse, `cells` stays `Record<string, unknown>`; optional typed refine — not required for contract correctness |
| D-N1 | Nit | db | `03-design.md` indexes still say “PK user”; column is `user_sub` (same Nit as 03a Round 2) |
| D-E1 | Enhancement | db | `copyLayoutPreservingCells` unused; write paths already preserve `cells` inline |

### Round notes

- Launched lenses this round: **api** + **db** only.
- Deduped: no near-duplicates across lenses (api error-shape / typing vs db schema / dead-helper are distinct).
- Conflict priority unused (no Security/Perf/Memory clash; no correctness vs micro-opt clash).
- Zero Critical/Major → **Result: clean**. Safe to leave lens loop.

