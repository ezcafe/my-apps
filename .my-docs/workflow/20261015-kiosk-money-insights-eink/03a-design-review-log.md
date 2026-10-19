# Design review log: 20261015-kiosk-money-insights-eink

**Result:** clean
**Round:** 1
**Updated:** 2026-10-15

**Isolated reviews (parallel-safe):** When Has API **and** not Notes `tiny-contract-tweak`, see `03a-api-contract-review.md`. When Has DB **and** not Notes `tiny-contract-tweak`, see `03a-db-design-review.md`. Tiny-tweak / Has no → treat as **skipped** (no empty files). Overall **clean** requires those Results **clean|skipped** and this log **clean**.

- API: **clean** (R1) — not deep-re-reviewed; cross-cutting only
- DB: **skipped** — Has DB no (no empty `03a-db`)

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | contracts | A/B page payloads stay conceptual (slot arrays + series); Bills / Loans / Budget spent sources are named in Analysis + “like month_board” but not a Module I/O field SoT table (sibling month_board had explicit `billsMinor` / `loansMinor`). | Optional typed `insightsStatsGrid` / `insightsChart` + one-line SoT per money slot (reuse month-board helpers). API review already deferred typed shapes. |
| Enhancement | diagram | Sequence shows prefs PATCH happy path only (no `401` / `400` / `429` alts). | Optional failure alts — see API Deferred. |
| Enhancement | contracts | No idempotency one-liner under API contracts for prefs PATCH. | Add one line; behavior already upsert-safe — see API Deferred. |
| Enhancement | pattern | Analysis listed visx `LineChart` shell as a reusable pattern; Design locks visx in UI / Best practices but does not teach it under **Design patterns used**. | Optional Pattern 4 (What / How / Why / anti-pattern: no Lightweight Charts) — Build already locked in Task 5. |
| Nit | practice | Contracts Errors list `403` and bare “rate-limit”; prefs route uses `401` / `400` / `429` (+ `503` db). | Align wording with `app/api/user/preferences/route.ts` — see API Nit. |

## Fix ask for my-dev-flow-design

(none — Round 1 clean)

## Deferred Enhancements (do not block clean)

- Optional Module I/O / slot field SoT for A/B (mirror month_board helpers).
- Sequence prefs failure alts; PATCH idempotency one-liner (API Deferred).
- Optional visx Pattern section under Design patterns used.
- Nit: prefs error status wording (`403` → real statuses).

## Round notes

- **Mode full checklist:** Problem map Steps 1–2 + Core + ★ ✓ · Analyze What/Why/How + Solution branches ✓ · Grill `frontier-empty`; Design honors Q1–Q5 (A map, B daily spend, ids, footer, API/DB) without re-open ✓ · System design Overview + Concepts ✓ · Patterns (3) taught ✓ · Sequence main path ✓ · Tasks acceptance + TDD + API Task 1 ✓ · UI locks Gate A #1/#2 + refs A/B visual/metric/footer/skeleton — no 80/20 re-litigation ✓ · OWASP table A01–A10 ✓ · Glossary terms present; ADR skipped with reason ✓.
- **UI:** Build ↔ UI lock present; visual locks match `refs/money-insights-stats-grid.png` / `refs/money-insights-chart.png` structure (2+3+3 + dither + dotted rules + footer; 3 KPIs + dotted-grid line + footer); monochrome inside cell; defaults A/B off.
- **Cross-cutting:** Tasks catch prefs enum/max and metric/series locks; no Build-critical frontier left open.
- Zero Critical / Major → **clean**. Overall clean = API clean ∧ DB skipped ∧ this log clean.
- No production code; did not edit 01–04.
