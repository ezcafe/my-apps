# Design review log: 20261015-kiosk-money-insights-heatmap

**Result:** clean
**Round:** 1
**Updated:** 2026-10-15

**Isolated reviews (parallel-safe):** When Has API **and** not Notes `tiny-contract-tweak`, see `03a-api-contract-review.md`. When Has DB **and** not Notes `tiny-contract-tweak`, see `03a-db-design-review.md`. Tiny-tweak / Has no → treat as **skipped** (no empty files). Overall **clean** requires those Results **clean|skipped** and this log **clean**.

- API: **clean** (R1) — not deep-re-reviewed; cross-cutting only
- DB: **skipped** — Has DB no (no empty `03a-db`)

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | diagram | Sequence shows prefs PATCH happy path only (no `401` / `400` / `429` alts). | Optional failure alts — see API Deferred. |
| Enhancement | contracts | No idempotency one-liner under API contracts for prefs PATCH. | Add one line; behavior already upsert-safe — see API Deferred. |
| Enhancement | contracts | Widget payload is a conceptual table, not a Module I/O type on `KioskPageData.widgets` (unlike `monthBoard` / `insightsChart`). | Optional typed `insightsHeatmap` shape — see API Deferred. Task 2 already locks hero/KPIs/cells/range. |
| Enhancement | ui-ux | Visual lock says ~7×52+ pills but does not lock week-start weekday (Sun vs Mon) or column packing for short years. | Optional one-line Build lock: match ref column order / first weekday; Task 4 composition check covers fidelity. |
| Enhancement | diagram | Money loader failure path absent (empty year vs throw). | Optional note: loader errors follow existing kiosk page error handling; empty year stays zeros + level-0 grid. |
| Nit | practice | Contracts Errors list `403` and bare “rate-limit”; prefs route uses `401` / `400` / `429` (+ `503` db). | Align wording with `app/api/user/preferences/route.ts` — see API Nit. |

## Fix ask for my-dev-flow-design

(none — Round 1 clean)

## Deferred Enhancements (do not block clean)

- Sequence prefs failure alts; PATCH idempotency one-liner; optional typed `insightsHeatmap` Module I/O (API Deferred).
- Optional week-start / column-pack lock for heatmap grid vs ref.
- Optional money-loader failure note (empty ≠ error).
- Nit: prefs error status wording (`403` → real statuses).

## Round notes

- **Mode full checklist:** Problem map Steps 1–2 + Core + ★ ✓ · Analyze What/Why/How + Solution branches ✓ · Grill `frontier-empty`; Design honors D1–D6 (count signal; any-tx streaks; rolling ~365; footer Money / Insights · last year; empty=zeros; id `money.insights_heatmap` default on) without re-open ✓ · System design Overview + Concepts ✓ · Patterns (3) taught (registry+Zod; gated loader+mapper; e-ink chrome) ✓ · Sequence main path ✓ · Tasks acceptance + TDD + API Task 1 ✓ · UI locks Gate A #1 hero + #2 heatmap + visual/metric/bucket/skeleton — no 80/20 re-litigation ✓ · OWASP table A01–A10 ✓ · Glossary terms present; ADR skipped with reason ✓.
- **UI:** Build ↔ UI lock present; visual locks match `refs/money-insights-heatmap.png` bands (hero|2×2 → pill heatmap → dither footer); monochrome inside cell; defaults A (heatmap + month_board on; A/B off).
- **Cross-cutting:** Tasks catch prefs enum/max, metric/bucket locks, gated skip, skeleton parity, e2e toggle; no Build-critical frontier left open. Thin `{ date, txCount }[]` grain correctly replaces spend cumulative for Grill count signal.
- Zero Critical / Major → **clean**. Overall clean = API clean ∧ DB skipped ∧ this log clean.
- No production code; did not edit 01–04.
