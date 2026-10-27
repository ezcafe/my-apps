# TDD test plan review

**Result:** clean  
**Updated:** 2026-10-27  
**Prereq:** Design present (`03` Result `done`); Isolated API/DB clean; overall `03a-design-review-log` clean; Grill `frontier-empty`

**04a unpaid / dirty** when planned tests present ∧ ¬Notes `04a skipped` ∧ (missing **or** Result ∉ {`clean`}) — incl. **`pending`**. ¬ planned tests → **04a ok** (no Prefer). Waiver Notes `04a skipped` = parent after Parent-relay **or** labeled solo after AskQuestion named yes.

## Planned cases reviewed

| Task | Scenario type | Test case | Covered? |
|------|---------------|-----------|----------|
| 1 | real / fixture | Seed helper idempotent + cleanup; count ≥10k under first-load filter predicates | yes |
| 1 | real | Timing helper records distinct spans; disabled → no prod leak | yes |
| 2 | real / contract | `includeTotal: false` → COUNT not invoked; `total === null`; `hasMore` from pageSize+1 (extra → true; short → false) | yes |
| 2 | real / default | `includeTotal: true` / omit → `total` matches COUNT; pager math unchanged | yes |
| 2 | real / cache | queryKey / list input differ when `includeTotal` flips | yes |
| 2 | edge / optional | keyset `nextCursor` still produced for `sort=occurredAt` | yes (optional) |
| 3 | real / UI | Pager disables Next from `hasMore` when `total` is null | yes |
| 3 | real / SSR | `/money` first-load list options pass `includeTotal: false` (key includes it) — gated on measure | yes |
| 3 | real / UI | Pager does not throw / blank when `total` null and `hasMore` true | yes |
| 4 | real / SSR | `/money` prefetch does not request summary on SSR critical path | yes |
| 4 | real / cache | First-load filter + `includeTotal` SSR ↔ client key parity (Spending) | yes |
| 4 | e2e | Rows visible while summary pending / deferred | yes |
| 5 | e2e | Ledger first load shows rows (structural Grill Q1 bar); red before 3–4, green after | yes |
| 6 | real / optional | Invalidation targets list keys incl. `includeTotal`; no cross-workspace reuse — gated | yes |

## Gaps

None blocking. Coverage matches Grill Q1–Q5 locks + Design Concepts 1–4 + Isolated API/DB closed Majors.

### Enhancement (fold into Task 2/3 Red tests during Build — not required for 04a dirty)

| Severity | Missing scenario | Suggested test |
|----------|------------------|----------------|
| Enhancement | Analytics / chart drilldown keep exact total | Unit: drilldown / analytics list options omit flag or pass `includeTotal: true` (never share skip-total key with ledger) |
| Enhancement | Default-path `hasMore` formula (Isolated API Nit) | Unit: when `includeTotal: true`, assert chosen formula (`(page * pageSize) < total` **or** pageSize+1) so “Page N of M” stays correct |
| Enhancement | Empty pager when `total` null | Unit/component: `hasMore: false` + empty rows → Next disabled; empty copy clear |
| Nit | Ban sentinel `-1` | Already implied by `total === null`; optional explicit `expect(total).not.toBe(-1)` on skip-total path |

## Real scenarios checked

- **Happy path:** skip-total + hasMore; default exact total; SSR summary defer; fixture ≥10k under first-load predicates; e2e rows without waiting on summary.
- **User-visible:** pager with null total; `/money` first-load structural bar.
- **Permission / workspace:** isolation unchanged (acceptance); Task 6 no cross-workspace keys when gated.

## Edge scenarios checked

- **Boundaries:** pageSize+1 hasMore true/false; queryKey flip; optional nextCursor.
- **Measure gates:** Tasks 3/6 correctly gated — no orphan production tests required when ranks demote.
- **Out of v1:** forms/edit bundle / rollups — correctly omitted from TDD.

## Fix ask

None required for Result **clean**. Optional Enhancement rows above may be added as named Red cases in `04-tasks.md` Tasks 2–3 during Build without re-dirtying 04a.

## Round notes

- Planned tests present in `04-tasks.md` (TDD sections per task).
- No product code written this stage.
- Orchestrated Task: do **not** Prefer `gate-b` / `build` here — parent re-derives after **04a ok**.
