# Foods

Workspace feature for logging food types (calendar + AI variety tips).

## Setup

1. Apply migration `0050_foods` (`pnpm db:migrate`).
2. Set OpenAI-compatible LLM env (see `.env.example`):
   - `FOODS_LLM_BASE_URL`
   - `FOODS_LLM_API_KEY`
   - `FOODS_LLM_MODEL` (optional, default `gpt-4o-mini`)

## Dates

`logged_on` is a local calendar day `YYYY-MM-DD` (not timestamptz). Analysis window is today − 6 days through today (7 days inclusive).

## API

- `GET/POST /api/foods/entries`
- `PATCH/DELETE /api/foods/entries/:id`
- `GET /api/foods/analysis`
- `POST /api/foods/analysis/retry`

Session auth + `foods` workspace cookie. Save always succeeds even if LLM fails.
