# Idea: Apple Wallet notifications (Telegram-like channel)

## Problem map (diagnose before framing)

**Mode:** full

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?
- Baby care events can notify a linked Telegram chat when `TELEGRAM_ENABLED` + confirmed link (`features/baby/server/notify.ts`, `telegram-link.ts`, `baby_telegram_link`).
- Loans can send browser Web Push when VAPID + subscription exist (`lib/loans-push-server.ts`, Loans settings).
- Shell `/settings` has Appearance, Kiosk, Account, Workspaces, API tokens, Watch pairing — no Wallet / PassKit subscribe UI.
- my-apps has **no** Apple Wallet pass issue, PassKit web service, or APNs pass-update path (no `pkpass` / PassKit code).
- WalletCast already ships the Apple pattern: QR → signed `.pkpass` → device register → empty APNs → device fetches pass → lock-screen via `changeMessage`.

#### What is missing / wrong?
- No opt-in path for users who want lock-screen alerts without Telegram (or without keeping the web app open).
- No feature flag + settings QR “add to Apple Wallet” when Apple channel is enabled (user ask: show QR on `/settings`).
- No subscriber / device / registration store for Wallet updates parallel to `baby_telegram_link`.
- No wiring from existing notify call sites (e.g. Baby care) into a Wallet “latest message” update + APNs fan-out.
- Apple certs, HTTPS web service, and Pass Type ID are required ops pieces — not present in my-apps env/docs yet.

#### What are the consequences?
- Caregivers on iPhone who skip Telegram miss the same kind of push Baby already sends to chat.
- Product stays tied to Telegram (or browser push for Loans only) for remote alerts.
- Without a clear settings subscribe surface, even a backend channel would stay unused.
- Copying WalletCast poorly (no `changeMessage`, no `updatedAt` bump, HTTP-only web service) yields silent updates or broken registration.

### Step 2 — Real core problem

- **Surface symptoms:** Users can link Telegram for Baby alerts; there is no Apple Wallet subscribe or Wallet-backed lock-screen notify in my-apps.
- **Root cause:** my-apps never implemented PassKit as a notification channel (issue + web service + APNs + prefs UI), despite an existing Telegram-shaped “enable → subscribe → fire on events” product pattern.
- **Core problem (one sentence):** Subscribed users who want Telegram-like lock-screen alerts have no Apple Wallet channel in my-apps, and no settings QR path to opt in when that channel is enabled.

### Mind map (visual text)

```
Problem: no Apple Wallet notify channel
├── Happening: Telegram (Baby) + browser push (Loans); WalletCast pattern exists outside
├── Missing: pass issue, PassKit WS, APNs, subscribers, settings QR when enabled
├── Consequences: iPhone users without Telegram miss care/event lock-screen alerts
├── Core: no Wallet channel + no settings subscribe path
└── ★ Top priority: Ship Apple Wallet as parallel notify channel + settings QR when enabled
```

## Problem

Subscribed users who want Telegram-like lock-screen alerts have no Apple Wallet channel in my-apps, and no settings QR path to opt in when that channel is enabled.

## User / audience

Signed-in workspace members (caregivers / operators) who already use notifications (Telegram today) and want an Apple Wallet lock-screen channel; iPhone users who scan a QR to add a pass.

## Outcome

Align with ★: my-apps can notify opted-in Apple Wallet subscribers the same product job as Telegram (event → lock-screen message). **v1 events default to Baby care** (same job as Telegram). Primary subscribe home is **shell `/settings`** (Telegram stays on Baby settings). When Apple is enabled, Settings shows **Add to Apple Wallet** first, plus clear status (and QR only as a secondary “other device” path).

## Metric

With Apple enabled and a real pass added: one **Baby care** event that today can hit Telegram also produces a visible Wallet lock-screen update for that subscriber. Settings shows subscribe CTAs only when enabled; status moves to pending/active/fail (no silent fake success); linked/unlinked is clear.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Baby Telegram notify gate + send | `features/baby/server/notify.ts`, `telegram-link.ts`, `lib/telegram/config.ts`, `db/schema/baby.ts` (`baby_telegram_link`) | Enable → confirmed link → send summary |
| Baby Telegram settings UI | `components/baby-settings-page.tsx`, `components/settings/settings-types.ts` | Link/unlink under `/baby/settings`, not shell `/settings` |
| Loans browser push | `lib/loans-push-server.ts`, `components/loans-settings/loans-settings-notifications.tsx` | Different channel (Web Push), not Wallet |
| Shell settings surfaces | `app/(shell)/settings/page.tsx` | No Wallet section today |
| WalletCast Apple pass + `changeMessage` | `walletcast-main/src/lib/apple/pass.ts` | `latest` field + `changeMessage: "%@"` |
| WalletCast PassKit web service | `walletcast-main/src/lib/apple/webservice.ts` | Register / listUpdated / getPass |
| WalletCast empty APNs pass update | `walletcast-main/src/lib/apple/apns.ts`, `src/lib/broadcast/broadcast.ts` | Empty `{}` payload; topic = pass type ID |
| WalletCast Apple setup (certs) | `walletcast-main/docs/setup-apple.md` | Pass Type ID, signer, WWDR, Team ID |
| WalletCast v1 design (flows) | `walletcast-main/docs/specs/2026-09-27-walletcast-v1-design.md` | QR → issue → register → broadcast |
| Apple: update passes web service + empty push | https://developer.apple.com/documentation/WalletPasses/adding-a-web-service-to-update-passes | Official PassKit update loop |
| Apple: distribute / update pass | https://developer.apple.com/documentation/walletpasses/distributing-and-updating-a-pass | Same serial = update |
| Apple archive: change messages | https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html | Field change + changeMessage → lock screen |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** Shell `/settings` is the **only primary subscribe home** (Telegram stays under Baby settings — short copy that they are separate). Enable-gated Apple Wallet section: **Add to Apple Wallet** (link/button) first when on; QR secondary for “scan from another device”; status (not linked / pending / active / fail); unlink + delete-pass guidance. Follow SettingsSection + clean-minimal tokens; update settings skeleton if section chrome changes.

