# Lens: security — 20261007-apple-wallet-setup-improve

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-07  
**Skill:** `security-and-hardening` (OWASP Top 10)  
**Primary source:** https://owasp.org/Top10/  
**Note:** Fresh Senior Verifier. Did not author the draft. No code changes. Did not edit `05-review-log.md` during lens write (parent merges).

**Scope:** Settings readiness DTO + diagnose (`lib/apple-wallet/config.ts`), `settings-loader`, `constants`, `AppleWalletSettings`, Help `#apple-wallet`, related tests/e2e. No new public HTTP (Has API no). Task 5 logs out of Gate B.

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement. | — |

## OWASP coverage (code lens)

| OWASP | Status | Note |
|-------|--------|------|
| **A01** Broken Access Control | **pass** | Same signed-in Settings surface; no new admin/health route; readiness is caregiver-safe codes only |
| **A02** Cryptographic Failures | **pass** | PEM/keys stay in env; client gets reason codes + optional `signerValidTo` ISO date only — never PEM/key material |
| **A03** Injection | **pass** | UI maps fixed `REASON_COPY`; React text nodes; e2e off-path asserts no `APPLE_SIGNER` / `BEGIN CERTIFICATE` |
| **A04** Insecure Design | **pass** | Option 1 avoids health HTTP; enable vs `healthyForAdd` split matches design threat model (multi-viewer Settings → safe classes) |
| **A05** Security Misconfiguration | **pass** | No debug env dump in props; HTTPS still required for enable; Help points to repo runbook path as text, not served markdown |
| **A06** Vulnerable Components | **pass** | Runtime uses Node `crypto.X509Certificate`; no new production deps (`node-forge` test-only for fixtures) |
| **A07** Auth Failures | **N/A** | No auth/session/cookie change this pass |
| **A08** Software / Data Integrity | **N/A** | No webhook/update pipeline change |
| **A09** Logging / Monitoring Failures | **pass** | Diagnose does not log PEM; Task 5 server key-name warnings deferred — no secret-in-log regression introduced |
| **A10** SSRF | **N/A** | No user URL fetch |

Source: https://owasp.org/Top10/

## Design OWASP compare (`03-design.md`)

| Design claim | Lens verdict |
|--------------|--------------|
| A01 same Settings auth; no admin leak path | Confirmed |
| A02 PEM env-only; UI never echoes secrets | Confirmed |
| A03 fixed copy; no raw PEM in HTML | Confirmed (+ e2e off assert) |
| A04 safe classes for multi-viewer | Confirmed |
| A05 no debug dump; HTTPS for enable | Confirmed |
| A06 Node crypto only | Confirmed |
| A07 N/A | Confirmed |
| A08 N/A | Confirmed |
| A09 server warnings preferred; no client secrets | Confirmed for ship scope (Task 5 deferred) |
| A10 N/A | Confirmed |

## Abuse cases (design ↔ code)

| Abuse | Mitigation in draft |
|-------|---------------------|
| Signed-in user harvests env names / PEM from Settings | Reasons are stable codes; copy map has no `APPLE_*`; e2e guards DOM |
| Log scraping diagnose | No diagnose logging shipped (Task 5 deferred); DTO has no PEM |

## Focus checks

| Area | Verdict | Note |
|------|---------|------|
| Secrets in RSC props | pass | `reasons`, `signerValidTo`, booleans only |
| Client bundle constants | pass | `APPLE_WALLET_SETUP_GUIDE_HREF` is path-only |
| New trust boundary | pass | None — RSC props only |
| Issue still on when expired | accept | Design: UI blocks Add; binary enable unchanged — not elevated this lens |

## Round notes

- Open Critical / Major / Enhancement: **none** → Result **clean**.
- Parent: copy this Result into `05-review-log.md` Merged lenses (single lens).
