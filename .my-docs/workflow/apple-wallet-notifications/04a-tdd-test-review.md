# TDD test-case review: apple-wallet-notifications

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-10-05  
**Prereq:** `03a-design-review-log.md` Result **clean** (API + DB + general Round 4)

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Missing any required `APPLE_*` → `isAppleWalletEnabled` false | yes — planned |
| 1 | real | Complete env set → true | yes — planned |
| 1 | edge | Incomplete `BASE_URL` / HTTPS rule (Design enable gate) → false | **no** — acceptance only |
| 1 | real | When false: issue/WS/notify no-op; Settings `appleEnabled: false` | partial — route 404 planned; Settings RSC not named |
| 2 | real | Unique `(workspace_id, user_sub)` and `serial_number` conflicts | yes — planned |
| 2 | real | Registration PK; device FK cascade deletes regs | yes — planned |
| 2 | edge | Indexes smoke: `(workspace_id, status)`, `registration.serial_number`, `issue_token.expires_at` | yes — planned |
| 2 | real | Housekeeping prunes expired/consumed issue tokens | **no** — acceptance only |
| 2 | edge | Non-RLS list in `docs/ARCHITECTURE.md` | N/A — doc check |
| 3 | real | Pass field `latest` + `changeMessage: "%@"` (fake certs) | yes — planned |
| 3 | real | Session issue: unauth 401; member 200 + pkpass content-type; disabled 404 `apple_disabled`; non-member 403 | yes — planned |
| 3 | real | Removed subscriber re-Add → same serial, `status=active` | yes — planned |
| 3 | real | Issue tx creates `channel_state`; getPass before first care → 200 empty latest | yes — planned |
| 3 | edge | Session reissue while **active** → same serial + auth (safe retry) | **no** — design lock; only removed re-Add named |
| 3 | edge | Rate-limited issue download → 429 `rate_limited` | **no** — acceptance + error matrix |
| 4 | real | Mint → redeem once → second redeem 410 `gone` | yes — planned |
| 4 | edge | Expired 410; unknown token 401; other user’s token cannot issue | yes — planned |
| 4 | real | Cross-origin mint 400; unauth mint 401 | yes — planned |
| 4 | real | Mint 201 + `Cache-Control: no-store` | yes — planned |
| 4 | edge | Mint/unlink when Apple disabled → 404 `apple_disabled` | **no** |
| 4 | edge | Mint rate-limit → 429 `rate_limited` | **no** |
| 4 | edge | Mint non-member → 403 `forbidden` | **no** |
| 5 | real | Register → bump → listUpdated → getPass (test DB) | yes — planned |
| 5 | real | Bad ApplePass 401; bad pushToken 400; removed subscriber getPass 401 | yes — planned |
| 5 | real | `If-Modified-Since` → 304 when unchanged | yes — planned |
| 5 | real | Unregister last reg → subscriber `removed`; orphan device deleted | yes — planned |
| 5 | real | listUpdated without ApplePass | yes — planned |
| 5 | edge | listUpdated wrong `passTypeId` → 404 | **no** — WalletCast covers pattern |
| 5 | edge | getPass unknown serial (after auth path) → 404 | **no** — design authorize rule |
| 5 | edge | Unregister idempotent 200 when reg already gone | partial — acceptance; not explicit in TDD |
| 5 | real | Multi-device: two `device_library_id` on same serial both listed / both push-eligible | **no** — grill grain |
| 6 | real | Fake ApnsSender records `{}` sends; 410 prunes token/reg | yes — planned |
| 6 | real | Notify tx: channel_state upsert text + active subscribers `updatedAt` bump | yes — planned |
| 6 | real | Removed subscribers excluded from push-token SELECT | yes — planned |
| 6 | real | First care event upserts channel_state (no prior row) | yes — planned |
| 6 | edge | Skip when Apple off or zero registrations (no APNs calls) | **no** |
| 6 | real | **Notify bump → listUpdated returns serial** (silent-no-notify regression) | **no** — design aggressive challenge |
| 6 | real | Notify → getPass body reflects `careSummary` in `latest` | **no** — lock-screen copy path |
| 6 | real | `maybeNotifyBabyCareCreated` (deps) invokes wallet branch when enabled | partial — “wire deps pattern” not a failing scenario |
| 7 | real | `walletStatusFrom`: fail when `requestFail`; cleared when false | yes — planned |
| 7 | real | Status matrix: not_linked / pending / active | partial — named in acceptance; not explicit in TDD rows |
| 7 | real | Settings search finds Apple Wallet category | yes — planned |
| 7 | edge | Apple off: no Add/QR (optional e2e) | optional — OK to skip |
| 8 | real | Unlink member → 204; second DELETE 204; regs gone | yes — planned |
| 8 | real | Non-member 403; cross-origin 400; rate-limit 429 | yes — planned |
| 8 | edge | Unlink when Apple disabled → 404 | **no** |
| 8 | real | After unlink: push-token query empty; WS ignores removed | partial — notify join only; getPass/listUpdated not named |
| 8 | edge | Orphan device row removed on unlink tx | **no** |
| 9 | real | Re-run Tasks 1–8 suite | yes — planned |
| — | manual | Real device lock-screen / live APNs | **No** — documented OK |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 6 | End-to-end PassKit update loop after care notify | Test DB: issue + register → `notifyWalletCare(workspace, careSummary)` → assert subscriber `updated_at` increased → `listUpdated` with old `passesUpdatedSince` returns serial → `getPass` includes latest text (parse pass.json or inject reader). One test; mirror WalletCast “updated after edit” shape. |
| Major | 6 | Baby schedule path calls wallet notify when enabled | Extend `features/baby/server/notify.test.ts` pattern: fake `isAppleWalletEnabled` + spy `sendWalletCareNotify` (or deps) → `scheduleNotifyBabyCareCreated` / `maybeNotifyBabyCareCreated` triggers wallet once per event; wallet off → not called; Telegram branch unchanged. |
| Major | 3 | Issue rate-limit | Route or handler test: exceed issue RPM → 429 `{ code: "rate_limited" }`. |
| Major | 4 | Mint guards missing from TDD | Route tests: Apple disabled 404; non-member 403; rate-limit 429 (mirror watch-pair mint tests). |
| Major | 7 | Settings status helper matrix | Unit: `walletStatusFrom(null, 0)` → `not_linked`; active sub + `regCount=0` → `pending`; `regCount≥1` → `active`; `requestFail=true` → `fail`; reload `requestFail=false` → not `fail`. |
| Major | 8 | Post-unlink device API surface | After DELETE subscription: `listUpdated` 204 or empty serials for device; `getPass` with prior ApplePass → 401 (removed). |
| Enhancement | 1 | BASE_URL part of enable gate | Unit: valid certs but bad/missing HTTPS base → false (match Telegram-style gate tests in `lib/telegram/config.test.ts`). |
| Enhancement | 3 | Active session reissue idempotency | Second session issue while active: same `serial_number` + `auth_token` in DB (only `updated_at` bump if needed). |
| Enhancement | 5 | listUpdated wrong pass type | `listUpdated` with wrong `passTypeId` → 404 (WalletCast `apple.test.ts` parity). |
| Enhancement | 5 | Two devices, one serial | Register device A + B same serial → both in listUpdated; notify push-token SELECT returns distinct tokens. |
| Enhancement | 2 | Issue-token housekeeping | Unit/integration on housekeeping hook: expired + consumed rows deleted; active unconsumed retained. |
| Enhancement | 6 | No-op paths | Notify with Apple off or no regs: ApnsSender.send never called; tx may still run or skip — assert documented behavior. |