## 80/20 UI (day-to-day)

### Main user goals

- See whether Apple Wallet notifications are available / enabled.
- Add the pass from Settings (Add link on this iPhone; QR if another device must scan).
- Know if *your* alerts are active; stop them when done.
- Get Baby-care lock-screen pings like Telegram — without Telegram.

### Vital few (high-impact ~20%)

- **Add to Apple Wallet** (link/button) visible only when Apple channel is enabled — primary on same iPhone.
- Clear status: not linked / pending / active / fail — **active = your signed-in user has a registered pass for this workspace** (each caregiver adds their own; not one shared family chat like Telegram).
- Lock-screen update on a real Baby care event after setup.
- Secondary: QR for other-device scan; remove / unlink / how to delete pass.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Channel available + **Add to Apple Wallet** when enabled.
- **Important info / action #2 (always visible):** Subscribe status (not linked / pending / active / fail) — “active” = your pass for this workspace is registered and can get updates.
- **Core action placement:** Settings section → Add first; status next; short how-to; feedback after add (pending → active or fail).
- **Secondary actions:** QR (“scan from another device”), long help, cert/ops, multi-device notes — expand/details.

### Top user journey to optimize

Open shell `/settings` → Apple Wallet → **Add to Apple Wallet** → see **pending / active / fail** → later lock-screen on a Baby care event. **Stop:** unlink in Settings and/or delete the pass from Apple Wallet (guidance in section).

### Sensible defaults

- Section hidden or clearly “unavailable” when Apple env/certs not configured (mirror Telegram `telegramEnabled` gating).
- Do not show Add / QR when the channel cannot issue passes.
- Primary home = shell `/settings`; Telegram remains on `/baby/settings`.
- v1 notify events = Baby care (Telegram-like); Analyze may widen later.
- Status grain default = **per signed-in user** (each adds own pass); Analyze may refine schema.

### Biggest usability risks to fix first

1. Add/QR shown when Apple cannot actually issue/update (broken trust).
2. Unclear that Telegram (Baby settings) and Wallet (shell Settings) are separate channels.
3. Silent fake success — pass “added” but status never reaches active (no pending/fail).

## Non-goals

- Google Wallet / Samsung Wallet in this pass.
- Full WalletCast product (multi-card marketing dashboard, loyalty, geo, scheduled broadcasts UI).
- Replacing Telegram or Loans browser push.
- Native iOS app / App Store push (this is PassKit Wallet, not APNs app push).
- Designing pass art as a brand studio (minimal pass fields enough for notify).

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| First notify payloads = Baby care (Telegram parity) | **Yes for v1 default** | Confirm widen in Analyze | Broader event matrix or Loans-only slice |
| Primary subscribe home = shell `/settings`; Telegram stays on Baby settings | **Locked** | User ask + Gate A | Only if owner overrides — then move/dual home |
| Subscribed/active = this signed-in user’s pass registered for this workspace (per-user, not shared Telegram chat) | **Preferred default** | Grill/Analyze: workspace-shared vs per-user | Schema + status copy + who scans |
| Operator has (or will get) Apple Developer Pass Type ID certs | Required to ship real devices | Check env willingness | Stub/dev-only or block Gate B |
| HTTPS public `webServiceURL` available in deploy | Required by Apple for updates | Check prod/tunnel plan | Dev HTTP-only limited; prod blocked |

## What we should not build

- Marketing-card editor, multi-tenant WalletCast admin, Google `addMessage` path, geo/locations, stamp loyalty.

## Success criteria

- [ ] When Apple channel disabled: no misleading Add / QR / subscribe CTA on Settings.
- [ ] When enabled: shell `/settings` shows **Add to Apple Wallet** first (QR secondary for other device) to get a signed updatable pass.
- [ ] After Add: status shows pending → active or fail (no silent fake success).
- [ ] Device can register with PassKit web service; update loop matches Apple docs (empty APNs → fetch → changeMessage).
- [ ] Baby care notify path (Telegram-like) can fan out to active Wallet subscribers.
- [ ] Unregister / remove path does not keep pushing dead tokens forever (prune invalid tokens); Settings gives unlink / delete-pass guidance.
- [ ] Light/dark Settings UI follows DESIGN_GUIDE; skeleton parity if layout changes.

## Open questions

1. **Event scope beyond v1:** Keep Baby care only, or also Loans / other apps later? (v1 default locked: Baby care.)
2. **Subscriber grain refine:** Confirm per-user preferred default vs workspace-shared pass; how many devices per user?
3. **Apple certs ready** for a real-device smoke, or design for env-gated “disabled until configured”?
4. **Message copy:** Reuse Telegram summary strings on the pass `latest` field, or a shorter lock-screen format?

*(Settings home locked: shell `/settings` primary; Telegram remains on Baby settings — not an open question.)*
