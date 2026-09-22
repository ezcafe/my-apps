# Idea: App-wide API + DB hardening

## Problem

API route contracts and database usage across the app are inconsistent. That raises risk of broken clients, unsafe SQL binds, wrong money aggregates, weak error shapes, and hard-to-evolve endpoints.

## User / audience

- **Primary:** developers and agents shipping Money, Baby, and shell features
- **Secondary:** end users (fewer runtime failures; safer data)

## Outcome

1. A ranked audit of current API contracts and DB usage (whole app).
2. A design + task list for the highest-value fixes.
3. Implement Critical/Major items through tests, review, and merge (user chose implement path).

## Metric

- Audit docs list concrete findings with file paths.
- Top Critical/Major fixes land with failing-then-passing tests.
- Isolated API + DB reviews (design-time and code-time) report clean for shipped items.

## Has UI

**no**

## Lean / skip hints

- **Lean UI concept?** no
- **Copy/token-only?** no (no UI)

## 80/20 UI (day-to-day)

N/A — no UI

## Non-goals

- Full rewrite of every route or schema.
- New product features or UI redesign.
- Changing business rules unless required for contract/DB correctness.
- Boiling the ocean: skip low-value style-only churn.

## Assumptions to attack

- “Whole app” can still ship in one PR if we cap Build to top Critical/Major only.
- Existing patterns in `AGENTS.md` / Money / Baby are the reuse baseline.
- postgres.js + Drizzle rules (no array `ANY(${x}::uuid[])`, no `SUM(...)::int` on money) are still the hard constraints.

## Success criteria

- [ ] `02-analysis.md` maps API + DB pain with What/Why/How.
- [ ] `03-design.md` / `04-tasks.md` rank fixes and bound Build scope.
- [ ] Design-review + API contract review + DB design review clean for planned work.
- [ ] Critical/Major tasks implemented, smoked, lite-reviewed, and merged.

## Open questions

- After Analyze, confirm which top N Critical/Major items enter Gate B Build (parent may ask if list is large).

## Decisions already made

- **Decision 1 Option 2:** audit then implement through merge.
- **Decision 2 Option 1:** whole-app surface (`app/api`, validators, `db/`).
