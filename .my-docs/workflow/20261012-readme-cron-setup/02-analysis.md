# Analysis: README cron setup (all features)

**Size:** Mode simple · docs-only

## Deep dive (required)

### Overall

#### What is this?
Operators need one README runbook to schedule every `POST /api/cron/*` job. Today only Money recurrence is covered; loans, investment quotes, and DB housekeeping live in scattered docs.

#### Why do we need this?
Without a host crontab guide, ops miss jobs (no push reminders, stale quotes, growing prune tables). Feature READMEs and `docs/API.md` do not replace a deploy runbook.

#### How to do this?
Expand README production §5 into an all-features cron guide; fix stale local `CRON_SECRET` wording; keep deep detail in linked docs.
- **Other ways:** Only update feature READMEs / `docs/API.md` (fails Metric — operators still chase many files).
- **Best practices:** Match live `lib/cron-auth.ts` + route inventory; host crontab (app has no cron); point out, don’t duplicate OpenAPI.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Fix local optional-secret lie; add four curls under current §5 | S / low | later |
| **2. Systemic fixes** | One § Cron jobs: shared auth + inventory + crontab + troubleshoot; fold Money notes | S / low | **yes ★** |
| **3. Creative / lateral** | New `docs/CRON.md` + README link only | S / medium discoverability | no |

- **★ Priority branch:** 2 Systemic — one README runbook (matches idea ★).
- **Map to Design:** Mode simple → one recommended design from branch 2. Quick win (auth wording) lands in same README edit. Branch 3 deferred / rejected.

### Solution pieces

#### Piece 1 — README cron runbook

##### What is this?
Replace Money-only §5 with shared pattern + four jobs.

##### Why do we need this?
Single place for schedule / auth / verify.

##### How to do this?
- Approach: Production section table + crontab block + short per-job notes; local section Bearer curls.
- Other ways: Append four jobs under old Money heading (weaker IA).
- Best practices: Align `docs/API.md` cron rows; host `curl -f`; secret out of world-readable crontab when possible.

#### Piece 2 — Auth accuracy (`CRON_SECRET`)

##### What is this?
Document `verifyCronRequest`: secret required all envs; missing → `503` `CRON_SECRET not configured`; bad Bearer → `401`.

##### Why do we need this?
README lines 39 and 124 contradict code (`optional locally`, `401 if unset`).

##### How to do this?
- Approach: Local + prod env tables say required; local curls include `Authorization: Bearer $CRON_SECRET`.
- Other ways: Leave stale text (blocks trust).
- Best practices: Same words as `docs/API.md` (“required all envs”).

## What exists today

Four cron routes share `verifyCronRequest` / `cronAuthResponse`. README covers only money-recurrence (prod crontab + local curl without Bearer). Deeper notes: `docs/API.md`, `docs/PERFORMANCE.md`, feature READMEs.

## Dependencies

- Docs only — no route/auth/OpenAPI changes.
- Keep Money recurrence behavior notes (at most one tx per template; no backfill).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `README.md` | Edit target (§ local Recurrence + §5 + env tables) |
| `lib/cron-auth.ts` | Auth truth |
| `app/api/cron/*/route.ts` | Four endpoints |
| `docs/API.md` | Cron table to mirror / link |
| `docs/PERFORMANCE.md` | Housekeeping detail link |
| `features/loans/README.md`, `features/investment/README.md` | Short cron mentions |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Host crontab + Bearer curl | README §5 today | Same shape for all four jobs |
| Point-don’t-duplicate | README → `docs/` | Keep runbook short |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| N/A — docs-only | — | No runtime change |

## Constraints and risks

- Stale README auth is Critical for operators if left unfixed.
- Inventing schedules as product locks — mark as **suggested** examples only.
- Do not imply in-container cron.

## Settled decisions (do not relitigate)

- Docs-only; Has API **no**; Has DB **no**.
- One README all-features cron section (fold Money §5).
- Auth: `CRON_SECRET` required **all** envs (code).
- Link `docs/API.md` / `PERFORMANCE.md` / feature READMEs for depth.
- Example schedules are operator suggestions, not code contracts.
- No automated tests (docs-only).

## Design tree (frontier)

### Settled
- Scope docs-only; four-route inventory; shared Bearer auth; fold §5; fix local/prod secret wording; host crontab pattern.

### Open frontier
- (empty)

### Blocked
- (none)

**Grill recommended?** no — frontier empty; Has API/DB no; Mode simple.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Auth code vs README | Compare `cron-auth` to README L39/L124 | Secret required; unset → **503** not 401 | Keep — must fix README |

## Blocking questions

None.

## Clear to grill / design?

yes — Grill skip (Notes); Design next.

## Flags for parent

- **Has API:** no
- **Has DB:** no
- **Verify commands:** cwd `/Users/ptquang86/ws/my-apps`; build/unit/e2e **N/A — docs-only README change**
- **Grill:** no → Notes `grill skipped — frontier empty; docs-only; Has API/DB no`
