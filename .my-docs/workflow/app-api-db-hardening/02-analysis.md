# Analysis: App-wide API + DB hardening

**Result:** done  
**Updated:** 2026-09-22  
**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.  
**Has API recommendation:** yes  
**Has DB recommendation:** yes

## Ranked findings (Design picks Build set)

| Rank | Severity | Finding | Paths |
|------|----------|---------|-------|
| 1 | Critical | Auth token rules disagree: Investment REST rejects non-`investment` API keys; Investment GraphQL reuses Money context (money keys work). Clients get different access by transport. | `lib/api-investment.ts` (lines ~63–68); `lib/api-auth.ts` `resolveInvestmentWorkspaceId` (allows money); `lib/graphql/finance-context.ts`; `app/api/graphql/investment/route.ts` |
| 2 | Critical | REST error envelopes mixed: many use `{ error, code }` JSON; rate limits / some 404s return plain text `new Response(...)`. Clients and agents cannot parse uniformly. | `lib/api-money.ts` helpers; vs `app/api/tokens/route.ts`, `app/api/workspace/timezone/route.ts`, `lib/graphql/http-handler.ts` 429/403 text |
| 3 | Major | Four near-copy feature API helpers (`unauthorized`/`badRequest`/… + `require*Context` + RLS wrapper). Drift already visible (Investment token check only in `api-investment`). | `lib/api-money.ts`, `lib/api-baby.ts`, `lib/api-loans.ts`, `lib/api-investment.ts` |
| 4 | Major | Investment REST list/mutate routes have CSRF helpers but **no** `enforceRateLimit` (Money import + workspace do). | `app/api/investment/activities/route.ts`, `app/api/investment/activities/[id]/route.ts`, import routes under `app/api/investment/import/**` |
| 5 | Major | Multi-step Money import commit opens **three** separate `withMoneyWorkspaceRls` transactions (preview read → commit → delete preview). Commit can succeed while cleanup fails; not one atomic unit. | `app/api/money/import/commit/route.ts` |
| 6 | Major | List pagination contracts differ: Money `page`/`pageSize` + composite cursor; Investment/Savings `limit`/`cursor` uuid; Baby GraphQL `limit` max 100. Hard for shared clients. | `lib/validators/money.ts`, `lib/validators/investment.ts`, `lib/validators/savings.ts`, `lib/validators/baby.ts` |
| 7 | Major | Validation feedback uneven: workspace/tokens join Zod issues; Investment often returns opaque `"Validation failed"` / `"Invalid query"`. | `app/api/workspace/members/route.ts` vs `app/api/investment/activities/route.ts` |
| 8 | Enhancement | No HTTP `Idempotency-Key` on mutating REST (import commit, pay, member add). Domain “idempotent” helpers exist only for seed/preview delete. | `app/api/money/import/commit/route.ts`; contrast `lib/money-seed-defaults.ts` |
| 9 | Enhancement | System/user tables without workspace RLS (`api_token`, `audit_event`, `user_preferences`, `workspace*`) rely on app filters — OK today; document + keep ownership checks tight. | `db/migrations/0007_api_token.sql`, `0010_audit_event.sql`, `0035_user_preferences.sql` |
| 10 | Enhancement | Array `ANY(${x}::uuid[])` absent; money `SUM` uses `::bigint` in loans; ESLint guards in place. Keep as regression bar, not Build work unless new violations. | `eslint.config.mjs`; `lib/loans-services/loans.ts`; `AGENTS.md` |

**Build bound (recommended):** ship ranks **1–5** (Critical + top Major). Defer 6–8 unless Design expands scope. Leave 9–10 as docs/lint hygiene.

## Deep dive (required)

### Overall

#### What is this?
Whole-app audit of REST + GraphQL contracts and Drizzle/postgres.js usage, then a **bounded** harden pass (not a rewrite). Surfaces: `app/api/**`, `lib/api-*.ts`, `lib/validators/**`, `lib/graphql/**`, `db/`.

#### Why do we need this?
Inconsistent errors, auth, rate limits, and transaction boundaries cause client bugs, uneven abuse protection, and cross-feature drift. Skipping leaves Critical auth/error mismatches in place while new features copy the wrong helper.

#### How to do this?
**Decision 1 — delivery shape**

