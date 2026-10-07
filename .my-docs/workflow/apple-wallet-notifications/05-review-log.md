# Review log: apple-wallet-notifications

**Result:** clean  
**Round:** adversarial/quality 2 clean → SPM Round 1 (needs fix) → Fix → SPM Round 2 clean  
**Updated:** 2026-10-05  
**Review profile:** full  
**SPM plan:** api+db+security  
**Note:** Fresh Merge findings arbiter (Round 2). Did not write draft or lenses. No code fixes in this stage.

## Adversarial test review

**Result:** clean

### Round 1 findings (closed)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/apple-wallet/apple-wallet.test.ts` other-user token | Tautological “other user” token case — redeem only asserted owner ≠ attacker. | fixed |
| Major | `lib/apple-wallet/http.test.ts` vs `http.ts` QR map | QR redeem HTTP failure mapping untested (410 gone / 401 unauthorized). | fixed |
| Major | `db/schema/apple-wallet.test.ts`; Task 2 TDD | No insert uniqueness / FK cascade repro (AST-only). | fixed |
| Major | `features/baby/server/notify.test.ts` wallet spy | Wallet fan-out call-count theater (args ignored). | fixed |
| Major | `features/baby/server/notify.test.ts` many-path | `maybeNotifyBabyCareCreatedMany` had no wallet coverage. | fixed |
| Major | `lib/apple-wallet/apple-wallet.test.ts` multi-device | Multi-device overclaimed listUpdated (never parsed serials for both devices). | fixed |
| Enhancement | `http.test.ts` DELETE | Unlink when Apple disabled → 404 apple_disabled. | fixed |
| Enhancement | `http.test.ts` orphan device | Orphan device row after DELETE not asserted. | fixed |
| Enhancement | webservice register | Second register → 200 idempotent not locked. | fixed |
| Enhancement | getPass unknown serial | Design 404 vs WalletCast-style 401 not locked. | fixed |
| Enhancement | Persistence harness | Drizzle store txs never executed in tests. | fixed (skip without DATABASE_URL) |
| Nit | `http.test.ts` 403 paths | Prefer `{ code: "forbidden" }` body parity. | deferred |
| Nit | Determinism | A few bare `new Date()` — OK for relative asserts. | deferred |

**Fix ask (Round 1) — closed:**

1. ~~Other-user token tautology → real binding/negative case~~
2. ~~HTTP `issue?t=` second → 410 gone; unknown → 401 unauthorized~~
3. ~~Task 2 unique conflict + cascade (always-on + optional live DB)~~
4. ~~Wallet notify spy args~~
5. ~~`maybeNotifyBabyCareCreatedMany` wallet per step + Apple off~~
6. ~~Multi-device listUpdated serials for both devices~~

### Round 2 (re-check after Fix)

Fresh Senior Verifier. Re-read Fix notes + suites. Focused run:

`corepack pnpm exec tsx --import ./scripts/test-env.mjs --test lib/apple-wallet/*.test.ts db/schema/apple-wallet.test.ts features/baby/server/notify.test.ts components/settings/settings.test.ts`

→ **74 pass / 0 fail / 3 skipped** (live schema uniqueness+cascade + Drizzle store smoke when `DATABASE_URL` unset).

| Fix ask | Re-verify |
|---------|-----------|
| 1 other-user binding | `apple-wallet.test.ts`: pre-issue attacker; redeem owner mint; owner ws/user; attacker serial/auth unchanged; no ws-2 spill. |
| 2 HTTP QR map | `http.test.ts`: second redeem → 410 `{ code: "gone" }`; unknown → 401 `{ code: "unauthorized" }`. |
| 3 schema uniqueness | Migration SQL unique+CASCADE locks; always-on conflict + cascade substitutes; live inserts `{ skip: !hasDb }`. |
| 4 wallet spy args | `notify.test.ts`: `walletArgs` deepEqual `[["ws-1","Bottle 120ml"]]`; Apple off → `[]`. |
| 5 many-path wallet | Per-step `[["ws-1","Breast"],["ws-1","Diaper"]]`; Apple off → zero calls. |
| 6 multi-device listUpdated | Parses `serialNumbers` for **both** `device-a` and `device-b`; push-token distinct kept. |

Enhancements from Round 1 also closed in Fix (unlink apple_disabled; orphan device; register 200; getPass 401 + comment; `store.db.test.ts`).

