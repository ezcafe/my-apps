# Tasks: apple-wallet-notifications

**Design option:** Decision 1 Option 1 (pending Gate B)  
**Has API:** yes · **Has DB:** yes · **Has UI:** yes  
**TDD:** Red tests first for lib/API/status helpers.  
**E2E:** Optional Settings gate/visibility only. **No automated e2e for real APNs/lock-screen** (needs Apple certs + device) — say so in `06-test-log`.  
**Design-update:** Round 2 — acceptance aligned to Round 2 API/DB residuals in `03-design.md`.

## UI locks (every UI task)

- Shell `/settings` only; Add first when enabled; status second (not linked / pending / active / fail)
- fail = request-scoped only (reload → not_linked | pending | active)
- QR secondary; hide Add/QR when Apple off; skeleton parity if category chrome changes
- Design tokens / `SettingsSection`; light+dark

## Security checks (cross-cutting)

- [ ] Issue/unlink require session + Baby workspace membership (`workspaceCookieName("baby")` / optional `workspaceId`)
- [ ] Mutators (`POST` mint, `DELETE` unlink) call `assertSameOriginStrict`
- [ ] PassKit routes use timing-safe `ApplePass` compare; reject `status≠active`
- [ ] Issue token: single-use + TTL ≤10m; rate-limit issue + mint + unlink
- [ ] No PEMs/tokens in logs or DB plaintext beyond required auth_token storage
- [ ] APNs 410/Unregistered prune

---

## Task 1 — Apple enable gate + env example (S)

**Acceptance:**
- [ ] `isAppleWalletEnabled` (all required `APPLE_*` + base URL rule as Design) mirrors Telegram pattern
- [ ] `.env.example` documents names only (no secrets)
- [ ] When false: issue/WS/notify refuse; Settings RSC gets `appleEnabled: false`

**TDD:**
- Unit: missing any required env → false; complete set → true
- Unit: `it("isAppleWalletEnabled is false when BASE_URL missing or not HTTPS")` — valid `APPLE_*` set but bad/missing base URL → false (mirror `lib/telegram/config.test.ts` gate style)

**Deps:** None · **Files:** `lib/apple-wallet/config.ts`, `.env.example`

## Task 2 — DB schema + migration (M)

**Acceptance:**
- [ ] Tables + columns match `03-design.md` Database contracts (PKs, types, nulls, defaults, status check)
- [ ] FKs: channel_state/subscriber/issue_token → `workspace` CASCADE; registration → device CASCADE + subscriber.serial CASCADE
- [ ] Uniques: `(workspace_id, user_sub)`, `serial_number`, `token_hash`
- [ ] Indexes: subscriber `(workspace_id, status)`; registration `(serial_number)`; issue_token `expires_at`
- [ ] Explicit **no RLS**; rows added to `docs/ARCHITECTURE.md` Non-RLS list for all five tables
- [ ] Housekeeping: prune expired/consumed issue tokens in `db-housekeeping` (or documented hook)
- [ ] Migration via repo Drizzle flow

**TDD:**
- Insert subscriber; unique conflict on second `(workspace,user)` and on `serial_number`
- Registration PK; FK cascade device→regs
- Index presence (or query plan smoke) for `(workspace_id, status)`, `registration.serial_number`, and `expires_at`
- Soft-unlink helper (if in this task) or deferred to Task 8: removed + zero regs
- Integration/unit (housekeeping hook): `it("prunes expired and consumed issue_token rows")` — expired + consumed deleted; active unconsumed retained

**Deps:** Task 1 · **Files:** `db/schema/*`, migrations, `docs/ARCHITECTURE.md`, `lib/db-housekeeping.ts`

## Task 3 — Pass build + session issue (M)

**Acceptance:**
- [ ] Build signed `.pkpass` with `webServiceURL`, serial, auth token, `latest` + `changeMessage: "%@"`
- [ ] `GET /api/apple-wallet/issue` (session): Baby workspace resolve + membership; upsert subscriber (stable serial; removed→active keep auth); `200` + `Content-Type: application/vnd.apple.pkpass` + `Cache-Control: no-store`
- [ ] Reissue **safe to retry** (same serial)
- [ ] Issue tx ensures `apple_wallet_channel_state` row for workspace (empty `latest_message` if absent) so getPass never 404s for missing channel after successful issue
- [ ] Apple disabled → `404` `{ error, code: "apple_disabled" }`; non-member → `403` `{ error, code: "forbidden" }`; unauth → `401`
- [ ] Rate-limit issue download

