# Test log: device-pairing-general

## Smoke

**Result:** smoke-pass  
**Updated:** 2026-09-26  
**Note:** main-thread

| Check | Result |
|-------|--------|
| `pnpm run build` | pass |
| Unit: watch-pairing-service + watch-pairing-settings + validators sample | 87 pass |
| Migration `0045_watch_pairing_grants` | applied |

## Lite test

**Result:** pass (same focused unit suite; no new e2e required by tasks for lite)

| Check | Result |
|-------|--------|
| Pairing + settings source tests | pass |
| Mint/redeem grant tests | pass |