**Open Critical / Major:** none.  
**Deferred:** Nit — forbidden body `{ code: "forbidden" }` parity; bare `new Date()` determinism.

**Adversarial test review: clean.**

## Adversarial Fix (round 1)

**Updated:** 2026-10-05  
**Result:** Majors + Enhancements addressed in tests (no product scope expand)

| Finding | Fix |
|---------|-----|
| Major — other-user token tautology | `apple-wallet.test.ts`: pre-issue attacker pass; redeem owner mint; lock owner ws/user/serial; attacker auth/serial unchanged; no ws-2 spill. |
| Major — HTTP QR error map | `http.test.ts`: `issue?t=` second redeem → `410` `{ code: "gone" }`; unknown → `401` `{ code: "unauthorized" }`. |
| Major — schema uniqueness theater | `db/schema/apple-wallet.test.ts`: migration SQL unique + CASCADE locks; always-on insert conflict + device→reg cascade substitutes; optional live Postgres inserts when `DATABASE_URL` set. |
| Major — wallet notify call-count | `notify.test.ts`: spy records `[workspaceId, careSummary]` (`ws-1` / `Bottle 120ml`). |
| Major — many-path wallet silence | `notify.test.ts`: `maybeNotifyBabyCareCreatedMany` wallet once per step; Apple off → zero calls. |
| Major — multi-device listUpdated | `apple-wallet.test.ts`: parse `serialNumbers` for **both** `device-a` and `device-b`; keep push-token distinct assert. |
| Enhancement — unlink apple_disabled | `http.test.ts` DELETE → `404` `{ code: "apple_disabled" }`. |
| Enhancement — orphan device after DELETE | assert `store.devices.has("d1") === false`. |
| Enhancement — register idempotent 200 | webservice: second register same device/serial → `200`. |
| Enhancement — getPass unknown serial | assert `401` + comment (WalletCast-style; Design 404 only after auth). |
| Enhancement — SQL store harness | `lib/apple-wallet/store.db.test.ts`: Drizzle `notifyCare` upsert + `softUnlink` orphan prune (skip without `DATABASE_URL`). |

**Nits left deferred:** forbidden body `{ code: "forbidden" }` parity; bare `new Date()` determinism.

## Quality

**Result:** clean  
**Round:** 2 (re-check after Fix)  
**Updated:** 2026-10-05  
**Role:** Senior Verifier (generation ≠ verification)  
**Scope:** Uncommitted / branch draft vs `01-idea`, `03-design`, `04-tasks`. Has UI yes — Gate A #1/#2 + Design UI locks. System design / Design patterns checked. API contracts deferred to API lens; schema/migrations deferred to DB lens.  
**Note:** Fresh Senior Verifier Round 2. Did not write the draft or the Fix. Generation ≠ verification.

### Checklist

- [x] Context understood (Option 1 PassKit + Settings + Baby fan-out)
- [x] Correctness + tests adequate (focused suites green; Majors locked)
- [x] Security (spot only — deep → security lens)
- [x] Architecture (patterns honored; issue tx closed)
- [x] Readability
- [x] Performance (spot — no hot-path N+1 flagged)
- [x] Deps/lockfile if touched (`passkit-generator` + `qrcode` — pin/advisory → security lens)
- [x] Verdict: **Approve**

### Round 1 findings (closed)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `apple-wallet-settings.tsx` / `http.ts` `pkpassResponse` | Navigational Add + `Content-Disposition` required for iPhone Wallet. | fixed |
| Major | `issue.ts` / `store.ts` upsert + channel | Issue subscriber + channel_state must be one DB tx. | fixed |
| Enhancement | `apple-wallet-settings.tsx` | `router.refresh()` after Add so active can appear after register. | fixed |
| Enhancement | `store.ts` `removePushTokens` | Last-token APNs prune → `status=removed` (unregister parity). | fixed |
| Enhancement | `issue.ts` `redeemAppleIssueToken` | Consume token only after successful issue. | fixed |

### Round 2 (re-check after Fix)