##### Option 1 — Shared contract kit, then patch hot paths (recommended)
**What it is:** Extract one REST error + rate-limit helper; align token/app-key rules once; fix Investment auth + rate limits + import tx; keep GraphQL `mapServiceError` as the GQL bar.  
**Example:** `lib/api-http.ts` → `{ error, code }` for 4xx/429; `requireInvestmentContext` matches `resolveInvestmentWorkspaceId`; one `runInWorkspace` around import commit+cleanup.  
**Pros:** High impact, small diff, matches Mode simple + “top Critical/Major only”.  
**Cons:** Does not fully unify pagination or every workspace route in one PR.  
**Recommendation:** **Pick Option 1.**

##### Option 2 — Feature-by-feature full rewrite
**What it is:** Normalize Money → Investment → Loans → Baby → workspace end-to-end (pagination, idempotency, every route).  
**Example:** Single OpenAPI-style contract for all lists before any code.  
**Pros:** Cleanest long-term.  
**Cons:** Boil-the-ocean; breaks Mode simple / non-goal “no full rewrite”.  
**Recommendation:** Reject for this run; park as follow-up.

- **Other ways:** Lint/docs-only (no runtime fix) — fails user Decision “implement through merge”.
- **Best practices:** Repo first — `require*Context` + `runInWorkspace`/`with*WorkspaceRls`, Zod in `lib/validators`, GraphQL `mapServiceError`, ESLint array/`SUM` rules (`AGENTS.md`, `docs/ARCHITECTURE.md`). Industry — stable error codes, same auth across transports, rate-limit mutating routes, single transaction for multi-step writes.

### Solution pieces

#### 1. REST error + rate-limit envelope

##### What is this?
One JSON shape `{ error, code }` (and optional `details`) for 400/401/403/404/409/429/503; stop plain-text 429/404 on session routes.

##### Why do we need this?
Clients and agents cannot branch on `code` when body is raw text (`tokens`, timezone 404, GraphQL HTTP 429).

##### How to do this?
- **Approach:** Shared helpers used by workspace/tokens/Money/Investment; keep GraphQL HTTP text only if Design documents “transport layer ≠ JSON API” — prefer JSON there too for 429/403.
- **Other ways:** Wrapper middleware only — heavier for App Router.
- **Best practices:** Match existing `lib/api-money.ts` codes; GraphQL already uses `extensions.code` via `lib/graphql/map-service-error.ts`.

#### 2. Auth / workspace scoping consistency

##### What is this?
Align API-token app-key rules across REST vs GraphQL vs `resolve*WorkspaceId`; keep Baby session-only; cron via `lib/cron-auth.ts`.

##### Why do we need this?
Rank 1: money token works on Investment GraphQL, fails Investment REST — silent product bug for automation.

##### How to do this?
- **Approach:** Pick one rule (recommend: money token may access Investment/Savings REST **or** GraphQL must reject money-only for investment — Design must choose; do not leave split). Document Baby no API key (`lib/api-baby.ts`).
- **Other ways:** Separate investment-only keys forever + update GraphQL to match REST (stricter).
- **Best practices:** `docs/ARCHITECTURE.md` workspace cookie + `assertWorkspaceAppAccess`; one resolver of truth in `lib/api-auth.ts`.

#### 3. Shared `require*Context` + less duplication

##### What is this?
Collapse duplicated unauthorized/forbidden/db_unavailable + RLS wrappers; keep thin feature facades if needed.

##### Why do we need this?
Rank 3 drift; four copies of the same ~120 lines.

##### How to do this?
- **Approach:** Core `lib/api-http.ts` + `lib/api-workspace-context.ts`; feature files re-export.
- **Other ways:** Leave copies; add tests only — weaker.
- **Best practices:** Prefer repo Money pattern as template (`lib/api-money.ts`).

#### 4. DB transaction / RLS hygiene on multi-step writes

##### What is this?
One `runInWorkspace` (or nested work on same tx) for import commit+preview delete; avoid accidental N+1 in new loops; keep `withBypassRls` for cron only.

##### Why do we need this?
Rank 5 partial failure; RLS set_config is per transaction (`db/index.ts`).

##### How to do this?
- **Approach:** Single RLS callback for commit path; service owns tx. Keep ESLint `SUM`/`ANY` rules.
- **Other ways:** Compensating delete job — more moving parts.
- **Best practices:** `withDbTransaction` / `runInWorkspace` in `db/index.ts`; loans pay already uses `withDbTransaction` (`lib/loans-services/pay.ts`).

#### 5. List contract + validation message quality (bounded)

##### What is this?
Document current pagination dialects; optionally align Investment REST validation messages with workspace (join Zod issues). Full cross-app pagination unify = follow-up.

##### Why do we need this?
Ranks 6–7 hurt shared clients and debugging; full unify is large.

