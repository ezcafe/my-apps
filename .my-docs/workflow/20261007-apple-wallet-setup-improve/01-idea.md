# Idea: Improve Apple Wallet setup & ops

## Problem map (diagnose before framing)

**Mode:** full

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?
- PassKit channel exists: `lib/apple-wallet/*`, `app/api/apple/**`, Settings UI, `docs/setup-apple-wallet.md`, ADR-001/002; Baby care calls `notifyWalletCare`.
- Enable gate is binary: all `APPLE_*` + HTTPS base URL, else Settings shows a generic “unavailable” line (`config.ts`, `apple-wallet-settings.tsx`).
- No missing-env warnings (unlike WalletCast `parseApple` warnings); no cert expiry / health surface in code.
- Setup doc covers certs, HTTPS, tunnel, renew (~1y), troubleshooting; README links it — Settings does not.
- Prior run `apple-wallet-notifications` stopped at Gate C without that run’s git commit; code is on `main` now — ops readiness still unproven in this review.

#### What is missing / wrong?
- Opaque “why off?” — partial env / HTTP URL / bad PEM look the same to the operator.
- No guided readiness (which checks fail) or in-Settings path to the setup runbook.
- No cert-notAfter / renew reminder in product or ops tooling (Apple Pass Type ID certs expire ~yearly).
- Pending → active needs device register over HTTPS; stuck pending has weak in-UI recovery beyond static labels + doc table.
- Apple warns private keys on the web app increase attack surface; my-apps keeps signer key in env on the same host (accepted for self-host, worth explicit risk note).

#### What are the consequences?
- Deployers waste time guessing which env/URL/cert step failed.
- Caregivers see “pending” or no lock-screen ping with little actionable feedback.
- Expired cert silently breaks issue + APNs until someone notices.
- Channel looks “shipped” in code while real-device setup may never finish reliably.
- Security/ops debt stays invisible until a breach or outage.

### Step 2 — Real core problem

- **Surface symptoms:** Unavailable Settings, stuck pending, no lock-screen update, hard cert/HTTPS setup.
- **Root cause:** Setup and runtime health are opaque — binary enable, thin operator feedback, no cert lifecycle, weak link from UI → runbook → Apple requirements.
- **Core problem (one sentence):** Operators and caregivers cannot reliably finish and keep a working Apple Wallet notify path because setup and failures stay hard to see and fix.

### Mind map (visual text)

```text
Problem: opaque Apple Wallet setup / ops
├── Happening: binary gate; generic unavailable; docs only outside Settings
├── Missing: readiness cues; missing-env detail; cert renew; stuck-pending help
├── Consequences: failed deploys; silent outages; caregiver distrust
├── Core: cannot finish/keep a working PassKit notify path with confidence
└── ★ Top priority: diagnosable setup + ops so Add → active lock-screen is reliable
```

## Problem

Operators and caregivers cannot reliably finish and keep a working Apple Wallet notify path because setup and failures stay hard to see and fix.

## User / audience

- **Primary:** self-host deployer / ops (certs, HTTPS, env, renew).
- **Secondary:** signed-in caregiver using **Settings → Apple Wallet** (Add, QR, status, unlink).

## Outcome

Setup and day-to-day ops are diagnosable and reliable: from certs + HTTPS → Add → active lock-screen, with clear failure cues and renew awareness — without building a marketing-card product.

## Metric