## Real scenarios checked

- **Happy path:** Enable gate → schema → session issue + channel row → QR redeem → WS register → notify upsert + APNs → Settings status/unlink. Tasks 1–5 and 8 name most HTTP success paths; **gap** is the chained notify → listUpdated → getPass slice (Task 6) and Baby fan-out wiring.
- **User-visible failures:** Human 401/403/404/410/429 matrix largely planned for issue/token/unlink; mint disabled/forbidden/rate-limit **missing**. Settings `fail` request-scoped covered via helper; RSC loader errors remain manual/optional e2e.
- **Empty / loading:** Pre–care-event getPass with empty latest planned (Task 3). Zero registrations skip APNs **not** planned. Skeleton parity — no automated CLS (accept manual per DESIGN_GUIDE).

## Edge scenarios checked

- **Boundaries:** Token TTL expired 410; single-use redeem; pushToken validation; 304 Last-Modified — planned. TTL mint bound (≤10m) implicit via expired redeem test only.
- **Idempotency:** Unlink second 204; register 201→200; session issue retry for **removed** user planned; **active** reissue gap. Mint “unsafe to retry” = new token each call — no assert that two mints yield two hashes (Enhancement).
- **Concurrency / partial data:** Rate limits not tested (double-submit on issue/mint/unlink). Notify tx before APNs after commit — tx assertions planned; compensating APNs failure not required v1.
- **Ownership / tenancy:** Non-member 403 on issue/unlink planned; mint 403 gap. Wrong-user QR token planned. PassKit `status≠active` → 401 planned; human unlink vs WS unregister both lead to removed — WS path planned, human unlink WS effect partial.