| Fix ask | Re-verify |
|---------|-----------|
| 1 Navigational Add + Content-Disposition | Settings: `<form method="GET" action={APPLE_WALLET_ISSUE_PATH}>` (no fetch→blob→download). `pkpassResponse` sets `Content-Disposition: attachment; filename="baby-care.pkpass"`. Locked by `apple-wallet-settings.test.ts` + `http.test.ts`. |
| 2 Issue upsert + channel one tx | `createDbAppleWalletStore.upsertSubscriberForIssue` runs subscriber upsert + `channel_state` INSERT ON CONFLICT DO NOTHING inside `db.transaction`. `issueApplePass` does not call `ensureChannelState`. Memory store mirrors same logical upsert. Locked by `apple-wallet.test.ts`. |
| 3 router.refresh after Add | `onAddSubmit` → pending + `router.refresh()`; `useEffect` syncs `initialStatus`; unlink also refreshes. |
| 4 APNs prune → removed | DB + memory `removePushTokens`: after device delete, serials with 0 regs → `status=removed`. Locked: last-token prune → `removed`. |
| 5 Token consume after issue | `redeemAppleIssueToken` awaits `issueApplePass` then `consumeIssueToken`. Locked: build failure leaves `consumedAt` null. |

Focused run (verifier): `http.test.ts`, `apple-wallet.test.ts`, `status.test.ts`, `config.test.ts`, `apple-wallet-settings.test.ts`, `store.db.test.ts` → **33 pass / 0 fail / 1 skip**.

### UI / Gate A parity (summary)

| Lock | Draft | Notes |
|------|-------|-------|
| Shell `/settings` only | Pass | Category `apple-wallet` + RSC props |
| Gate A #1 Add first when enabled | Pass | Label/order + navigational GET delivery |
| Gate A #2 status when section on | Pass (when enabled) | not_linked/pending/active; fail label kept (request-scoped; navigational errors surface as HTTP response) |
| QR secondary | Pass | `<details>` “Scan from another device” |
| Apple off: no Add/QR + unavailable | Pass | |
| Telegram separate line | Pass | Section description |
| Unlink + delete-pass help | Pass | |
| Skeleton category count | Pass | `loading.tsx` nav length 7 = `SETTINGS_CATEGORIES` |

### Design patterns

| Pattern | Honored? |
|---------|----------|
| Env all-required enable gate | Yes — `isAppleWalletEnabled` |
| Injected notify deps + schedule | Yes — `features/baby/server/notify.ts` |
| Framework-free PassKit + thin routes | Yes — `lib/apple-wallet/*` + thin `app/api/**` |
| Issue tx with channel_state | Yes — closed in Round 1 Fix |

### Open Critical / Major

- Critical: none  
- Major: none

**Quality review: clean.**

### Fix notes (Quality Round 1)

**Fixed (all Critical/Major + Enhancements):**

1. **Major — iPhone Add delivery:** Settings Add is a navigational `<form method="GET" action={APPLE_WALLET_ISSUE_PATH}>` (no fetch→blob→download). `pkpassResponse` sets `Content-Disposition: attachment; filename="baby-care.pkpass"`.
2. **Major — Issue DB tx:** `upsertSubscriberForIssue` upserts subscriber + `channel_state` INSERT ON CONFLICT DO NOTHING in **one** `db.transaction`. `issueApplePass` no longer calls `ensureChannelState` separately.
3. **Enhancement — status refresh:** Add `onSubmit` sets pending + `router.refresh()`; props sync via `useEffect`; unlink refreshes after success.
4. **Enhancement — APNs prune:** `removePushTokens` deletes dead devices then sets `status=removed` when a serial has 0 regs left (unregister parity → Settings `not_linked`, not stuck `pending`).
5. **Enhancement — issue token:** `redeemAppleIssueToken` builds/issues the pass **before** `consumeIssueToken`, so sign/build failure leaves the token redeemable.

**Tests locking Majors (+ enhancements):**
- `http.test.ts` — issue 200 asserts `Content-Disposition`
- `apple-wallet-settings.test.ts` — source lock: form GET, no blob/download/fetch issue
- `apple-wallet.test.ts` — upsert ensures channel without separate ensure; issue does not call `ensureChannelState`; redeem survives build failure; last-token APNs prune → `removed`

**Focused test run:** `http.test.ts`, `apple-wallet.test.ts`, `status.test.ts`, `config.test.ts`, `apple-wallet-settings.test.ts`, `store.db.test.ts` → **33 pass, 0 fail, 1 skip** (`store.db.test` skipped without `DATABASE_URL`).

## Merged SPM (API ‖ DB ‖ Security)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-api.md`, `05-lens-db.md`, `05-lens-security.md` (lenses in SPM plan this round).

**Round:** 2  
**Result:** clean  
**Fix ask:** none  
**Conflict priority:** Security Critical > API/DB contract / correctness / data-integrity > Quality > Perf/Memory Enhancements

