# Tasks: Apple Wallet readiness in Settings

## Task 1: Diagnose helper + notAfter unit tests

**Description:**
Add `diagnoseAppleWallet(env)` beside `config.ts`. Keep `isAppleWalletEnabled` as the binary gate. Return `enabled`, `healthyForAdd`, stable `reasons` codes, and `signerValidTo` from Node `X509Certificate.validTo`. Map missing HTTPS, missing cert class, unreadable signer, expiring (≤30d), expired. Do not put env names in the DTO.

**Healthy-env rule (locked):** Fully healthy → `reasons` exactly `["ready"]`. Never empty. Blocker/warn codes never coexist with `ready`.

**Acceptance:**

- [ ] `enabled` matches today’s `isAppleWalletEnabled` for the same env fixtures
- [ ] Fully healthy fixture → `reasons` exactly `["ready"]` and `healthyForAdd === true` (empty `reasons` is a fail)
- [ ] Expired signer → `signer_expired` in reasons (no `ready`) and `healthyForAdd === false` even when keys+HTTPS present
- [ ] Expiring ≤30d → `signer_expiring` (no `ready`), `healthyForAdd === true`
- [ ] HTTP or missing base URL → `public_url_https`; missing cert material → `passkit_certs`
- [ ] Unreadable signer PEM → `signer_unreadable`, `healthyForAdd === false`

**Tests (TDD — what turns red first):**

- [ ] Unit: missing each required class / non-HTTPS URL → expected reason codes; assert `!reasons.includes("ready")` (`config.test.ts` or sibling)
- [ ] Unit: fixture PEM with `validTo` in the past → expired + not healthy for Add; no `ready`
- [ ] Unit: fixture PEM with `validTo` within 30 days → expiring + healthy for Add; no `ready`
- [ ] Unit: complete valid env (not expiring) → `reasons` exactly `["ready"]` + `healthyForAdd === true` (empty `reasons` fails)
- [ ] Unit: unreadable signer PEM → `signer_unreadable`, `healthyForAdd === false`, `signerValidTo === null`, no `ready` (04a Fix ask)

**Files likely touched:** `lib/apple-wallet/config.ts` (or `diagnose.ts`), `lib/apple-wallet/config.test.ts`, optional test PEM fixtures under `lib/apple-wallet/`

**Scope:** M

**Dependencies:** none

---

## Task 2: Wire readiness props through settings-loader

**Description:**
Extend `AppleWalletSettingsLoader` / page props with diagnose fields (`healthyForAdd`, `reasons`, `signerValidTo`). Keep status query behavior. When `!appleEnabled`, still return readiness reasons (status may stay `not_linked`).

**Acceptance:**

- [ ] Loader returns diagnose fields on every Settings load
- [ ] Status path unchanged when enabled + linked
- [ ] Types exported for Settings component

**Tests (TDD — what turns red first):**

- [ ] Unit/integration: loader with mocked diagnose (or env) returns reasons when disabled
- [ ] Unit: enabled + expired fixture yields `healthyForAdd: false` in loader result

**Files likely touched:** `lib/apple-wallet/settings-loader.ts`, Settings page wiring under `app/(shell)/settings/` / `components/settings/*`

**Scope:** S

**Dependencies:** Task 1

---

## Task 3: Settings UI — readiness, Add gate, pending checklist

**Description:**
Replace generic unavailable paragraph with reason list + setup-guide link. Show `Alert` for expired/expiring. Show Add only when `healthyForAdd`. Under `pending`, show HTTPS WS + Wallet notifications checklist. Fail uses `Alert` + retry hint. Update skeleton for zero CLS. Follow DESIGN_GUIDE (flat section, tokens, radii).

**Setup-guide href (locked):** Use `APPLE_WALLET_SETUP_GUIDE_HREF = "/help#apple-wallet"` from `lib/apple-wallet/constants.ts`. Do **not** use a bare `docs/…` path (not a served route). Add a thin Help section with `id="apple-wallet"` (checklist + pointer to repo `docs/setup-apple-wallet.md` for deployers) so the Settings link is not a dead hash. Mirror Settings → `/help` for API tutorial.

