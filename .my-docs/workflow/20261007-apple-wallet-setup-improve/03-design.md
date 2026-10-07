# Design: Apple Wallet readiness in Settings

**Mode:** full — from `00-run.md`

## Decision 1: which design approach?

### Option 1 — Systemic Settings readiness (★)

**What it is:**
Keep ADR-001/002 and binary enable. Add a diagnose helper next to `config.ts` that returns caregiver-safe reason classes + signer `validTo`. Pass a readiness DTO through `settings-loader` into Settings. Off-state lists fix classes + setup-doc link; expired cert warns and blocks Add as not healthy. No new public HTTP route.

**Example:**
`diagnoseAppleWallet()` → `{ enabled, healthyForAdd, reasons: ["public_url_https"], signerValidTo, … }` → `loadAppleWalletSettingsProps` → Settings shows “Public URL must use HTTPS” + link to `/help#apple-wallet` (setup guide).

**Pros:**

- Hits Metric (specific misconfig + real iPhone active path)
- Matches Gate A 80/20 (readiness + Add always visible)
- Reuses RSC props path; no new API surface

**Cons:**

- Copy taxonomy must stay safe (no env names / PEM)
- PEM parse edge cases need unit tests

### Option 2 — Health-route / docs-first (creative)

**What it is:**
Improve `docs/setup-apple-wallet.md` + optional server-log warnings; optionally add a private ops health HTTP route. Settings stays thin (“ask your deployer” or generic unavailable). Cert expiry mainly in docs/logs.

**Example:**
`GET /api/ops/apple-wallet-health` (auth TBD) returns raw check list; Settings only links the setup doc.

**Pros:**

- Smaller Settings change; ops can curl health
- Less risk of oversharing in caregiver UI

**Cons:**

- Misses Gate A vital few in Settings
- New public/semi-public API → Has API yes + auth model gap (no admin role)
- Metric “specific reason in product” weak unless deployer leaves Settings

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Med (config + loader + Settings + tests) | Low–med docs; med+ if health route |
| Complexity | Diagnose DTO + UI copy | New trust boundary if HTTP |
| Usability | Diagnosable in Settings | Deployer guesses without leaving app |
| Failure cases | Expired → warn + not healthy for Add | Silent UI until docs/logs |

## Recommendation

**Pick Option 1** because Grill settled deployer-first safe classes, in-app `notAfter`, and real-device Metric — systemic Settings readiness is the only path that puts specific reasons where caregivers/deployers already look, without inventing an admin-only health API.

## Chosen design (user-approved)

<!-- Fill after Gate B -->

## System design

### Overview

- **What it is:** Readiness as a **server-side DTO** on the existing Settings RSC path — diagnose env/certs once, map to safe UI classes, keep issue/WS/notify gated by today’s binary enable (plus Add gated by `healthyForAdd`).
- **Components / boundaries:** Env/PEM (server only) → `diagnoseAppleWallet` / `config` → `settings-loader` → `AppleWalletSettings` (signed-in). Issue/WS/notify unchanged ownership.
- **Data flow:** Page load runs diagnose + status query → props. Add still navigates to existing issue GET. (Fields: Contracts overview.)
- **Consistency & failure:** Enable stays “keys + HTTPS present.” Expired signer → readiness warn + `healthyForAdd=false` (Add not offered). Bad PEM → reason class, not stack traces. Point to sequence for returns.
- **Why this shape:** Explains the binary gate without a new HTTP contract or WalletCast clone.
- **Best practices:** Safe classes only; secrets in env; DESIGN_GUIDE `Alert` for blockers; skeleton parity.
- **Anti-patterns:** Dumping `APPLE_*` names/PEM; flipping enable solely on expiry without clear Add health rule; new dashboard chrome.
- **Reference:** ADR-001/002; `lib/apple-wallet/config.ts`; `settings-loader.ts`.

### Concept 1 — Channel readiness DTO