### Round 1 (history — needs fix → Fix)

**Result (Round 1):** needs fix

#### Lens inputs

| Lens | File | Result | Open Critical/Major |
|------|------|--------|---------------------|
| api | `05-lens-api.md` | clean | none (A1 Enhancement; A2–A4 Nit) |
| db | `05-lens-db.md` | clean | none (D-N1/D-N2 Nit deferred) |
| security | `05-lens-security.md` | has findings | **S1, S2** Major (S3–S4 Enhancement) |

#### Winners (Fix these)

| Severity | Sources | Finding | Decision |
|----------|---------|---------|----------|
| Major | security **S1** | `redeemAppleIssueToken` ignores `consumeIssueToken` boolean after build. Concurrent redeem of one `t=` can both return `.pkpass` before only one row is consumed. Breaks Design / Task 4 / ADR-002 single-use. DB store’s conditional UPDATE is fine; caller race is the gap. | keep — Security Major |
| Major | security **S2** | Public `GET /api/apple-wallet/issue?t=` has no `enforceRateLimit`. Session issue / mint / unlink are limited; QR redeem is the unauthenticated abuse surface. Design A04 + Task security checks require rate-limit on issue. | keep — Security Major |
| Enhancement | api **A1** | Mint/unlink parse unbounded `req.text()` + `JSON.parse` cast; no Zod for optional `workspaceId`. Watch-pair mint uses `readJsonBounded` + schema. | keep — API contract hygiene |
| Enhancement | security **S3** | PassKit `/log` unauthenticated and uncapped beyond entry length caps; cheap log noise / DoS. | keep (optional RPM) |
| Enhancement | security **S4** | Transitive `joi` advisories via `passkit-generator`; reachability low for this draft. | keep (triage / track) |

#### Conflicts resolved (losers)

| Dropped / demoted | Lost to | Why |
|-------------------|---------|-----|
| DB note that `consumeIssueToken` conditional UPDATE “matches single-use” | **S1** | Store method is correct; Security Major is caller ignore + TOCTOU. No DB schema change required for S1. |
| Quality Round 1 “consume after successful issue” (closed) | — | Sequential consume-after-build is already in place; **S1** is the concurrency / ignored-boolean gap — not a reopen of that Enhancement. |
| API A2–A4 Nit; DB D-N1/D-N2 Nit | — (deferred) | Design prose / unused 503 row / PassKit disabled body / prune batch / orphan-count loops — non-blocking. |

#### Fix ask (for Fix agent)

1. **Major (S1):** In `lib/apple-wallet/issue.ts` `redeemAppleIssueToken`, after successful build require `consumeIssueToken === true`; if false → treat as `gone` (410) and **do not** return `.pkpass` bytes (or claim token with conditional UPDATE before build and release on hard failure). Add a concurrent-redeem test.
2. **Major (S2):** In `lib/apple-wallet/http.ts` `handleIssueGet` token (`t=`) branch, apply IP (or shared-store) rate limit **before** redeem — same RPM family as session issue or a dedicated public redeem bucket. Cover with a 429 route test.
3. **Enhancement (A1):** Mint/unlink: small Zod schema (`workspaceId` optional UUID) + `readJsonBounded`; parse/validation fail → `400` `bad_request` (peer watch-pair mint).
4. **Enhancement (S3):** Optional shared rate limit on `/api/apple/v1/log`; keep redaction.
5. **Enhancement (S4):** Triage `joi` via override/bump when compatible, or track upstream `passkit-generator`; re-audit before release.

#### Deferred (do not block Result)

| Id | Note |
|----|------|
| A2 Nit | Soften design getPass unknown-serial 404 → match code 401 (already test-locked). |
| A3 Nit | Wire `dbUnavailable` or drop matrix 503 row. |
| A4 Nit | Optional empty-body 404 for PassKit when Apple off. |
| D-N1 / D-N2 | Unbounded prune DELETE; tiny per-serial orphan loops — design-ok at current volume. |
| Adversarial/Quality residual Nits | Forbidden body `{ code: "forbidden" }` parity; bare `new Date()` determinism. |

#### Round notes

- Lenses this round: **api**, **db**, **security** (no perf/memory).
- API + DB **clean**; Security drives merge Result.
- Open after merge: **2 Major** (S1, S2) + 3 Enhancement (A1, S3, S4).
- **Merged SPM Result: needs fix** — Fix agent must close S1 + S2 before lens re-verify.

