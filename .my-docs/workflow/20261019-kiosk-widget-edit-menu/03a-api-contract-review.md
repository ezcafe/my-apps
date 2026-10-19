# API contract review: 20261019-kiosk-widget-edit-menu

**Result:** clean
**Round:** 3
**Updated:** 2026-10-19

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | practice | Sequence still light on 401 / 429 / 503 for reorder PATCH. | Optional alts (carry Round 2). |
| Enhancement | contracts | Reorder + Resize rapid applies could race two PATCHes. | Optional Build note: serialize client applies or last-write-wins + refresh from response. |
| Nit | practice | Errors row lists unknown widget id; good — keep Settings + reorder paths covered in Task 8 units. | — |

**API checklist:** typed I/O · one error shape · edge validation · pagination · additive fields · naming · idempotency · matches repo patterns

**Checklist notes (pass / gap):**

- **Typed I/O:** pass — cells rules unchanged; amend adds ordered `kioskWidgets` permutation PATCH (existing field, new order semantics).
- **One error shape:** pass — reuse prefs errors.
- **Edge validation:** pass — unknown widget ids → 400; reorder = permutation of enabled set (Design lock).
- **Pagination:** N/A.
- **Additive fields:** pass — no new request field; order significance of `kioskWidgets` documented.
- **Naming:** pass.
- **Idempotency:** pass in practice — same ordered body retry-safe; docs Enhancement still deferred.
- **Auth / ownership:** pass — unchanged.
- **Sequence failures:** pass for amend path — optimistic layout/order + PATCH + rollback on fail; 400 cells path retained.
- **Tasks catch mistakes:** pass — Task 8 order round-trip + baby-inject; Task 9 reorder PATCH + Done no PATCH; Task 3/7 immediate size.
- **Repo patterns:** pass — extend existing preferences PATCH; ADR-003 widgets array as SoT for order (P1).

## Fix ask for my-dev-flow-design

(none)

## Deferred Enhancements (do not block clean)

- Sequence alts for 401 / 429 / 503.
- Client serialize / race note for rapid Resize + reorder.
- Prior Round 2 deferred items (idempotency one-liner; full `cells` map unit).

## Round notes

- **Amend scope (design-backloop A1 B2):** Immediate Resize reflow (client optimistic; no new API field). Drag reorder persists via **P1** `kioskWidgets` order (normalize preserve). No new endpoint.
- Prior Round 1–2 Major closures still hold for `cells`.
- Zero Critical; zero open Major → **clean**.
