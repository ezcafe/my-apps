# Lens: api — baby-home-layout-custom-diaper

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
| Typed input/output | pass | GraphQL `BabyQuickCareInput` + Zod `babyQuickCareSchema` optional `occurredAt`/`endedAt` strings; success still `BabyQuickCareResult` (`steps`, `replayed`, `openSleep`) |
| One error format | pass | Invalid ISO → `parseOrThrow` → `Validation failed…` → `mapServiceError` → GraphQL `BAD_REQUEST`; auth/workspace via existing `requireBabyWriteWorkspace` |
| Validate at edges only | pass | Zod at `runBabyQuickCare` entry (`parseOrThrow`); present times validated even when truth table later IGNORE-applies them; no second policy layer |
| Lists paginated | N/A | Single mutating quick-care path; no new list endpoint |
| Additive fields / no silent breaks | pass | Optional fields only; no remove/retype; create sleep/diaper time fields unchanged (UI wire) |
| Naming matches repo | pass | camelCase `occurredAt` / `endedAt` matches create inputs (`CreateBabyDiaperInput`, `StartBabySleepInput`, `EndBabySleepInput`) |
| Idempotency for mutating endpoints | pass | Required `clientRequestId`; same id → stored result `replayed: true`; no body/hash compare (matches design) |
| Contract matches `03-design.md` | pass | Truth table implemented in `napEndClock` + insert paths; Pump family still skips auto-endNap |

Skill: `api-and-interface-design`

## Round notes

- **Scope:** Additive optional times on `babyQuickCare` (`Has API: yes`). No new mutation, auth surface, or DB.
- **Verified vs truth table:**
  - **SLEEP start** (no open nap): `occurredAt` else now; `endedAt` unused for insert
  - **SLEEP end** (open nap): `endedAt` else now; `occurredAt` IGNORE (`napEndClock` skips occurred when `kind === "SLEEP"`)
  - **DIAPER insert:** `occurredAt` else now; `endedAt` IGNORE for insert
  - **BREAST / FORMULA / PUMP_AMOUNT inserts:** always server `now`
  - **Auto-endNap** (non-SLEEP, non-pump-family): `endedAt` else `occurredAt` else now
  - **Pump family** (`PUMP_AMOUNT` / BREAST pump sides): does not auto-end open sleep
- **Coverage:** Zod (`lib/validators/baby.test.ts`), `runBabyQuickCare` unit suite (`features/baby/server/quick-care.test.ts` optional times block), Yoga pass-through + bad datetime (`lib/graphql/baby-yoga.test.ts`).
- **FYI (not a finding):** No dedicated unit for SLEEP **start** + only `endedAt` IGNORE; same IGNORE rule is covered for DIAPER + only `endedAt` and by start-path code (`occurredAt ?? now`). Yoga bad-datetime test asserts errors but not `extensions.code === BAD_REQUEST` (wet-detail test does).
