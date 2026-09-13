# Test log: baby-home-redesign

**Result:** success
**Round:** 3
**Updated:** 2026-09-12

## Coverage

Map design success criteria / main flows → e2e.

**Verdict:** covered **21** · MISSING **0** · blocked **1** (Task 13 low-light timed human check — not automatable). Stack is Playwright. Old home CTA tests rewritten to hamburger entry; Option B flows live in `e2e/baby-home-option-b.spec.ts` + GraphQL helpers.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Row 1: two large Left / Right breast controls with clear names and icons | `e2e/baby-home-option-b.spec.ts` → `row 1: Left and Right breast controls…` | covered |
| Idle breast press starts visible elapsed timer in that control | `…` → `idle breast press starts elapsed timer; press again saves one feed` | covered |
| Running breast press again saves exactly one feed (side + duration) and returns idle | same test | covered |
| Other breast while timer runs: save current side, start other | `…` → `other breast while timer runs…` | covered |
| Breast / sleep timer survives lock + reload on same device | `…` → `breast timer survives reload…` (sleep open state from `BabyQuickCare` response covered in sleep + auto-finalize tests) | covered |
| Row 2: formula, sleep, diaper large controls in that order | `…` → `row 2 order: formula, sleep, diaper` | covered |
| Formula opens at age-band default (+ range); no birth date → 120 ml / 60–150 | `…` → `formula defaults to age-band mid…` | covered |
| Bottle + / − by 10, clamp at band; center press saves shown amount | `…` → `bottle + twice then save…` | covered |
| Custom ml modal (10–300); Confirm sets only; center saves; reset to age default after save; cancel / backdrop / validation | `…` → `custom ml modal: confirm, cancel paths…` | covered |
| Birth-date prompt on home when unset; set/change on `/baby/settings` (incl. error tokens → local copy) | `…` → `birth-date prompt on home; set on settings…` | covered |
| Idle sleep starts timer; press again saves one sleep and returns idle | `…` → `idle sleep starts timer…` | covered |
| Diaper shows wet / dirty / mixed; default wet; + / − cycle; center saves | `…` → `diaper cycles wet/dirty/mixed…` | covered |
| Save progress / success / failure clear; no duplicate on double-tap or replay; failed chain saves nothing; no Undo toast | `…` → `chain failure is all-or-nothing; double-tap once; replay once` | covered |
| Unknown outcome → Try again + Discard; retry same press / values / `clientRequestId`; pending clear rules; fail-closed localStorage; pending too old; nothing auto-retries | `…` → `retry same press…`, `pending clear rules…`, `fail-closed…` (×2), `reload mid-save…` | covered |
| Midnight rollover: new day feed count without manual reload (`dayFrom` / `dayTo`) | `…` → `midnight rollover refetches…` + `midnight rollover in America/New_York…` | covered |
| Next-due shared next-feed on idle L / R / bottle; hide without last feed or birth date | `…` → `next-due shared feed; sleep from ended; diaper…` | covered |
| Next-due sleep from last sleep **ended**; while napping elapsed only | same test | covered |
| Next-due diaper; hide without last diaper or birth date | same test | covered |
| Row 3 last-care summary scannable; count refresh after save | `e2e/baby-care.spec.ts` → `home shows last-care status below quick cards`; `e2e/baby-home-option-b.spec.ts` → `count refresh after save…` | covered |
| Empty / load-failure still leaves safe logging (`babyHomeQuickStatus` fail; breast/bottle/diaper still save) | `e2e/baby-care.spec.ts` → `home status error keeps breast bottle diaper saving` | covered |
| One-hand / large targets / EN+VI / a11y on Option B home (care ≥ 56 px, VI Custom + birth-date copy) | `…` → `3AM geometry…` + `Vietnamese: Custom modal…`; EN↔VI in `baby-care.spec.ts` | covered |
| Full forms + history reachable for detail/corrections (hamburger, not home CTAs) | `baby-care.spec.ts` hamburger Log feed/nap/diaper/measure; `option-b` → `hamburger still reaches full forms…` | covered |
| Task 12: auto-finalize one `BabyQuickCare` chain + all-or-nothing failure + no step preview + concurrent nap from response | `…` → `auto-finalize one BabyQuickCare chain…` + chain-failure test | covered |
| Task 12: mocks use `BabyHomeQuickStatus` + `BabyQuickCare` `steps` (not timeline / openSleep / eventId) | `e2e/helpers/baby-home-graphql.ts` + `BabyQuickCare mock contract uses steps not eventId` | covered |
| Task 13: low-light timed usability (90% / 5 s, EN+VI, lights off) | — | blocked — manual script only; cannot automate dark-room thumb timing safely in Playwright |

**E2E stack:** Playwright (`@playwright/test`)
**E2E command:** `npx playwright test e2e/baby-care.spec.ts e2e/baby-home-option-b.spec.ts` (or `npm run test:e2e`)

**Note:** Task 13 remains a human low-light run; record results in this log when executed. Task 13 alone does not fail this run.

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm run build` | 0 | Next.js 16.3.2 compile + TypeScript OK |
| Unit | `pnpm test` | 0 | 698 pass · 0 fail · 16 skipped · ~5.8 s |
| E2E (1st) | `npx playwright test e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts` | 1 | 43 passed · 5 skipped · 1 failed (pending too-old `getByText` strict mode vs toast span) |
| E2E (re-run) | same (after e2e-only `pendingTooOldTitle` locator fix) | 0 | **44 passed · 5 skipped · 0 failed** |

## Failures (if any)

None after e2e-only re-run.

**Round 3 first pass (cleared by locator scope):**
- **Test:** `pending clear rules: definite codes clear; ambiguous keep; discard keeps timer`
- **Cause:** page-wide `getByText(/too long|đã quá lâu/i)` matched pending `<p>` and a truncated toast `<span>` (strict mode).
- **Fix:** e2e-only `pendingTooOldTitle()` scoped to `baby-home` `<p>` (same pattern as `pendingTitle`). No product change.

**Round 2 product focus (Custom Confirm → bottle centre) held green this round.**

## Fix ask for my-code-workflow

None — suite green. Task 13 blocked (manual) is OK for success.

## Round notes

**Round 3 (my-test-workflow Run suite):** After Fix from tests (Custom Confirm deferred focus).

- Build + unit green (698 pass).
- Custom Confirm focus product fix held (modal test green).
- E2e-only once: `pendingTooOldTitle` scopes too-old pending copy; re-ran e2e → 44 pass.
- Task 13 still blocked (manual low-light); does not fail this run.
- **Result: success.**
