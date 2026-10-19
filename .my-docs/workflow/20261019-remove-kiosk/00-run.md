# Workflow run: 20261019-remove-kiosk

## Required

**Status:** paused

**Mode:** full

**Complexity:** full kiosk feature teardown — routes, UI, lib, prefs API, layout schema migration, e2e; supersedes in-flight kiosk widget work

**Slug:** `20261019-remove-kiosk`

**Review profile:** full

**Lens plan:** api+db

**Pending parallel:** none

**Verify commands:**
- **cwd:** `/Users/ptquang86/ws/my-apps`
- **build:** `npm run build`
- **unit:** `npm test`
- **e2e:** `npm run test:e2e -- e2e/apple-wallet-settings.spec.ts e2e/loans.spec.ts e2e/workspace-member-app-grants.spec.ts e2e/money.spec.ts e2e/investments.spec.ts`

**Last Verify:** verify-pass
**Last verify-pass at:** 2026-10-19T03:15Z
**Verify attempts:** 1

**Gate B veto:** none

**Gate B approved:** Option 1

**Gate C approved:** none

**Last stage:** gate-c — await named commit/push/PR/merge; e2e waived via gate-c-test-override

**Run metrics:**
- Task count: 23
- verify-fail count: 0
- main-thread fallbacks: 0
- design-review rounds: 1
- review fix rounds: 1
- smoke↔fix / test↔fix rounds: 2
- Gate B HITL / Grill HITL: blocking / async-notify
- inherit retries: 23

## Optional / when known

### Resolved models

| Tier | Slug | Notes |
|------|------|-------|
| High | claude-sonnet-5-5-high | Analyze, Design, Update |
| Medium | claude-opus-5-5-medium | Ideation, Gate A, skim, Grill, design-review, full mechanical |
| Fast | composer-2.5-fast | Build, Fix, Smoke, Test, Merge |

**Resolve:** From Task allowlist; soft preferred hints matched.

**Fallback:** High → Medium → Fast → `inherit` · Medium → Fast → `inherit` · Fast → `inherit`.

**Fast-on-simple:** Mode full → Medium when available for mechanical.

### Repo

- **Root:** `/Users/ptquang86/ws/my-apps`
- **Branch:** `main`
- **Started:** 2026-10-19T02:22Z
- **Has UI:** yes
- **Has API:** yes
- **Has DB:** yes
- **Has auth/PII/schema:** yes
- **HITL Gate B:** blocking
- **HITL Grill:** async-notify
- **HITL Gate C:** blocking
- **04a:** run
- **Smoke:** smoke-pass (re-run)

### Orchestrator card (parent — avoid re-ingest)

| Field | Value |
|-------|-------|
| Phase | paused |
| Stage id | gate-c |
| Next step | Gate C ask — commit / push / PR / merge |
| Task description | n/a — await Gate C yes |
| stages.md section | hitl-gate-c.md |
| Model tier | n/a |
| Prereq Result | gate-c-test-override + provenance (e2e waive) |
| Last Verify | verify-pass |
| Verify attempts | 1 |
| Gate B veto | none |
| Artifact to check | 06-test-log.md (failure waived) |
| Design backloop | none |
| Main-thread fallback | none |

### Gates

- [x] Gate A — Day-to-day + 80/20 (auto when `01a` Result ok)
- [x] Gate B — Design + tasks (+ tests if planned) — HITL: blocking — Option 1
- [ ] Gate C — Commit / push / PR / merge — **always blocking**

### Notes

