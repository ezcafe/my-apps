# API contract review: 20261012-kiosk-widgets

**Result:** clean
**Round:** 3
**Updated:** 2026-10-13

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | practice | Sequence still covers PATCH `401` / `400` / `429` only; loader/finance degrade when money board is enabled is not an alt path (page already has `dbUnavailable` / `noWorkspace`). | Optional alt: finance throw → existing empty/unavailable flags; chart-empty stays distinct from no workspace. Deferred. |
| Nit | practice | Prefs `429` uses `{ error: "Too many requests" }` without `code` (`route.ts`), while `badRequest`/`unauthorized` include `code`. Design correctly says “same as today.” | Out of scope unless this run touches the route helper. |

**API checklist:** typed I/O · one error shape · edge validation · pagination · additive fields · naming · idempotency · matches repo patterns

**Checklist notes (pass / gap):**

- **Typed I/O:** pass — nested `kioskLayout` replace rules locked; `KioskMonthBoardWidget` field list on `widgets.monthBoard`; Field SoT table locks `billsMinor` / `loansMinor`; Task 3 points at that shape + helpers.
- **One error shape:** pass for this extend — reuse `401` / `400` / `429` as today (`app/api/user/preferences/route.ts`).
- **Edge validation:** pass — Zod at PATCH; unknown `focusWidgetId` → `400`; `readJsonBounded` + same-origin unchanged.
- **Pagination:** N/A — single prefs row, not a list resource.
- **Additive fields:** pass — optional nested `kioskLayout`; existing `kioskWidgets` / `weatherCity` unchanged.
- **Naming:** pass — camelCase `kioskLayout` / `focusWidgetId` beside `kioskWidgets`; DB `kiosk_layout`; month-board minors mirror `KioskNetWidget`.
- **Idempotency:** pass — Contracts: same body upsert safe to retry; no new store.
- **Auth / ownership:** pass — session `user_sub` only; no client workspace on prefs; finance stays loader/server-scoped.
- **Sequence failures:** pass for prefs gate; Enhancement (deferred) for money-load degrade alt.
- **Tasks catch mistakes:** pass — Task 1 layout-only + focus SoT; Task 3 field list + bills/loans SoT acceptance + TDD.
- **Repo patterns:** pass — extend GET/PATCH preferences; ADR-003; no new public money REST.

## Fix ask for my-dev-flow-design

(none — Round 3 clean)

## Round notes

### Round 1 (kept for audit)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Major | contracts | Nested `kioskLayout` PATCH semantics ambiguous; layout-only risk silent no-op. | Lock omit vs full replace; layout-only must persist. |
| Major | contracts | `focusWidgetId` edge vs resolve rules conflict (reject / strip / leave). | Zod reject unknown; resolve disabled/stale → first enabled. |
| Major | contracts | Month board loader DTO untyped. | Type `widgets.monthBoard` in Contracts; Task 3 points at shape. |

### Round 2 — verify (API contract reviewer)

- **Major 1 cleared:** Contracts → Nested replace (omit = unchanged; present = all three required, whole-object replace) + layout-only PATCH must write; Task 1 acceptance + unit for layout-only round-trip / no silent no-op.
- **Major 2 cleared:** Single SoT — PATCH Zod rejects unknown ids (`400`); known-but-disabled may store; `resolveFocusWidgetId` maps invalid/disabled/stale → first enabled; Task 1 removes strip/leave fork; Pattern 1 / DB notes aligned.
- **Major 3 cleared:** Module I/O `KioskMonthBoardWidget` lists fields + `budgetChart: null` empty-chart rule; Task 3 acceptance matches that shape.
- **Enhancement folded earlier:** Idempotency one-liner present in Contracts.
- Zero open Critical / Major → **clean**.
- Deferred Enhancements: finance-degrade sequence alt; Nit 429 body shape out of scope.

### Round 3 — light verify (API contract reviewer)

Fresh check after design-review loans/bills SoT lock (Module I/O Field SoT + Pattern 2 + Task 3).

- **Module I/O coherent:** `KioskMonthBoardWidget` still typed; `billsMinor` / `loansMinor` have explicit SoT rows — bills = `MONEY_LEDGER_BILLS` expense (same as `bills.summary`); loans = `loansInsightsSummary.monthlyObligationMinor` (same as `loans.summary`; not due-sum / not remaining). Explicit “no loans ledger preset.”
- **Pattern 2 aligned:** Widget-gated loader names the same helpers; anti-pattern matches the lock.
- **Task 3 aligned:** Description, acceptance, and TDD cite the same sources and field list; no second aggregation story.
- Round 2 prefs PATCH / focus / additive rules unchanged and still pass.
- Zero open Critical / Major → **clean**. Deferred Enhancement + Nit unchanged.
