# Test log: baby-care

**Result:** success
**Round:** 1
**Updated:** 2026-09-06

## Coverage

Map design success criteria / main flows → e2e.

**Verdict (2026-09-06):** **7 covered** · **0 MISSING** · **2 waived** (was blocked). Playwright stack added (`@playwright/test`, `pnpm test:e2e`).

Sources: `01-idea.md` MVP success criteria · `03-design.md` home/flows · `04-tasks.md` Checkpoints D–E / Task 18 Telegram · user main flows.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Workspace nav → Baby Care (`/baby`, app key `"baby"`) | `e2e/baby-care.spec.ts` › workspace nav reaches /baby | covered |
| Home: Log feed CTA | `e2e/baby-care.spec.ts` › home Log feed CTA opens feed form | covered |
| Home: Log nap (sleep start/end) CTA | `e2e/baby-care.spec.ts` › home Log nap CTA opens sleep form | covered |
| Home: Timeline CTA / day view | `e2e/baby-care.spec.ts` › home Timeline CTA opens day view | covered (route + heading or unauth load error; event list needs `E2E_STORAGE_STATE`) |
| Diaper log (wet / dirty / mixed) | `e2e/baby-care.spec.ts` › diaper page shows wet / dirty / mixed | covered (kind buttons visible; submit needs session) |
| Growth/health + charts | `e2e/baby-care.spec.ts` › growth page shows title and add form | covered (page + add CTA; chart data needs session) |
| EN ↔ VI UI strings (nav + home) | `e2e/baby-care.spec.ts` › EN ↔ VI toggles home and nav labels | covered |
| Shared timeline (second caregiver sees log within sync interval) | — | **waived** (2026-09-06) — needs dual Pocket ID / dual storageState; unit/sync covered; no multi-user e2e this run |
| Telegram notify + add-log (feed/diaper/sleep/health) | — | **waived** (2026-09-06) — live bot secrets; unit/webhook/command tests cover path; no browser e2e this run |

**MVP criteria not treated as e2e:** design-system glance (large targets / light+dark / skeleton parity) = manual/visual; deferred items (prediction, PDF, offline/CRDT, public API) = docs only.

**E2E stack:** Playwright (`@playwright/test`) · config `playwright.config.ts` · specs under `e2e/`
**E2E command:** `pnpm test:e2e` (UI: `pnpm test:e2e:ui`)
**Auth:** Pocket ID / NextAuth — no bypass. Optional `E2E_STORAGE_STATE` after codegen save-storage (see `.env.example` + `e2e/helpers/auth.ts`). Prefer `E2E_BASE_URL=http://localhost:3000`.

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js compile + TS + routes OK |
| Unit | `pnpm test` | 0 | 409 pass, 0 fail, 9 skip |
| E2E | `pnpm test:e2e` | 0 | 7 passed (`e2e/baby-care.spec.ts`) |

## Failures (if any)

None after user waive of Shared timeline + Telegram e2e (2026-09-06).

## Fix ask for my-code-workflow

None for this round. Follow-up (optional): dual-session shared timeline e2e; Telegram mock harness e2e.

## Round notes

- Coverage: user chose Option A (Playwright); 7 smoke flows covered.
- Run suite green: build / unit / e2e.
- User **waived** Shared timeline + Telegram browser e2e → **Result: success**.
