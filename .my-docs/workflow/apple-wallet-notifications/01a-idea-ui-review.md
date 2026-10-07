# Idea day-to-day review (Gate A): apple-wallet-notifications

**Result:** ok
**Round:** 2
**Updated:** 2026-10-05
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- See if Apple Wallet alerts are available / on
- Add the pass from Settings (this iPhone first; QR if another device must scan)
- Know if *my* alerts are active; stop them when done
- Get Baby-care lock-screen pings like Telegram — without Telegram

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| **Add to Apple Wallet** when channel is on | One-tap subscribe on the phone you hold — without this, nothing starts |
| Honest status (not linked / pending / active / fail) | Trust; “active” = *your* pass for this workspace |
| Lock-screen update on a real Baby care event | The daily job after one-time setup |
| Stop path (unlink + delete-pass guidance) | People need a clear exit |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Channel available + **Add to Apple Wallet** when enabled |
| Important info / action #2 (always visible) | Status (not linked / pending / active / fail) — per signed-in user |
| Secondary / deferred (expand / modal / menu / overflow) | QR for other-device scan; long help; cert/ops; multi-device notes |
| Core actions dominant? | **yes** — Add first; status next; QR secondary |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Dead Add/QR when Apple cannot issue | yes | Section hidden / unavailable when off — in defaults + risks |
| Telegram (Baby) vs Wallet (shell Settings) | yes | Homes locked; short “separate channels” copy |
| Silent fake success after Add | yes | pending → active or fail in journey + success |
| Exact message length / multi-device count | no | Open Qs — fine for Analyze |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | Non-goals keep Settings small (no Google, no marketing dashboard, no replace Telegram) |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open `/settings` → Apple Wallet → **Add** → pending/active/fail → later lock-screen on Baby care | **yes** |
| Open Settings when Apple off → unavailable (no dead CTA) | yes |
| Stop → unlink in Settings and/or delete pass (guidance) | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Hide / unavailable when Apple not configured | No broken trust |
| Shell `/settings` primary; Telegram stays Baby | One place to look |
| v1 events = Baby care | Matches Telegram job users know |
| Status = per signed-in user (own pass) | Clear for multi-caregiver homes |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Settings → Add → status becomes active (or clear pending/fail)
- One Baby care event → visible Wallet lock-screen update
- Disabled channel → zero misleading subscribe CTA
- Soft fail: abandon after Add with status still not active

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Add-first + status + Baby v1 locked |
| Convenience (few steps, low friction in daily use) | yes | Same-phone Add; QR only when needed |
| Easy to use (clear actions, low learning cost) | yes | Homes locked; status meaning plain |
| Understanding (problem + outcome make sense to a real user) | yes | Core problem + ★ Outcome clear |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | iPhone-first path matches audience |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Add → status → how-to → secondary QR |

## Problem map / Core problem (product clarity)

| Check | Pass? | Note |
|-------|-------|------|
| Problem map present (Mode full) | yes | WHAT branches + mind map + ★ present |
| Core problem one clear user sentence | yes | No Wallet lock-screen channel + no settings opt-in |
| Outcome matches ★ top priority | yes | Parallel channel + Settings subscribe when enabled; Baby v1 |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | Devices-per-user still open | Fine for Grill/Analyze — not blocking day-to-day |
| Nit | Message copy length still open | Prefer shorter lock-screen line in Design later |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

1. None — Result **ok**.

## Auto-approve?

- **Yes** — Result **ok**; 80/20 overall pass **yes**; day-to-day checklist acceptable → parent checks **Gate A**.

## Round notes

- **Round 1:** Problem map + Core problem + Outcome ★ alignment OK. Idea direction right (parallel channel, hide when off, status, Non-goals). Blocked on day-to-day: same-phone Add-first, where to find it, what “active” means, confirm-after-add. Result **needs update**. No escalate.
- **Round 1 → ideation-update (2026-10-05):** PO applied Fix-ask — Add-first (#1), shell `/settings` locked (Telegram stays Baby), per-user “active” default, journey + success for pending/active/fail, Baby care v1 in Outcome/Metric, stop path in Top journey.
- **Round 2:** Re-judged updated `01-idea.md` on merits. All Round 1 Majors cleared. 80/20 pass; checklist acceptable. Result **ok**. Remaining open Qs (devices/copy) are Design/Analyze, not Gate A blockers.
