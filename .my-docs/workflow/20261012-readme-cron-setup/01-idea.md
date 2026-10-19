# Idea: README cron setup for all features

## Problem map (diagnose before framing)

**Mode simple:** stub.

- **Core problem:** README only documents Money recurrence cron; other `/api/cron/*` jobs lack a host crontab setup guide.
- **N/A — root cause clear** under deep WHAT branches.

### Mind map

```
Problem
├── Happening: README § Recurring transactions covers money-recurrence only
├── Missing: loan-reminders, investment-quotes, db-housekeeping + shared crontab pattern
├── Consequences: ops miss schedules; feature READMEs/docs/API.md fragment the story
└── ★ Top priority: one README cron runbook covering all four routes
```

## Problem

Operators cannot find one place to schedule every app cron job.

## User / audience

Operators deploying the production Compose stack (and local devs who curl cron routes).

## Outcome

`README.md` has a clear cron setup guide for **all** features that expose `/api/cron/*`, with shared auth (`CRON_SECRET`), example crontab lines, verify curls, and a short troubleshooting table. Money-only section is folded into or replaced by the all-features guide without losing recurrence behavior notes.

## Metric

A new operator can schedule every cron from README alone (no need to chase feature READMEs).

## Constraints

- Docs only — do not change cron route code or auth.
- Match live behavior in `lib/cron-auth.ts` and `app/api/cron/*/route.ts`.
- Keep plain words; align with existing README tone.
- Point to deeper docs (`docs/API.md`, `docs/PERFORMANCE.md`, feature READMEs) rather than duplicating long API detail.

## Non-goals

- Implementing new cron routes
- Docker-in-app cron sidecar
- Changing OpenAPI / route auth

## Primary sources

- `README.md` (current recurrence section)
- `app/api/cron/money-recurrence/route.ts`
- `app/api/cron/loan-reminders/route.ts`
- `app/api/cron/investment-quotes/route.ts`
- `app/api/cron/db-housekeeping/route.ts`
- `lib/cron-auth.ts`
- `docs/API.md` (REST cron table)
- `docs/PERFORMANCE.md` (housekeeping)
- `features/investment/README.md`, `features/loans/README.md`

## Open questions

None for Mode simple — inventory is known (four routes).
