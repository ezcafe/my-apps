# Review log: Configurable kiosk widgets + month money board

## Adversarial test review

**Round:** 2 · **Result:** clean  
**Updated:** 2026-10-13  
**Scope:** Re-verify Fix R1 Critical/Major against draft tests (generation ≠ verification). Fresh verifier; did not write the code.

### Round 1 (baseline)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `e2e/kiosk-layout.spec.ts` | Month-board glance soft-skipped (theater). | closed (R2 proven) |
| Major | `kiosk-month-board-card.test.ts` | Empty-chart path did not lock six metrics. | closed (R2 proven) |
| Major | `kiosk-dashboard-skeleton.test.ts` | Default skeleton missing month-board chart + 6 metric slots. | closed (R2 proven) |
| Major | `kiosk-dashboard.test.ts` | Gate A #2 money-on unproven via board wiring. | closed (R2 proven) |
| Major | `kiosk-dashboard.test.ts` + skeleton | CSS CQ SoT class names unproven. | closed (R2 proven) |
| Enhancement | `app/(shell)/kiosk/loading.tsx` (no test) | Loading purity (no prefs/DB await) is acceptance-only; no import/static check. | open (defer) |
| Enhancement | `components/kiosk/kiosk-widget-settings.tsx` (no component test) | Focus visibility covered only via pure `showKioskFocusControl`; Settings markup wiring untested. | open (defer) |
| Enhancement | `kiosk-month-board-card.test.ts` | Linear lock asserts `role="progressbar"`; no negative for circular gauge markup. | open (defer) |
| Nit | `kiosk-month-board-card.test.ts` | Substring `/Expenses/` etc. weaker than `>Expenses<` / aria. | open (defer) |

### Round 2 — Fix R1 closure proof

| Fix ask | Verdict | Evidence (would fail if removed) |
|---------|---------|----------------------------------|
| Critical — e2e glance | **proven** | Enables Month money board checkbox + poll `colsOk && boardOn`; unconditional `kiosk-month-board` + Expenses/Income; hard expect empty-budget or progressbar; remaining Net/Savings/Bills/Loans when empty. Soft `if (isVisible) else board` gone. Toggle wires real PATCH (`toggle` → `save`). |
| Major — empty chart metrics | **proven** | Empty-chart `it` matches all six labels + “No workspace budget” + `doesNotMatch` progressbar. Dropping any label or the `dl` fails. |
| Major — skeleton slots | **proven** | Month section asserts `h-2 w-full` + exactly six `min-w-0 space-y-2`; CQ trio on board. Matches skeleton markup. |
| Major — dashboard money-on | **proven** | Two board HTML cases: null chart → Expenses/Income + empty copy + no progressbar; with budget → Expenses/Income + progressbar. Unavailable-only (`KioskMonthBoardUnavailable` has no Expenses) would fail. |
| Major — CSS SoT classes | **proven** | Live board + skeleton units assert `kiosk-cq-phone-narrow` / `phone-wide` / `wider` (real tokens in `globals.css`). Pixel CQ still non-goal. |

**Lock coverage (challenge summary):**

| Design UI / Gate A lock | Proven by tests? | Note |
|-------------------------|------------------|------|
| Settings layout → `/kiosk` mode/cols | yes | E2E `data-kiosk-pref-cols='2'` + grid mode |
| Month-board glance on `/kiosk` (Task 8) | yes | Unconditional board + Expenses/Income; empty or progress |
| Gate A #2 money on (budget + Expenses/Income…) | yes | Card unit + dashboard wiring + e2e |
| Gate A #2 money off (first non-money primary) | yes | Dashboard unit |
| Empty board → enable prompt | yes | Dashboard unit |
| Linear budget (not circular) + six labels | yes | With-budget + empty-chart six labels; circular negative deferred Enhancement |
| Skeleton default-only three cells | yes | Order + `h-2 w-full` + six metric slots + CQ classes |
| CSS CQ column SoT on board | yes | Class-name lock (not pixel) |
| Layout Zod / layout-only PATCH / omit-key | yes | Validator + service units |
| Null-prefs defaults / no migrate stored set | yes | Registry units |
| Widget-gated month-board loads | yes | `loadMonthBoardIfEnabled` call counts |
| Focus visibility matrix | yes (helper) | Pure unit; Settings component deferred Enhancement |
| Focus fallback / effectiveKioskColumns | yes | `kiosk-layout.test.ts` |

**Fix ask (Critical/Major only):** none — Round 2 clean.

**Deferred Enhancements:** loading.tsx prefs/DB purity check; Settings component focus visibility render; circular-gauge negative; tighter label selectors.

**Round 2 notes:**

- Fresh read of Fix notes, `04-tasks.md`, and Fix-touched files: `e2e/kiosk-layout.spec.ts`, `kiosk-month-board-card.test.ts`, `kiosk-dashboard-skeleton.test.ts`, `kiosk-dashboard.test.ts` (+ product markup cross-check).
- No new Critical/Major. Residual risks are Enhancement/Nit only (unchanged Deferred).
- Result **clean** — zero open Critical/Major. Next: Quality.