**TDD:**
- Unit: pass field includes changeMessage (fake certs OK)
- Route: unauthenticated → 401; enabled+member → 200 pkpass content-type; disabled → 404 apple_disabled; non-member → 403
- Upsert: removed subscriber re-Add → same serial, status active
- Issue creates channel_state when absent; getPass (after register auth) before first care event → `200` with empty latest (not 404 channel missing)
- Route: `it("GET issue returns 429 when rate limited")` — exceed issue RPM → `429` `{ code: "rate_limited" }`

**Deps:** Task 2 · **Files:** `lib/apple-wallet/pass.ts`, `app/api/apple-wallet/issue/route.ts`

## Task 4 — QR issue token (S)

**Acceptance:**
- [ ] `POST /api/apple-wallet/issue-token`: session + `assertSameOriginStrict` + rate-limit; `201` `{ data: { url, expiresAt } }` + header `Cache-Control: no-store`
- [ ] Policy **single-use + TTL ≤10m**; token bound to workspace + user_sub
- [ ] `GET /api/apple-wallet/issue?t=`: issues owner’s pass; invalid → `401`; expired/used → `410` `{ code: "gone" }` (not 400)
- [ ] Mint marked **unsafe to retry** (new token each call)

**TDD:**
- Mint → redeem once → second redeem 410
- Expired → 410; unknown → 401; other user’s token cannot issue their pass
- Cross-origin mint → 400; unauth mint → 401
- Mint `201` includes `Cache-Control: no-store`
- Route (mirror watch-pair mint tests): Apple disabled → `404` `{ code: "apple_disabled" }`; non-member → `403` `{ code: "forbidden" }`; rate-limit → `429` `{ code: "rate_limited" }`

**Deps:** Task 3 · **Files:** issue-token route, token repo helpers

## Task 5 — PassKit web service (M)

**Acceptance:**
- [ ] register / unregister / listUpdated / getPass / log under `/api/apple/v1/**`
- [ ] Status codes per Design table: register `201`/`200`/`400`/`401`; unregister **`200` when ApplePass ok** (idempotent if reg already gone) / `401`; listUpdated `200` body / `204` / `404` (no ApplePass); getPass `200` pkpass+Last-Modified / `304` via `If-Modified-Since` / `401` / `404` unknown serial only; log `200`
- [ ] Register validates `pushToken`; device upsert + reg insert in **one tx**
- [ ] Unregister tx (WalletCast): delete reg → if 0 regs for serial set `status=removed` → if 0 regs for device delete device
- [ ] listUpdated / getPass / authorize require subscriber `status=active`; removed → **`401`** (not 404)
- [ ] getPass rebuilds pass with workspace latest text (channel row guaranteed by issue tx)

**TDD:**
- Unit (test db): register → listUpdated after bump → getPass; bad token → 401; bad pushToken → 400; removed subscriber → **401** on getPass; `If-Modified-Since` → 304 when unchanged
- Unregister last reg for serial → subscriber `removed`; orphan device deleted when no regs left
- listUpdated without ApplePass still works for deviceLibraryId
- Fake `buildPass` buffer OK
- Unit (test db): `it("listUpdated returns 404 for wrong passTypeId")` — WalletCast `apple.test.ts` parity
- Unit (test db, optional): `it("two device_library_id on same serial both appear in listUpdated and notify push-token SELECT")` — distinct push tokens for A + B

**Deps:** Task 2–3 · **Files:** `lib/apple-wallet/webservice.ts`, `app/api/apple/v1/**`

## Task 6 — APNs sender + notify fan-out (M)

**Acceptance:**
- [ ] Empty `{}` APNs to registered push tokens; prune 410/Unregistered
- [ ] On Baby care notify **in one tx**: `channel_state` **INSERT … ON CONFLICT DO UPDATE**; bump all active subscribers’ `updatedAt`; then APNs after commit
- [ ] Push-token SELECT joins registration+device+subscriber with `status=active` + `workspace_id`
- [ ] Injected deps; does not block GraphQL schedule path
- [ ] Skip when Apple off or no registrations
- [ ] First care event with no prior channel_state still sets latest (upsert, not update-only)

