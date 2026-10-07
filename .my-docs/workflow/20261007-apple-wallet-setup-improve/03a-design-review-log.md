# Design review log: 20261007-apple-wallet-setup-improve

**Result:** clean
**Round:** 2
**Updated:** 2026-10-07

**Isolated reviews (parallel-safe):** Has API = no → API contract review **skipped**. Has DB = no → DB design review **skipped**. Overall clean requires those skipped + this log clean.

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | glossary-adr | Grill Domain modeling lists `GLOSSARY.md` for Channel readiness + Wallet UI status; Design uses those terms; `04-tasks.md` has no glossary update. | Add a small task (or Task 2/3 bullet) to update `GLOSSARY.md` with the two terms. |
| Enhancement | tasks | Metric (Grill Q3 / Design) includes real iPhone **active**; checkpoints only cover Settings light/dark + e2e copy — no Gate B / manual real-device proof. | Add checkpoint or Gate B note: reach **active** on a real device with HTTPS + Pass Type ID certs (or explicitly narrow Metric if deferred). |
| Enhancement | design | Expired → UI blocks Add while `appleEnabled` may stay true; Design says document that issue may still fail if called elsewhere — no task updates the setup doc with that rule. | Add a short setup-doc bullet (Task 3 or Task 5) for expiry vs enable vs Add vs issue. |
| Enhancement | diagram | Sequence covers load → Add gate; thin on pending checklist and diagnose failure alts (`signer_expired`, bad PEM). | Optional: add alt/opt fragments for expired + pending cues (not required for Has API no). |
| Enhancement | security-owasp | A09 “prefer server warnings”; Task 5 is optional — Gate B can drop logs while table still says pass. | Either mark Task 5 in-scope for this pass, or soften A09 note to “optional logs; UI safe classes are the control.” |
| Nit | practice | `00-run.md` Lens plan still “expect api+db+security if Build ships…” while Has API/DB = no and Chosen design adds neither. | Parent: set Lens plan to security (and ui) unless scope expands. |
| Nit | ui-ux | Help sections today use `help-*` ids (`help-quick-start`, …); Design locks `id="apple-wallet"`. Hash works either way. | Optional: use `id="help-apple-wallet"` + href `/help#help-apple-wallet` for Help id consistency (only if changing both Design + tasks together). |

## Fix ask for my-dev-flow-design

_(none — zero Critical / Major)_

## Round notes

- **API / DB:** Skipped per `00-run.md` Has API no / Has DB no; Design Contracts match; no health-route drift from rejected Option 2.
- **Round 1 Majors — closed:**
  1. **Setup-guide href:** `03-design.md` locks shippable `APPLE_WALLET_SETUP_GUIDE_HREF = "/help#apple-wallet"` + thin Help `#apple-wallet` section (not bare `docs/…`). Matches existing Settings → `/help` for API tutorial. `04-tasks.md` Task 3 (+ Task 4 href assert) acceptance proves navigation / hash target. Repo has `lib/apple-wallet/constants.ts` and Help via `components/api-help.tsx` — Build path is real.
  2. **Healthy-env rule:** Design **Healthy-env rule (locked)** — fully healthy → `reasons` exactly `["ready"]`; empty forbidden; blocker/warn XOR `ready`. Task 1 + Task 3 ready-props acceptance aligned; no “ready or empty blockers” fork remains.
- **Alignment:** Gate A #1/#2 honored (Add when `healthyForAdd`; expired → not Add is Grill lock, not abandonment). Grill Settled reflected. System design + Design patterns teach. OWASP table present. Skeleton parity in Design + Task 3. Problem map / Analyze deep dive + Solution branches / Grill frontier-empty OK.
- **Deferred Enhancements:** glossary task; real-device Metric checkpoint; setup-doc expiry/issue note; sequence alts; Task 5 vs A09; Lens plan nit; optional Help id prefix nit.
- **Critical count:** 0 · **Major count:** 0 · **Deferred Enhancement count:** 5 (+ 2 Nit)

### Round 1 (prior — needs update)

**Result was:** needs update · Critical 0 · Major 2 (setup-guide href; ready XOR empty blockers). See findings table history in git if needed.

### Round 2 — design-update verification (this round)

**Updated:** 2026-10-07 · Verifier · fresh context · no production code · did not author 01–04

Verified Fix ask items applied in Design + tasks. No new Critical/Major from general design-review checks. **Result: clean.**
