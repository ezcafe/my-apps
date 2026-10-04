# Grill: trust-api-perf-suggest

**Result:** frontier-empty
**Updated:** 2026-10-04
**HITL:** auto (suggest-only run; Gate B N/A — user-first settle)

## Round 1 (frontier)

❓ **Q1** — **Recommended #1 for future ship:** residual REST Idempotency on investment activities vs DB housekeeping cron vs Non-RLS ownership tests?

➡️ Recommended: **Option 1 — Idempotency on `POST /api/investment/activities`** — user-first: prevents double journal lines on flaky retry; reuses published Idempotency contract + client helper.

---

❓ **Q2** — **Pagination unify placement:** S docs/adapter slice on pick list vs demote full unify as L?

➡️ Recommended: **Demote full unify to below pick line; optional S “document + client helper note” as Enhancement only** — user-first: avoids breaking clients; ARCHITECTURE forbids casual rename.

---

❓ **Q3** — **Baby quick-care prune vs REST residual order?**

➡️ Recommended: **REST residual #1; Baby prune #3–4** — user-first: Watch already has `clientRequestId` exactly-once; table growth is scale debt, not daily double-write.

## Scenario stress-test

1. **Flaky mobile create investment activity** — retry without key → two rows; with key → one + replay.
2. **Two pods, rate_limit rows never deleted** — housekeeping cron bounds growth.
3. **Stolen Bearer tries another user’s token id** — ownership tests must fail closed on `userSub`.

## Settled decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Future #1 recommendation | Investment activities Idempotency-Key | Trust + existing pattern |
| Pagination | Below pick / L | ARCHITECTURE constraint |
| Baby prune | Mid backlog | Scale, not daily double-write |
| Infra Redis/PgBouncer | Out of pick | PERFORMANCE out of scope |
| This run ship | None | Decision 1 Option 3 |

## Glossary / ADR

- No new glossary terms required (Idempotency-Key / Non-RLS already in ARCHITECTURE).
- No ADR (suggestions only; no hard-to-reverse choice shipped).

## Frontier

empty
