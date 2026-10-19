# Idea: Fix Loans / Money e2e

## Problem map (diagnose before framing)

**Mode simple:** stub — Core problem clear from failing Playwright run.

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?
- `e2e/loans.spec.ts` + `e2e/money.spec.ts` fail under auth storage (`E2E_STORAGE_STATE=e2e/.auth/user.json`).
- Loans: `page.goto("/loans")` / `/loans/insights` hit 60s timeout or `ERR_ABORTED`; Pay path misses toast `Payment recorded in Money`.
- Money: add-transaction path times out; later cases see `ERR_CONNECTION_RESET` / `REFUSED` (dev server likely died).
- Same suite: Investments + apple-wallet + workspace-member app grants passed.

#### What is missing / wrong?
- Stable Loans/Money page load (or durable wait) for e2e `goto`/`load`.
- Reliable Pay success feedback (or test selector) for recorded payment.
- N/A — root cause clear enough to Analyze (hang vs crash vs assertion drift).

#### What are the consequences?
- Cannot trust Money/Loans Depth C smoke before merge.
- Cascade kills later Money cases when the webServer drops.
- Blocks confidence after recent kiosk/nav/settings churn on `main`.

### Step 2 — Real core problem

- **Surface symptoms:** Loans/Money e2e red (timeouts, aborted navigations, missing Pay toast, connection refused).
- **Root cause:** TBD in Analyze — likely `/loans` or Money write path hang/crash under e2e (or assertion drift), then server cascade.
- **Core problem (one sentence):** Loans and Money Playwright happy paths fail to complete reliably under the local e2e webServer.

### Mind map (visual text)

```
Fix Loans/Money e2e
├── ★ Stabilize /loans (+ insights) load under e2e
├── Pay success feedback / selector
├── Money add-tx + later routes (avoid server die)
└── Keep Investments green (out of scope unless shared)
```

## Outcome

**Loans** and **Money** e2e specs pass with `E2E_STORAGE_STATE=e2e/.auth/user.json` (no new product feature; fix product hang/crash and/or harden e2e waits/selectors as needed).

## Non-goals

- Fix baby-care e2e failures (separate).
- New Money/Loans features or schema.
- Full suite green beyond `e2e/loans.spec.ts` + `e2e/money.spec.ts` unless a shared helper causes both.

## Constraints

- Follow debug order: reproduce → failing coverage → fix → green.
- Prefer product fix if `/loans` hang is real; e2e-only harden when flake/env.
- No secrets in docs; use existing auth storage path.
- DESIGN_GUIDE / skeleton parity if UI changes.

## Success signal

`E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/loans.spec.ts e2e/money.spec.ts` exits 0.
