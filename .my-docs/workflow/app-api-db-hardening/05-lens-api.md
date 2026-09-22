# Lens: api — app-api-db-hardening

**Result:** clean
**Round:** 2
**Updated:** 2026-09-22

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| A2 | Nit | `lib/request-guards.ts` `readBodyTextBounded` + `lib/http-idempotency.ts` `hashRawBodyBytes` | Design asks hash of **raw body bytes as received**. Pipeline decodes bytes with `TextDecoder` then SHA-256s UTF-8 string bytes. Consistent for normal JSON; invalid UTF-8 replacement could drift from true octet hash. | Hash the merged `Uint8Array` before decode, or document UTF-8 JSON-only assumption in ARCHITECTURE Idempotency section. |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | Money / investment import commit Zod before claim; members create Zod + owner gate before claim; Investment activities Zod + `details` flatten; shared helpers typed. |
| One error format | pass | Flat `{ error, code, details? }` via `lib/api-http.ts`; facades re-export; tokens / timezone / GraphQL HTTP 429–403 use JSON. |
| Validate at edges only | pass | Route Zod / owner checks before idempotency claim; `clientSafeErrorMessage` on hardened catch paths (money/investment commit, activities mutates). |
| Lists paginated | N/A | Rank 6 docs-only; dialects in ARCHITECTURE. |
| Additive fields / no silent breaks | pass | Money\|investment keys on Investment REST; optional idempotency header; error bodies plain→JSON on hardened paths only. |
| Naming matches repo | pass | camelCase JSON; stable route ids; rate-limit names unchanged pattern. |
| Idempotency for mutating endpoints | pass | Three hot paths wired; claim outside / complete in mutator tx; 409 codes; replay header; DELETE on abort; 128 code points; batched completed prune; ARCHITECTURE client contract (routes, unsafe-to-retry without header, conflicts, minimized replay bodies). |
| Contract matches `03-design.md` | pass | Auth, errors, Investment rate limit + Zod messages, money atomic commit, idempotency protocol match code. Shipped `docs/ARCHITECTURE.md` Idempotency-Key section satisfies Task 6 “documented” (R1 A1 closed). Minimized replay (members omit email; investment counts) documented in ARCHITECTURE — intentional vs full-row live 200. |

Skill: `api-and-interface-design`

## Round notes

- **Scope:** Round 2 re-verify after SPM fixes vs `03-design.md` API contracts + `lib/api-http.ts`, `lib/http-idempotency.ts`, money/investment import commit, workspace members add, Investment activities, `docs/ARCHITECTURE.md` Idempotency section.
- **R1 Major (A1) closed:** ARCHITECTURE lists three routes, max 128, replay header, 409 `idempotency_*`, absent key = unsafe to retry, 24h TTL, auth/replay-body notes; `hardening-docs.test.ts` locks section.
- **R2 fix ask verified:** Members `assertWorkspaceOwner` before `beginIdempotencyRequest`; investment import Zod before claim; `clientSafeErrorMessage` + `ClientFacingError` on money import commit; batched `pruneExpiredIdempotencyCompleted` (`IDEMPOTENCY_PRUNE_BATCH_SIZE`); redacted idempotency store (`membersIdempotencyReplayBody`, investment counts-only `data`).
- **Still Nit-only:** A2 body-hash bytes vs UTF-8 string (unchanged from R1; does not block clean).
- **Out of lens:** DB migration/RLS → db lens; OWASP deep pass → security lens.
- **Do not fix here** — Fix only after Merge findings.
