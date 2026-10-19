# Design review log: 20261012-kiosk-widgets

**Result:** clean
**Round:** 2
**Updated:** 2026-10-13

**Isolated reviews (parallel-safe):** When Has API, see `03a-api-contract-review.md`. When Has DB, see `03a-db-design-review.md`. Overall **clean** requires those Results **clean|skipped** and this log **clean**.

- API: **clean** (R2) — not deep-re-reviewed this round
- DB: **clean** (R2) — not deep-re-reviewed this round

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | practice | Stored prefs keep old widget sets; new defaults only hit null prefs — already locked as null-only in Design UI + Task 2. | No further design change; Build follows null-only. |
| Enhancement | practice | Dual-column prefs upsert window (widgets + layout) remains deferred from DB review. | Prefer one `onConflictDoUpdate` when both keys patch; OK to match today’s sequential style. |
| Nit | analysis | `02-analysis.md` Solution piece 5 still says skeleton mirrors fullscreen vs grid; Design/Task 7 now lock default-only. | Optional sync on a later doc pass — Build SoT is `03`/`04`. |
| Nit | idea | Idea Open questions may still list items Grill settled. | Optional close on next ideation touch. |

## Fix ask for my-dev-flow-design

(none — Round 2 clean)

Deferred Enhancements: dual-column upsert; finance-degrade sequence alt (API); Nit analysis/idea doc sync.

## Round notes

### Round 1 (kept for audit)

**Result then:** needs update

| Severity | Area | Finding |
|----------|------|---------|
| Major | system-design / ui-ux / tasks | Layout-aware route `loading` impossible without prefs; no default-only lock |
| Major | system-design / tasks | Column-cap SoT conflict (CSS vs JS `viewportCap`) |
| Major | design / contracts | `billsMinor` / `loansMinor` undefined; “loans ledger filters” vague |

### Round 2 — design-update (Architect from Fix ask) [prior append]

| Fix ask Major | Where locked | Lock |
|---------------|--------------|------|
| 1 Loading | UI + Overview + Task 7 | `kiosk/loading.tsx` + skeleton = **default-only** (grid, cols 1, weather + month_board + loans). No DB/prefs in route `loading`. Accept CLS when prefs differ. |
| 2 Columns SoT | Concept 1 + Option 1 + Tasks 4/6/7 (+ Task 8 note) | **CSS-only** `@container` override of `--kiosk-cols` via tokens `kiosk-cq-phone-narrow` (cap 1) / `phone-wide` (cap 2) / `wider` (cap 4). `effectiveKioskColumns(pref, viewportCap)` = pure helper, **injected cap for unit tests only**; live board does not measure in JS. |
| 3 billsMinor / loansMinor | Module I/O field SoT + Pattern 2 + Task 3 | `billsMinor` = `MONEY_LEDGER_BILLS` expense current month (same as `bills.summary`). `loansMinor` = `loansInsightsSummary.monthlyObligationMinor` (same as `loans.summary`). Dropped “loans ledger filters.” |

**Enhancements folded in that update:** linear budget viz; null-prefs defaults only.

### Round 2 — verify (Senior Architect, fresh)

- **Major 1 cleared:** Design UI “Route loading lock” + Overview anti-pattern “DB/await in route loading” + Task 7 acceptance/TDD = default-only grid-1 three cells; CLS for non-default prefs accepted. No layout cookie / prefs-in-loading path required.
- **Major 2 cleared:** Concept 1 names CSS SoT + tokens; Option 1 / Sequence / Task 4–6 forbid ResizeObserver / JS measure; helper is test-inject only.
- **Major 3 cleared:** Module I/O field SoT table + Pattern 2 + Task 3 acceptance/TDD name helpers and `monthlyObligationMinor`; no loans ledger preset.
- **Checklist (Mode full):** Problem map Steps 1–2 + Core + ★ ✓ · Analyze What/Why/How + Solution branches ✓ · Grill frontier-empty; Design honors Q1–Q6 ✓ · System design Overview + Concepts ✓ · Patterns (3) ✓ · Sequence prefs failures + board alts ✓ · Tasks acceptance + TDD ✓ · UI locks Gate A #1/#2 — no 80/20 re-litigation ✓ · OWASP table ✓ · Glossary + ADR-003 ✓ · API/DB isolated reviews **clean**.
- Zero open Critical / Major → **clean**. Overall clean = API clean ∧ DB clean ∧ this log clean.
- No production code; did not edit 01–04.
