# API contract review: 20261015-kiosk-money-insights-eink

**Result:** clean
**Round:** 1
**Updated:** 2026-10-15

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | practice | Sequence shows PATCH success only; no alt for prefs `401` / `400` / `429` (sibling design had them). | Optional alt on prefs gate; does not change enum/max semantics. |
| Enhancement | contracts | Contracts table has no idempotency one-liner for PATCH (sibling locked “same body upsert safe to retry”). | Add one line under API contracts; behavior already matches today’s prefs upsert. |
| Enhancement | contracts | A/B page payloads are conceptual tables, not Module I/O types on `KioskPageData.widgets` (unlike `monthBoard`). | Optional typed `insightsStatsGrid` / `insightsChart` shapes in Contracts; Task 2 already locks slots/series. |
| Nit | practice | Errors list `403` and bare “rate-limit”; prefs route uses `401` / `400` / `429` (+ `503` db). | Align wording with `app/api/user/preferences/route.ts` — drop `403`, name `429`. |

**API checklist:** typed I/O · one error shape · edge validation · pagination · additive fields · naming · idempotency · matches repo patterns

**Checklist notes (pass / gap):**

- **Typed I/O:** pass for public API — extend existing GET/PATCH prefs; `kioskWidgets` enum gains `money.insights_stats_grid` / `money.insights_chart`; max = `KIOSK_WIDGET_IDS.length`. Page payloads conceptual (Enhancement).
- **One error shape:** pass for this extend — reuse existing prefs errors; Nit on `403` vs real statuses.
- **Edge validation:** pass — Zod enum + max at PATCH; unknown → reject; oversized → reject; same-origin + `readJsonBounded` unchanged.
- **Pagination:** N/A — single prefs row, not a list resource.
- **Additive fields:** pass — new enum members only; no remove/retype of existing prefs fields; defaults off.
- **Naming:** pass — `money.*` dotted ids match registry; camelCase payload keys in sequence (`insightsStatsGrid` / `insightsChart`).
- **Idempotency:** pass in practice (existing upsert); Enhancement to spell it in Contracts.
- **Auth / ownership:** pass — session user; same-origin PATCH; no client workspace id; money stays loader/server-scoped.
- **Sequence failures:** prefs happy path only — Enhancement for failure alts.
- **Tasks catch mistakes:** pass — Task 1 acceptance + Zod unit tests (accept new ids, reject unknown, max = registry length).
- **Repo patterns:** pass — ADR-003 prefs path; no new money REST; Has DB no respected (no invented DB contract).

## Fix ask for my-dev-flow-design

(none — Round 1 clean)

## Deferred Enhancements (do not block clean)

- Sequence alt for prefs `401` / `400` / `429`.
- Idempotency one-liner under API contracts.
- Optional Module I/O types for A/B page widgets (mirror `monthBoard`).

## Round notes

- Scope: prefs Zod enum + PATCH `/api/user/preferences` for two new widget ids. Has DB no — no DB findings.
- Verified against `route.ts` (session, same-origin, rate limit, Zod via service), `userPreferencesPatchSchema` (array + max from registry), and sibling clean review pattern.
- Zero Critical / Major → **clean**.