- **What it is:** Structured, caregiver-safe explanation of why enable is on/off plus cert renew cue + `healthyForAdd`.
- **How we use it here:** Built in lib; passed as Settings props (not a public API).
- **Why we chose it:** Grill glossary; avoids health-route auth gap.
- **Best practices:** Stable reason codes; UI maps codes → plain copy; never send PEM/env names.
- **Reference:** Grill glossary “Channel readiness”; WalletCast warnings **pattern only**.

### Concept 2 — Healthy for Add vs enable

- **What it is:** `appleEnabled` = binary gate (issue/WS/notify). `healthyForAdd` = enabled **and** signer cert not expired (and PEM readable).
- **How we use it here:** Expired → `Alert` warning + hide/disable Add; enable may still be true so ops see “certs present but expired.”
- **Why we chose it:** Grill recommend: warn + not healthy for Add — do not silently flip enable without defining Add.
- **Best practices:** Near-expiry (≤30 days): warn, Add still allowed; expired: block Add.
- **Reference:** Node `crypto.X509Certificate.validTo` spike.

## Sequence diagram

```mermaid
sequenceDiagram
  participant User as SignedInUser
  participant Page as SettingsPageRSC
  participant Loader as settingsLoader
  participant Diag as diagnoseAppleWallet
  participant UI as AppleWalletSettings
  participant Issue as IssueGET

  User->>Page: GET /settings
  Page->>Loader: loadAppleWalletSettingsProps(userSub)
  Loader->>Diag: diagnose(env)
  Diag-->>Loader: enabled, healthyForAdd, reasons, signerValidTo
  Loader-->>Page: props + wallet UI status
  Page-->>UI: render readiness / Add / status
  alt not enabled or not healthyForAdd
    UI-->>User: Alert or list + setup doc link; Add hidden/disabled
  else healthyForAdd
    User->>Issue: Add to Apple Wallet (existing)
    Issue-->>User: .pkpass or error
  end
```

## Contracts

### API contracts

**Has API: no** — no new/changed public HTTP handlers this pass.

| Item | Detail |
|------|--------|
| Method + path | N/A — RSC props only |
| Auth / who can call | Existing signed-in Settings (any session that can open `/settings`) |
| Request fields | N/A |
| Success response | N/A |
| Errors | N/A |
| Downstream calls | N/A |

**Internal module contract (lib → loader → UI):**

| Field | Type | Notes |
|-------|------|-------|
| `appleEnabled` | boolean | Current `isAppleWalletEnabled` |
| `healthyForAdd` | boolean | `enabled && signerReadable && !expired` |
| `reasons` | string[] | Stable codes only (below). Never empty when diagnose runs. |
| `signerValidTo` | string \| null | ISO date from `validTo`; null if missing/unreadable |
| `status` | WalletUiStatus | Existing map |

**Healthy-env rule (locked — `ready` XOR blockers/warns):**

- Fully healthy (`enabled` + `healthyForAdd` + signer readable + not expired + not ≤30d expiring) → `reasons` is exactly `["ready"]`. Empty `reasons` is forbidden.
- Any blocker or warn (`public_url_https`, `passkit_certs`, `signer_unreadable`, `signer_expired`, `signer_expiring`) → those codes only; **do not** also emit `ready`.
- UI: map `ready` → ready line; map other codes → muted list and/or `Alert`. Do not treat “empty blockers” as the healthy signal.

**Reason codes (UI copy; no env names):**

| Code | When | Caregiver-safe copy (intent) |
|------|------|------------------------------|
| `public_url_https` | Base URL missing or not HTTPS | Public URL must use HTTPS |
| `passkit_certs` | Any required cert/key/id missing | PassKit certificates missing on server |
| `signer_unreadable` | Signer PEM present but parse fails | Signer certificate cannot be read — check setup |
| `signer_expired` | `validTo` &lt; now | Signer certificate expired (date) — renew |
| `signer_expiring` | `validTo` within 30 days | Signer certificate expires soon (date) — renew |
| `ready` | Fully healthy (see rule above) | Channel ready for Add |

