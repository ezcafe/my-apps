# DB design review: 20261019-kiosk-widget-edit-menu

**Result:** clean
**Round:** 3
**Updated:** 2026-10-19

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | docs | Array order of `kiosk_widgets` is now user-significant (was registry-sorted on write). | Optional schema/comment or ADR-003 note: order is board paint order. |
| Nit | ownership | PK wording still “user” in older contract table. | Say `user_sub` (carry Round 2). |

**DB checklist:** typed columns · indexes/uniques · write/read owners · additive migration · safe binds · bounded lists · tenant filters · design↔schema match

**Checklist notes (pass / gap):**

- **Typed columns:** pass — no new column; `kiosk_widgets` text[]/json array already stores order; `kiosk_layout.cells` nest unchanged (ADR-005).
- **Indexes/uniques:** pass — PK `user_sub`.
- **Write/read owners:** pass — preferences service; baby-inject must append without full re-sort (Task 8).
- **Additive migration:** pass — no DDL; behavior change is normalize + write paths.
- **Safe binds:** pass — scalar upsert.
- **Bounded lists:** pass — closed widget id set via normalize.
- **Tenant filters:** pass — owner row.
- **Tasks catch migration / shape:** pass — Task 8/9; no `widgetOrder` nest (P1 rejected P2).
- **design↔schema match:** pass — order in ADR-003 widgets column; cells remain ADR-005.

## Fix ask for my-dev-flow-design

(none)

## Deferred Enhancements (do not block clean)

- Document `kiosk_widgets` order significance (schema comment or ADR-003 appendix).
- Nit: PK `user_sub` wording.
- Prior “no DDL / missing cells → defaults” one-liner.

## Round notes

- Amend does **not** add `kioskLayout.widgetOrder` (P1). DB shape unchanged.
- Baby-inject preserve-order lock closes rewrite risk for user order.
- Zero Critical; zero open Major → **clean**.
