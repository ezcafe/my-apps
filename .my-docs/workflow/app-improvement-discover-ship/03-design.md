# Design: app-improvement-discover-ship

**Mode:** full  
**Has UI:** **yes** — Money empty / form cold-path copy only (batch addendum)  
**Has API:** **no** for remaining build (prior #1 already on `main`)  
**Has DB:** **no** for remaining build (prior #4 prune already on `main`)  
**Ship pick (expanded):** Decision 6 → Options **2 + 3 + 4A** with packaging **P1** (keep #1)  
**ADR:** skipped (Grill)

## Locked grill picks (do not reopen)

| Topic | Pick |
|-------|------|
| Tie-break | Spender (Money / Loans) first |
| Baby API tokens | Demoted below daily UI / spender trust |
| Ship size | S/M only |
| Gate C paperwork | Excluded from product backlog |
| Delivery | Discover → human picks → ship in this run |

## Expanded Decision 6 (2026-10-10)

Human: **A + P1** — Option 4 = Baby prune (not tokens); keep #1; add #2 + #3 + #4 in the same run/PR.

### Status vs current `main` (re-verify)

| # | Item | Status on `main` |
|---|------|------------------|
| 1 | Safe retry Idempotency | **Shipped** (`lib/idempotency-client.ts`, Money `[kind]`, UI headers) |
| 2 | Kiosk first-load measure + slim | **Shipped / measured** — `docs/PERFORMANCE.md` `/kiosk` ~20 kB page manifest; insight stats stay `next/dynamic`; no further slim |
| 3 | Money cold-path empty/Help copy | **Remaining — this Build** |
| 4A | Baby `quick_care_request` prune | **Shipped** — `lib/baby-quick-care-prune.ts` + `POST /api/cron/db-housekeeping` (TTL default 168h) |

**Already shipped (not candidates):** Settings single-pane; grouped drawer; Loans Insights urgency; Baby ChartShell; #1/#2/#4 above.

## Ranked backlog (vital few — keep for history)

| # | Item | Size | Job | Why now |
|---|------|------|-----|---------|
| 1 | Safe retry Idempotency | S–M | Safe import / add-member retry | **Done** |
| 2 | Kiosk measure + slim if regressed | S | Fast household glance | **Done** (measure; no slim needed) |
| 3 | Money cold-path empty/Help copy | S | New spender orientation | **Ship now** |
| 4 | Baby quick-care prune | S–M | Trust at scale | **Done** (7-day TTL batch prune) |
| 5 | Baby personal API token (`bby_`) | M | Automation | Demoted; not in this batch |

## Chosen design (remaining: #3 only)

**Money cold-path copy** — one clear job: a new spender who opens Spending / Insights / Add transaction sees empty copy that points to the next action, not an error tone.

1. Centralize cold-path strings in `lib/money-cold-path-copy.ts` (unit-tested).
2. Wire Spending / Bills / Savings ledger `emptyState` in `lib/money-ledger-presets.ts` to those strings (titles + descriptions + primary CTA labels stay action-first).
3. Tighten Insights default transactions empty (`analytics-transactions-table` fallback) and the main spend ATF empty (`spend-by-category-card`) so copy mentions **add a transaction** before “widen the range”.
4. Tighten Money form picker empties for accounts / categories / merchants to name the Settings destination (`/money/settings/accounts` etc.) in plain words.
5. **Help:** treat as helpful empty copy (DESIGN_GUIDE empty ≠ error). Do **not** rewrite `/help` ApiHelp (API power-user surface).

**Non-goals:** New empty layouts/illustrations; i18n framework; Baby/Loans/Investments copy; changing filter logic; skeleton changes (copy-only → skeleton N/A unless layout changes — none).

## System design

### Overview

- **What it is:** Copy-only orientation pass on Money cold empties.
- **Boundaries:** Preset strings + a few AnalyticsEmptyState titles/descriptions + form emptyMessage strings. No API/DB.
- **Data flow:** Static strings → existing empty primitives.
- **Why this shape:** Smallest S slice that matches Option 3; reuses `AnalyticsEmptyState` / ledger presets.
- **Best practices:** Empty ≠ error; one next action; plain words (AGENTS.md).
- **Anti-patterns:** Error `Alert` for zero rows; cinematic empty art; editing Help API catalog.

### Concept 1 — Action-first empty

- **What:** Title names the zero; description says add data **or** widen filters.
- **How:** Shared constants; presets import them.
- **Why:** One test surface; consistent voice across Spending/Insights.
- **Reference:** `docs/DESIGN_GUIDE.md` Empty & loading; `lib/money-ledger-presets.ts`.

## Sequence diagram

N/A — static copy; no new request flow.

## API contracts

N/A.

## Database contracts

N/A.

## UI / UX / mobile

- **Build must match:** Same empty primitive; only string changes.
- **#1 visible job:** Empty Spending shows clear “add transaction” CTA (existing href).
- **#2:** Insights empty not mistaken for a load failure.
- **Mobile:** Same; no layout change.
- **Skeleton:** N/A — no structure change.

## OWASP

Copy-only; no new auth/input surfaces. A03 N/A (no user HTML). Keep existing React text children (no `dangerouslySetInnerHTML`).

## Aggressive challenges

- Why not also rewrite `/help`? — API Help is not the spender cold path; out of Option 3 example.
- Why not detect “zero accounts forever” vs “filtered empty”? — Needs live lookup branching (M); S slice keeps one honest range-empty voice that still leads with add.
- Why not re-slim kiosk? — Already measured; no regression to fix.
- Why not re-build prune? — Already on `main` via housekeeping cron.