**Events / other module APIs:** none new. Issue / WS / `notifyWalletCare` keep using `isAppleWalletEnabled` only.

### Database contracts

**Has DB: no** — no schema/migration.

| Table / collection | Purpose | Key fields | Indexes | Write owner | Read owners |
|--------------------|---------|------------|---------|-------------|-------------|
| N/A | — | — | — | — | — |

**Data ownership notes:** Existing subscriber/registration reads in loader unchanged.

### Example queries

N/A — no new queries. Loader keeps today’s status `count` on registrations.

## Design patterns used

### Pattern 1 — Diagnose helper beside config

- **What it is:** Pure env→DTO function next to the enable gate; gate stays boolean for runtime.
- **How we use it here:** `lib/apple-wallet/config.ts` (or sibling) + `config.test.ts`; loader calls diagnose.
- **Why we chose it:** Extends repo pattern; WalletCast warnings shape without clone.
- **Best practices:** Unit-test each reason; logs may name env keys, Settings must not.
- **Anti-patterns:** Forking a second enable implementation.
- **Reference:** `config.ts`; WalletCast `parseApple` warnings (pattern only).

### Pattern 2 — RSC props Presenter

- **What it is:** Server loads DTO; client section renders; no client fetch for readiness.
- **How we use it here:** `settings-loader` → page → `AppleWalletSettings`.
- **Why we chose it:** Avoids Has API; matches Settings today.
- **Best practices:** Props include readiness + status; skeleton mirrors hierarchy.
- **Anti-patterns:** Client-side env guessing.
- **Reference:** `settings-loader.ts`, `apple-wallet-settings.tsx`.

### Pattern 3 — Progressive disclosure in Settings section

- **What it is:** Always-visible readiness + Add; QR/unlink secondary.
- **How we use it here:** Gate A #1/#2; pending checklist under status; setup link always when off or unhealthy.
- **Why we chose it:** Gate A 80/20.
- **Best practices:** Flat `SettingsSection`; `Alert` for expired/fail; muted list for off reasons.
- **Anti-patterns:** Card-wrapped settings; PEM tooling in chrome.
- **Reference:** `docs/DESIGN_GUIDE.md` Settings / Alert.

| Pattern | Why chosen (one line) | Reference |
|---------|----------------------|-----------|
| Diagnose beside config | Explain gate without forking it | `config.ts` |
| RSC props Presenter | No new API | `settings-loader.ts` |
| Progressive disclosure | Gate A 80/20 | `apple-wallet-settings.tsx` |

## UI / UX / mobile

- **UI:** `/settings` → Apple Wallet only. No new shell nav.
- **Build ↔ UI lock:** Match this section + live chrome (tokens, radii, Add primary).
- **80/20 UI:**
  - Goals: know healthy/available; Add; see pending→active.
  - Vital few: why off/ready; Add + honest status; setup link + pending checklist.
  - **#1 always visible:** Channel readiness (on / why off / cert warn) + status.
  - **#2 always visible when `healthyForAdd`:** Add to Apple Wallet.
  - Secondary: QR in details; unlink less prominent; PEM in docs only.
- **Layout / hierarchy (top → bottom):**
  1. Readiness: ready line **or** muted reason list (off) **or** `Alert` warning (expired/expiring).
  2. Setup doc link (always when off, expired, or pending stuck cues).
  3. Add button (only if `healthyForAdd`); else short “fix server setup / renew cert” line.
  4. Status label; if `pending`: checklist (HTTPS web service, Wallet notifications, open pass once).
  5. Fail: `Alert` + retry hint (re-Add / check HTTPS).
  6. Details: QR; unlink.
- **Loading / empty / error / success:** Skeleton mirrors stack; empty = not_linked (not error); fail = `Alert` error; expired = `Alert` warning.
- **Skeleton parity:** Same order: readiness block → Add slot → status → details chrome; `rounded-[var(--radius-md)]` section / `rounded-[var(--radius-sm)]` nested.
- **Mobile:** Add ≥44px; no hover-only; thumb-friendly Settings on phone.
- **Accessibility:** Reason list as list; `Alert` has role; link text “Apple Wallet setup guide” (not “click here”).
- **Day-to-day:** Session Add default; QR collapsed; safe classes for all signed-in viewers.

