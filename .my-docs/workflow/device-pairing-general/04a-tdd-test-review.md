# TDD test-case review: device-pairing-general

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-26  
**Note:** main-thread fallback — usage limit

## Planned / existing test cases reviewed

| Task | Scenario | Covered in 04-tasks? |
|------|----------|----------------------|
| 1 | Migration apps/scopes + defaults | yes |
| 2 | Mint rejects empty apps | yes |
| 2 | Redeem uses stored apps/scopes | yes |
| 2 | Token name pattern / no auto-revoke | partial (name yes; no-revoke explicit) |
| 2 | Mint rejects when assertAppAccess false | **no** |
| 3 | Mint schema zod: apps required, bad app key | **no** (generic validator tests only) |
| 4 | Generate disabled without apps (source/contract) | partial |
| 4 | No Create token form in ApiTokenSettings source | **no** |
| 4 | Reveal one-time / consumed messaging | **no** |
| 5 | BABY_API pairing primary wording | yes if docs test exists |

## Gaps → fold into `04-tasks.md`

| Sev | Task | Add |
|-----|------|-----|
| Major | 2 | Unit: mint throws FORBIDDEN when `assertAppAccess` false for a selected app |
| Major | 2 | Unit: redeem does **not** call `revokeWatchTokens` (or deps spy unused) |
| Major | 3 | Validator: empty apps / unknown app key fail; valid `["money"]` + scopes `["read"]` pass |
| Major | 4 | Source test: `api-token-settings` has no Create token / TokenCreateForm |
| Enhancement | 4 | Source test: pairing card mentions one-time / Reveal testid |

## Fix ask (folded into 04-tasks)

See Task 2–4 TDD bullets updated in `04-tasks.md`.

## Round notes

- After fold → treat as ready for Gate B (tests planned; Build writes reds first).
