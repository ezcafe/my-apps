# Grill: 20261007-apple-wallet-setup-improve

**Result:** frontier-empty
**Updated:** 2026-10-07
**HITL:** blocking — Round 1 human settled (1→1, 2→2, 3→1)
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled (facts / prior locks):** Gate A + Settings IA; ADR-001/002; binary enable stays runtime gate; secrets never in UI; generic unavailable copy today (`apple-wallet-settings.tsx`); no diagnose helper yet; any signed-in Settings viewer sees Apple Wallet (no admin-only Settings role); Node `crypto.X509Certificate.validTo` parses signer PEM without new deps; setup doc already has ~1y renew; prior Gate C “no commit” — channel code is on `main` (`3051a30`); no leftover unmerged intent beyond `main`.
- **Settled (Round 1 human):** Decision 1 Option 1 (deployer-first safe classes); Decision 2 Option 2 (parse signer `notAfter` / `validTo`); Q3 Option 1 (real certs + HTTPS yes/soon — Metric includes real iPhone **active**).
- **Open frontier:** _(empty)_
- **Blocked:** true admin-only env-name UI — no role model (out of scope). Design still defines: exact reason-class strings; whether expired cert **warn-only** vs also flipping enable/issue (recommend: readiness warn + treat as not healthy for Add when expired).

## Frontier round 1

**Decision 1 — North-star for Settings copy when channel is off**

| | **Option 1 — Deployer-first** | **Option 2 — Caregiver-first** |
|--|------------------------------|--------------------------------|
| **What** | Off-state lists actionable server fix classes | Off-state stays short; deep fixes only in setup doc |
| **Example** | “Public URL must be HTTPS” + “PassKit certs missing on server” + setup link | “Not available on this server” + “Ask your deployer” + setup link |
| **Pros** | Hits Metric (specific misconfig); matches self-host primary audience | Safer for all signed-in viewers; less config taxonomy |
| **Cons** | Overshare risk if classes get too specific | Deployer still guesses without leaving Settings |
| **Recommendation:** **Option 1** with **caregiver-safe classes** (no env var names / PEM) — every signed-in user already sees this section. |

➡️ Recommended: **Option 1** — user-first: diagnosable off-state without leaking secrets.

**Settled as:** **Option 1** — human 2026-10-07 (`1→1`)

---

**Decision 2 — Cert expiry this pass**

| | **Option 1 — Docs + renew note in UI** | **Option 2 — Parse signer cert notAfter in readiness** |
|--|----------------------------------------|--------------------------------------------------------|
| **What** | Yearly renew hint + setup doc link | Decode PEM `validTo`; warn near/expired in readiness |
| **Example** | “Certs expire ~yearly — see setup doc” | “Signer cert expired 2026-09-01 — renew” |
| **Pros** | Fast; no parse edge cases | Matches Metric “expired cert → specific reason”; Node API already proven |
| **Cons** | Easy to miss until break | Still no APNs live probe; bad PEM messaging needed |
| **Recommendation:** **Option 2** in same Design as readiness (config + Settings props) — spike settled: no new deps. |

➡️ Recommended: **Option 2** — user-first: expired cert shows a specific reason before silent outage.

**Settled as:** **Option 2** — human 2026-10-07 (`2→2`)

---

❓ **Q3** — **Real-device / production assumption**: Are real Pass Type ID certs + a stable HTTPS public URL already in use, or planned before this pass ships?

➡️ Recommended: Treat as **yes / soon** if Metric includes real iPhone **active** — else Design scopes Metric to misconfig copy + smoke only. — user-first: lock success bar to what you can verify.

**Settled as:** **yes / soon (Option 1)** — human 2026-10-07 (`3→1`); Metric includes real iPhone **active**

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| Two caregivers, channel off | Both see same off-state copy (no admin gate) → Decision 1 must assume multi-viewer |
| HTTP `BASE_URL`, certs present | Enable false; readiness must name **HTTPS / public URL** class (not “certs”) |
| Enable true, Add succeeds, 0 device regs | UI **pending** (`walletStatusFrom`); show HTTPS WS + Wallet notifications checklist — not “fail” |
| Signer PEM present but `validTo` past | If Decision 2 Option 2: readiness warns expired even if enable gate today is “keys present” only — Design must define whether expiry flips enable or warn-only |

## Domain modeling

### Glossary updates
- **Channel readiness** → structured, caregiver-safe explanation of why the Apple enable gate is on or off (and optional cert renew cue).
- **Wallet UI status** → Settings-facing state: `not_linked` / `pending` / `active` / `fail` (fail is request-scoped, not stored).
- Paths touched: `GLOSSARY.md`

### ADR
- **Skipped:** Decisions 1–2 still open (blocking HITL). Copy depth and cert-cue depth are reversible UI/ops choices until Gate B locks them — fail three-part bar for a new ADR this round. ADR-001/002 unchanged.

## Auto-pick log

- `fact — generic unavailable + binary gate + no diagnose helper — code`
- `fact — no Settings admin role for Apple Wallet — any signed-in viewer`
- `fact — Node X509Certificate.validTo works without new deps — spike`
- `fact — prior Gate C leftover — none beyond main commit 3051a30`
- _(no auto-pick on Decision 1 / 2 / Q3 — HITL blocking)_

## Grill digest (≤4 bullets)

1. Human settled: deployer-first safe off copy; in-app cert `notAfter`; real HTTPS/certs for Metric.
2. Residual for Design: exact reason strings; expired cert warn vs flip enable.
3. Glossary: Channel readiness + Wallet UI status; no new ADR this pass.
4. Ready for Design? **yes** — frontier-empty.

## Human settle log

- `human — Decision 1 Option 1 — deployer-first caregiver-safe classes`
- `human — Decision 2 Option 2 — parse signer notAfter in readiness`
- `human — Q3 Option 1 — real certs + HTTPS yes/soon`