##### How to do this?
- **Approach:** In Design contracts, table the dialects; Build only: Investment Zod messages + rate limits. Defer renaming `pageSize`→`limit` unless parent expands scope.
- **Other ways:** Big-bang rename all list APIs — high churn.
- **Best practices:** Keyset cursors already preferred for Money occurredAt; Baby limit max 100.

## What exists today

Next.js App Router APIs: GraphQL for Money/Loans/Investment/Savings/Baby (`app/api/graphql/**` + Yoga handlers); REST for workspace, tokens, preferences, Money/Investment import, Investment activities, cron, telegram. Auth: session + API tokens (`lib/api-auth.ts`). DB: Drizzle + postgres.js `prepare: false`, workspace RLS via `app.workspace_id` (`db/index.ts`). Validators under `lib/validators/**`. ESLint blocks bad array binds and `SUM(...)::int`.

## Dependencies

- Must stay compatible: existing GraphQL clients, Money bootstrap SSR (`lib/money-ssr-seed.ts`), cron secrets, API token prefixes (`mny_`/`sav_`/`inv_`).
- Changing Investment token rules may break or unlock external scripts — Design must state migration.
- No UI (Has UI: no); client types may still need regenerating if contracts change.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/api-money.ts` / `api-investment.ts` / `api-baby.ts` / `api-loans.ts` | Context + error helpers to unify |
| `lib/api-auth.ts` | Token resolve + workspace ID rules |
| `lib/graphql/map-service-error.ts` | GQL error allowlist bar |
| `lib/graphql/http-handler.ts` | CSRF + rate limit for GraphQL HTTP |
| `app/api/money/import/commit/route.ts` | Multi-tx RLS example to fix |
| `app/api/investment/activities/route.ts` | Missing rate limit + weak validation messages |
| `db/index.ts` | `runInWorkspace` / `withBypassRls` |
| `eslint.config.mjs` | Array + SUM guards |
| `docs/ARCHITECTURE.md` | Workspace / feature layering |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| `require*Context` + `with*WorkspaceRls` | `lib/api-money.ts` et al. | Canonical REST auth + RLS |
| Zod validators per domain | `lib/validators/*` | Shared input contracts |
| `mapServiceError` | `lib/graphql/map-service-error.ts` | Stable GraphQL codes |
| `readJsonBounded` + `assertSameOriginStrict` | `lib/request-guards.ts` | Payload + CSRF for session writes |
| `enforceRateLimit` | `lib/rate-limit.ts` | Abuse control already on Money/workspace |
| postgres.js-safe queries | `AGENTS.md` + ESLint | Prevent 22P02 / 22003 |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Shell vs feature API namespaces | `docs/ARCHITECTURE.md`, `app/api/{money,investment,workspace,graphql}` | Keep hardening inside existing boundaries |
| Workspace RLS request path | `db/index.ts` `runInWorkspace` | Trust boundary for tenant data |
| Dual auth (session + API token) | `lib/api-auth.ts` | Same product, two clients — must share rules |
| Cron bypass RLS | `withBypassRls` + `lib/cron-auth.ts` | Separate privilege domain |

## Constraints and risks

- Mode **simple**: one recommended design; Build only ranked Critical/Major.
- Do not rewrite all routes or change business rules without need.
- Auth rule flip (money↔investment tokens) is a **breaking** contract — need explicit Design choice + tests.
- Nested RLS transactions increase pool use and partial-failure risk under load.

## Settled decisions (do not relitigate)

- Whole-app audit surface (`app/api`, validators, `db/`).
- Implement top Critical/Major through merge (not audit-only).
- Has UI: **no**.
- Has API / Has DB: **yes** / **yes** (confirmed by Analyze).
- postgres.js: no JS-array `ANY(...::type[])`; no `SUM(money)::int`.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Array bind scan | Confirm no `ANY(${ids}::uuid[])` | None in tree | Discard — already clean |
| SUM::int on money | Confirm AGENTS rule held | Loans use `::bigint`; counts use `::int` | Keep lint vigilance only |
| Investment token matrix | Session / money key / inv key × REST × GQL | REST stricter than GQL | Keep — drives Decision in Design |

## Blocking questions

1. **Investment API keys:** Should money tokens access Investment REST (match GraphQL), or should GraphQL reject money tokens for Investment (match REST)?
2. **Build set:** Confirm ranks **1–5** for Gate B (or name a different top-N).
3. **Pagination:** Document-only this run, or include Investment validation-message polish only (recommended)?
