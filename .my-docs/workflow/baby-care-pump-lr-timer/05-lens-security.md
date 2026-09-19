# Lens: security — baby-care-pump-lr-timer

**Result:** clean  
**Round:** 1  
**Updated:** 2026-09-19

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| S1 | Enhancement | `lib/validators/baby.ts` (`createBabyFeedSchema`, `babyQuickCareSchema`); design abuse case “oversized amountMl / duration” | Server Zod still allows any positive `amountMl` / `durationSec` (no hard max). Client steppers use `BABY_FORMULA_HARD_MAX_ML` (300) for Bottle/Pump amount UI only. Same pre-existing gap as FORMULA/breast; new `PUMP_AMOUNT` / `pump_l`/`pump_r` inherit it. Design’s “existing max rules” are client-side, not server. | Optional follow-up: share a server max with FORMULA (e.g. mirror hard max + duration cap) so GraphQL cannot store absurd values. Not a new privilege or cross-tenant issue. |
| — | — | `lib/baby-quick-care-notify.ts` vs `createPumpAmount` | Notify filter lists `saveBreast` / `createFormula` but not `createPumpAmount`. Idle Pump amount inserts stay silent on Telegram. **Not a defect for this lens** — product parity gap; reduces (does not expand) care-summary fan-out. | Product follow-up if notify parity with Bottle is required; no security action. |

## OWASP coverage (security lens only)

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 | pass | `babyQuickCare` uses `requireBabyWriteWorkspace`; `runBabyQuickCare` scopes inserts/updates by `workspaceId` + baby profile; `feedSessionEventId` load requires same workspace, `type === "feed"`, and matching `babyId` else `NOT_FOUND`. Matches `03-design.md` IDOR → `NOT_FOUND`. |
| A02 | N/A | No new secrets/crypto. Care-timer is device `localStorage` only (not auth). No sensitive data added to URLs. |
| A03 | pass | Zod at GraphQL edge for methods/sides/`PUMP_AMOUNT`/`breastRunning`; Drizzle parameterized writes. Guidelines + TimedCareChip use React text children (`<p>{line}</p>`); no `dangerouslySetInnerHTML` / eval in draft UI. |
| A04 | pass | Server enforces allowlisted sides (`breast_*`/`pump_*`), required duration for timed pump methods, required `amountMl` for `PUMP_AMOUNT` / legacy `pump`; `PUMP_AMOUNT` ≠ FORMULA (sibling step `createPumpAmount`). Growth pump capture chip removed (dual-entry abuse addressed). Residual: no server hard max on ml/duration (S1 Enhancement). Baby GraphQL RPM still applies. |
| A05 | N/A | No new CORS, CSP, or debug flags; existing shell headers / baby GraphQL handler unchanged. |
| A06 | N/A | No new npm dependencies in this draft (app/schema/validators/UI only). |
| A07 | pass | Reuses Baby session + write-workspace gate; no new auth cookies/tokens. |
| A08 | pass | Versioned care-timer key (`baby.careTimer.v1`) with one-time migrate; corrupt JSON / unknown side / wrong `babyId` → null. Zod rejects unknown method/side. Idempotent quick-care via `clientRequestId` store (pre-existing). |
| A09 | pass | New paths do not log care payloads/PII. `mapServiceError` keeps failures opaque. Notify summaries use existing care-summary helpers only when notify kinds fire. |
| A10 | N/A | Fixed `POST /api/graphql/baby` only; no server fetch of user URLs. |

Source: https://owasp.org/Top10/

## Design OWASP compare (`03-design.md`)

| Design claim | Lens verdict |
|--------------|--------------|
| A01 workspace-scoped care writes | Confirmed |
| A02 timer local only / no new secrets | Confirmed (N/A) |
| A03 Drizzle + React escape; guidelines static i18n | Confirmed |
| A04 Server Zod for methods/sides; duration vs amount paths explicit | Confirmed; S1 notes missing server max vs design “oversized → max rules” wording |
| A05 / A06 / A10 N/A | Confirmed |
| A07 reuse Baby workspace auth | Confirmed |
| A08 versioned timer + reject corrupt store | Confirmed |
| A09 do not log care payloads/PII | Confirmed |

## Round notes

- **Scope:** Draft quick-care (`PUMP_AMOUNT` / `createPumpAmount`, widened BREAST sides), validators (`pump_l`/`pump_r`, `babyCareTimerSideSchema`), home + TimedCareChip + guidelines, widened care-timer store. Compared to `03-design.md` Security / OWASP abuse cases.
- **Trust boundaries:** Browser → Baby GraphQL (session + workspace cookie); client timer localStorage (non-auth); feed/quick-care payloads → Zod then workspace-scoped DB.
- **No Critical/Major.** S1 optional server max only. No production fixes in this Task.
