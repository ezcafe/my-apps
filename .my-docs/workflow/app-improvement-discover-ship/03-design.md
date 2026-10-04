# Design: app-improvement-discover-ship

**Mode:** full  
**Has UI:** yes (discovery; ship item may refine)  
**Has API:** **yes** — additive optional `Idempotency-Key` on Money legacy `[kind]` import (Decision 6 → backlog #1)  
**Has DB:** **no** — reuse `http_idempotency`  
**Ship pick:** Decision 6 → Option 1 — backlog #1 Safe retry Idempotency  
**ADR:** skipped (Grill)

## Locked grill picks (do not reopen)

| Topic | Pick |
|-------|------|
| Tie-break | Spender (Money / Loans) first |
| Baby API tokens | Demoted below daily UI / spender trust |
| Ship size | S/M only |
| Gate C paperwork | Excluded from product backlog |
| Delivery | Discover → human picks **one** → ship in this run |

## Decision 1: how to hand off discovery → ship?

### Option 1 — Ranked backlog + ready tasks for recommended #1 (recommended)

**What it is:** Publish a short ranked backlog. Fully specify System design + `04-tasks` for the **recommended** ship slice. If the human picks another item, update `03`/`04` for that slice before design-review.

**Example:** Backlog ranks “safe retry imports/members” #1 with Tasks 1–4; human can still pick Kiosk perf #3 and we rewrite tasks.

**Pros:** Fastest path if recommendation accepted; still allows a different pick; honors Option 2 delivery.

**Cons:** Extra rewrite if the human rejects #1.

### Option 2 — Backlog only; design ship slice after pick

**What it is:** Design stops at ranked list + criteria; no ship tasks until Decision 6.

**Example:** Design-review waits; after pick, a second Design pass fills contracts/tasks.

**Pros:** No wasted task writing.

**Cons:** Extra round-trip before design-review; slower ship.

### Recommendation

**Pick Option 1** — user-first: lands a spender trust win sooner when the recommendation is accepted; still allows override.

## Ranked backlog (vital few)

Score: spender-first · daily pain · S/M only · demote Baby API · exclude Gate C-only.

| # | Item | Size | Job | Why now |
|---|------|------|-----|---------|
| **1 (recommended)** | **Safe retry: Idempotency-Key on live import/member writes** | S–M | Import Money CSV / Investment statement / add member without double-apply on flaky retry | Server already has `lib/http-idempotency` on Money **commit**, Investment commit, members POST — but Money UI uses **legacy** `/api/money/import/[kind]` (no idempotency), and Investment + members clients **never send** the header |
| 2 | Kiosk first-load measure + slim if regressed | S | Fast household glance | PERFORMANCE.md still “measure after change” |
| 3 | Money cold-path empty/Help copy pass | S | New spender orientation | Empty ≠ error already exists; tighten cold copy only |
| 4 | Baby `quick_care_request` prune/retention | S–M | Trust at scale | Documented follow-up; demoted vs spender |
| 5 | Baby personal API token (`bby_` + Settings) | M | Automation | Demoted by Grill; keep on backlog |
| — | Full pagination unify | L | API clients | **Out of pick list** until re-scoped to one dialect S slice |
| — | Close Gate C paperwork | — | Maintainer | **Excluded** |

**Already shipped (not candidates):** Settings single-pane + skeleton; grouped drawer + Other apps; Loans Insights urgency; Baby ChartShell on hydration (and related Insights work on `main`).

## Ship criteria (for Decision 6)

1. One clear user job.  
2. Size S or M.  
3. Reuses existing patterns (no new feature app).  
4. Honest Has UI / Has API / Has DB.  
5. Testable in one PR.

## Chosen design (for recommended #1)

**Safe retry slice** (Decision 6 locked):

1. Add shared client helper to mint ≤128-char `Idempotency-Key` and attach header on JSON POSTs.  
2. Wire helper on: Investment import commit, workspace members **POST** (add member).  
3. Add server idempotency to Money legacy `POST /api/money/import/[kind]`:
   - Use `readJsonBoundedWithRaw` (raw body for hash).
   - Validate `{ rows: array }` **before** claim (no claim on bad JSON/shape).
   - `actor.route` = ``POST /api/money/import/${kind}`` (kind in route id — keys do not collide across kinds).
   - `beginIdempotencyRequest` / complete / abort like Money commit.
   - Optional header; absent = unsafe retry.
4. Wire helper on Money CSV wizard import fetch.  
5. Document the legacy route in `docs/ARCHITECTURE.md` Idempotency table.  
6. Unit/route tests: key sent; replay header; absent key still works; key >128 → 400.
7. Client on **409** `idempotency_in_progress` / `idempotency_body_mismatch`: show existing error toast via `toUserFacingMessage` / response `error` — do not treat as success; user can retry with a **new** key.

**Non-goals for #1:** Migrate Money wizard to preview+commit; members PATCH/remove; GraphQL mutations; Baby tokens.

## System design

### Overview

- **What it is:** Optional Idempotency-Key on hot REST writes so a retry replays the first success instead of double-importing / double-adding a member.
- **Boundaries:** Browser wizards/panels → Next route handlers → existing `lib/http-idempotency` + Postgres `http_idempotency`. No new tables.
- **Data flow:** Client mints key per user attempt → POST with header + body → claim/replay/409 per existing library → UI treats success (including replay) as done.
- **Consistency:** Same as current commit routes (24h TTL, body hash match).
- **Why this shape:** Reuse hardened library; fix the gap where UI never opts in and Money UI misses the protected route.
- **Best practices:** Validate body before claim (Money commit pattern); never log response bodies; redacted replay payloads.
- **Anti-patterns:** New idempotency stack; forcing keys on all GraphQL; renaming pagination dialects in this slice.
- **Reference:** `docs/ARCHITECTURE.md` Idempotency-Key; `lib/http-idempotency.ts`; commit routes.

### Concept 1 — Opt-in header, same semantics everywhere

- **What:** Optional `Idempotency-Key` ≤128; absent = one-shot unsafe retry.
- **How:** `beginIdempotencyRequest` on legacy Money kind route; client helper on three UI POSTs.
- **Why:** Matches published contract; no breaking change.
- **Best practices:** One key per user gesture; regenerate on intentional second import.
- **Reference:** Money/Investment commit routes.

## Sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant UI as WizardOrMembersPanel
  participant H as newIdempotencyHeaders
  participant API as REST route
  participant Id as http_idempotency
  participant DB as Domain write

  U->>UI: Confirm import / Add member
  UI->>H: mint key for this attempt
  UI->>API: POST + Idempotency-Key + JSON body
  API->>Id: beginIdempotencyRequest
  alt replay
    Id-->>API: prior status + body
    API-->>UI: 200 + Idempotency-Replayed
    UI-->>U: Success toast (same as first success)
  else in_progress or body_mismatch
    Id-->>API: conflict
    API-->>UI: 409 + code
    UI-->>U: Error toast (not success); next attempt new key
  else claimed
    API->>DB: perform write
    API->>Id: complete claim
    API-->>UI: 200 success
    UI-->>U: Success toast
  end
```

## API contracts (recommended #1)

| Route | Change |
|-------|--------|
| `POST /api/money/import/[kind]` | **Add** optional `Idempotency-Key`; raw-body claim; validate `{ rows }` before claim; route id includes `kind`; response JSON stays `{ data: { created } }` |
| `POST /api/investment/import/commit` | Unchanged server; **client sends** header |
| `POST /api/workspace/members` | Unchanged server; **client sends** header on add |
| `POST /api/money/import/commit` | Unchanged (already idempotent; no UI caller today) |

No request/response JSON field changes. Conflict responses stay **409** with codes `idempotency_in_progress` / `idempotency_body_mismatch` (existing library). Key >128 → **400**. Absent key → one-shot success, no durable claim.

## Database contracts

**N/A** — reuse `http_idempotency` (`0042_http_idempotency`). No migration.

## Example queries

N/A for product reads. Library already claims/completes via Drizzle on `http_idempotency`.

## Design patterns used

### Pattern 1 — Shared HTTP idempotency library

- **What:** One claim/replay helper for hot REST routes.
- **How:** Call `beginIdempotencyRequest` / `completeIdempotencyClaim` from legacy Money kind route.
- **Why:** Avoid a second idempotency design.
- **Best practices:** Validate before claim; route id string stable.
- **Anti-patterns:** Per-route custom tables.
- **Reference:** `lib/http-idempotency.ts`

### Pattern 2 — Client header helper

- **What:** Small pure helper builds headers with Content-Type + Idempotency-Key.
- **How:** Wizards/panels call it once per attempt.
- **Why:** Unit-testable; one place for max length.
- **Best practices:** `crypto.randomUUID()` or equivalent; trim ≤128.
- **Anti-patterns:** Hard-coding keys; reusing key across different bodies.
- **Reference:** New `lib/idempotency-client.ts` (name flexible)

## UI / UX / mobile (recommended #1)

- **Build must match:** No new chrome. Success toast unchanged when `Idempotency-Replayed` is present.
- **#1 visible job:** Import / add member still the primary CTA (unchanged).
- **#2:** Existing busy/disabled while request in flight (keep; prevents double-tap where already present).
- **Mobile:** Same wizards; header is invisible infrastructure.
- **Skeleton:** N/A — no layout change. If any busy spinner exists, leave as-is.

## OWASP (recommended #1)

| Top 10 | Notes |
|--------|-------|
| A01 Broken Access Control | Re-run auth/workspace checks before replay (existing library contract) |
| A02 Cryptographic Failures | N/A — no new secrets |
| A03 Injection | JSON + Zod/validate as today; key is opaque string ≤128 |
| A04 Insecure Design | Opt-in header; absent stays unsafe (documented) |
| A05 Security Misconfiguration | Do not log response bodies |
| A06 Vulnerable Components | N/A |
| A07 Auth Failures | Session/token gates unchanged |
| A08 Data Integrity | Body hash mismatch → 409 |
| A09 Logging Failures | No `response_body` in logs |
| A10 SSRF | N/A |

## Aggressive challenges

- Why not migrate Money UI to preview+commit only? — Larger IA change; out of S/M unless separate pick.
- Why not GraphQL idempotency? — Different stack; Baby/Money GQL already have request ids in places; out of scope.
- Is Settings polish still a candidate? — **No** — single-pane + skeleton already on `main`.

## If Decision 6 picks another item

Update this file’s Chosen design / System design / contracts / UI / OWASP and rewrite `04-tasks.md` for that item before design-review. Keep the Ranked backlog table.
