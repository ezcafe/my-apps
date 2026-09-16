# Design review log: baby-insights-table-style

**Result:** clean  
**Round:** 2  
**Updated:** 2026-09-14

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | design | Row layout names Baby fields but still has no exact `TableHead` i18n keys / card line order map. | Optional one short column map in Design if Build wants labels pinned early. |
| Nit | design / ui-ux | Live UI task text says “loans/Transactions” mobile cards; loans cards use `--radius-md`, Transactions / DESIGN_GUIDE nested rows use `--radius-sm`. Skeleton section already says `--radius-sm`. | Build: prefer Money ledger `--radius-sm` for mobile cards (skeleton already correct). |
| Nit | security-owasp | A09 still marked **pass** for a change that adds no logging. | Optional: **N/A** — “no new logs/metrics this pass.” |
| Nit | practice | Design is silent on whether `fx-stagger-children` stays on Table/cards (live lists use it today). | Drop stagger on table rows (match Transactions) or keep only on mobile cards if desired. |

## Fix ask for my-design-workflow

None — Result is **clean**. Nits above do not block Build.

Do **not** reopen Option 1 vs 2, URL sync, Money defaults, or GraphQL contracts unless Gate 2 rejects them.

## Round notes

### Round 2 — verifier (fresh context)

- Reviewed: `01-idea.md`, `01a-idea-ui-review.md`, `02-analysis.md`, `03-design.md`, `04-tasks.md`, prior Round 1 notes in this log. Did not rewrite 01–04. No production code.
- **Round 1 Fix ask — verified closed:**
  1. `03-design.md` empty path: empty ≠ error + recovery via existing date filter / Apply (no second filter).
  2. `03-design.md` a11y: section `h2` visible name; `TableCaption` only `sr-only` or omit (both lists).
  3. `04-tasks.md` Task 3a: failing Insights e2e (today via chip/controls + table/card chrome) **before** Tasks 3–4 UI; Task 5 is green closeout only.
  4. `04-tasks.md` Task 6: empty-today recovery copy + period chip / light-dark.
  5. `01-idea.md`: Outcome covers KPIs/charts/lists + sparse today normal + Baby ≠ Money month; Open questions settled by Locked picks.
- **Still solid:** Locked picks; Option 1; sequence (open → today → load → error alt → Reset); GraphQL reused + workspace auth; OWASP A01–A10 present; skeleton parity; Money defaults protected; TDD order unit → failing e2e → UI → green e2e.
- **Repo spot-check:** Lists still `<ul divide-y>`; skeleton still divide-y; `babyInsightsDefaultRange` still month via `defaultAnalyticsFilters` — design still matches current gap. Empty keys are Insights-only (`insights.emptyGrowth` / `insights.emptyTimeline`). Period chip formats applied dates (`insights.periodThisMonth` unused).
- **Security:** No Critical/Major authz or injection gaps for chrome + client-default pass.
- **Exit rule:** Zero Critical / Major / Enhancement → **clean**. Nits optional for Build polish only.
- Next (parent): `my-code-workflow` (TDD review → Build) → Gate 2 → `my-review-workflow`.

### Round 1 — summary (kept for history)

- Result was **needs update** (three Enhancements: empty recovery, TDD e2e-before-UI, a11y double-title). Architect applied Fix ask; nits deferred on purpose.