**Acceptance:**

- [ ] Off-state shows caregiver-safe copy from reason codes (no `APPLE_*` / PEM)
- [ ] Setup guide link visible when off, expired, or pending checklist shown; `href` is `/help#apple-wallet` (constant)
- [ ] Signed-in click navigates to Help Apple Wallet section (hash target exists)
- [ ] Expired → warning Alert; Add hidden or disabled
- [ ] Expiring → warning Alert; Add still available
- [ ] Ready props (`reasons: ["ready"]`) → ready line + Add visible
- [ ] Pending → checklist under status
- [ ] Skeleton order matches live: readiness → Add slot → status → details

**Tests (TDD — what turns red first):**

- [ ] Component/unit: props with `public_url_https` render HTTPS copy + no Add; setup link `href` is `/help#apple-wallet`
- [ ] Component/unit: expired props → warn + no Add; `reasons: ["ready"]` → ready copy + Add visible
- [ ] Component/unit: `signer_expiring` + `healthyForAdd: true` → warning Alert **and** Add visible (04a)
- [ ] Component/unit: `status: "pending"` → HTTPS WS + Wallet notifications checklist; setup link still `/help#apple-wallet` (04a)
- [ ] Unit: Help content exposes `id="apple-wallet"` (04a — prefer markup unit)

**Files likely touched:** `components/apple-wallet-settings.tsx`, `components/apple-wallet-settings.test.ts`, matching skeleton / settings loading UI, `lib/apple-wallet/constants.ts`, `app/(shell)/help/page.tsx` and/or Help content component (thin `#apple-wallet` section)

**Scope:** M

**Dependencies:** Task 2

---

## Task 4: E2E Settings off/on readiness copy

**Description:**
Extend `e2e/apple-wallet-settings.spec.ts` so unavailable vs ready messaging is covered (env or test hooks as the suite already does). Assert setup link (`/help#apple-wallet`) and absence of env var names in DOM when off.

**Acceptance:**

- [ ] E2E off path: specific readiness cue (HTTPS and/or certs class) visible; generic-only line gone
- [ ] E2E off path: setup guide link `href` is `/help#apple-wallet`
- [ ] E2E on/healthy path: Add to Apple Wallet visible
- [ ] DOM text does not include `APPLE_SIGNER` / PEM headers

**Tests (TDD — what turns red first):**

- [ ] E2E: Settings Apple Wallet off → readiness copy + setup link to `/help#apple-wallet`
- [ ] E2E: Settings Apple Wallet on + healthy → Add visible
- [ ] E2E off path: DOM must not contain `APPLE_SIGNER` or `BEGIN CERTIFICATE` (04a)

**Files likely touched:** `e2e/apple-wallet-settings.spec.ts`, e2e fixtures/env helpers if present

**Scope:** M

**Dependencies:** Task 3

---

## Task 5: Server-side diagnose warnings (optional quick win)

**Description:**
On diagnose (startup or first Settings/load path — prefer existing log style), emit missing-env / expired warnings with **env key names allowed in logs only**. No UI change.

**Acceptance:**

- [ ] Logs mention missing keys or expired signer when diagnose finds them
- [ ] Logs never print PEM bodies

**Tests (TDD — what turns red first):**

- [ ] Unit: diagnose/log helper called with incomplete env → warning string includes key name, not PEM

**Files likely touched:** `lib/apple-wallet/config.ts` or small log helper; call site in services/bootstrap if one exists

**Scope:** S

**Dependencies:** Task 1

---

## Checkpoints

After Tasks 1–2:

- [ ] Diagnose unit tests green (incl. notAfter expired / expiring)
- [ ] Loader returns readiness props

After Tasks 3–4:

- [ ] Settings off/on e2e green
- [ ] Manual: light/dark `/settings` Apple Wallet — skeleton parity, Add gate on expired

After Task 5 (if in Gate B scope):

- [ ] Log warnings verified without leaking PEM
