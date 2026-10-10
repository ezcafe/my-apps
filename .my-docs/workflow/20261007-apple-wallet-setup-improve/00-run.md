# Workflow run: 20261007-apple-wallet-setup-improve

**Status:** done

**Mode:** full — invent which Apple Wallet setup/ops/product improvements matter; multi-surface (certs, PassKit WS, issue auth, settings, notify)

**Complexity:** complex — post-v1 review of existing PassKit channel vs ops friction, gaps vs WalletCast/Apple docs, prioritized improvements

**Slug:** `20261007-apple-wallet-setup-improve`

**Review profile:** full

**Lens plan:** security — Has API no · Has DB no; Settings copy / cert surface

**Run metrics (optional):**

| Metric | Value |
|--------|-------|
| design-review rounds | 2 |
| Gate B tier used | blocking |
| usage-limit inherit retries | several (Medium/High/Fast → inherit) |
| main-thread fallbacks | |
| deferred Enhancements count | Task 5 deferred + design-review Enhancements |

**Last stage:** Gate C · stop without git

## Resolved models

| Tier | Slug | Notes |
|------|------|-------|
| High | `claude-sonnet-5-5-high` | Analyze, Design, Update |
| Medium | `claude-opus-5-5-medium` | Ideation, Gate A, skim, Grill, design-review |
| Fast | `composer-2.5-fast` | Build, Fix, Smoke, Test, Merge; mechanical if Medium unavailable |

**Fallback:** High → Medium → Fast → `inherit` · Medium → Fast → `inherit` · Fast → `inherit`.

## Repo

- **Root:** `/Users/ptquang86/ws/my-apps`
- **Reference:** `/Users/ptquang86/Downloads/walletcast-main` (PassKit pattern only)
- **Prior run:** `.my-docs/workflow/apple-wallet-notifications/` (Status done; Gate C declined git)
- **Branch:** `main`
- **Started:** 2026-10-07T13:25:00Z
- **Last stage:** Gate C · stop without git
- **Has UI:** yes
- **Has API:** no
- **Has DB:** no
- **HITL Gate B:** blocking — approved Option 1 · Tasks 1–4 · Task 5 deferred
- **HITL Gate C:** blocking — human chose stop without git
- **04a:** run — planned unit + e2e in 04-tasks

## Orchestrator card (parent — avoid re-ingest)

| Field | Value |
|-------|-------|
| Phase | merge |
| Next step | none — pipeline stopped at Gate C (no git) |
| Task description | — |
| Stage id | — |
| stages.md section | — |
| Model tier | — |
| Prereq Result | full test success · review clean · Gate C stop |
| Artifact to check | — |
| Main-thread fallback | none |

## Gates

- [x] Gate A — Day-to-day + 80/20 (auto when `01a` Result ok)
- [x] Gate B — Design + tasks (+ tests if planned) approved — HITL: blocking · Option 1 · Tasks 1–4 (Task 5 deferred)
- [x] Gate C — Commit / push / PR / merge — **declined** (stop without git)

## Notes

- Goal: review existing Apple Wallet setup in my-apps; diagnose gaps; prioritize improvements (setup docs, ops, reliability, UX, security). Suggestions land in Design; Gate B picks what to ship.
- Do not reopen v1 Gate C; this is a new improvement run.
- Prior ADRs: `docs/decisions/ADR-001-apple-wallet-shared-channel.md`, `ADR-002-apple-wallet-issue-auth.md`.
- Grill settled: deployer-first safe classes; in-app cert notAfter; real-device Metric.
- Build: diagnose + Settings readiness + Help `#apple-wallet` + prop-driven UI tests; smoke-pass; review clean after A1 fix.
- Full test Round 2: e2e **1 passed / 3 skipped** (Apple off); jar refreshed 2026-10-08.

## Run log

- **13:25** · done · Step 0 — Classify + seed · Mode full · Review profile full · HITL Gate B blocking
- **13:25** · done · Step 1 — Ideation · usage-limit · Medium fail → wait 5s → Medium fail → inherit ok · Has UI yes · Core: opaque setup/ops
- **13:30** · done · Gate A · Result ok · auto-approved · inherit
- **13:35** · done · Step 1s — Skim · Result done · inherit
- **13:40** · done · Step 2 — Analyze · High fail → inherit · Has API no · Has DB no · Grill yes · ★ systemic readiness
- **13:50** · paused · Step 2g — Grill Round 1 · needs-round · wait Decisions 1–2 + Q3
- **13:56** · done · Step 2g — Grill · frontier-empty · human 1→1, 2→2, 3→1
- **13:56** · done · Step 3 — Design · Option 1 systemic Settings readiness · Has API no · Has DB no
- **14:00** · done · Design-review Round 1 · needs update · 2 Major
- **14:05** · done · Design Update · Majors closed
- **14:10** · done · Design-review Round 2 · clean
- **14:10** · done · Step 4a — TDD · needs more tests · Fix ask folded into 04-tasks
- **14:15** · paused · Gate B — blocking — approve Design Option 1 + tasks?
- **14:21** · done · Gate B · approved Option 1 · Tasks 1–4 · Task 5 deferred
- **14:21** · done · Step 4 — Build · Tasks 1–4 · 23 unit pass · typecheck pass · Task 5 deferred · inherit
- **14:35** · done · Step 4s — Smoke · smoke-pass · build+unit
- **14:40** · done · Review Round 1 · needs update · A1 Major
- **14:45** · done · Fix A1 · prop-driven UI tests
- **14:50** · done · Review Round 2 · clean
- **14:55** · paused · Full test · failure · e2e auth jar stale · wait human
- **06:04** · paused · Decision 4 Option 1 · refresh e2e auth jar (interactive Pocket ID)
- **06:05** · running · playwright codegen → e2e/.auth/user.json · waiting user sign-in
- **06:06** · done · e2e browser → Firefox only (`playwright.config.ts` + auth docs + seed script)
- **06:06** · running · firefox codegen → e2e/.auth/user.json · waiting user sign-in
- **06:08** · done · revert e2e browser → Chromium
- **06:11** · running · Full test e2e re-run · auth jar refreshed
- **06:12** · paused · e2e still /login · `e2e/.auth/user.json` mtime still 2026-09-07 (jar not rewritten)
- **06:19** · done · Full test Round 2 · success · e2e 1 pass / 3 skip (Apple off) · jar refreshed
- **06:19** · paused · Gate C — blocking — Approve commit + push + PR + merge?
- **06:23** · done · Gate C · stop without git · pipeline done
