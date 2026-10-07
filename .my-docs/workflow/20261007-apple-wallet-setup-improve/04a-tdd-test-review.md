# TDD test-case review: 20261007-apple-wallet-setup-improve

**Result:** needs more tests
**Round:** 1
**Updated:** 2026-10-07

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | missing cert class / non-HTTPS → reason codes | yes (planned) |
| 1 | edge | PEM `validTo` past → `signer_expired` + `healthyForAdd === false` | yes (planned) |
| 1 | edge | PEM `validTo` ≤30d → `signer_expiring` + `healthyForAdd === true` | yes (planned) |
| 1 | real | complete valid env → `reasons` exactly `["ready"]` + healthy | yes (planned) |
| 1 | edge | unreadable signer PEM → `signer_unreadable` + not healthy | **no** |
| 1 | edge | blocker/warn codes never include `ready` (XOR rule) | partial (implied; not asserted) |
| 1 | real | `enabled` matches `isAppleWalletEnabled` on same fixtures | partial (acceptance only) |
| 2 | real | loader returns reasons when Apple disabled | yes (planned) |
| 2 | edge | enabled + expired → loader `healthyForAdd: false` | yes (planned) |
| 2 | real | enabled + linked: status path unchanged (still maps registrations) | **no** |
| 3 | real | `public_url_https` props → HTTPS copy, no Add, setup `href=/help#apple-wallet` | yes (planned) |
| 3 | real / edge | expired → warn + no Add; `["ready"]` → ready + Add | yes (planned) |
| 3 | edge | expiring → warn Alert **and** Add still visible | **no** |
| 3 | real | `status: pending` → HTTPS WS + Wallet notifications checklist | **no** |
| 3 | real | fail status → Alert + retry hint | **no** |
| 3 | real | Help `#apple-wallet` target exists (setup link not dead) | **no** |
| 4 | real | E2E off → readiness copy + setup link `/help#apple-wallet` | yes (planned) |
| 4 | real | E2E on + healthy → Add visible | yes (planned) |
| 4 | edge / security | DOM has no `APPLE_SIGNER` / PEM headers when off | **no** (acceptance only) |
| 5 | real | log helper incomplete env → key name, not PEM | yes (planned; optional task) |

Existing baselines skimmed: `config.test.ts` (enable gate only), `apple-wallet-settings.test.ts` (issue GET form only), `e2e/apple-wallet-settings.spec.ts` (generic unavailable copy — will need rewrite for specific readiness).

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 1 | Unreadable signer PEM (acceptance + design edge) | `diagnoseAppleWallet: unreadable signer PEM → reasons includes signer_unreadable, healthyForAdd false, signerValidTo null, no ready` |
| Major | 1 | Ready XOR blockers/warns | Fold into each diagnose case: `assert.deepEqual` / `assert.ok(!reasons.includes("ready"))` when any blocker/warn present; healthy case already asserts exact `["ready"]` |
| Major | 3 | Expiring ≤30d UI (locked table: Alert + Add on) | `AppleWalletSettings: signer_expiring props → warning Alert visible and Add to Apple Wallet present` |
| Major | 3 | Pending checklist (Gate A / design vital) | `AppleWalletSettings: status pending → checklist copy for HTTPS web service and Wallet notifications` |
| Major | 3 or 4 | Setup guide hash target exists | Unit on Help markup/`id="apple-wallet"` **or** E2E: follow setup link → `#apple-wallet` heading/section visible |
| Major | 4 | No secrets in caregiver DOM (acceptance + OWASP A03) | E2E off path: `expect(section).not.toContainText(/APPLE_SIGNER|BEGIN CERTIFICATE/)` |
| Enhancement | 2 | Linked status unchanged when readiness added | Loader test: enabled + mocked registrations → `status` still `pending`/`active` as today; readiness fields present |
| Enhancement | 3 | Fail Alert + retry | `status fail` props → error Alert + retry hint text |
| Enhancement | 1 | Exact 30-day boundary | Fixture `validTo = now + 30d` → `signer_expiring`; `now + 31d` → `ready` only |
| Enhancement | 5 | Expired signer in logs (if Task 5 in Gate B) | Log string mentions expired / renew cue; never PEM body |

## Real scenarios checked

- Happy path: Task 1 ready DTO; Task 3 ready + Add; Task 4 E2E on + Add — **covered**.
- User-visible failures: off reasons + expired warn/no Add — **mostly covered**; **expiring Alert**, **pending checklist**, **fail Alert** missing from planned TDD.
- Empty / loading / permission: empty = `not_linked` (existing e2e/status); loading skeleton = manual/checkpoint only (ok); permission = auth-gated Settings e2e (existing) — **adequate**.

## Edge scenarios checked

- Boundaries / invalid input: missing HTTPS/certs, expired, expiring diagnose — **planned**; **unreadable PEM** and **XOR with `ready`** not listed; 30d boundary optional.
- Concurrency / double-submit / idempotency: diagnose/loader are pure/RSC load — N/A; existing e2e optimistic pending after Add covers client double-path enough — **no new required**.
- Offline / partial data / race: partial env (missing one cert class) covered by Task 1 “missing each class”; loader when `!enabled` still returns reasons — **planned**. No race implied by design.

## Fix ask for Build

Concrete tests to add or strengthen (fold into `04-tasks.md` Task 1 / 3 / 4 TDD lists before or during Build):

1. **Task 1 — `diagnoseAppleWallet` unreadable PEM:** fixture with present but invalid `APPLE_SIGNER_CERT` → `reasons` includes `signer_unreadable`, excludes `ready`, `healthyForAdd === false`, `signerValidTo === null`.
2. **Task 1 — assert XOR in every diagnose case:** any fixture that expects blocker/warn codes must assert `!reasons.includes("ready")` and non-empty `reasons`.
3. **Task 3 — expiring UI:** props with `reasons: ["signer_expiring"]`, `healthyForAdd: true` → warning Alert + Add button present.
4. **Task 3 — pending checklist:** `status: "pending"` → visible checklist cues (HTTPS web service + Wallet notifications); setup link still `/help#apple-wallet` when checklist shown.
5. **Task 3 or 4 — live hash target:** Help page (or content) exposes `id="apple-wallet"`; setup link navigates to that section (unit on markup preferred if e2e env cannot guarantee Apple-off).
6. **Task 4 — secrets absent:** off-path DOM must not contain `APPLE_SIGNER` or `BEGIN CERTIFICATE` / PEM headers.

Do **not** expand into a long matrix (per-missing-key UI copy, skeleton snapshot, real-device active). Prefer the six strong cases above; keep Task 5 as-is if Gate B keeps it optional.

## Round notes

- Design locks that drove gaps: Healthy-env `ready` XOR; expired vs expiring Add table; pending checklist under status; setup href `/help#apple-wallet` + Help target; no env/PEM in UI.
- Planned Task 1–4 core happy/off/expired/ready path is solid; result is not clean because locked edges (unreadable, expiring UI, pending, secrets, hash target) lack red-first cases.
- Task 2 “status unchanged when linked” is Enhancement — wire regression risk is real but secondary to diagnose + UI gates.
- Existing e2e “Apple Wallet is unavailable” assert must be replaced by specific readiness copy (already in Task 4 plan).
