# Analysis: Apple Wallet notifications

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.
**Updated:** 2026-10-05
**Has API (recommend):** **yes** — PassKit web service + authenticated pass issue
**Has DB (recommend):** **yes** — pass subscribers, devices, registrations (+ latest text / updatedAt)

## Deep dive (required)

### Overall

#### What is this?
Add Apple Wallet as a **parallel notify channel** to Baby Telegram: when Apple env/certs are ready, shell `/settings` lets each signed-in user **Add** a pass (QR secondary); Baby care events update the pass + empty APNs so iPhone shows a lock-screen message via `changeMessage`.

#### Why do we need this?
Caregivers without Telegram (or who want Wallet lock-screen alerts) have no opt-in path today. Skipping leaves Baby alerts tied to chat/browser only and wastes the proven WalletCast PassKit loop.

#### How to do this?
Learn WalletCast’s loop (issue `.pkpass` → device register → bump `latest` + subscriber `updatedAt` → empty APNs → device fetch → `changeMessage`). Mirror Telegram’s **env enable gate** + fire-and-forget notify; put subscribe UI only on shell `/settings` (Gate A lock). Do **not** ship a marketing-card product.

- **Other ways:** (1) Web Push for Baby like Loans — different UX, not Wallet lock-screen. (2) Run WalletCast as a separate app — dual ops, no shell Settings home.
- **Best practices:** Repo: `isTelegramEnabled` + `scheduleNotifyBabyCareCreated` deps; SettingsSection + skeleton parity. Industry/WalletCast: HTTPS `webServiceURL`, Pass Type ID cert, empty `{}` APNs, prune 410/Unregistered, bump `updatedAt` on message change.

#### Decision 1: Module placement for Apple Wallet code

##### Option 1 — Shared `lib/apple-wallet` (+ thin `app/api/apple/**`, `app/api/.../issue`)
**What it is:** Framework-light PassKit/APNs/issue logic under shared lib; routes thin; Baby notify calls into it.
**Example:** `lib/apple-wallet/{config,pass,webservice,apns,notify}.ts` + `app/api/apple/v1/**` like WalletCast.
**Pros:** Reusable beyond Baby; matches WalletCast “lib free of Next”; clear public PassKit surface.
**Cons:** New shared module; must keep workspace/user ownership explicit at call sites.
**Recommendation:** **Option 1** — channel is cross-feature; Baby is first caller only.

##### Option 2 — Nest under `features/baby` only
**What it is:** All PassKit + schema live as Baby-only.
**Example:** `features/baby/server/apple-wallet.ts` + Baby GraphQL for status.
**Pros:** Closer to first notify call sites.
**Cons:** Harder to reuse; Settings (core) would call into Baby; fights “Telegram shared bot / future features” pattern.
**Recommendation:** Reject for v1 architecture; Baby owns **fan-out call**, not the whole channel.

#### Decision 2: Subscriber grain (who is “active”)

##### Option 1 — Per signed-in user (+ devices) ★ preferred
**What it is:** Each user in a workspace adds their own pass; status = that user’s registration; fan-out to all active users’ devices in the workspace.
**Example:** Rows keyed by `(workspaceId, userSub, serialNumber)` + device/registration tables.
**Pros:** Matches Gate A “active = your pass”; multiple caregivers; clear unlink.
**Cons:** More rows than one shared Telegram chat; need device prune.
**Recommendation:** **Option 1**.

##### Option 2 — One workspace-shared pass (Telegram-like)
**What it is:** One serial/auth for the workspace; anyone scans same QR.
**Example:** Mirror `baby_telegram_link` one-row-per-workspace.
**Pros:** Simpler schema.
**Cons:** Breaks Gate A status copy; shared secret on pass; hard multi-caregiver UX.
**Recommendation:** Reject unless owner overrides Gate A.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Env gate + hide Settings CTAs; docs stub for certs | Low / no lock-screen yet | later (tasks) |
| **2. Systemic** ★ | Issue + PassKit WS + APNs + DB + Settings Add/status + Baby notify fan-out | High / certs+HTTPS | **yes** |
| **3. Creative** | External WalletCast sidecar; or Baby Web Push only | Medium–high / dual product or wrong channel | no |

- **★ Priority branch for this pass:** **2. Systemic** (matches idea ★: Wallet channel + Settings QR/Add when enabled).
- **Map to Design:** Option pair = Decision 1 Option 1 + Decision 2 Option 1; Design UI = SettingsSection category; Non-goals keep Google / marketing dashboard out.

