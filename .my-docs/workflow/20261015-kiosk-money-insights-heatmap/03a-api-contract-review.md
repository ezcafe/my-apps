# API contract review: 20261015-kiosk-money-insights-heatmap

**Result:** clean
**Round:** 1
**Updated:** 2026-10-15

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | practice | Sequence shows PATCH success only; no alt for prefs `401` / `400` / `429`. | Optional alt on prefs gate; does not change enum/max semantics. |
| Enhancement | contracts | Contracts table has no idempotency one-liner for PATCH (existing prefs upsert is safe to retry with same body). | Add one line under API contracts; behavior already matches today’s prefs upsert. |
| Enhancement | contracts | Widget payload is a conceptual table, not a Module I/O type on `KioskPageData.widgets` (unlike `monthBoard` / `insightsChart`). | Optional typed `insightsHeatmap` shape in Contracts; Task 2 already locks hero/KPIs/cells/range. |
| Nit | practice | Errors list `403` and bare “rate-limit”; prefs route uses `401` / `400` / `429` (+ `503` db). | Align wording with `app/api/user/preferences/route.ts` — drop `403`, name `429`. |
| Nit | contracts | Success response says “Prefs JSON”; route wraps as `{ data: prefs }`. | Mirror existing envelope wording so Build does not invent a bare prefs body. |

**API checklist:** typed I/O · one error shape · edge validation · pagination · additive fields · naming · idempotency · matches repo patterns

**Checklist notes (pass / gap):**

- **Typed I/O:** pass for public API — extend existing GET/PATCH prefs; `kioskWidgets` enum gains `money.insights_heatmap`; max = `KIOSK_WIDGET_IDS.length`. Page payload conceptual (Enhancement).
- **One error shape:** pass for this extend — reuse existing prefs errors; Nit on `403` vs real statuses.
- **Edge validation:** pass — Zod enum + max at PATCH; unknown → reject; oversized → reject; same-origin + `readJsonBounded` unchanged. Stored unknown ids still strip on normalize (read path).
- **Pagination:** N/A — single prefs row, not a list resource.
- **Additive fields:** pass — new enum member only; no remove/retype of existing prefs fields; `defaultEnabled: true` for fresh/null prefs only (matches Gate A / defaults A).
- **Naming:** pass — `money.insights_heatmap` dotted id matches registry; sequence uses `widgets.insightsHeatmap` camelCase like `insightsChart` / `monthBoard`.
- **Idempotency:** pass in practice (existing upsert); Enhancement to spell it in Contracts.
- **Auth / ownership:** pass — session user; same-origin PATCH; no client workspace id; money stays loader/server-scoped.
- **Sequence failures:** prefs happy path only — Enhancement for failure alts.
- **Tasks catch mistakes:** pass — Task 1 acceptance + Zod unit tests (accept new id, reject unknown, max = registry length); Task 5 e2e toggle round-trip.
- **Repo patterns:** pass — ADR-003 prefs path; no new money REST; Has DB no respected (no invented DB contract). Matches sibling e-ink prefs-extend pattern.

## Fix ask for my-dev-flow-design

(none — Round 1 clean)

## Deferred Enhancements (do not block clean)

- Sequence alt for prefs `401` / `400` / `429`.
- Idempotency one-liner under API contracts.
- Optional Module I/O type for `insightsHeatmap` page widget (mirror `monthBoard`).

## Round notes

- Scope: prefs Zod enum + PATCH `/api/user/preferences` for one new widget id (`money.insights_heatmap`). Has DB no — no DB findings.
- Verified against `route.ts` (session, same-origin, rate limit, Zod via service), `userPreferencesPatchSchema` (array + max from registry), and sibling clean review `20261015-kiosk-money-insights-eink`.
- Zero Critical / Major → **clean**.
