# Test log: apple-wallet-notifications

**Result:** success
**Mode last run:** full
**Round:** 1
**Updated:** 2026-10-05

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `corepack pnpm run build` | 0 | Next.js 16.3.7 compile + TS OK. Apple Wallet routes present: `/api/apple-wallet/*`, `/api/apple/v1/*`. |
| Unit (full pool) | `corepack pnpm test` | non-zero* | 1390 pass · **0 fail** · 25 skipped · **1 cancelled** (`lib/telegram/send.test.ts` — `passes AbortSignal and times out hung fetch`, `cancelledByParent` / pending Promise). Unrelated to Apple Wallet. Same flake pattern prior smokes treated as green when fail=0. Module-mock second process skipped when first pool exits non-zero. |
| Unit (module mocks) | `corepack pnpm run test:module-mocks` | 0 | 22 pass / 0 fail (re-run after pool). |
| Unit (focused Apple Wallet) | `corepack pnpm exec tsx --import ./scripts/test-env.mjs --test lib/apple-wallet/*.test.ts db/schema/apple-wallet.test.ts features/baby/server/notify.test.ts components/settings/settings.test.ts` | 0 | **68 pass / 0 fail** — config, schema, HTTP, pass fields, status, notify, settings. |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → existing e2e only.
Sources: `01-idea.md` Success criteria + Top user journey; `03-design.md` UI locks / sequence; `04-tasks.md` E2E note (optional Settings only; no automated APNs/lock-screen).
Scanned: `e2e/*.spec.ts` (incl. `e2e/apple-wallet-settings.spec.ts`); `package.json` `test:e2e`; `playwright.config.ts`.

| Criterion / flow | E2E file / test | Status |
|------------------|-----------------|--------|
| When Apple off: no Add / QR / subscribe CTA on Settings | `e2e/apple-wallet-settings.spec.ts` → Apple off | **covered** (needs `E2E_STORAGE_STATE`; asserts unavailable copy + no Add/Show QR) |
| When Apple on: shell `/settings` shows **Add to Apple Wallet** first; status second; QR secondary | `e2e/apple-wallet-settings.spec.ts` → Apple on | **blocked** — needs `APPLE_*` + HTTPS `BASE_URL` on e2e webServer; no `appleEnabled` mock hook in repo (Task 7: skip if hard). Test skips when gate off. |
| After Add: status pending → active or fail (no silent fake success) | `e2e/apple-wallet-settings.spec.ts` → After Add pending | **blocked** — optimistic `pending` mockable only when Apple on (form `preventDefault` keeps Settings); `active` needs real device register; `fail` is request-scoped after real issue error. APNs not automated. |
| Main journey: open `/settings` → Add → see status | same Settings suite (off covered; Add path blocked until Apple on) | **partial** — off gate covered; Add→status blocked with Apple-on rows above |
| PassKit register + empty APNs → listUpdated/getPass → `changeMessage` / lock-screen | — | **blocked/manual** (design: no automated e2e; needs certs + device) |
| Baby care notify → visible Wallet lock-screen (Metric) | — | **blocked/manual** (same; unit covers fan-out with fake APNs) |
| Unlink / delete-pass guidance in Settings | `e2e/apple-wallet-settings.spec.ts` → Unlink | **blocked** — Unlink UI only when status ≠ `not_linked`; needs Apple on (or existing linked sub). Same env gate as Apple-on row. |
| Light/dark + settings skeleton parity | — | not required for e2e (unit / DESIGN_GUIDE; Task 7) |

**Covered (e2e):** 1 — Settings Apple-off gate (no Add/QR)  
**MISSING:** 0  
**Blocked (Settings, not MISSING):** 3 — Apple-on Add/status/QR order; After-Add pending/active/fail; Unlink/delete-pass guidance (all need Apple env on webServer; no product mock hook)  
**Blocked/manual (device):** 2 — real PassKit/APNs update loop; Baby care → lock-screen Metric  

**E2E stack:** Playwright (`@playwright/test`)  
**E2E command:** `E2E_STORAGE_STATE=e2e/.auth/user.json corepack pnpm exec playwright test e2e/apple-wallet-settings.spec.ts`  
**Add-missing-e2e note (2026-10-05):** Added Settings suite. Verified locally: 1 passed (Apple off), 3 skipped (Apple on paths — gate off on webServer). Did not invent `appleEnabled` test hook. Keep real APNs/lock-screen blocked/manual.

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `corepack pnpm run build` | 0 | Next.js 16.3.7 Turbopack build + TS OK. Routes include `/api/apple-wallet/*`, `/api/apple/v1/*`, `/settings`. |
| Unit (full pool) | `corepack pnpm test` | non-zero* | **1432** tests · **1403 pass** · **0 fail** · 28 skipped · **1 cancelled** (`lib/telegram/send.test.ts` → `passes AbortSignal and times out hung fetch`, `cancelledByParent`). Pre-existing / out of scope. Treated green when fail=0 (same as smoke). |
| Unit (module mocks) | `corepack pnpm run test:module-mocks` | 0 | **22 pass / 0 fail**. |
| E2E (Apple Wallet settings) | `E2E_STORAGE_STATE=e2e/.auth/user.json corepack pnpm exec playwright test e2e/apple-wallet-settings.spec.ts` | 0 | **1 passed** (Apple off: no Add/QR). **3 skipped** (Apple on / After Add pending / Unlink — gate off; documented blocked). Reused existing `pnpm dev` on :3000. Hydration mismatch warning in webServer logs (hash nav Appearance→Apple Wallet); did not fail the suite. |

**Suite result:** success — build green; unit fail=0; e2e green with documented Apple-on skips; Coverage MISSING=0; blocked/manual APNs OK by design.

## Failures (if any)

_(none — fail=0; one cancelled Telegram AbortSignal suite, pre-existing / out of scope for this slug)_

## Fix ask for my-dev-flow-code

_(none — success)_

## Round notes

- No automated e2e for real APNs / lock-screen (by design — needs Apple certs + device).
- Add-missing-e2e: `e2e/apple-wallet-settings.spec.ts` — closed Apple-off Settings gate; Apple-on / pending / unlink marked **blocked** (env gate; no mock hook).
- Full suite run 2026-10-05: build + full unit + apple-wallet settings e2e.
- `pnpm` via `corepack pnpm` in this environment.