### Solution pieces

#### 1. Shell Settings subscribe UI

##### What is this?
New Settings category/section: enable-gated **Add to Apple Wallet**, status (not linked / pending / active / fail), secondary QR + unlink/delete-pass help.

##### Why do we need this?
Without Settings, the channel has no day-to-day opt-in; Gate A locks this as primary home (Telegram stays `/baby/settings`).

##### How to do this?
- Approach: Extend `SETTINGS_CATEGORIES` + `SettingsSection` on `app/(shell)/settings/page.tsx`; server-pass `appleEnabled`; status from DB for `session.user.id` + active workspace; skeleton category count parity in `loading.tsx`.
- Other ways: Put under Baby settings — **forbidden** (Gate A).
- Best practices: Mirror `telegramEnabled` hide; Add first, QR in details; no fake active without registration.

#### 2. Apple env gate + pass issue

##### What is this?
`APPLE_*` env (Pass Type ID, Team ID, signer/WWDR PEMs) → `isAppleWalletEnabled`; authenticated endpoint issues signed `.pkpass` with `webServiceURL`, serial, auth token, `latest` + `changeMessage: "%@"`.

##### Why do we need this?
No issue path ⇒ no pass; showing Add without certs breaks trust (skim risk #1).

##### How to do this?
- Approach: Mirror `lib/telegram/config.ts` all-required gate; issue creates subscriber row then returns `.pkpass` (WalletCast `buildApplePass` / `passkit-generator`); Add button = direct download URL on this device; QR encodes same issue URL for other devices.
- Other ways: Public unauthenticated slug issue like WalletCast cards — weaker for multi-user workspace app.
- Best practices: Secrets only in env (`.env.example` names); HTTPS `BASE_URL` for updates; rate-limit issue.

#### 3. PassKit web service + APNs

##### What is this?
Apple’s register / unregister / listUpdated / getPass (+ log); empty APNs push on notify; prune dead tokens.

##### Why do we need this?
Pass installs without HTTPS + WS never update; without empty push + field change, no lock-screen.

##### How to do this?
- Approach: Port WalletCast `webservice.ts` / `apns.ts` shapes behind thin `app/api/apple/v1/**`; authorize `ApplePass <authToken>`; on Baby notify: set latest text, bump subscriber `updatedAt`, `sendPassUpdates([])` body `{}`, remove 410/Unregistered.
- Other ways: Polling-only without APNs — devices won’t wake reliably.
- Best practices: Apple PassKit update docs; bump `updatedAt` whenever message/design changes (WalletCast gotcha).

#### 4. DB schema (subscribers / devices)

##### What is this?
Persist pass serial, auth token, user+workspace ownership, device library id, push token, registration link, latest message (or equivalent), status, timestamps.

##### Why do we need this?
Telegram has `baby_telegram_link`; Wallet needs devices + registrations for the update loop and per-user status.

##### How to do this?
- Approach: Adapt WalletCast tables to my-apps: `workspace_id` + `user_sub` (not `cardId`); Drizzle + migration; RLS/workspace patterns like Baby.
- Other ways: Store only push tokens without serial — breaks getPass auth.
- Best practices: Unique serial; cascade unregister; write owner = issue/WS/notify services.

#### 5. Baby notify fan-out

##### What is this?
Extend Baby care notify so the same events that hit Telegram also update Wallet subscribers when Apple is enabled.

##### Why do we need this?
Metric/success: one Baby care event → lock-screen for active Wallet users.

##### How to do this?
- Approach: Keep `scheduleNotifyBabyCareCreated*` fire-and-forget; add Wallet branch (deps-injected like Telegram) after/alongside Telegram send; reuse Telegram `careSummary` for lock-screen text (Grill Q3 settled).
- Other ways: Separate event bus — overkill for v1.
- Best practices: Do not block GraphQL on APNs; log failures; skip when no active registrations.

## What exists today

my-apps: Baby Telegram enable → confirmed link → `notify.ts` send; shell Settings flat sections; no PassKit. WalletCast: full Apple loop + schema + `docs/setup-apple.md`. Loans Web Push is unrelated.

## Dependencies

- Apple Developer Pass Type ID certs + public HTTPS base URL for prod updates.
- New deps likely: `passkit-generator` (and image resize helper as needed).
- Settings category + skeleton; `.env.example` `APPLE_*`; Baby notify call sites unchanged in product job.
- Compatible with existing Telegram and Loans push (parallel, not replace).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `features/baby/server/notify.ts` | Fan-out hook + deps pattern |
| `lib/telegram/config.ts` | Enable-gate model |
| `db/schema/baby.ts` (`baby_telegram_link`) | Contrast: workspace-shared chat vs per-user Wallet |
| `app/(shell)/settings/page.tsx`, `components/settings/settings-types.ts`, `loading.tsx` | Subscribe home + skeleton |
| `components/baby-settings-page.tsx` | Status/pending UX pattern (keep separate) |
| WalletCast `src/lib/apple/{pass,webservice,apns}.ts`, `broadcast/broadcast.ts`, `db/schema.ts`, `docs/setup-apple.md` | Issue / WS / APNs / tables / ops |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Env all-required enable gate | `lib/telegram/config.ts` | Hide Add/QR when Apple incomplete |
| Injected notify deps + schedule | `features/baby/server/notify.ts` | Testable fan-out without blocking mutations |
| SettingsSection + category meta | `components/settings/*` | Gate A chrome; search keywords |
| Framework-free Apple WS + ApnsSender | WalletCast `webservice.ts` / `apns.ts` | Thin routes; fake APNs in tests |
| Pending → active status | Baby Telegram confirm UX | Map to issued → device-registered |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Parallel notify channel (Telegram ‖ Wallet) | Baby notify + new Wallet lib | Same event, two sinks; independent enable |
| PassKit update loop | Apple docs + WalletCast | Issue → register → empty push → fetch → changeMessage |
| Core Settings + feature event owners | `docs/ARCHITECTURE.md` | Subscribe UI on core; Baby owns care writes/notify trigger |
| Auth boundary split | PassKit `ApplePass` token vs session issue | Devices use pass auth; humans use session |

## Constraints and risks

- Gate A: Settings home; Add first; per-user active; hide when disabled.
- HTTPS required for updates; cert mismatch = undownloadable pass.
- Silent fake active if status ignores registration.
- Missing `updatedAt` bump ⇒ `listUpdated` empty ⇒ no notification.
- Do not invent Baby settings dual-home or Google Wallet this pass.

## Settled decisions (do not relitigate)

- Primary subscribe UI = shell `/settings`; Telegram stays `/baby/settings`.
- v1 events = Baby care (Telegram-like).
- Has UI = yes; Mode full.
- Per-user active status (Gate A) — not challenged in Grill.
- Shared `lib/apple-wallet` + thin PassKit routes (Analyze Decision 1 Option 1) — ADR-001 **Accepted**.
- Non-goals: Google Wallet, WalletCast marketing product, replace Telegram/Loans push.
- **Facts (Grill code check):** no PassKit in my-apps; WalletCast stores `latestMessage` on card + bumps subscriber `updatedAt`; Telegram is workspace-shared; no qrcode dep yet.
- **Grill Round 1 (human `1/1/1/1/1`):** Q1 one serial + multi-device registrations; Q2 session Add + short-lived QR token (ADR-002); Q3 reuse Telegram `careSummary` (**user overrode** grill rec Option 2); Q4 env-gated disabled until `APPLE_*`; Q5 workspace channel-state + bump subscriber `updatedAt`.

## Design tree (frontier)

### Settled
- Settings home + Add-first + enable gate; Baby care v1; learn WalletCast Apple loop; shared lib + per-user schema (Gate A / Analyze).
- **Q1** Devices: one serial per `(workspace, user)`; multi-device via registrations.
- **Q2** Issue auth: session Add + short-lived QR token.
- **Q3** Lock-screen copy: reuse Telegram `careSummary` (user override vs short template).
- **Q4** Certs: env-gated disabled until `APPLE_*` complete.
- **Q5** Latest: workspace channel-state + bump subscriber `updatedAt`.

### Open frontier
- _(empty)_

### Blocked
- _(none for Grill)_ — Design may write `03-design.md`. Gate B still blocking before Build.

**Grill recommended?** done → `02b-grill.md` **frontier-empty**.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| WalletCast Apple paths | Confirm issue/WS/APNs/schema for my-apps map | Loop + tables clear; drop cards/Google | keep as reference |
| my-apps QR libs | Need QR for secondary CTA | No qrcode usage in repo today | Design: add small QR lib or server PNG |
| context-mode FE routing | Skill asks MCP for HTML/CSS/JS | Namespace unavailable this run | discard blocker — used DESIGN_GUIDE + Settings chrome |

## Blocking questions

_(none)_ — Grill Round 1 settled.

## Clear to grill / design?

**yes** — Grill **frontier-empty**; Design next. Has API **yes**, Has DB **yes**.
