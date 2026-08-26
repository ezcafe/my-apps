# Loans feature

Workspace-backed loan tracking with SC spreadsheet amortization, progress charts, and payment reminders. Top-level shell UI at `/loans` (same `workspaceAppKey: "money"` as Money; GraphQL uses `ctx_workspace_loans`).

## Routes

| Path | Purpose |
|------|---------|
| `/loans` | Home: due panel, filters, loans table |
| `/loans/insights` | Date-range filter bar; remaining, monthly obligation, weighted APR, next due (as-of now); remaining-by-loan + paid principal vs interest in the selected period; extra charts behind More insights |
| `/loans/new` | Create amortized loan |
| `/loans/settings` | Browser push + Money workspace note |
| `/loans/[id]` | Detail, chart, pay actions, schedule |

Legacy `/money/loans/*` redirects to these paths (temporary). `/loans/manage` redirects to `/loans`.

GraphQL: `POST /api/graphql/loans` (cookie `ctx_workspace_loans`).

## Domain rules

- Amounts are stored in **minor units** (`amountMinor` pattern from Money).
- `annualRateBps`: basis points (525 = 5.25%).
- Schedule is generated on create and not edited (cancel loan only).
- Pay with Money: atomic `loanInstallmentPayWithTransaction` creates a Money expense in the **Money** workspace and links `money_transaction_id`.
- Mark paid without transaction: updates installment status only.

## Interest calculation

All new loans use the **SC spreadsheet** engine:

- **EMI:** `ROUND(PMT(rate/12, term, principal))`
- **Interest:** actual/365 daily accrual between due dates (`balance × rate × days ÷ 365`, rounded per row)
- **Principal:** payment − interest each period; last row pays remaining balance

Optional **two-tier rate schedule** at create:

- `initialRateMonths` — months at the initial `annualRateBps`
- `rateAfterInitialBps` — rate for the remainder (required when initial period < term)
- Payment recalculates via PMT on remaining balance at the switch month; optional `paymentAfterRateChangeMinor` override

The create form defaults to **300-month term** and **due day 25**.

Optional `collateralValueMinor` at create is display-only (LTV / down payment); it does not change the schedule.

## Money integration

Loan optional fields `moneyAccountId` / `moneyCategoryId` are validated against the user's **Money** workspace at create/pay time, not the Loans workspace id.

## Notifications

### In-app

- Due banner on loans home (`loansDueInstallments`) with inline Pay
- One toast per session when opening Loans

### Browser push

1. Set env (server):
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (e.g. `mailto:you@example.com`)
2. Set client:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same as public key)
3. User enables notifications under `/loans/settings`
4. Cron: `POST /api/cron/loan-reminders` with `Authorization: Bearer $CRON_SECRET`

Service worker: [`public/sw.js`](../../public/sw.js).

## Manual test checklist

- [ ] Create loan (12 months, 5%) → 12 schedule rows
- [ ] Home shows progress %, remaining, and next due in the table
- [ ] Pay from due banner or table row → Money transaction + progress update
- [ ] Detail chart: scheduled vs paid vs projected
- [ ] Mark paid without transaction → no Money tx, progress updates
- [ ] Due installment → banner + toast on first visit
- [ ] `/money/loans/manage` redirects to `/loans`
- [ ] Push (with VAPID): cron sends notification; click opens loan
- [ ] Light and dark mode on charts and table
