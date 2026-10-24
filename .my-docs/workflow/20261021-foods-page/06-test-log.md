# Test log

## Smoke

**Result:** success  
**Smoke source:** Smoke-Task

### Notes

- Smoke-Task: re-ran Foods unit suites + `tsc --noEmit` (pass).
- E2E `e2e/foods.spec.ts` auth-gated; needs `E2E_STORAGE_STATE` + migrated DB + optional LLM env (fail-soft OK).
- Apply migration `0050_foods` before manual / e2e smoke.

## Unit

**Result:** pass (Foods-focused)

Commands:

```bash
pnpm exec tsx --test lib/validators/foods.test.ts lib/validators/foods-calendar.test.ts features/foods/server/analyze-foods.test.ts lib/features/registry.foods.test.ts lib/money-tabs-chrome-path.test.ts lib/workspace-app-keys.test.ts
pnpm exec tsx --experimental-test-module-mocks --test lib/api-foods-auth.test.ts
pnpm exec tsc --noEmit -p tsconfig.json
```

## test-full

**Result:** success  
**Test path:** full  
**Updated:** 2026-10-22 06:24

- Foods unit suites: 13 pass (incl. auth mock).
- `tsc --noEmit`: clean.
- E2E `e2e/foods.spec.ts`: present, auth-gated — not run this turn (no storage state in agent). Manual/CI when `E2E_STORAGE_STATE` + migrate available.
