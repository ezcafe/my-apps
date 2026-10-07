# Lens: security — apple-wallet-notifications

**Result:** clean  
**Round:** 2 (re-check after Fix)  
**Updated:** 2026-10-05  
**Skill:** `security-and-hardening` (OWASP Top 10)  
**Primary source:** https://owasp.org/Top10/  
**Note:** Fresh Senior Verifier. Did not author the draft or Fix. No code changes in this Task. Did not edit `05-review-log.md`.

ID↔name rows below follow the skill / design table (Broken Access Control … SSRF). The live Top 10 page currently publishes the **2025** renumbering; merge should treat skill names as authoritative for this run.

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement findings this round. | — |

## S1–S4 closure (Round 1 → Round 2)

| Id | Round 1 | Round 2 verdict | Evidence |
|----|---------|-----------------|----------|
| **S1** Major | Consume boolean ignored after build; concurrent QR redeem could return two `.pkpass` | **closed** | `redeemAppleIssueToken` issues then `consumeIssueToken`; `if (!claimed)` → `AppleIssueTokenError("gone")` — no bytes returned (`lib/apple-wallet/issue.ts`). Store keep conditional UPDATE (`consumedAt is null`). Test: `concurrent redeem of one token: one pkpass winner; loser gone (410)` in `apple-wallet.test.ts`. |
| **S2** Major | Public `GET …/issue?t=` had no rate limit | **closed** | `handleIssueGet` `t=` branch calls `enforceRateLimit` (`apple-wallet:issue-redeem`, `issueRpm`, IP/`userKey: null`) **before** redeem (`http.ts`). Wired in `services.ts`. Test: `GET issue?t= returns 429 when rate limited before redeem; token stays redeemable` (`http.test.ts`). |
| **S3** Enhancement | PassKit `/log` uncapped RPM | **closed** | `handlePassKitLog` → `apple-wallet:passkit-log` + `logRpm()` (default 60 / `APPLE_WALLET_LOG_RPM`). Redaction path unchanged. Test: `PassKit log returns 429 when rate limited`. |
| **S4** Enhancement | Transitive `joi` advisories via `passkit-generator` | **closed** | `pnpm.overrides.joi` = `17.13.7` in `package.json`; lockfile resolves `joi@17.13.7`. `pnpm audit` JSON: **0** `joi` advisory mentions (reachability remains low for this draft). |

## OWASP coverage (security lens only)

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| **A01** Broken Access Control | **pass** | Session issue / mint / unlink: session + `assertWorkspaceAppAccess(…, baby)` after workspace resolve; QR redeem bound to minted `workspace_id`+`user_sub`. PassKit register/getPass/unregister gated by timing-safe `ApplePass` + `status=active` (unregister allows removed). Soft-unlink scoped to actor workspace+user. |
| **A02** Cryptographic Failures | **pass** | PEMs only from env via `getAppleWalletConfig` / HTTPS `BASE_URL`; issue token stored as SHA-256 hash; raw token only in QR URL (short TTL, `Cache-Control: no-store` on mint). `auth_token` plaintext in DB is PassKit-required (Design). Pass signing via `passkit-generator`. |
| **A03** Injection | **pass** | Drizzle parameterized store; register `pushToken` hex length regex; path `passTypeId` must match config; log entries coerced + length-capped; mint/unlink body via bounded JSON + UUID schema (Fix A1); no shell/eval; React settings UI. |
| **A04** Insecure Design | **pass** | Env gate; mint/unlink CSRF same-origin; session issue + **QR redeem** + mint/unlink RPM; single-use consume boolean enforced after build (S1). Design abuse cases (QR replay / rate-limit) met in code. |
| **A05** Security Misconfiguration | **pass** | Disabled channel → stable `404 apple_disabled` (no cert leakage); human JSON errors use project envelope; WS enable-gated; `.env.example` names only. |
| **A06** Vulnerable Components | **pass** | `passkit-generator` / `qrcode` pinned; `joi` overridden to patched `17.13.7` (S4). Residual non-joi audit items are outside this feature’s new dep path and not re-opened here. |
| **A07** Auth Failures | **pass** | ApplePass: length-checked `timingSafeEqual`. Issue tokens: high-entropy mint, hash lookup, TTL ≤10m, consume-after-success with ignored-boolean closed under concurrency (S1). Session routes reuse existing cookie session. |
| **A08** Software / Data Integrity | **pass** | Signed `.pkpass`; stable serial/auth on reissue; notify upsert+bump in one store tx then APNs; issue upsert+channel in one DB tx. |
| **A09** Logging / Monitoring Failures | **pass** | WS log redacts by length; no PEM/auth/token logging on human handlers; public `/log` now RPM-capped (S3). |
| **A10** SSRF | **N/A** | No user-controlled server URL fetch; APNs/pass build use fixed config hosts. |

