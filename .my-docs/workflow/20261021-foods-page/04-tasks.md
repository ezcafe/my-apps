# Tasks (TDD-ready)

Each task: behavior, failing test name first, files allowed, done evidence.

## Planned tests

| Case | Failing test name | Covers |
|------|-------------------|--------|
| Reject unknown food type | `foodsEntrySchema rejects unknown foodType` | Zod presets |
| Accept optional meal + note | `foodsEntrySchema accepts mealSlot and note` | Entry shape |
| Analysis prompt window | `buildFoodsAnalysisPrompt includes only last 7 days` | D3 window |
| Parse LLM JSON | `parseFoodsAnalysisResponse maps summary and suggestions` | AI shape |
| Analysis fail keeps prior | `upsertFoodAnalysisOnError preserves prior ok summary` | D2 |
| Create entry requires workspace | `POST foods entries returns 401/403 without membership` | Auth |
| Calendar day icons | `distinctFoodTypesForDay collapses duplicate types` | Calendar icons |
| E2E log + analysis region | `foods page shows icons and analysis after save (mocked LLM)` | User flow |

## Task order

### T1 — Domain validators + presets

- **Behavior:** Zod schema for entry create/update; preset list export; meal slot enum.
- **Failing test first:** `foodsEntrySchema rejects unknown foodType`
- **Files:** `features/foods/lib/foods-types.ts`, `features/foods/lib/foods-entry-schema.ts`, `*.test.ts`
- **Done:** unit green

### T2 — Analysis pure helpers

- **Behavior:** Window filter, prompt builder, response parse, error upsert merge rule.
- **Failing test first:** `buildFoodsAnalysisPrompt includes only last 7 days`
- **Files:** `features/foods/server/analyze-foods.ts` (+ test); mockable `completeChat`
- **Done:** unit green

### T3 — Schema + migration

- **Behavior:** `foods` workspace key; `food_log_entry` + `food_analysis` tables.
- **Failing test first:** (integration or schema type test if repo pattern exists; else migration apply in verify)
- **Files:** `db/schema/workspace.ts`, `db/schema/foods.ts`, migration
- **Done:** migrate applies; types export

### T4 — API routes

- **Behavior:** CRUD entries + get/retry analysis; auto-analyze after write; auth gate.
- **Failing test first:** `POST foods entries returns 401/403 without membership`
- **Files:** `app/api/foods/**`, `features/foods/server/*`, `lib/api-foods.ts` (or twin)
- **Done:** route/unit tests green; LLM mocked

### T5 — Shell + UI

- **Behavior:** Registry + layout provider; calendar + day log + analysis panel; skeleton parity; disclaimer.
- **Failing test first:** `distinctFoodTypesForDay collapses duplicate types` then e2e
- **Files:** `lib/features/registry.ts`, `app/(shell)/foods/**`, components, `loading`/skeletons
- **Done:** unit + e2e with mocked LLM

### T6 — Env example + docs touch

- **Behavior:** Document `FOODS_LLM_*` in `.env.example`; brief feature README.
- **Failing test:** N/A (docs)
- **Files:** `.env.example`, `features/foods/README.md`
- **Done:** names present; no secrets
