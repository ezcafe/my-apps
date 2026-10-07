# Light repo skim: apple-wallet-notifications

**Result:** done
**Updated:** 2026-10-05
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Analyze / Design in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js shell (`my-apps`) notifies via Telegram (Baby) and Loans Web Push — **no** PassKit / `.pkpass` / APNs pass-update code. Shell `/settings` uses flat `SettingsSection`; Telegram subscribe stays under Baby settings. Learn issue → register → empty APNs → `changeMessage` from WalletCast (paths only; do not copy the marketing product).

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `app/(shell)/settings/page.tsx` + `loading.tsx` | Shell Settings + skeleton | **yes** — Wallet subscribe home |
| `components/settings/settings-section.tsx` + `settings-types.ts` | Flat section + category search | **yes** — new category/keywords |
| `components/baby-settings-page.tsx` | Telegram link (`telegramEnabled` gate) | pattern only — keep on Baby |
| `components/loans-settings/loans-settings-notifications.tsx` | Browser Web Push | no — different channel |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `features/baby/server/notify.ts`, `telegram-link.ts`; `lib/telegram/config.ts`; `db/schema/baby.ts` (`baby_telegram_link`) | Enable → link → send; env gate model |
| `.env.example` (`TELEGRAM_*`, `VAPID_*`) | No `APPLE_*` yet — mirror enable-gate |
| WalletCast: `src/lib/apple/{pass,webservice,apns}.ts`; `broadcast/broadcast.ts`; `db/schema.ts` (`subscribers`, `apple_devices`, `apple_registrations`); `app/api/apple/v1/**`, `api/passes/apple/**`; `docs/setup-apple.md` | Reference issue / WS / APNs / schema |

## Hard constraints (do not fight)

1. Primary subscribe UI = shell `/settings`; Telegram stays `/baby/settings` (Gate A lock).
2. Hide Add/QR when Apple cannot issue (mirror `isTelegramEnabled`).
3. DESIGN_GUIDE: `SettingsSection`, tokens, skeleton parity if chrome changes.
4. Updates need HTTPS `webServiceURL`, Pass Type ID certs, `changeMessage` + `updatedAt` bump.
5. v1 events = Baby care; do not replace Telegram/Loans push; no Google Wallet this pass.

## Risks if we ignore the repo

Dead Add/QR when Apple off; silent fake “active”; broken update loop (no empty APNs / no `updatedAt`); Wallet under Baby settings; inventing a second notify stack instead of extending Baby notify.

## Enough for Analyze / Design?

yes — Settings + Telegram gate/notify + WalletCast Apple paths located; Analyze owns schema grain, issue routes, cert/env wiring.