**Setup-guide href (locked — shippable):**

- Repo file `docs/setup-apple-wallet.md` is **not** a served app route (README/dev runbook only; same as other `docs/*`).
- No existing GitHub/raw docs URL constant in the app. Settings already uses in-app Help for docs: API tokens → `/help` (`app/(shell)/settings/page.tsx`, `docs/API.md`).
- **Shippable href:** `APPLE_WALLET_SETUP_GUIDE_HREF = "/help#apple-wallet"` in `lib/apple-wallet/constants.ts` (client-safe).
- Settings “Apple Wallet setup guide” uses that constant (`target` same-tab or default Next `Link`).
- Help page (`/help`) gains a thin **Apple Wallet** section with `id="apple-wallet"`: short checklist (HTTPS public URL, PassKit certs on server, renew before expiry) + note that the full deployer runbook lives in repo `docs/setup-apple-wallet.md`. Does **not** invent a new public HTTP API or serve raw markdown as a route.
- Acceptance: signed-in user clicks the Settings link → lands on Help Apple Wallet section (hash works).

**Expired cert (locked definition):**

| State | `appleEnabled` | `healthyForAdd` | UI |
|-------|----------------|-----------------|-----|
| Missing HTTPS/certs | false | false | Reason list + setup link; no Add |
| Enabled, cert OK | true | true | Ready + Add |
| Enabled, expiring ≤30d | true | true | Warning Alert + Add still on |
| Enabled, expired | true | **false** | Warning Alert + setup link; **Add hidden/disabled** |
| Signer unreadable | false or true per gate | false | Reason + no Add |

Binary enable **does not** flip solely on expiry (issue/WS may still “think” on until ops renew — Add blocked in UI; document that issue may still fail at sign time if called elsewhere).

## Security design review (OWASP)

Trust boundaries:

- Env/PEM only on server; Settings viewers = any signed-in user.
- No new HTTP health surface.

Abuse cases:

- Signed-in user harvests env names / PEM from UI → mitigated by safe classes only.
- Log scraping of diagnose → allow env key names in **server logs only**, never props.

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | pass | Same Settings auth; no admin-only leak path invented |
| A02 Cryptographic Failures | pass | PEM stay env; UI never echoes secrets |
| A03 Injection | pass | Reason codes mapped to fixed copy; no raw PEM in HTML |
| A04 Insecure Design | pass | Threat: multi-viewer Settings → safe classes required |
| A05 Security Misconfiguration | pass | No debug dump; HTTPS still required for enable |
| A06 Vulnerable Components | pass | Node `crypto` only; no new deps |
| A07 Auth Failures | N/A | No auth flow change |
| A08 Software / Data Integrity | N/A | No webhook/update pipeline change |
| A09 Logging / Monitoring Failures | pass | Prefer server warnings for missing env; no secrets in client |
| A10 SSRF | N/A | No user URL fetch |

Source: https://owasp.org/Top10/

## Challenges answered

- **Do we need this?** Yes — binary gate + generic unavailable blocks Metric.
- **What fails?** Expired cert without Add health rule; env-name leak; health-route without roles.
- **Is this overspecified?** No — DTO + Settings + tests; no microservice / Google / cards.

## Domain / ADR notes

- **Glossary terms used:** Channel readiness; Wallet UI status (`not_linked` / `pending` / `active` / `fail`).
- **ADR:** N/A — skipped: reversible UI/ops choices; ADR-001/002 unchanged (three-part bar fails).
- **Grill locks honored:** Decision 1 Option 1 (deployer-first safe classes); Decision 2 Option 2 (`notAfter`/`validTo`); Q3 real HTTPS+certs / Metric includes real iPhone **active**; expired → warn + not healthy for Add.
- **Has API:** **no**
- **Has DB:** **no**