## Fix ask for Build

Fold into `04-tasks.md` TDD sections (Red first):

1. **Task 6 (Major):** `it("notify bumps updatedAt so listUpdated returns serial and getPass shows careSummary")` — full test DB loop after register.
2. **Task 6 (Major):** `it("maybeNotifyBabyCareCreated calls wallet notify when Apple enabled")` — deps spy in `notify.test.ts`; assert not called when disabled.
3. **Task 3 (Major):** `it("GET issue returns 429 when rate limited")`.
4. **Task 4 (Major):** Mint route trio: `apple_disabled` 404, `forbidden` 403, `rate_limited` 429.
5. **Task 7 (Major):** `walletStatusFrom` table test — not_linked / pending / active / ephemeral fail.
6. **Task 8 (Major):** `it("after unlink getPass returns 401 and listUpdated omits serial")` (+ push tokens empty already planned).
7. **Task 1 (Enhancement):** BASE_URL gate unit alongside env completeness.
8. **Task 5 (Enhancement):** Wrong passTypeId listUpdated 404; optional two-device same serial.
9. **Task 2 (Enhancement):** Housekeeping prune issue_token rows (if hook lives in Task 2).

Prefer **one strong integration test** (Fix #1) over many thin route mocks. Reuse repo patterns: `node:test` + fake deps (`watch-pairing-service.test.ts`, `notify.test.ts`); WalletCast-style PGlite/test DB for WS if the repo adds `createTestDb` or Drizzle test harness for apple-wallet.

**Explicit non-goals (OK):** Live APNs; real lock-screen e2e; optional Settings e2e; timing-safe `safeEqual` unit (nice-to-have if exported like WalletCast).

## Auto-approve for Gate B?

**No** for test-case plan quality until Fix ask Majors (Tasks 3, 4, 6, 7, 8) are folded into `04-tasks.md`. Human Gate B still owns design + tasks approve (HITL blocking).

## Round notes

- Design-review clean; planned summary in `04-tasks.md` matches API/DB contracts and WalletCast reference patterns (`walletcast-main/src/lib/apple/apple.test.ts`, `broadcast.test.ts`).
- Strongest hole vs Gate A metric: **no named red** for notify → device poll path (`updatedAt` bump + latest text) or Baby `notify.ts` fan-out — highest regression risk for “Telegram parallel.”
- Rate-limit reds missing on **issue** (Task 3) despite Task 8 unlink + design matrix — align all three human mutators before Build.
- No product code in this stage. Parent: fold Fix ask → re-read 04a or proceed Gate B with updated tasks → Build TDD.
- **2026-10-05:** Fix ask (Majors + Enhancements) folded into `04-tasks.md` TDD bullets — concrete `it(...)` names and assertions; optional Settings e2e and no automated APNs/lock-screen unchanged.
