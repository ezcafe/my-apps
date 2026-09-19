# Design review log: baby-activities-page

**Result:** clean
**Round:** 2
**Updated:** 2026-09-18

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | No Critical, Major, or Enhancement findings this round. | — |
| Nit | analysis | `02-analysis.md` still lacks the template “Deep dive” headings (What / Why / How + other ways + best practices), though substance is covered via What exists / Dependencies / Patterns / Risks / Blocking questions and Design D1–D4 already locked. | Optional later tidy only — not required to unblock Gate B. |
| Nit | practice | Idea success wording still says “period → filters → ledger”; Gate A2 / 01b / Design correctly lock **filters → period → ledger**. | Do not change chrome order; Build follows 01b. |

## Fix ask for my-design-workflow

None — Round 1 Fix ask items verified applied. Design is clean for next stage.

## Round notes

- Fresh read of `01`–`04`, `01a`/`01b`, skim, analysis, `ui-refs/`, plus spot-check of `baby-typeDefs.ts`, `baby-query-options.ts` (`BABY_*`), and Insights `activityOpen` / `listsEnabled` / `moreOpen` / sync glue in `baby-insights-dashboard.tsx`.
- **Round 1 Fix ask spot-check (all done):**
  1. Contracts + examples use real `from`/`to` and growth `id`/`kind`/`recordedAt`/`valueNum`/`valueText`/`unit`/`notes`; point Build at `lib/baby-query-options.ts`.
  2. Activities owns timeline list **and** sync/auto-page/load-more; Insights drops timeline list / `activityOpen` / `listsEnabled` / sync (Chosen + enable table + Task 3/4).
  3. Insights growth enable = existing **`moreOpen`** (not a new flag); empty/skeleton until expand documented.
  4. Series-only care KPIs after timeline off; timeline fallback gone and OK.
  5. Sequence diagram has auth/forbidden, load error + retry, and partial multi-delete alts.
  6. Task 3 has concrete red-first cases (enable-on-mount, no Insights log, chrome/default range); sync move in description.
  7. Decision 2/3 Recommendation marked **Superseded by Chosen**.
- Human locks consistent: D1:1, D2:2, D3:2, D4:1 across Chosen + `04` header.
- Gate A / A2 treated as settled. Did **not** re-argue 80/20. UI in `03` matches `01b` / ui-refs (FilterMenu chrome, filters → period → ledger, ghost Edit, floating bar, cue, empty crumbs, no summary strip). No UI-drift Critical/Major.
- OWASP Top 10 table complete with trust boundaries and abuse cases; source cited. No security Critical/Major.
- Skim hard constraints and Patterns to reuse honored (same Baby feature, move not duplicate, 7-day default, skeleton parity, no Money/schema churn).
- Result **clean** — zero Critical, Major, and Enhancement. Next: TDD test-case review → Gate B → Build.
