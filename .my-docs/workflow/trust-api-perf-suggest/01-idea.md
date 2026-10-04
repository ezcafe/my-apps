# Idea: Ranked trust / API / perf debt (suggest only)

**Project shape:** Next.js shell (`my-apps`) with workspace features Money, Investments, Loans, Baby Care; Pocket ID auth; Postgres + Drizzle; GraphQL + REST. Clean-minimal UI per `docs/DESIGN_GUIDE.md`.

## Problem

Maintainers lack a short, ranked backlog of **trust / API / performance** debt grounded in primary docs and code. Without it, work drifts to UI polish while gaps remain: incomplete safe-retry coverage, three list pagination dialects, Non-RLS ownership risk, and known perf follow-ups (bundle measure, shared cache, DB housekeeping).

## User / audience

- **Primary:** Maintainers / operators choosing the next hardening PR.
- **Secondary:** Spenders and caregivers who benefit when retries, ownership checks, and first-load stay correct and fast.
- **Not this pass:** End-user feature discovery, Baby chrome polish, new product apps.

## Outcome

What “done” looks like for **this run** (Decision 1 Option 3):

1. Ranked backlog of ~5–8 items under the **trust / API / perf** lens (Decision 2 Option 3).
2. Each item: user-job label (what it protects), size S/M (or L demoted), primary-source pointer, ship criteria for a **future** run.
3. Design records two ways to present the backlog; **no Build**, no Gate B/C, no merge.

## Metric

A maintainer can pick the next hardening PR in under five minutes from the ranked list without re-scanning ARCHITECTURE / PERFORMANCE / API docs.

## Sources (primary)

| Claim / topic | Primary source | Notes |
|---------------|----------------|-------|
| Pagination dialects + unify follow-up | `docs/ARCHITECTURE.md` | Explicit “not this PR” |
| Non-RLS tables + ownership rules | `docs/ARCHITECTURE.md` | `api_token`, `audit_event`, `user_preferences`, `workspace*`, `http_idempotency` |
| Idempotency-Key routes + contract | `docs/ARCHITECTURE.md`, `lib/http-idempotency.ts` | commit / `[kind]` / investment commit / members |
| Client Idempotency helper | `lib/idempotency-client.ts` | Prior ship; residual = other mutators |
| Hot REST mutators without key | `app/api/**/route.ts` | e.g. workspace create/reset, investment activities POST, members remove |
| Perf baselines + SSR rules | `docs/PERFORMANCE.md` | Kiosk “measure after change”; Insights ATF |
| Perf follow-ups (pooler/Redis/edge) | `docs/PERFORMANCE.md` Out of scope | Infra-sized |
| DB housekeeping SQL | `docs/PERFORMANCE.md` | `security_rate_limit`, `money_import_preview` |
| Partitioning watch list | `docs/PERFORMANCE.md` | Threshold-gated |
| Automation API surface | `docs/API.md` | GraphQL + REST + tokens |
| Baby Watch retry / `clientRequestId` | `docs/BABY_API.md` | quick-care idempotent; residual prune/retention |
| Feature layering | `docs/ADDING_A_FEATURE.md`, `AGENTS.md` | WorkspaceAppKey + registry |
| Token ownership filters | `lib/api-token-service.ts` | Filters by `userSub` |

## Has UI

**no** — deliverable is workflow docs (ranked backlog). No product chrome in this run.

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** N/A — backlog is documentation for maintainers; future ship runs set Has UI per item.

## 80/20 UI (day-to-day)

N/A — no UI

## Non-goals

- Building or merging any backlog item in this run.
- Baby / Money UI polish as ranking winners.
- Unifying all pagination dialects in one mega-PR without an S-scoped slice.
- PgBouncer / Redis / edge HTML cache (infra follow-ups — list as L/out-of-pick unless re-scoped).
- Replacing Pocket ID, Postgres, or design system.
- Closing Gate C for `app-improvement-discover-ship` (separate run).

## Assumptions to attack

- “Idempotency is done” after Money `[kind]` — other hot REST mutators may still be unsafe to retry.
- Pagination unify is automatically the #1 next PR (may be too large without an S slice).
- Non-RLS tables are “fine because services look correct” without audit tests.
- Perf follow-ups in PERFORMANCE.md are all equal priority (most are infra-sized).

## Success criteria

1. `01`–`04` deliver a ranked trust/API/perf backlog with sources and ship criteria.
2. Prior Idempotency ship is treated as **done** for Money import `[kind]` + wired UI callers; residual coverage listed separately.
3. Pipeline stops after Design (Decision 1 Option 3).
4. No production code changes in this run.

## Open questions

1. Prefer expanding REST Idempotency-Key vs Money GraphQL mutation retry safety next? (Default: REST first — contract already published.)
2. Allow one S-scoped “pagination dialect docs + adapter” vs full unify? (Default: S docs/adapter only if ranked.)
3. Cap backlog items at M for “pick next week”? (Default: yes — L goes below pick line.)

## Residual after prior Idempotency ship

Already covered (do not re-rank as #1): `POST /api/money/import/commit`, `POST /api/money/import/[kind]`, `POST /api/investment/import/commit`, `POST /api/workspace/members` + client helper on those UI callers (see `docs/ARCHITECTURE.md` Idempotency table; prior run `app-improvement-discover-ship`).

Likely residual mutators (to verify in Analyze): workspace create/reset, members remove, investment activities POST, import preview/abandon, Watch pair/redeem, tokens POST — and GraphQL mutations (different mechanism than REST header).
