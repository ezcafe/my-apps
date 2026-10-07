# Lens: api — apple-wallet-notifications

**Result:** clean  
**Round:** 2 (re-check after SPM Fix: Zod mint/unlink, QR rate-limit, consume fail-closed)  
**Updated:** 2026-10-05  
**Verifier:** Senior Verifier (did not author draft; did not change code)  
**Skill:** api-and-interface-design

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A2 | Nit | `03-design.md` getPass / authorize vs `webservice.ts` `getPass` | Design still says **404** when serial unknown after auth. Code returns **401** when no subscriber row (cannot verify `ApplePass`) — WalletCast-aligned; locked in tests. Only post-auth miss is missing `channel_state` → **404**. | Soften design prose: unknown serial → 401; channel missing after auth → 404. |
| A3 | Nit | Human error matrix `db_unavailable` vs `http.ts` | Matrix lists **503** `db_unavailable`. Handlers do not catch store/DB failures → unhandled **500**. Peer session routes omit this map; crons use `dbUnavailable`. | Wire `dbUnavailable` on trusted catch paths or drop the matrix row. |
| A4 | Nit | PassKit handlers + `appleDisabled()` | When Apple is off, PassKit routes return human JSON `{ error, code: "apple_disabled" }` **404**. PassKit failure table does not define this; Apple clients expect status-only bodies. | Optional design note, or empty-body 404 for `/api/apple/v1/**` only. |

## Closed since Round 1 (Fix verified)

| Prior | Severity was | Verification |
|-------|--------------|--------------|
| A1 | Enhancement | Mint/unlink use `readWorkspaceBody` → `readJsonBounded` + `appleWalletWorkspaceBodySchema` (optional UUID, `.strict()`). Bad JSON / invalid UUID → **400** `bad_request`. Locked in `http.test.ts`. |
| S1 (API single-use) | Security Major (merged) | `redeemAppleIssueToken` requires `consumeIssueToken === true` after build; else **gone** and no `.pkpass`. Concurrent redeem: one winner / one `gone`. Locked in `apple-wallet.test.ts`. |
| S2 (QR rate-limit) | Security Major (merged) | `handleIssueGet` `t=` branch: `apple-wallet:issue-redeem` IP/anon limit **before** redeem (`issueRpm`). 429 does not burn token. Locked in `http.test.ts`. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | Success shapes match design: pkpass bytes; mint `201` `{ data: { url, expiresAt } }` + `Cache-Control: no-store`; unlink `204`; PassKit register/unregister empty; listUpdated `{ serialNumbers, lastUpdated }` / `204`; getPass pkpass/`304`. Mint/unlink body validated at edge via Zod. |
| One error format | pass | Human JSON flat `{ error, code, details? }` via `lib/api-http.ts` + local `apple_disabled` / `gone`. PassKit auth/validation failures status-only (WalletCast). |
| Validate at edges only | pass | Session auth, same-origin, membership, Apple enable, rate limits (session issue / QR redeem / mint / unlink / PassKit log), issue-token length/TTL/consume, pushToken hex at WS edge. Internal `issue*` / store not re-validating policy. |
| Lists paginated | N/A | No human list endpoint; `listUpdated` is PassKit device poll. |
| Additive fields / no silent breaks | pass | New surface; `Content-Disposition` on pkpass additive vs design headers. |
| Naming matches repo | pass | camelCase `workspaceId` / `expiresAt`; routes `/api/apple-wallet/*` + `/api/apple/v1/*`; rate-limit names `apple-wallet:issue\|issue-redeem\|mint\|unlink\|passkit-log`. |
| Idempotency for mutating endpoints | pass | Session issue safe retry; QR redeem unsafe after success (`410` `gone`, consume fail-closed); mint unsafe; unlink idempotent `204`; register `201`/`200`; unregister `200` when auth ok. No `Idempotency-Key` (not offered). |
| Contract matches `03-design.md` | pass | Human status/code matrix (401/403/404 apple_disabled/400/410 gone/429) matches `http.ts` including QR redeem rate-limit under issue. PassKit ops, auth rules, `304` If-Modified-Since, listUpdated unauthenticated poll match `webservice.ts`. Residual prose only: getPass unknown-serial 404 (A2); unused 503 row (A3); PassKit disabled body (A4). |

## Round notes

- **Scope:** Re-verify design↔code after SPM Fix vs `03-design.md` API contracts + `app/api/apple-wallet/**`, `app/api/apple/v1/**`, `lib/apple-wallet/http.ts`, `issue.ts`, `webservice.ts`, `validators/apple-wallet.ts`, `services.ts`, `lib/api-http.ts`.
- **Fix focus:** Zod mint/unlink (A1), QR `issue-redeem` rate-limit before redeem (S2), consume fail-closed after successful build (S1 / single-use). All three hold in code + tests.
- **Human routes:** Thin Next handlers → `handleIssueGet` / `handleIssueTokenPost` / `handleSubscriptionDelete`. Guard order: enable → auth → rate → same-origin (mutators) → body parse → workspace resolve → membership.
- **PassKit:** Route params awaited (Next 16); register pushToken `16–200` hex; authorize `ApplePass` + `status=active` (unregister allows non-active).
- **Out of lens:** Schema/migrations → db; OWASP/certs/token entropy → security.
- **Do not fix here** — nits deferred; no Fix ask from this lens.
- **Open Critical / Major:** none → **Result: clean**.
