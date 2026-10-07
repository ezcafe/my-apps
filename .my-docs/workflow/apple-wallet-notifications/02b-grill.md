# Grill: apple-wallet-notifications

**Result:** frontier-empty  
**HITL Gate B:** blocking (Gate B still required before Build; Grill settled)  
**Updated:** 2026-10-05 · Round 1 settled · human picks `1/1/1/1/1`

## Facts settled (code-verified)

- my-apps: no PassKit; Telegram = workspace `baby_telegram_link` + `summary` (`notify.ts`).
- WalletCast: `latestMessage` on **card**; bumps subscriber `updatedAt`; multi-device via `apple_registrations`.
- No `qrcode` dep yet. Analyze path unchallenged: shared `lib/apple-wallet` + per-user (Gate A).

## Settled (Round 1 — human `1/1/1/1/1`)

| Q | Title | Pick | Notes |
|---|-------|------|-------|
| **Q1** | Devices per user | **Option 1** | One serial per `(workspace, user)`; multi-device via registrations. Matches rec. |
| **Q2** | Issue auth URL | **Option 1** | Session Add-on-this-device; short-lived token URL for QR. Matches rec. |
| **Q3** | Lock-screen copy | **Option 1** | Reuse Telegram `careSummary`. **User override** (grill rec was Option 2 short template). |
| **Q4** | Certs before Gate B | **Option 1** | Env-gated disabled until `APPLE_*` complete. Matches rec. |
| **Q5** | Where is `latest` stored | **Option 1** | Workspace channel-state + bump subscriber `updatedAt`. Matches rec. |

## Frontier

**Empty** — no open decision whose prerequisites are settled and still unanswered. Design may proceed.

## Scenario stress-test (under settled picks)

| Scenario | Outcome |
|----------|---------|
| A+B each Add; care event | Both users’ devices: empty APNs + same workspace latest text (`careSummary`) |
| QR on spouse phone | Short-lived token → A’s pass only; expires; no public issue |
| Apple env incomplete | No Add/QR; Telegram still works |
| Pass deleted; APNs 410 | Prune token; user stays active if another registration remains |

## Glossary / ADR

- **Glossary:** terms finalized in repo `GLOSSARY.md` (channel, subscriber, loop, enable gate, latest state, issue token).
- **ADR-001:** **Accepted** — shared `lib/apple-wallet` + per-user subscribers (Analyze + Grill).
- **ADR-002:** **Accepted** — session Add + short-lived QR issue token (Q2; auth bar).
- **ADR skipped — Q3:** copy choice easy to reverse later.
- **ADR skipped — Q4:** ops enable timing; reversible; mirrors Telegram gate.
- **ADR skipped — Q1/Q5 as separate files:** folded into ADR-001 consequences (serial grain + workspace latest).

## Grill digest

- Human settled all five: serial-per-user multi-device; session+QR token; **careSummary** (override); env-gated certs; workspace latest + `updatedAt` bump.
- Glossary + ADR-001/002 accepted; no frontier left for Design.
- Residual risk: long Telegram summaries may truncate poorly on lock screen (accepted with Q3 Option 1).