**TDD:**
- Unit: notify with fake ApnsSender records sends; 410 removes device/registration
- Unit: asserts channel_state upsert text + subscriber `updatedAt` bump in same logical flow
- Unit: removed subscribers excluded from push-token list
- Integration (test DB, prefer one strong test over thin mocks): `it("notify bumps updatedAt so listUpdated returns serial and getPass shows careSummary")` — issue + register → `notifyWalletCare(workspace, careSummary)` → assert subscriber `updated_at` increased → `listUpdated` with old `passesUpdatedSince` returns serial → `getPass` body includes latest text (parse pass.json or inject reader)
- Unit (`features/baby/server/notify.test.ts` deps pattern): `it("maybeNotifyBabyCareCreated calls wallet notify when Apple enabled")` — fake `isAppleWalletEnabled` + spy wallet send → wallet branch once per care event; Apple off → wallet not called; Telegram branch unchanged

**Deps:** Task 5 · **Files:** `lib/apple-wallet/{apns,notify}.ts`, `features/baby/server/notify.ts`

## Task 7 — Settings UI + status + unlink (M)

**Acceptance:**
- [ ] New Settings category: Add first, status second, QR secondary, unlink + delete-pass help
- [ ] Status from **RSC props** (`appleEnabled`, `status`) — no `GET /api/apple-wallet/status`
- [ ] Mapping: none → not_linked; issued 0 regs → pending; ≥1 reg → active; **fail only request-scoped** after Add error (reload never shows fail from DB)
- [ ] Baby workspace resolve for status matches API (cookie `baby`)
- [ ] Apple off: no Add/QR; unavailable copy
- [ ] Short note Telegram is separate (Baby settings)
- [ ] Skeleton parity in `loading.tsx` if section count/layout changes

**TDD:**
- Unit: `walletStatusFrom` table — `walletStatusFrom(null, 0)` → `not_linked`; active subscriber + `regCount=0` → `pending`; `regCount≥1` → `active`; `requestFail=true` → `fail`; `requestFail=false` → not `fail`
- Unit/settings search: keywords find Apple Wallet category
- Optional e2e: settings shows/hides Add by `appleEnabled` mock — **skip if hard**; document

**Deps:** Task 3–5 · **Files:** `app/(shell)/settings/*`, `components/settings/*`, loading skeleton

## Task 8 — Unlink API + docs stub (S)

**Acceptance:**
- [ ] `DELETE /api/apple-wallet/subscription`: session + same-origin + rate-limit (mirror mint) + Baby membership
- [ ] Soft `status=removed` + **delete registrations** (and orphan devices) in **one tx**
- [ ] Idempotent: already removed / never linked → `204`
- [ ] After unlink: push-token query returns none; listUpdated/getPass ignore removed
- [ ] Short ops note pointing at WalletCast-style Apple setup (Pass Type ID, WWDR, HTTPS)

**TDD:**
- Route: member unlinks → 204; second DELETE → 204; registrations gone; notify join empty for that serial
- Non-member → 403; cross-origin → 400; rate-limited → 429 `rate_limited`
- Route/integration: `it("after unlink getPass returns 401 and listUpdated omits serial")` — after DELETE subscription, prior ApplePass on getPass → `401`; device `listUpdated` → `204` or empty serial list (push-token query empty covered above)

**Deps:** Task 2, 7 · **Files:** delete route, `docs/` setup stub (names only)

## Task 9 — Verify suite (S)

**Acceptance:**
- [ ] Focused unit/route tests green; typecheck/lint for touched paths
- [ ] Manual (when certs exist): Add → active → care event → lock-screen — else note blocked by env gate

**TDD:** Re-run Tasks 1–8 tests; no new e2e required for APNs

---

## Task order

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9  
(4 can parallel 5 after 3; 7 after status data from 3+5)

## Planned tests summary (for 04a)

| Area | Automated? |
|------|------------|
| Enable gate | Unit yes |
| Schema / FKs / indexes / Non-RLS doc | Integration/unit yes |
| Pass changeMessage / issue auth / content-type | Unit + route yes |
| Issue token single-use + TTL (401/410) + mint no-store | Unit/route yes |
| WS register/listUpdated/getPass codes | Unit yes |
| Notify upsert+tx + push `active` filter + APNs prune | Unit yes (fake APNs) |
| Status helper (incl. ephemeral fail) + settings search | Unit yes |
| Unlink soft-remove + reg delete idempotent + rate-limit | Route yes |
| Real device lock-screen / APNs | **No** — manual only |
| Settings e2e | Optional / skip OK |

**If no certs in CI:** Apple stays disabled; tests use fakes/self-signed as WalletCast does — do not require live APNs in CI.
