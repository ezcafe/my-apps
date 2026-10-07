# Analysis: Apple Wallet setup & ops clarity

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

## Deep dive (required)

### Overall

#### What is this?
Make the existing PassKit notify channel **diagnosable**: operators and caregivers can see why Apple Wallet is off, how to finish Add → **active**, and when certs need renew — without a marketing-card product. Aligns with Core problem in `01-idea.md` (opaque setup/ops).

#### Why do we need this?
- **Outcome:** Deployer enables channel; real iPhone reaches **active**; misconfig shows a **specific** reason.
- **If skipped:** Generic unavailable, stuck pending, silent cert expiry — channel looks shipped but ops stay unreliable.

#### How to do this?
Keep ADR-001/002 + Settings chrome. Extend **config diagnostics** (WalletCast-style reasons, not clone) → pass structured readiness into Settings → clearer unavailable / pending / fail + link to `docs/setup-apple-wallet.md`. Optional cert `notAfter` in same readiness path.
- **Other ways:** Docs/README-only (no Settings change); separate ops CLI / health route; full signing microservice (Non-goal).
- **Best practices:** Repo — binary gate in `config.ts`, Settings section, `Alert`, skeleton parity, DESIGN_GUIDE. Industry — progressive disclosure; no secrets in UI; HTTPS required for PassKit WS ([Apple Updating a Pass](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html)).

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Doc link in Settings; caregiver-safe “why off” classes (HTTPS / certs / URL); pending HTTPS checklist copy; fail retry hint | Low / low | yes — early tasks |
| **2. Systemic** | `diagnoseApple*` reasons (+ optional cert notAfter); extend settings-loader props; e2e for off/on copy | Med / med (copy leak) | **yes — ★** |
| **3. Creative** | Startup/log warnings only; ops health HTTP; admin-only debug panel | Med–high / role model gap | later / Option 2 candidate |

- **★ Priority branch for this pass:** **2 Systemic** (diagnosable setup/ops) — matches idea mind-map ★; Branch 1 rides as early tasks.
- **Map to Design (full):** Option 1 ≈ systemic Settings readiness; Option 2 ≈ docs/log-first or health-route lateral. Quick wins → early tasks (not Non-goals).

**Decision 1 — North-star for Settings copy when channel is off**

| | **Option 1 — Deployer-first** | **Option 2 — Caregiver-first** |
|--|------------------------------|--------------------------------|
| **What** | Off-state lists actionable server fixes | Off-state stays short; deep fix text in doc only |
| **Example** | “Public URL must be HTTPS” + “PassKit certs missing on server” + setup link | “Not available on this server” + “Ask your deployer” + setup link |
| **Pros** | Hits Metric (specific misconfig); self-host primary audience | Safer if all signed-in users see Settings; less env taxonomy |
| **Cons** | Risk of oversharing config classes | Deployer still guesses without docs |
| **Recommendation:** **Option 1** with **caregiver-safe classes** (no env var names / PEM) — settle in Grill if product prefers Option 2.

**Decision 2 — Cert expiry this pass**

| | **Option 1 — Docs + renew note in UI** | **Option 2 — Parse signer cert notAfter in readiness** |
|--|----------------------------------------|--------------------------------------------------------|
| **What** | Point to yearly renew in setup doc / Settings hint | Decode PEM `notAfter`; warn when near/expired |
| **Example** | “Certs expire ~yearly — see setup doc” | Status: “Signer cert expired 2026-09-01 — renew” |
| **Pros** | Fast; no crypto parse risk | Matches Metric “expired cert → specific reason” |
| **Cons** | Easy to miss until break | PEM parse edge cases; still no APNs live probe |
| **Recommendation:** Prefer **Option 2** if effort stays in `config` + Settings props; else ship Option 1 first task and Option 2 same Design if Grill keeps it. **Ask user** if production certs exist before betting Metric on Option 2 alone.

### Solution pieces

#### 1. Config readiness (lib)

##### What is this?
Beyond boolean `isAppleWalletEnabled` — structured reasons (missing cert class, non-HTTPS URL, optional bad PEM / notAfter).

##### Why do we need this?
Binary gate is the opacity root (`02-skim` constraint 2).

##### How to do this?
- **Approach:** Add diagnose helper next to `config.ts`; keep enable gate unchanged for issue/WS/notify.
- **Other ways:** WalletCast `warnings[]` strings only; health HTTP.
- **Best practices:** Repo tests in `config.test.ts`; WalletCast `parseApple` warnings pattern (names in logs OK; Settings = safe classes).

#### 2. Settings UI (Gate A 80/20)

##### What is this?
Same `/settings` → Apple Wallet: readiness when off; pending/fail next steps; setup doc path; Add stays primary.

##### Why do we need this?
Vital few from Gate A; current generic unavailable + thin pending label.

##### How to do this?
- **Approach:** Extend `AppleWalletSettingsProps` from loader; `Alert` / muted lists; link to setup doc; skeleton parity.
- **Other ways:** New dashboard page (conflicts IA / Non-goals).
- **Best practices:** Existing `apple-wallet-settings.tsx` hierarchy; DESIGN_GUIDE tokens; no new shell nav.

#### 3. Cert lifecycle cue

##### What is this?
Surface renew awareness (docs and/or `notAfter`).

##### Why do we need this?
~1y Pass Type ID certs; silent break of issue + APNs.

