# Design review log: apple-wallet-notifications

**Result:** clean
**Round:** 4
**Updated:** 2026-10-05

## API contract review (when Has API)

Filled by the isolated **API contract review** Task only. Skip section when Has API = no.

**Result:** clean  
**Round:** 3  
**Updated:** 2026-10-05  
**Skill:** api-and-interface-design  
**Sources:** `03-design.md` API contracts + sequence (post Round 2 design-update) · `04-tasks.md` Tasks 3–5/8 · `02-analysis.md` · `02-skim.md` · `00-run.md` · `lib/api-http.ts` · `app/api/watch/pair/route.ts` · WalletCast `webservice.ts` (reference)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | No Critical / Major / Enhancement findings | — |

**Round 2 residuals verified in design + tasks:**

| Topic | Status |
|-------|--------|
| Mint `201` + `Cache-Control: no-store` (watch-pair parity) | `03-design.md` issue-token headers row; Task 4 acceptance + TDD |
| Unlink rate-limit (mirror mint RPM) + `429` `rate_limited` | Locked picks; DELETE guards; human matrix; OWASP A04; Task 8 acceptance/TDD |
| getPass `304` via `If-Modified-Since` (HTTP-date seconds) | PassKit table + Task 5 TDD |
| getPass / authorize: `401` bad auth or `status≠active`; `404` unknown serial only | Authorize rule + getPass row; Task 5 (removed → `401`) |

**API checklist:** typed I/O ✓ · one error shape ✓ (`{ error, code, details? }`) · edge validation ✓ · pagination N/A · additive N/A (new surface) · naming OK · idempotency ✓ (per-route) · matches repo patterns ✓ (flat `api-http` envelope; mint `{ data }` + no-store; watch-pair RPM mirror)

**Also OK (prior rounds):** Per-route success I/O; flat human error matrix (no `400` for bad/expired `t`; `410` `gone`); Baby `workspaceCookieName("baby")` + optional `workspaceId` + 403; Settings RSC-only status; PassKit WS table (register/unregister/listUpdated/getPass/log); listUpdated without `ApplePass`; single-use+TTL issue token; same-origin on mint/unlink; sequence failure alts; Tasks 3–5/8 acceptance aligned to contracts.

### Fix ask (API only)

None — Round 3 clean.

## DB design review (when Has DB)

Filled by the isolated **DB design review** Task only. Skip section when Has DB = no.

**Result:** clean  
**Round:** 3  
**Updated:** 2026-10-05  
**Skill:** database-and-data-model  
**Sources:** `03-design.md` Database contracts + example queries (post Round 2 design-update) · `04-tasks.md` Task 2/3/5/6/8 · `db/schema/watch-pairing-code.ts` · `docs/ARCHITECTURE.md` Non-RLS · WalletCast `subscribers/repository.ts` · AGENTS.md Database/Drizzle

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | No Critical/Major/Enhancement/Nit findings this round. | — |

**DB checklist:** typed columns/nulls ✓ · indexes/uniques ✓ (subscriber `(workspace_id, status)`, registration `(serial_number)`, issue_token `expires_at` + `token_hash`) · write+read owners ✓ (channel_state: **issue** ensure + notify) · migration additive ✓ · backfill N/A · multi-write tx ✓ (issue/register/unregister/unlink/notify) · unsafe array/`SUM::int` N/A · lists bounded OK · tenant/ownership + Non-RLS ✓ · design↔tasks match ✓

**Round 2 residuals — verified in design + tasks:**
- **channel_state on issue:** Transactions require `apple_wallet_channel_state` INSERT … ON CONFLICT DO NOTHING (empty latest) in issue upsert; write owners list **issue**; getPass contract notes channel guaranteed post-issue; Task 3 acceptance/TDD cover absent row + pre–care-event getPass `200`.
- **Unregister (WalletCast):** Transactions lock delete reg → 0 regs for serial → `status=removed` → 0 regs for device → delete device; soft-unlink table + pending vs **not_linked** after last unregister; Task 5 acceptance/TDD aligned with WalletCast `unregisterAppleDevice`.
- **registration.serial_number index:** Documented on table + Task 2 indexes/TDD smoke.
- **Register set-active:** Documented no-op when authorize requires `active`.