---

## Quality

**Round:** 2 · **Result:** clean  
**Updated:** 2026-10-13  
**Scope:** Re-verify Quality Fix R1 (Focus Select resolve). Fresh verifier (generation ≠ verification). Do not deep-review API/DB (Lens plan api+db).

### Checklist

- [x] Context understood
- [x] Correctness + tests adequate (Adv R2 clean; Focus Select unit locks Fix)
- [x] Security (surface only — no secrets; prefs stay session path; defer deep OWASP to Security if added)
- [x] Architecture (Option 1 cell grid; registry; widget-gated loader; CSS CQ SoT; no JS measure / no builder)
- [x] Readability
- [x] Performance (no Quality-blocking hot-path issue; defer N+1/overlap to Perf if planned)
- [x] Deps/lockfile if touched — N/A
- [x] Verdict: Approve

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/kiosk/kiosk-widget-settings.tsx` (Focus `Select` `value`) | **Stale/disabled `focusWidgetId` not coerced for Settings chrome.** (R1) | closed (R2 proven) |
| Enhancement | `components/kiosk/kiosk-widget-settings.tsx` (Columns block) | Columns Select is wrapped in `layout.mode === "grid"` only. Design UI / Pattern 3 list mode+cols always and make **only** focus conditional. Grid-only hide is sensible progressive disclosure — align UI to Design (always show cols) or document grid-only in Design. | open (defer) |
| Enhancement | `components/kiosk/kiosk-dashboard-skeleton.tsx` (month board) | Live with-budget card has Budget + spent/limit row above the bar; skeleton is title → `h-2` bar → six metrics (no amounts row). Empty-chart live has text instead of bar — loading cannot know which. Optional closer reserved space if product wants less CLS when a workspace budget exists. | open (defer) |
| Enhancement | `components/kiosk/kiosk-widget-settings.tsx` (`save` notify) | Widget-only toggle success copy can say `N widgets · layout saved` even when PATCH omitted `kioskLayout`. | open (defer) |
| Nit | `app/globals.css` (kiosk CQ) | Each band lists `.kiosk-board.kiosk-cq-*` and `.kiosk-board` with the same rule — token classes are test SoT only. Harmless redundancy. | open (defer) |

### Round 2 — Fix R1 closure proof

| Fix ask | Verdict | Evidence |
|---------|---------|----------|
| Major — Focus Select value resolve | **proven** | `focusSelectValue = resolveFocusWidgetId(enabledList, layout.focusWidgetId) ?? ""` (same helper as board). Unit: disabled/stale `money.net_month` → first enabled `context.today_weather` selected; enabled `loans.payments` kept. Focused run: 2/2 settings + layout helpers pass. |

**UI lock (Gate A #1/#2 + Design UI) — pass (including Focus Select):**

| Lock | Draft | Note |
|------|-------|------|
| #1 Active layout on `/kiosk` | pass | Option 1 cells; fullscreen focus / grid + `--kiosk-pref-cols` + CQ classes |
| #2 Money on | pass | Linear progress (not circular) + Expenses/Income then Net/Savings rate, Bills/Loans |
| #2 Money off | pass | First non-money cell primary; empty → enable prompt |
| Settings anti-builder | pass | Toggles + mode + cols + conditional focus; no drag-drop |
| Settings↔board focus | pass | Select `value` uses `resolveFocusWidgetId` (Design: disabled/stale → first enabled) |
| Default-only loading | pass | `loading.tsx` → skeleton; no prefs/DB await |
| CSS column SoT | pass | No ResizeObserver / JS width measure on live board |
| Tokens / no Tesla chrome | pass | Semantic tokens; radius-md/sm |

**System design / patterns:** Registry resolve, widget-gated `loadMonthBoardIfEnabled`, prefs PATCH+notify, CSS CQ caps — honored. Dual band/fullscreen path rejected in code. API/DB contract depth deferred to lenses.

### Fix ask (Critical/Major only)

none — Round 2 clean.

**Deferred Enhancements:** always-show Columns (or Design note); optional skeleton Budget amounts row; notify copy when layout not patched; CQ selector redundancy.

**Round notes:**

- R1: One Major (Settings focus value vs resolve rule) → needs update.
- R2: Fresh read of Quality Fix notes, Design `focusWidgetId` / `resolveFocusWidgetId` contract, draft `kiosk-widget-settings.tsx` + `kiosk-widget-settings.test.ts`. Major closed; no new Critical/Major. Residual Enhancements/Nit unchanged Deferred.
- Result **clean** — zero open Critical/Major. Next: lenses (api+db).

---

## Merged lenses (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-*.md` (only files for lenses in **Lens plan** this round).

**Round:** 1  
**Result:** clean  
**Updated:** 2026-10-13  
**Sources this round:** api · db (Lens plan); security / perf / memory not launched

### Winners (fix these)