A deployer can enable the channel and reach **active** on a real iPhone using only in-product cues + setup doc; a known misconfig (missing env, HTTP URL, or expired cert) surfaces a **specific** reason — not a silent no-op.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Channel shape + Settings subscribe | ADR-001, ADR-002; `lib/apple-wallet/*`; `components/apple-wallet-settings.tsx` | Shared notify; session + QR issue auth |
| Enable gate (APPLE_* + HTTPS) | `lib/apple-wallet/config.ts`; `docs/setup-apple-wallet.md` | Binary on/off |
| PassKit update loop (HTTPS WS, empty APNs, auth token) | [Adding a Web Service to Update Passes](https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes); [Updating a Pass](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html) | Production HTTPS; push uses pass cert |
| Cert renew ~yearly | `docs/setup-apple-wallet.md`; Apple Developer Pass Type ID cert practice | No in-app notAfter today |
| Missing-env warnings pattern | WalletCast `src/lib/config/env.ts` (`parseApple` warnings) | Pattern only — not product clone |
| Private key on web server risk | Apple Wallet PG Security Overview (Updating a Pass) | Prefer separate signing host; self-host tradeoff |
| Prior Gate C no-commit | `.my-docs/workflow/apple-wallet-notifications/00-run.md` | Code later on `main`; ops still to prove |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no — readiness / status / errors likely need Settings behavior, not copy alone.
- **UI notes for Design:** Shell **Settings → Apple Wallet** — unavailable reasons, pending→active clarity, link to setup doc; avoid new dashboard product.

## 80/20 UI (day-to-day)

### Main user goals

- Know if Apple Wallet notify is available and healthy.
- Add pass on this iPhone (or QR on another).
- See status move to active; unlink when done.

### Vital few (high-impact ~20%)

- Clear **why unavailable** (or ready) for the deployer-facing message.
- **Add to Apple Wallet** + honest **pending / active / fail**.
- Path to fix: setup doc + next action when stuck.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Channel readiness (on + why off) + status.
- **Important info / action #2 (always visible):** **Add to Apple Wallet** when enabled.
- **Core action placement:** Add primary; status under it; QR secondary in details; unlink less prominent.
- **Secondary actions:** Scan QR; unlink; deep cert PEM tooling stays in docs/ops, not Settings chrome.

### Top user journey to optimize

Open `/settings` → Apple Wallet → see readiness → Add (or QR) → pending → active → care event → lock-screen.

### Sensible defaults

- Prefer session Add on this device; QR collapsed until needed.
- When disabled, show the **smallest actionable** fix list (missing HTTPS / named env class) — not raw secrets.

### Biggest usability risks to fix first

- Generic unavailable with no next step.
- Stuck pending with no HTTPS / notifications checklist.
- Fail state that does not say what to retry.

## Non-goals

- Marketing-card / loyalty / broadcast SaaS (not a WalletCast clone).
- Google Wallet.
- Replacing Baby Telegram notify.
- Reopening ADR-001/002 grain unless new evidence forces it.
- Full separate signing microservice in this pass (document risk; defer unless Gate B expands).

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Real Pass Type ID certs + HTTPS host are (or will be) used | Yes for lock-screen success | Ask deployer; try Add on device | Scope stays docs/test-smoke only |
| Settings is the right place for readiness cues | Prefer yes | Check who runs env vs who Adds | Ops CLI / README-only path |
| Binary enable is the main opacity driver | Likely | List real failure modes from logs | Prioritize cert renew or pending UX first |
| Caregivers need richer UI this pass | No — ops may dominate | Decide Gate A / Gate B | Has UI stays yes but thinner copy |

## What we should not build

- Multi-card designer, public landing pages, subscriber CRM.
- Second notify product beside Telegram + Wallet.

## Success criteria

- [ ] Problem map ★ accepted: diagnosable setup/ops over new Wallet product surfaces.
- [ ] Prioritized gap list ready for Analyze (setup, Settings UX, reliability, security) with primary sources.
- [ ] Has UI = yes with 80/20 focused on Settings readiness + Add/status journey.
- [ ] Non-goals keep marketing-card and Google out of scope.
- [ ] Open questions logged; no Critical/Major blockers for Gate A.

## Open questions

- Is a production (or stable tunnel) HTTPS deploy with real Pass Type ID certs already in use?
- This pass: docs + Settings diagnostics first, or also cert-expiry detection in-app?
- Who is the north-star user for Gate B scope — deployer or caregiver?
- Any must-keep constraint on showing “which env is missing” in Settings (info leak to non-admins)?
- Confirm whether prior Gate C “no commit” left any unmerged intent beyond what is on `main` today.
