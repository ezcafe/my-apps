# Lens: security — app-api-db-hardening

**Result:** clean  
**Round:** 2 (re-verify after SPM Fix ask 1–7)  
**Updated:** 2026-09-22

## Findings

No open Critical, Major, or Enhancement items after Round 2 verification.

### Round 1 → Round 2 (closed)

| Id | Was | Location | Resolution |
|----|-----|----------|------------|
| S1 | Major | `app/api/workspace/members/route.ts` POST | **Fixed.** Zod parse, then `assertWorkspaceOwner(userSub, workspaceId)` **before** `beginIdempotencyRequest`. Actor uses verified `workspaceId` only. |
| S2 | Major | `app/api/investment/import/commit/route.ts` | **Fixed.** `investmentImportCommitBodySchema.safeParse` before claim; invalid bodies never INSERT. |
| S3 | Major | `lib/api-http.ts`; investment activities / import commit; money import commit | **Fixed.** `dbUnavailable()` default `"Database unavailable"` (no docker / `DATABASE_URL` hints). Mutator catches use `clientSafeErrorMessage` with stable fallbacks; domain paths use `ClientFacingError` / allowlist where needed. |
| S4 | Enhancement | `http_idempotency.response_body` | **Mitigated.** Members replay omits email (`membersIdempotencyReplayBody`). Investment replay stores count-only `{ data: result }` from `commitInvestmentStatement`. Money stores `{ imported: count }`. Residual: DB operator / backup visibility until TTL — documented in `docs/ARCHITECTURE.md`; no logging of jsonb. |
| S5 | Enhancement | Replay path | **Accepted + documented.** Every request re-runs route auth (`require*Context` / session + owner for members) before `beginIdempotencyRequest`. `ARCHITECTURE.md` states 24h TTL without extra membership re-check beyond those gates. |
| D2 | Enhancement | `pruneExpiredIdempotencyCompleted` | **Fixed.** Batched `DELETE … LIMIT 500` on claim path (`IDEMPOTENCY_PRUNE_BATCH_SIZE`). |

### Deferred (non-blocking)

| Id | Severity | Location | Finding |
|----|----------|----------|---------|
| S6 | Nit | `lib/graphql/http-handler.ts`, `baby-http-handler.ts` | POST-only **405** remains plain text `"Method Not Allowed"` while 429/403 use JSON `{ error, code }`. Transport consistency only. |

## OWASP coverage (security lens)

| OWASP | Status | Note |
|-------|--------|------|
| **A01** Broken Access Control | **pass** | Investment REST: money\|investment keys + `resolveInvestmentWorkspaceId` + `verifyMoneyWorkspaceAccess`. Members idempotency uses server-verified owner workspace before claim. Idempotency rows scoped `(workspace_id, user_sub, route, key)` on every op. |
| **A02** Cryptographic Failures | **pass** | Request integrity via SHA-256 of body bytes (UTF-8 path; bounded JSON). No secrets in client error payloads on hardened paths. Replay store minimized (counts / no email). |
| **A03** Injection | **pass** | Drizzle / parameterized SQL in idempotency + hot import paths; bounded JSON reads. |
| **A04** Insecure Design | **pass** | Rate limits on Investment mutates + import; validate-before-claim on all three hot idempotency routes; money import one outer RLS + prune outside; abort deletes claim on failure. |
| **A05** Security Misconfiguration | **pass** | Hot REST + GraphQL HTTP 429/403 JSON helpers. Hardened mutators no longer expose ops / raw DB text (S3 closed). S6 nit only on GraphQL 405 body shape. |
| **A06** Vulnerable Components | **N/A** | No new npm dependencies in this hardening draft. |
| **A07** Auth Failures | **pass** | Explicit Investment API-key matrix; write scope on mutators; CSRF / same-origin for cookie sessions; Bearer skips CSRF (existing). Replay requires live auth at route entry (S5 documented). |
| **A08** Software / Data Integrity | **pass** | Money import: preview + writes + preview delete + idempotency complete share one outer RLS tx; claim outside / complete inside; no nested commit tx under ALS. |
| **A09** Logging / Monitoring Failures | **N/A** | No new audit pipeline; design defers. Server `console.error` on failures without forwarding message to client; docs warn not to log `response_body`. |
| **A10** SSRF | **N/A** | No user-controlled server URL fetch in scope. |

Source: https://owasp.org/Top10/

## Focus checks (Round 2)

| Area | Verdict | Note |
|------|---------|------|
| Auth Investment keys | pass | `isInvestmentApiTokenAppKeyAllowed` + `requireInvestmentContext` aligned with GraphQL / `resolveInvestmentWorkspaceId`. |
| Rate limits | pass | Named `enforceRateLimit` after auth on Investment activities POST/PATCH/DELETE and import preview/commit. |
| Idempotency trust boundary | pass | Non-RLS table: app filter on auth-derived actor; members owner-before-claim; validate-before-claim everywhere. |
| Idempotency `response_body` | pass | Redaction + TTL + no-log policy documented and reflected in code. |
| RLS money import commit | pass | Rank 5 wiring: prune outside; `skipPrune` inside single `withMoneyWorkspaceRls`; `commitMoneyImport` uses ALS-bound connection. |
| Error bodies (hardened paths) | pass | Stable `{ error, code }`; no docker / env hints on 503. |
| Client contract (security-relevant) | pass | `docs/ARCHITECTURE.md` Idempotency-Key section: three routes, 128 cp, 409 codes, absent key unsafe, auth-on-replay policy. |

## Round notes

- Fresh verifier; compared tree to `03-design.md` Security / idempotency sequences and merged SPM Fix ask 1–7 (`05-review-log.md` Fix notes merged-spm).
- Round 1 Majors S1–S3 and Enhancements S4–S5 (+ DB D2 batch prune) verified in code and architecture docs. No code changes in this lens.
- Primary sources: https://owasp.org/Top10/ ; skill `security-and-hardening`.