##### How to do this?
- **Approach:** Per Decision 2; document risk of key-on-web-host (Non-goal: signing microservice).
- **Other ways:** Calendar/ops alert outside app.
- **Best practices:** Setup doc renew section already exists — link first.

#### 4. Pending → active recovery copy

##### What is this?
When status is **pending** (or fail), show HTTPS / notifications checklist — not only static label.

##### Why do we need this?
Register needs HTTPS WS; stuck pending is top usability risk (Gate A).

##### How to do this?
- **Approach:** Conditional copy under status; deep PEM tooling stays in docs.
- **Other ways:** Auto-poll registration (nice-to-have; not required for opacity core).
- **Best practices:** `walletStatusFrom` semantics unchanged unless Design finds a bug.

#### 5. Tests

##### What is this?
Unit for diagnose reasons; e2e for unavailable vs ready messaging.

##### Why do we need this?
Metric is specific misconfig text; prevent regression to generic line.

##### How to do this?
- **Approach:** Extend `config.test.ts` + `e2e/apple-wallet-settings.spec.ts`.
- **Other ways:** Manual-only (waives repo debug rule — avoid).
- **Best practices:** Reproduce → failing test → fix.

## What exists today

Shared channel on `main`: `lib/apple-wallet/*`, `app/api/apple/**`, Settings subscribe, setup doc, ADR-001/002. Enable = all `APPLE_*` + HTTPS public URL; Settings shows one generic unavailable line; status map is not_linked / pending / active / fail; no missing-env or cert notAfter in product.

## Dependencies

- Stay compatible with issue session/QR (ADR-002), PassKit WS, `notifyWalletCare`.
- DESIGN_GUIDE + skeleton parity on Settings edits.
- Secrets stay in env (skim constraint 4).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/apple-wallet/config.ts` (+ tests) | Enable gate → readiness |
| `lib/apple-wallet/settings-loader.ts` | Props into Settings |
| `components/apple-wallet-settings.tsx` | Primary UI |
| `docs/setup-apple-wallet.md` | Runbook to link |
| `e2e/apple-wallet-settings.spec.ts` | UX regression |
| WalletCast `src/lib/config/env.ts` | Warnings **pattern only** |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Binary enable + PEM decode | `config.ts` | Extend, don’t fork gate |
| Settings section + details QR | `apple-wallet-settings.tsx` | 80/20 already matches Gate A |
| Status map | `status.ts` / loader | Keep semantics; add copy |
| `Alert` for errors | Settings + ui/alert | Fail / warn surfaces |
| WalletCast warnings | ref env.ts | Server-side reason list shape |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Shared notify channel | ADR-001, `lib/apple-wallet` | Don’t nest under Baby |
| Issue auth session + QR token | ADR-002 | Unchanged grain |
| Readiness DTO → RSC props | settings-loader → page | Prefer over new public API |
| Env secrets, UI safe classes | skim + Apple security note | Leak vs diagnose tradeoff |

## Constraints and risks

- Do not reopen ADR grain without evidence.
- Do not dump env names / PEM to all Settings viewers.
- No marketing-card / Google / Telegram replacement.
- Self-host often has no separate “admin” role — “admin-only detail” may mean **safe classes for everyone** or **server logs only**.
- Fake/self-signed certs: Add may work; APNs/register may not — copy must not over-promise.

## Settled decisions (do not relitigate)

- Gate A ok; Has UI yes; Settings is the product surface.
- ADR-001 / ADR-002 accepted.
- Binary enable remains the runtime on/off rule (diagnostics explain it).
- Non-goals: WalletCast clone, Google, signing microservice this pass.
- **Grill facts (2026-10-07):** Generic unavailable copy confirmed; any signed-in Settings viewer sees Apple Wallet (no admin-only gate); Node `crypto.X509Certificate.validTo` parses signer PEM without new deps; prior Gate C “no commit” left no unmerged intent beyond `main` (`3051a30`).
- **Grill human (2026-10-07):** Decision 1 Option 1 (deployer-first safe classes); Decision 2 Option 2 (in-app `notAfter`); Q3 yes/soon real HTTPS+certs — Metric includes real iPhone **active**.

## Design tree (frontier)

### Settled
- Core problem = opaque setup/ops; ★ diagnosable path in Settings.
- IA: `/settings` → Apple Wallet; no new product chrome.
- Secrets not shown in UI.
- Spike: PEM `notAfter` / `validTo` parse is feasible in-process — **keep**.
- Decision 1 Option 1; Decision 2 Option 2; real-device Metric yes.

### Open frontier
- _(empty — Grill frontier-empty)_

### Blocked
- True “admin-only env names” UI — no role model → out of scope.
- Design still locks: exact reason-class strings; expired cert warn vs flip enable.

**Grill recommended?** Settled — see `02b-grill.md` Result **frontier-empty**.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| PEM notAfter parse | Can Node decode signer cert expiry without new deps? | Yes — `crypto.X509Certificate.validTo` works on PEM | keep if Decision 2 Option 2 |

## Parent flags (for `00-run.md`)

| Flag | Recommendation | Note |
|------|----------------|------|
| **Has API** | **no** | Readiness via config + settings-loader RSC props; no new public HTTP contract unless Design picks health route (then flip yes). |
| **Has DB** | **no** | No schema/migration; status queries stay as today. |

## Blocking questions

_(none — Round 1 settled)_

## Clear to grill / design?

**yes** — clear to Design.