**Also OK (carried):** Full column lists + PKs/checks; FKs/`ON DELETE`; soft-unlink + reg delete + `status=active` filters; removed→re-Add upsert (stable serial, keep auth_token); notify `INSERT…ON CONFLICT DO UPDATE` + tx + push-token SELECT; per-table owners + explicit Non-RLS (Task 2 ARCHITECTURE); issue_token mirrors `watch_pairing_code`; ephemeral fail; example queries use Drizzle/table refs; QR redeem shares session issue upsert (same DB path).

### Fix ask (DB only)

None — DB section **clean** for Gate B build (schema/migration/tasks contract).

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | No Critical / Major / Enhancement findings (general design review). | — |

**General checklist (Mode full):** Problem map + ★ ✓ · Analyze What/Why/How + Solution branches ✓ · Grill frontier-empty ✓ · System design Overview (boundaries, auth split, failure) ✓ · Design patterns taught (env gate, notify deps, WalletCast thin routes) ✓ · Sequence (actors, alts: disabled, token, rate-limit, WS auth) ✓ · Tasks sized with acceptance + TDD “red first” ✓ · UI locks match Gate A #1 Add-first / #2 status / hide when off / skeleton parity ✓ · OWASP design table present ✓ · ADR-001/002 + GLOSSARY terms ✓ · Skim constraints honored (Settings home, v1 Baby, no Google) ✓ · API/DB depth → see isolated sections (Round 3 clean).

## Fix ask for my-dev-flow-design

None — overall **clean** for Gate B (API Round 3 + DB Round 3 + general review).

## Deferred Enhancements

- Optional: name QR render approach in Task 7 (Analyze spike: no `qrcode` dep yet — server PNG vs small lib).
- Optional: Task 6 acceptance line naming Telegram `careSummary` for Grill Q3 traceability (behavior already implied by notify fan-out).

## Round notes

- API contract review round 1 — **needs update** (5 Major, 3 Enhancement, 1 Nit).
- Did not edit `01`–`04`. No production code. No DB or general design review.
- Verifier did not author design docs.

### Round 1 — design-update (Architect)

**Updated:** 2026-10-05  
**Files:** `03-design.md`, `04-tasks.md` (this log only for notes). No production code. Gate A idea kept.

**User-first locks applied:**
- Issue token: **single-use + TTL ≤10m** → invalid `401`, expired/used `410` `gone`
- Settings status: **RSC `/settings` props** (no REST status route)
- Soft-unlink: `status=removed` + **delete registrations** in same tx; push/WS filter `status=active`
- fail UI: **request-scoped only** (no durable error column)

**API Fix ask → done:**
1. Typed success/error for issue (session + `?t=`), issue-token `201 { data: { url, expiresAt } }`, DELETE `204`; pkpass `Content-Type` + `Cache-Control`; flat `{ error, code }`; dropped `400` for bad tokens.
2. Workspace resolve: Baby `workspaceCookieName("baby")` + optional `workspaceId` + membership → 403; wired into issue/status/unlink.
3. PassKit WS response table aligned with WalletCast (register/listUpdated/getPass/log); listUpdated no `ApplePass`.
4. Idempotency per mutator; token policy locked; same-origin + rate-limit on mint/unlink.
5. Tasks 3–5/8 acceptance + TDD updated for shapes/codes/workspace/WS.
6. Sequence: alt notes for disabled, bad/expired token, rate-limit, register 401/400.

**DB Fix ask → done:**
1. Full column lists, FKs/`ON DELETE`, no RLS + ARCHITECTURE Non-RLS entries (Task 2), per-table owners, notify + `expires_at` indexes.
2. Soft-unlink + removed→re-Add upsert (stable serial, keep auth_token); push/WS `active` filter; no misleading cascade-on-soft-remove.
3. channel_state upsert; notify tx; push-token SELECT; register/unlink txs; APNs after commit.
4. Tasks 2/6/7/8 acceptance tightened (FKs, indexes, Non-RLS, upsert/unlink, ephemeral fail).
5. Issue token mirrors `watch_pairing_code` (`consumed_at`); housekeeping prune.

### Round 2 — API contract review (verifier)

**Updated:** 2026-10-05  
**Result:** **needs update** (1 Major, 1 Enhancement, 2 Nit).  
**Scope:** API section only after Round 1 design-update. Did not edit `01`–`04`. No DB or general review. Verifier did not author design docs.

**Round 1 API Majors:** cleared (typed I/O, error matrix, workspace resolve, PassKit WS table, idempotency/token policy, tasks, sequence).

