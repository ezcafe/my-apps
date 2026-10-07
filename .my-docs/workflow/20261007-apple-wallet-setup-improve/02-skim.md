# Light repo skim: 20261007-apple-wallet-setup-improve

**Result:** done
**Updated:** 2026-10-07
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Analyze / Design in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

my-apps already ships a shared PassKit notify channel (`lib/apple-wallet/*`, `app/api/apple/**`, Settings subscribe UI). Enable is binary (`isAppleWalletEnabled`: all `APPLE_*` + HTTPS `BASE_URL` / `NEXT_PUBLIC_APP_URL`); Settings shows one generic unavailable line when off. Docs/ADRs exist; no in-product missing-env list or cert notAfter.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/apple-wallet-settings.tsx` | Add / QR / status / unlink; generic unavailable | yes — primary surface |
| `app/(shell)/settings/page.tsx` + `components/settings/*` | Category `apple-wallet`; loads props | yes — shell wiring |
| `lib/apple-wallet/settings-loader.ts` + `status.ts` | `appleEnabled` + UI status map | yes — extend readiness |
| `docs/setup-apple-wallet.md` | Certs, HTTPS, tunnel, renew, troubleshoot | yes — link from Settings |
| `e2e/apple-wallet-settings.spec.ts` | Settings e2e | yes — extend |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/apple-wallet/config.ts` | Binary gate; PEM decode; no warnings today |
| `app/api/apple-wallet/{issue,issue-token,subscription}` | Session + QR issue (ADR-002) |
| `app/api/apple/v1/**` | PassKit WS (register / getPass / list / log) |
| `db/schema/apple-wallet.ts` | channel_state, subscriber, device, registration |
| `features/baby/server/notify.ts` | `notifyWalletCare` caller |

## Hard constraints (do not fight)

1. **ADR-001 / ADR-002 accepted** — shared channel + session/QR issue; do not reopen grain unless new evidence.
2. **Binary enable today** — all required `APPLE_*` + HTTPS public URL, else Settings unavailable + issue/WS/notify no-op (`config.ts`, setup doc).
3. **Settings is the product UI** — readiness/status live under `/settings` → Apple Wallet; no marketing-card / WalletCast product clone.
4. **Secrets stay in env** — no PEM values in Settings; caregiver-safe copy if showing “why off” (Gate A Enhancement).
5. **UI must follow DESIGN_GUIDE** + skeleton parity on Settings changes.

## WalletCast pattern pointers (not clone)

- Warnings shape: `/Users/ptquang86/Downloads/walletcast-main/src/lib/config/env.ts` (`parseApple` → `warnings`)
- PassKit modules: `…/src/lib/apple/{pass,webservice,apns}.ts` — pattern only

## Risks if we ignore the repo

Opaque off-state stays; stuck pending has no checklist; cert renew (~1y in setup doc) stays invisible; fighting ADR grain or dumping env names to non-admins creates product/security debt.

## Enough for Analyze / Design?

yes — Gate A ok; paths + enable gate + ADRs + docs give enough constraints. Open: deployer vs caregiver copy depth; in-app cert expiry vs docs-first (settle in Analyze/Grill).