| Severity | Sources (api/db/security/perf/memory) | Finding | Decision |
|----------|---------------------------------------|---------|----------|
| — | api / db | No open Critical / Major / Enhancement from either lens. | No Fix ask. |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| — | — | No opposing Critical/Major; both lenses clean. |

### Fix ask (for Fix agent)

*(empty — Result clean)*

**Round notes:**

- Merged Round 1 from `05-lens-api.md` (clean) and `05-lens-db.md` (clean). Zero open Critical / Major / Enhancement across both.
- **API:** Prefs PATCH + month-board module I/O match `03-design.md`; Zod at edge; additive `kioskLayout`; checklist all pass / N/A.
- **DB:** Additive `kiosk_layout` jsonb + journal `0048`; write/read owners match; Examples 1–3 pass; no bad array binds / `SUM`→`::int`.
- **Deferred (non-blocking):** API A1 Nit (prefs `429` bare `{ error }` without `code` — design-accepted pre-existing); DB D-N1 Nit (no per-migration snapshot for `0048` — historical gap). Do not enter Fix ask.
- No cross-lens conflicts. Dedup: none needed — complementary clean verdicts.
- Next: review lenses clean → `my-dev-flow-test` per Review profile (no Fix round).

---

## Deferred (Enhancements — do not block clean)

- Loading purity static check for `app/(shell)/kiosk/loading.tsx`
- Settings component focus-control visibility render test
- Month-board circular-gauge negative assert
- Stronger label selectors (`>Expenses<` / aria) in month-board card tests
- Settings Columns always visible (or Design documents grid-only) — Quality R1
- Optional month-board skeleton Budget amounts row — Quality R1
- Notify copy says “layout saved” on widget-only PATCH — Quality R1
- globals.css kiosk CQ duplicate selectors — Quality R1
- Prefs route `429` without `code` (pre-existing; design “same as today”) — API lens A1 Nit
- No per-migration Drizzle snapshot for `0048_kiosk_layout` (historical gap) — DB lens D-N1 Nit

---

## Fix notes (adversarial-tests · Fix R1)

**Stage:** fix-review · **Verify:** verify-pass (attempt 1) · **Updated:** 2026-10-13

| Fix ask | Change | TDD |
|---------|--------|-----|
| Critical — e2e glance | `e2e/kiosk-layout.spec.ts`: enable Month money board checkbox before save poll; drop soft `if (isVisible)`; unconditional `kiosk-month-board` + Expenses/Income; empty-budget **or** progressbar branch (+ remaining metrics when empty). | test lock only (product already renders board) |
| Major — empty chart metrics | `kiosk-month-board-card.test.ts`: empty-chart `it` asserts all six labels + empty copy + no progressbar. | Red→Green lock |
| Major — skeleton slots | `kiosk-dashboard-skeleton.test.ts`: month section asserts `h-2 w-full` linear placeholder + six `min-w-0 space-y-2` metric slots; CQ classes on board. | Red→Green lock |
| Major — dashboard money-on | `kiosk-dashboard.test.ts`: two cases — null chart (Expenses/Income + empty budget) and with budget (progress + Expenses/Income) via full board HTML. | Red→Green lock |
| Major — CSS SoT classes | Live board + skeleton unit asserts `kiosk-cq-phone-narrow` / `kiosk-cq-phone-wide` / `kiosk-cq-wider`. | Red→Green lock |

**Verify commands:** `npm run build` (pass) · `npm test` (pass, 0 fail) · e2e not in Verify gate.

**Out of scope:** Deferred Enhancements (loading purity, Settings focus render, circular-gauge negative, tighter label selectors). No product rewrite required — locks already present in markup.

---

## Fix notes (quality · Fix R1)

**Stage:** fix-review · **Verify:** verify-fail (attempt 3) · **Updated:** 2026-10-13

| Fix ask | Change | TDD |
|---------|--------|-----|
| Major — Focus Select value resolve | `kiosk-widget-settings.tsx`: Focus `Select` `value` uses `resolveFocusWidgetId(enabledList, layout.focusWidgetId)` (enabled stored id, else first enabled, else `""`). | Red→Green: `kiosk-widget-settings.test.ts` locks disabled/stale focus → first enabled selected; enabled focus kept |

**Verify commands:** `npm run build` (pass) · `npm test` (fail ×3 — exit 1) · e2e not in Verify gate.

**Verify blocker (out of Quality Fix ask):** `lib/telegram/send.test.ts` — `passes AbortSignal and times out hung fetch` cancels (`cancelledByParent`: event loop resolves while promise pending). Root cause: `AbortSignal.timeout` uses an unref’d timer, so a hung fetch waiting only on that abort does not keep the Node test runner alive. Suite reports `# fail 0` / `# cancelled 1` but non-zero exit. Reproduces alone and in full suite. Quality Focus Select unit file passes in isolation (2/2). No telegram change made (scope = Quality Major only).

**Out of scope:** Deferred Enhancements (always-show Columns; skeleton Budget amounts; notify copy; CQ selector redundancy).