**Residuals:** mint `201` missing `Cache-Control: no-store` (Major); unlink rate-limit still omitted vs Fix ask #4 (Enhancement); getPass `If-Modified-Since` / removed 401 vs 404 (Nits).

### Round 2 — DB design review (verifier)

**Updated:** 2026-10-05  
**Result:** **needs update** (1 Major, 2 Enhancement, 1 Nit).  
**Scope:** DB section only after Round 1 design-update. Did not edit `01`–`04`. No production code. Verifier did not author design docs.

**Round 1 DB Majors/Enhancements:** cleared (typed schema, FKs, soft-unlink/upsert, indexes, txs, notify upsert, owners/Non-RLS, tasks, issue_token/housekeeping, ephemeral fail, push-token SELECT).

**Residuals:** issue `channel_state` optional vs getPass channel-missing 404 (Major); unregister still “maybe” vs WalletCast/pending semantics (Enhancement); `registration.serial_number` index (Enhancement); register set-active vs authorize (Nit).

**Overall Result:** needs update (API Round 2 residuals + DB Round 2 residuals).

### Round 2 — design-update (Architect)

**Updated:** 2026-10-05  
**Files:** `03-design.md`, `04-tasks.md` (this log only for notes). No production code. Grill locked picks unchanged except explicit Round 2 locks below.

**User-first locks applied (Round 2):**
- Mint `201`: **`Cache-Control: no-store`** (watch-pair parity)
- Unlink: **rate-limit** mirror mint RPM + matrix `429` `rate_limited`
- Issue tx: **ensure `channel_state`** (empty latest upsert) — getPass not 404 for missing channel after issue
- Unregister: **`200` when ApplePass ok** (WalletCast idempotent)
- getPass: **`401`** for bad auth or `status≠active`; **`404`** unknown serial only; **`304`** via **`If-Modified-Since`**
- Index **`apple_wallet_registration(serial_number)`**
- Unregister tx: WalletCast lock (0 regs → `removed` + orphan device delete); **pending** = issue→first register; last unregister → **not_linked** until re-Add
- Register set-active: documented **no-op** when authorize requires active

**API Fix ask (Round 2) → done:**
1. issue-token headers + Task 4 TDD
2. unlink rate-limit + Task 8 acceptance/TDD + error matrix + OWASP A04
3. Nits: If-Modified-Since; removed getPass → 401

**DB Fix ask (Round 2) → done:**
1. channel_state on issue (required) + write owners + Task 3/5 acceptance/TDD
2. unregister tx locked + Task 5 acceptance/TDD
3. serial_number index (Task 2); register set-active note

**Ready for:** API + DB contract re-review (Round 3 or same-round verify).

### Round 3 — DB design review (verifier)

**Updated:** 2026-10-05  
**Result:** **clean** (0 Critical, 0 Major, 0 Enhancement, 0 Nit).  
**Scope:** DB section only after Round 2 design-update. Did not edit `01`–`04`. No production code. Verifier did not author design docs.

**Round 2 DB residuals:** cleared — issue ensures `channel_state`; unregister tx matches WalletCast; `registration(serial_number)` index; register set-active documented as no-op; Tasks 2/3/5/8 acceptance/TDD match `03-design.md`.

### Round 3 — API contract review (verifier)

**Updated:** 2026-10-05  
**Result:** **clean** (0 Critical / Major / Enhancement).  
**Scope:** API section only after Round 2 design-update. Did not edit `01`–`04`. No DB or general review. Verifier did not author design docs.

**Round 2 API residuals:** cleared — mint `Cache-Control: no-store`; unlink rate-limit + matrix `429`; getPass `If-Modified-Since` / `304`; removed subscriber → `401` (not `404`).

### Round 4 — General design review (verifier)

**Updated:** 2026-10-05  
**Result:** **clean** (0 Critical / Major / Enhancement in general Findings).  
**Scope:** Full Mode checklist after API + DB Round 3 clean. Did not deep-re-review API/DB contracts. Did not edit `01`–`04`. No production code. Verifier did not author design docs.

**Cross-cutting:** Tasks 3–8 acceptance/TDD align with `03-design.md` UI locks, OWASP A04 rate-limits, sequence failure alts, and security checks block in `04-tasks.md`. Unlink UI (Task 7) + API (Task 8) sequencing is build-order only — not a contract gap.

**Overall Result:** **clean** — ready for TDD test-case review (if planned) → Gate B.
