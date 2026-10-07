# Apple Wallet setup (PassKit)

Enable **Baby Care lock-screen updates** through Apple Wallet — the same job as Telegram notify, via PassKit’s update loop (issue → register → empty APNs → fetch → `changeMessage`).

This is **not** a marketing-card product. Subscribe UI lives under shell **Settings → Apple Wallet**.

You need an [Apple Developer Program](https://developer.apple.com/programs/) membership (paid, individual or organization). Plan about 15–30 minutes for certs, then deploy with HTTPS.

## What you need

1. Apple Developer account with a **Pass Type ID**.
2. **Pass signing certificate** + private key for that Pass Type ID.
3. **Apple WWDR** intermediate (G4).
4. A public **HTTPS** origin (`BASE_URL` or `NEXT_PUBLIC_APP_URL`) — Apple will not call `http://` for the web service after install.
5. Database migration applied (`0047_apple_wallet` / `pnpm db:migrate`).

Until every required `APPLE_*` value is set **and** the public URL is HTTPS, `isAppleWalletEnabled` stays false: Settings shows unavailable (no Add/QR), and issue / PassKit / notify no-op.

Env names (no secrets in git): see [`.env.example`](../.env.example).

## 1. Create a Pass Type ID

1. Open [Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list/passTypeId).
2. Click **+** and choose **Pass Type IDs**.
3. Description: e.g. `My Apps Baby Care`. Identifier: reverse-DNS starting with `pass.`, e.g. `pass.com.yourdomain.myapps`.

That identifier is `APPLE_PASS_TYPE_ID`.

## 2. Create the signing certificate

Generate a private key and CSR. Keep `signer.key` secret; never commit it.

```bash
mkdir -p certs && cd certs
openssl req -new -newkey rsa:2048 -nodes \
  -keyout signer.key -out signer.csr \
  -subj "/CN=My Apps Baby Care/emailAddress=you@example.com"
```

In the developer portal, open your Pass Type ID → **Create Certificate** → upload `signer.csr` → download `pass.cer`. Convert to PEM:

```bash
openssl x509 -inform der -in pass.cer -out signer.pem
```

Already have a `.p12` from Keychain?

```bash
openssl pkcs12 -legacy -in cert.p12 -clcerts -nokeys -out signer.pem
openssl pkcs12 -legacy -in cert.p12 -nocerts -out signer.key
```

If the key keeps a passphrase, set `APPLE_SIGNER_KEY_PASSPHRASE`.

## 3. Download Apple’s WWDR certificate (G4)

```bash
curl -sO https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
```

## 4. Find your Team ID

Under [Membership details](https://developer.apple.com/account#MembershipDetailsCard) — a 10-character string such as `A1B2C3D4E5`. That is `APPLE_TEAM_ID`.

## 5. Configure my-apps

PEM values can be raw PEM or **base64 on one line** (handy for host dashboards):

```bash
echo "APPLE_SIGNER_CERT=$(base64 -i signer.pem | tr -d '\n')"
echo "APPLE_SIGNER_KEY=$(base64 -i signer.key | tr -d '\n')"
echo "APPLE_WWDR_CERT=$(base64 -i wwdr.pem | tr -d '\n')"
```

```env
APPLE_PASS_TYPE_ID=pass.com.yourdomain.myapps
APPLE_TEAM_ID=A1B2C3D4E5
APPLE_SIGNER_CERT=LS0tLS1CRUdJTi...
APPLE_SIGNER_KEY=LS0tLS1CRUdJTi...
APPLE_WWDR_CERT=LS0tLS1CRUdJTi...
# Optional if the key is encrypted:
# APPLE_SIGNER_KEY_PASSPHRASE=

# Public HTTPS origin (required for enable + webServiceURL)
BASE_URL=https://your-public-https-host.example
# or: NEXT_PUBLIC_APP_URL=https://your-public-https-host.example

# Optional rate limits (requests per minute)
# APPLE_WALLET_ISSUE_RPM=20
# APPLE_WALLET_MINT_RPM=20
# APPLE_WALLET_LOG_RPM=60
```

Apply migrations if you have not already:

```bash
pnpm db:migrate
```

Restart the app. Sign in, open shell **Settings → Apple Wallet**. You should see **Add to Apple Wallet** (and status), not the “unavailable” copy.

## 6. Test on an iPhone

1. **HTTPS:** `BASE_URL` / `NEXT_PUBLIC_APP_URL` must be a public **https://** URL. For local dev, use a tunnel (e.g. ngrok) and set that URL in env. Tunnel URLs change on restart — installed passes stop updating until you re-Add with the new host.
2. On the iPhone (Safari), open **Settings → Apple Wallet** → **Add to Apple Wallet**. Safari should open Wallet (navigational `.pkpass`, not a Files download).
3. Status should move to **pending**, then **active** after the device registers with the web service.
4. Log a Baby care event (same path that can notify Telegram). Within seconds, the lock screen should show the care summary (`changeMessage` on the pass `latest` field).
5. Optional: on another device, expand **Scan from another device** and scan the QR (short-lived single-use token).

### How the loop works

1. User Adds a pass from Settings (session download or QR token).
2. iPhone registers at `/api/apple/v1/...` with `Authorization: ApplePass <token>`.
3. On Baby care events, the app upserts workspace latest text, bumps subscriber `updated_at`, and sends an empty APNs `{}` wake (production APNs; same Pass Type ID cert — no separate APNs key).
4. The device calls `listUpdated` / `getPass` and shows the `latest` field via `changeMessage`.

Telegram stays under **Baby → Settings**. Wallet does not replace it.

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Settings shows unavailable / no Add | Missing `APPLE_*`, or base URL not HTTPS |
| Pass won’t open (“Safari cannot download this file”) | Cert does not match Pass Type ID, or WWDR wrong — check server logs |
| Pass installs but never updates | Web service not HTTPS, or tunnel URL changed after install |
| No lock-screen ping | Device not registered yet; or pass **… → Pass Details → Allow Notifications** off; or no active registration |
| Status stuck on pending | Device never called register (HTTPS / cert); or APNs rejected fake/self-signed certs |
| Device errors | iOS posts to `/api/apple/v1/log` — look for apple-wallet lines in server logs |

Pushes always go to APNs production (`api.push.apple.com`) with the Pass Type ID certificate. There is no separate APNs key to create for this channel.

The pass certificate expires after about one year. Renew in the portal and replace `APPLE_SIGNER_CERT` (and the key if you created a new CSR).

## Local smoke without real APNs

Throwaway / self-signed certs can exercise **download + web service** wiring in tests or a tunnel. **APNs rejects** fake certs — expected. Use real Pass Type ID certs for lock-screen validation on a device.

## Reference

- Env gate: `lib/apple-wallet/config.ts` (`isAppleWalletEnabled`)
- Pass + web service path: `lib/apple-wallet/pass.ts` (`webServiceURL` = `{baseUrl}/api/apple`)
- ADR: [`docs/decisions/ADR-001-apple-wallet-shared-channel.md`](decisions/ADR-001-apple-wallet-shared-channel.md)
- Patterns adapted from open-source [WalletCast](https://github.com/adrbn/walletcast) PassKit loop (learn/adapt — not a marketing-card clone)

Primary Apple docs: [Wallet Developer Guide](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/) · [PassKit Web Service Reference](https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes)
