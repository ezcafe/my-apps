# Code review: 20261007-apple-wallet-setup-improve

**Review profile:** full  
**Lens plan:** security (Has API no · Has DB no)  
**Overall Result:** clean  
**Updated:** 2026-10-07  
**Note:** Fresh verifier. Did not author the draft. No production code changed.

**Counts:** Critical 0 · Major 0 · Enhancement deferred (see Deferred)

## Adversarial test review

**Result:** clean (Round 2)  
**Critical:** 0 · **Major:** 0

### Round 1 (prior — needs update)

| Id | Severity | Location | Finding |
|----|----------|----------|---------|
| A1 | Major | `components/apple-wallet-settings.test.ts` | Task 3 locked UI cases (expiring Alert+Add, pending checklist, expired vs ready, setup href) are covered only by `readFileSync` + regex on the `.tsx` source. Strings can stay while `healthyForAdd` / `status === "pending"` conditionals regress — tests still pass. Not a real failure-mode assert. Diagnose + loader units and e2e off-path secrets check are solid; this gap is the UI prop matrix. |

**Fix ask (Round 1 — Critical/Major only):** A1 — replace source-grep readiness UI cases with prop-driven `renderToStaticMarkup` asserts (see Fix notes Round 1).

### Round 2 — A1 fix verification (this round)

**Updated:** 2026-10-07 · Verifier · fresh context · no production code · did not author draft  
**Result:** clean · Critical 0 · Major 0

**A1 closed — verified**

| Fix ask criterion | Evidence |
|-------------------|----------|
| Prop-driven `renderToStaticMarkup` on pure slice | `AppleWalletSettingsView` exported; `renderView()` → `renderToStaticMarkup(createElement(AppleWalletSettingsView, props))` |
| `signer_expiring` + `healthyForAdd: true` → warning Alert **and** Add | Markup asserts title/copy + `role="status"` (Alert warning) + Add + issue `action` |
| `signer_expired` + `healthyForAdd: false` → no Add | Markup asserts warn + `doesNotMatch` Add; ready props show Add |
| `status: "pending"` → checklist | Markup asserts `data-testid="apple-wallet-pending-checklist"` + HTTPS WS / Wallet notifications + setup href |
| Setup `href` = `/help#apple-wallet` | Markup asserts `href="/help#apple-wallet"` on off / pending matrices |

Source-regex remains only for navigational GET delivery and Help `id="apple-wallet"` (explicitly out of A1; Task 3 Help still “prefer markup” — Enhancement, not reopened as Major).

**New Critical/Major:** none.

**What is good (Round 2)**

| Check | Note |
|-------|------|
| UI prop matrix | Real rendered failure modes for Add gate, cert warn, pending, setup href, fail Alert, stack order |
| Diagnose units | Unchanged; forge PEM fixtures still cover ready XOR / expired / expiring |
| Loader units | Unchanged; disabled + expired `healthyForAdd: false` |
| Suite green | `apple-wallet-settings.test.ts` 9 pass; config + loader 14 pass |

**Fix ask (adversarial — Critical/Major only):** none

**Deferred (Enhancement — unchanged)**

- Loader: enabled + linked status path regression (04a Enhancement).
- Exact 30-day boundary fixture (`now+30d` expiring vs `now+31d` ready).
- Help `#apple-wallet` still source-grep (could be markup unit later).
- Nit: expired/expiring copy regexes use `|renew` alternate — Add-gate asserts still catch the A1 failure modes.

## Quality review

**Result:** clean  
**Critical:** 0 · **Major:** 0

| Axis | Verdict | Note |
|------|---------|------|
| Correctness | pass | `diagnoseAppleWallet` matches design DTO + ready XOR; Add gated by `healthyForAdd`; expired vs expiring table honored in UI |
| Architecture | pass | Diagnose beside `config`; RSC props via `settings-loader`; no new HTTP; patterns match 03-design |
| UI lock (Has UI) | pass | Readiness → Add slot → status → details; safe reason copy; setup `/help#apple-wallet`; Help section `id="apple-wallet"`; flat `SettingsSection` + `Alert` |
| Skeleton | pass (shell) | Settings `loading.tsx` stays single Appearance pane (existing category swap); Apple content SSR — no new CLS surface required beyond prior Settings pattern |
| Security (shallow) | defer | Deep pass → security lens |
| Readability | pass | Clear reason map; no env names in client |

**Enhancement (deferred — do not block)**

- Issue GET still follows binary `isAppleWalletEnabled` when cert expired (design-documented; UI-only Add block).
- Expired copy puts date after “renew” vs design “(date) — renew” wording order.

**Fix ask:** none

## Merged lenses

**Round:** 1  
**Result:** clean  
**Note:** Lens plan = security only (1 lens). Parent copied `05-lens-security.md` — no Merge Task.

| Severity | Sources | Finding | Decision |
|----------|---------|---------|----------|
| — | security | No open Critical / Major / Enhancement | pass |

**Conflicts resolved:** none  

**Fix ask (merged lenses):** none  

**Round notes:** Security clean. Round 2 Adversarial closed A1 → overall review **clean** (adversarial + quality + security: zero Critical/Major).

## Deferred

| Item | From | Notes |
|------|------|-------|
| Loader linked-status regression unit | Adversarial / 04a | Enhancement |
| 30-day boundary PEM fixtures | Adversarial / 04a | Enhancement |
| Task 5 server diagnose logs | Gate B deferred | Out of this ship |
| Gate issue on expiry | Quality | Design kept binary enable |

## Fix notes

### Round 1 — A1 (2026-10-07)

**Fixed:** Major A1 only. Extracted `AppleWalletSettingsView` (pure presentational slice; hooks stay in `AppleWalletSettings`). Replaced source-regex readiness UI cases in `components/apple-wallet-settings.test.ts` with `renderToStaticMarkup` + prop matrices (repo pattern, same as money/baby markup tests).

**Prop cases now fail on regression:**
- `public_url_https` + `healthyForAdd: false` → HTTPS copy, no Add, setup `href="/help#apple-wallet"`, no env/PEM strings
- `signer_expired` + `healthyForAdd: false` → warning Alert, no Add; `reasons: ["ready"]` → ready copy + Add
- `signer_expiring` + `healthyForAdd: true` → warning Alert **and** Add
- `status: "pending"` → HTTPS WS + Wallet notifications checklist + setup href
- fail → error Alert; stack order from rendered markup

**Left as source checks (out of A1):** navigational GET delivery; Help `id="apple-wallet"`.

**Not touched:** Enhancements (loader linked-status, 30-day boundary, etc.).

**Tests:** `components/apple-wallet-settings.test.ts` + `lib/apple-wallet/config.test.ts` + `lib/apple-wallet/settings-loader.test.ts` → 23 pass / 0 fail. No commit.
