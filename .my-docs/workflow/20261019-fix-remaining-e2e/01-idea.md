# Idea: Fix remaining full-suite e2e failures

## Problem map (diagnose before framing)

**Mode simple:** stub OK.

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?

- Full Playwright with auth (`E2E_STORAGE_STATE=e2e/.auth/user.json`) finished **19 failed / 117 passed / 4 skipped** (~22.9m). Evidence: terminal `919566.txt`.
- Loans + Money specs all passed (prior invalidate/nav fix holds).
- Failures: **6** `baby-care`, **11** `baby-home-option-b`, **2** `investments`.

#### What is missing / wrong?

- Baby home layout/geometry assertions (row order, Kind height vs nap, 3AM hit area).
- Baby i18n / settings locale (EN↔VI, Vietnamese copy).
- Baby recovery / pending / chain-failure / birthday modal flows.
- Custom diaper / Custom time capture (strict-mode dual wet chip; occurredAt).
- Growth / Activities / vaccine capture navigations.
- Investments settings + new form: `page.goto` timeout / `ERR_ABORTED` (possible webServer stress after long baby run).

#### What are the consequences?

- Full suite stays red; Gate C blocked on any run that needs full or baby/investments e2e.
- False confidence if only Loans/Money are re-checked.

### Step 2 — Real core problem

- **Surface symptoms:** 19 red Playwright tests across baby + investments.
- **Root cause:** TBD in Analyze — mix of product/layout drift, selector strictness, i18n, and possible nav/webServer flakiness on investments.
- **Core problem (one sentence):** Remaining e2e failures after Loans/Money fix must be diagnosed and fixed so baby + investments specs pass under the same auth Verify command.

### Mind map (visual text)

```
Remaining e2e red
├── Baby care (6) — locale, diaper Custom, vaccine, growth, delete
├── Baby home Option B (11) — layout ★, recovery, VI, custom diaper
└── Investments (2) — settings/new goto timeout
```

## Outcome

All currently failing tests in `e2e/baby-care.spec.ts`, `e2e/baby-home-option-b.spec.ts`, and `e2e/investments.spec.ts` pass with `E2E_STORAGE_STATE=e2e/.auth/user.json`. Loans/Money stay green (no regression).

## Constraints

- Follow reproduce → failing tests → fix → green (workspace debug rule).
- Prefer product fixes when UI/behavior drifted; prefer test fixes when assertions are stale.
- No new API/DB/auth unless Analyze proves need (then reclassify Gate B).
- Do not invent Gate C on sibling runs.

## Non-goals

- Re-fix Loans/Money product code (already green).
- Merge/commit without Gate C yes.
- Broad baby redesign beyond what the red tests require.
