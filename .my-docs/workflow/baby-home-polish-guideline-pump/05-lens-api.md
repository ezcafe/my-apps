# Lens: api — baby-home-polish-guideline-pump

**Result:** clean
**Round:** 1
**Updated:** 2026-09-20

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | None | — |

## API checklist (api lens only)

| Check | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| Typed input/output | pass | `BabyQuickCareInput` / `BabyQuickCareResult` unchanged; `BabyQuickActionKind` + Zod `z.enum` both include `PUMP_AMOUNT`; client `BabyQuickAction` / `BabyQuickCareRequest` already typed |
| One error format | pass | Resolver uses existing `mapServiceError`; missing `amountMl` → Zod `BABY_QUICK_AMOUNT_REQUIRED` (same as FORMULA); unknown enum still GraphQL validation error |
| Validate at edges only | pass | GraphQL enum at Yoga; Zod in `runBabyQuickCare` (`parseOrThrow`) — service edge only; no extra internal re-checks for this kind |
| Lists paginated | N/A | Single mutation; no new list endpoint |
| Additive fields / no silent breaks | pass | Enum value added only; no removed/retyped fields; success shape (`steps`, `replayed`, `openSleep`) unchanged |
| Naming matches repo | pass | `PUMP_AMOUNT` matches existing SCREAMING_SNAKE kinds (`BREAST`, `FORMULA`, …) and Zod allowlist |
| Idempotency for mutating endpoints | pass | Required `clientRequestId`; same key → stored replay with `replayed: true` (shared path with FORMULA); no new key surface |
| Contract matches `03-design.md` | pass | Design: enum extend only, auth via `requireBabyWriteWorkspace`, `amountMl` required for kind, `createPumpAmount` downstream — matches typeDefs, validator, yoga tests, resolver |

Skill: `api-and-interface-design`

## Round notes

- **Scope:** Additive GraphQL enum only (`Has API: yes` — `PUMP_AMOUNT` on `BabyQuickActionKind`). No new mutation, auth, or response fields.
- **Verified:** `lib/graphql/baby-typeDefs.ts` enum; `lib/validators/baby.ts` kind allowlist + `BABY_QUICK_AMOUNT_REQUIRED` for FORMULA \| PUMP_AMOUNT; `features/baby/server/quick-care.ts` → `createPumpAmount`; `lib/graphql/baby-resolvers.ts` write gate unchanged; yoga tests happy path + missing `amountMl`.
- **FYI (not a finding):** `babyQuickCareNotifyKinds` still keys off `createFormula` / `saveBreast`, not `createPumpAmount` — Telegram silent for pump-amount inserts. Design Task 1 / API contract call for enum-only and “existing notify filter”; out of this contract scope unless product wants FORMULA parity later.
-