### Round 2 (re-verify after Merged SPM Fix)

**Round:** 2  
**Result:** clean  
**Conflict priority:** Security Critical > API/DB contract / correctness / data-integrity > Quality > Perf/Memory Enhancements  
**Note:** Fresh Merge findings arbiter. Did not write draft, Fix, or lenses. No code changes in this stage.

#### Lens inputs

| Lens | File | Result | Open Critical/Major |
|------|------|--------|---------------------|
| api | `05-lens-api.md` | clean | none (A2–A4 Nit deferred; A1/S1/S2 closed) |
| db | `05-lens-db.md` | clean | none (D-N1/D-N2 Nit deferred) |
| security | `05-lens-security.md` | clean | none (S1–S4 closed) |

#### Winners (Fix these)

| Severity | Sources | Finding | Decision |
|----------|---------|---------|----------|
| — | — | No open Critical / Major / Enhancement after merge. | — |

#### Conflicts resolved (losers)

| Dropped / demoted | Lost to | Why |
|-------------------|---------|-----|
| — | — | No API vs DB vs Security clash. All three lenses **clean**. |

#### Fix ask (for Fix agent)

_(none — clean)_

#### Deferred (do not block Result)

| Id | Note |
|----|------|
| A2 Nit | Soften design getPass unknown-serial 404 → match code 401 (already test-locked). |
| A3 Nit | Wire `dbUnavailable` or drop matrix 503 row. |
| A4 Nit | Optional empty-body 404 for PassKit when Apple off. |
| D-N1 / D-N2 | Unbounded prune DELETE; tiny per-serial orphan loops — design-ok at current volume. |
| Security residual | Concurrent loser may still run `issueApplePass` before losing consume race (no second `.pkpass`). |
| Adversarial/Quality residual Nits | Forbidden body `{ code: "forbidden" }` parity; bare `new Date()` determinism. |

#### Round notes

- **Inputs:** API R2 clean (A1/S1/S2 verified); DB R1 clean (unchanged; no Fix surface); Security R2 clean (S1–S4 verified closed in code + tests).
- **Prior Merged SPM Round 1:** needs fix → Fix closed S1+S2+A1/S3/S4 → Round 2 re-verify.
- **Result:** **clean** — zero open Critical / Major / Enhancement. SPM loop done. Lens files left untouched; no production code in this step.
- **Merged SPM Result: clean** — Fix ask none.

## Merged SPM Fix (Round 1)

**Updated:** 2026-10-05  
**Role:** Senior Developer (Fix) — lens = merged SPM / security  
**Result:** S1 + S2 Majors + A1/S3/S4 Enhancements closed

### Fixed

| Id | Fix |
|----|-----|
| **Major S1** | `redeemAppleIssueToken`: after successful build, require `consumeIssueToken === true`; else throw `gone` (no `.pkpass`). Concurrent redeem test: one fulfilled + one `AppleIssueTokenError` `gone`. |
| **Major S2** | `handleIssueGet` `t=` branch: IP/anon `enforceRateLimit` (`apple-wallet:issue-redeem`, same `issueRpm`) **before** redeem. 429 test locks token still redeemable after deny. |
| **Enhancement A1** | Shared `readWorkspaceBody`: `readJsonBounded` + `appleWalletWorkspaceBodySchema` (`workspaceId` optional UUID, strict). Mint + unlink → `400` `bad_request` on bad JSON / invalid UUID. |
| **Enhancement S3** | `handlePassKitLog`: shared RPM (`apple-wallet:passkit-log`, `logRpm` default 60 / `APPLE_WALLET_LOG_RPM`). Redaction unchanged. 429 test. |
| **Enhancement S4** | `pnpm.overrides.joi` = `17.13.7` (patches all three advisories without jumping to joi 18). `pnpm audit` → 0 joi advisories. Reachability still low; override keeps passkit on patched 17.x. |

### Tests locking Fix ask

- `apple-wallet.test.ts` — concurrent redeem winner/loser
- `http.test.ts` — QR redeem 429 before redeem; mint bad JSON / bad UUID; PassKit log 429

### Focused test run

`corepack pnpm exec tsx --import ./scripts/test-env.mjs --test lib/apple-wallet/http.test.ts lib/apple-wallet/apple-wallet.test.ts lib/apple-wallet/status.test.ts lib/apple-wallet/config.test.ts`

→ **35 pass / 0 fail / 0 skipped**

**Open Critical / Major after Fix:** none (pending lens re-verify).
