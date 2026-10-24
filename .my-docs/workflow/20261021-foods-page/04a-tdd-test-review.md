# TDD test plan review

**Result:** clean  
**Updated:** 2026-10-21

**04a unpaid / dirty** when planned tests present ∧ ¬Notes `04a skipped` ∧ (missing **or** Result ∉ {`clean`})

## Planned cases

| Case | Verdict |
|------|---------|
| `foodsEntrySchema rejects unknown foodType` | Keep — edge validation |
| `foodsEntrySchema accepts mealSlot and note` | Keep |
| `buildFoodsAnalysisPrompt includes only last 7 days` | Keep — D3 |
| `parseFoodsAnalysisResponse maps summary and suggestions` | Keep |
| `upsertFoodAnalysisOnError preserves prior ok summary` | Keep — D2 |
| `POST foods entries returns 401/403 without membership` | Keep — auth |
| `distinctFoodTypesForDay collapses duplicate types` | Keep — calendar |
| `foods page shows icons and analysis after save (mocked LLM)` | Keep — e2e |

## Gaps (non-blocking)

- Add unit for note max-length reject if Build sets 280.
- Analysis retry route can piggyback e2e or a thin route test.

## Notes

Zero `needs more tests` blockers. Planned set covers schema, AI helpers, auth, UI helper, e2e. **04a ok** → Prefer **gate-b**.