- Abort / scope-change: Status `stopped` + frozen stage + reason
- Decision N Option 2 — full feature teardown (user: "2")
- User ask: remove kiosk page — we don't need it anymore
- Scope: routes + nav + components/kiosk + lib/kiosk + settings UI + prefs validators/API + drop layout columns migration + e2e + related ADRs/docs as needed
- Supersedes paused run `20261019-kiosk-widget-edit-menu` and other in-flight kiosk WIP for product direction (do not continue that Gate B)
- Large uncommitted kiosk WIP on main — Design must inventory keep vs delete vs discard
- Status `done` only after Merge Result success **and** `merge` ∈ Gate C approved
- Calibration (strongly recommended after `done` — lint warn, ≤3 lines): Mode OK? · Review profile OK? · Biggest friction stage? — append same lines to `.my-docs/workflow/_calibration.md`
- usage-limit retry — ideation — Medium waited 5s then retry; still limited → inherit ok
- Has UI yes (from 01-idea.md)
- usage-limit — gate-a — Medium skipped (prior limit); inherit ok
- Gate A auto-approved — 01a Result ok
- Verify commands confirmed from 02-skim (cwd/build/unit/e2e unchanged)
- clarity-check ok — analyze
- Analyze: Has API/DB/auth yes confirmed; ★ systemic teardown; Grill yes (redirect)
- clarity-check ok — grill
- Grill digest: permanent `/kiosk`→`/money`; ADR-006; glossary purged; weather bookmarks→`/money`
- clarity-check ok — design
- Design recommends Option 1 (systemic teardown); Has API/DB/auth yes; 04a will run
- lint H1 parallel skip patched locally in lint_core (writing_isolated) for api∥db first launch
- api-contract-review R1 needs update (prefs empty bag / retire route; Task 1 accept)
- db-design-review R1 needs update (DROP TABLE user_preferences end-state)
- design-update R1: prefs API → retire route (not empty bag); DB → DROP TABLE; Task 1/3 + contracts/sequence aligned; 03a Round notes appended
- design-review Result clean (Round 1)
- clarity-check ok — tdd-review
- 04a needs more tests → parent folded Majors into 04-tasks TDD bullets
- Gate B digest posted — awaiting Option 1 yes
- provenance — gate-b-approved — user: "yes Option 1, go build"
- clarity-check ok — build
- usage-limit retry — build — Fast waited 5s; still limited → inherit ok
- Build verify-pass — Option 1 teardown; Smoke Build-writes-Smoke; e2e baby collateral reds noted
- smoke-pass (re-run)
- adversarial R1 needs fix — Major kiosk-redirects permanent binding
- clarity-check ok — fix-review
- Decision N Option 1 — narrow e2e for this run (user: "Narrow e2e for this run") — exclude baby-care + baby-home-option-b; keep apple-wallet/loans/workspace-grants/money/investments
- Abort / scope-change: Status `stopped` — Decision N Option 4 (user: "4"); frozen at test-full R2 (narrowed e2e Loans/Money red). Draft teardown code remains on disk; no Gate C / merge. Resume needs new Decision or new slug.
- Resumed from stop — Waive Gate C e2e
- gate-c-test-override
- provenance — gate-c-test-override — user: "Do Waive Gate C e2e — explicit gate-c-test-override + your quote, then Gate C."

### Run log

- **09:22** · running · step-0 · Mode full + profile full — Option 2 full teardown; seeded Pending parallel api|db
- **09:25** · running · ideation · 01-idea.md drafted (inherit); Next gate-a
- **09:27** · running · gate-a · Result ok; Next skim
- **09:29** · running · skim · Result done; Next analyze
- **09:32** · running · analyze · 02-analysis.md; Next grill
- **09:33** · running · grill · frontier-empty; Next design
- **09:35** · running · design · 03+04 written Option 1; Next api∥db
- **09:38** · running · api∥db · both needs update; Pending parallel none; Next design-update
- **09:39** · running · design-update · R1 prefs retire + DROP TABLE; Next api∥db R2
- **09:41** · running · api∥db · R2 both clean; Next design-review
- **09:44** · running · design-review · Result clean; Next tdd-review
- **09:46** · paused · gate-b · blocking — await Option 1 approve
- **09:49** · running · gate-b · parent consent write — gate-b-approved Option 1
- **09:49** · running · build · launch after Gate B Option 1
- **10:08** · running · build · verify-pass + Smoke; Next smoke re-run (E1)
- **10:09** · running · smoke · smoke-pass (re-run); parent consent write — smoke-pass-rerun
- **10:12** · running · adversarial · needs fix; Next fix-review
- **10:23** · running · fix-review · verify-pass; Next adversarial R2
- **10:25** · running · adversarial · R2 clean; Next quality
- **10:26** · running · quality · clean; Next lens-api∥lens-db
- **10:28** · running · lens-api∥lens-db · both clean; Next merge-findings
- **10:29** · running · merge-findings · clean; Next test-full
- **10:34** · paused · test-full · e2e exit 1 — 13 baby fails / 91 pass; kiosk teardown not implicated; await Decision N
- **10:35** · running · test-full · Decision N Option 1 — re-run with narrowed e2e
- **10:51** · paused · test-full · R2 failure — narrowed e2e 7 fail (Loans/Money); await Decision N
- **10:58** · stopped · test-full · Decision N Option 4 — user stop; no Gate C
- **11:00** · paused · gate-c · parent consent write — gate-c-test-override; await Gate C named actions