Source: https://owasp.org/Top10/

## Focus checks (requested)

| Area | Verdict | Note |
|------|---------|------|
| Authz (session + Baby membership) | pass | `defaultAppleWalletHttpDeps` → `assertWorkspaceAppAccess` + baby workspace resolve; non-member 403. |
| ApplePass (PassKit WS) | pass | `Authorization: ApplePass …` + `safeEqual`; wrong/missing → 401; removed → 401 on getPass/register. |
| Issue tokens | pass | Hash + TTL + consume-after-success; concurrent loser → `gone`, no second `.pkpass` (S1). |
| Rate limits | pass | Session issue / mint / unlink RPM; QR redeem `apple-wallet:issue-redeem` before redeem (S2); PassKit log RPM (S3). |
| Secrets | pass | Certs/keys env-only; token hash at rest; mint response no-store. |
| CSRF / same-origin | pass | `assertSameOriginStrict` on POST mint + DELETE unlink. Session Add is navigational GET (Design / iPhone Wallet) — SameSite session cookies apply. |
| PassKit WS surface | pass | register pushToken validate; listUpdated unauthenticated by Apple design; log redacted + RPM. |
| Supply chain (joi) | pass | Override `17.13.7`; audit clean for joi (S4). |

## Design OWASP compare (`03-design.md`)

| Design claim | Lens verdict |
|--------------|--------------|
| A01 session + membership; ApplePass timing-safe; token bound user+workspace | Confirmed |
| A02 certs in env; HTTPS base URL | Confirmed |
| A03 Zod/validate pushToken + params; no raw SQL concat | Confirmed (regex + Drizzle + bounded mint/unlink body) |
| A04 rate-limit issue + mint + unlink; same-origin mutators | Confirmed — includes public QR redeem RPM (S2) + single-use race closed (S1) |
| A05 enable gate; env.example names; prune 410 | Confirmed |
| A06 pin passkit-generator | Confirmed; joi override (S4) |
| A07 constant-time; expire + consume tokens | Confirmed under concurrency |
| A08 signed pkpass; stable serial | Confirmed |
| A09 no tokens/PEMs in logs; log redacts | Confirmed; log RPM (S3) |
| A10 N/A | Confirmed |

## Round notes

- **Scope:** Same as Round 1 — `lib/apple-wallet/*`, `app/api/apple-wallet/**`, `app/api/apple/v1/**`, schema/migration, Settings UI, Baby notify fan-out, ADRs, Design security + Task security checks — focused on Fix closures for S1–S4.
- **Trust boundaries:** Browser session → human issue/mint/unlink; QR device → issue token URL; Apple device → PassKit WS; Baby notify → store + APNs.
- **Open Critical / Major:** none → Result **clean**.
- Residual: concurrent loser may still run `issueApplePass` before losing the consume race (wasted work / duplicate upsert for same user+workspace). Does not return a second `.pkpass`; not elevated.
- No production code changed in this lens.
