# Idea day-to-day review (Gate A): 20261007-apple-wallet-setup-improve

**Result:** ok
**Round:** 1
**Updated:** 2026-10-07
**Role:** end user (day-to-day usage) — fresh context only

## Problem map / Core problem (product clarity)

| Check | Pass? | Note |
|-------|-------|------|
| Problem map present (Mode full) | yes | 3 WHAT branches + mind map + ★ |
| Core problem one clear sentence | yes | Operators/caregivers cannot finish/keep a working notify path because setup/failures stay hard to see and fix |
| Outcome matches ★ top priority | yes | Diagnosable setup/ops → Add → active lock-screen |

## 80/20 UI rule (required when UI)

Focus on the vital few that deliver most day-to-day value. Progressive disclosure: keep the main surface focused; hide rare options.

### 1. Main user goals

What users come to accomplish (list):

- Know if Apple Wallet notify is available and healthy
- Add the pass on this iPhone (or via QR on another)
- See status reach active; unlink when done

### 2. Vital few features / problems

High-impact ~20% (most used or most painful). Sources if known: analytics, support, interviews, usability — else product judgment:

| Vital few item | Why it is high-impact |
|----------------|------------------------|
| Clear why unavailable (or ready) | Stops deployer guessing when the channel is off |
| Add + honest pending / active / fail | Main caregiver path to a working pass |
| Path to fix (doc + next action when stuck) | Turns dead-ends into fixable steps |

### 3. Core actions visually dominant

Primary tasks need: clear placement, strong hierarchy, descriptive labels, fewer steps, helpful defaults, immediate feedback. Secondary actions → menus, overflow, expand, modal, or less prominent areas.

| Item | Value |
|------|-------|
| Important info / action #1 (always visible) | Channel readiness (on + why off) + status |
| Important info / action #2 (always visible) | Add to Apple Wallet when enabled |
| Secondary / deferred (expand / modal / menu / overflow) | Scan QR; unlink; deep cert/PEM tooling in docs/ops |
| Core actions dominant? | yes |

### 4. Biggest usability problems first

Fix confusion that hits most users before polish (nav, forms, hidden errors, etc.):

| Problem | Fix first? | Note |
|---------|------------|------|
| Generic unavailable with no next step | yes | Main opacity pain |
| Stuck pending with no HTTPS / notifications checklist | yes | Blocks active + lock-screen |
| Fail state that does not say what to retry | yes | Avoid silent no-op |
| Cert renew ~yearly | yes | Silent break after ship |

### 5. Simplify the interface

Rarely used options removed or hidden so they do not distract from common tasks:

| Pass? | Note |
|-------|------|
| yes | QR collapsed; PEM/cert tooling stays out of Settings chrome; non-goals bar marketing-card UI |

### 6. Top user journeys

Most common workflow mapped and prioritized over rare screens:

| Journey steps (Open → … → done) | Optimized? |
|---------------------------------|------------|
| Open /settings → Apple Wallet → readiness → Add (or QR) → pending → active → care event → lock-screen | yes |

### 7. Sensible defaults

Preselect what most users choose (forms, filters, checkout-like flows):

| Default | Why it helps most users |
|---------|-------------------------|
| Session Add on this device | Matches “I’m on my iPhone” common case |
| QR collapsed until needed | Secondary device path stays out of the way |
| Smallest actionable fix list when off (no raw secrets) | Deployer gets next step without dumping env values |

### 8. Test, measure, repeat (plan)

What to track after ship (completion, errors, abandonment, conversion, time on task) — or N/A if too early:

- Reach **active** on a real iPhone using only in-product cues + setup doc
- Known misconfig (missing env, HTTP URL, expired cert) shows a **specific** reason — not a silent no-op

**80/20 overall pass?** yes

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (goals → vital few → dominant core → simplify → journey → defaults) | yes | Settings-focused; Add + readiness dominate |
| Convenience (few steps, low friction in daily use) | yes | Diagnosable off state beats env guesswork |
| Easy to use (clear actions, low learning cost) | yes | Two always-visible items; QR/unlink secondary |
| Understanding (problem + outcome make sense to a real user) | yes | Opaque setup/ops is a problem real deployers feel |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Add on iPhone is the path; Settings must work on phone |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Map → problem → 80/20 → non-goals reads clean |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Enhancement | North-star user still open (deployer vs caregiver) | Before Design, pick one primary for Settings copy depth when channel is off |
| Enhancement | Non-admin seeing “which env is missing” is unresolved | Note caregiver-safe vs admin-only detail in Lean / UI notes |
| Nit | Measure plan lives in Metric, not under 80/20 §8 | Optional: mirror Metric bullets into §8 for Design handoff |

## Fix ask for Ideation

Concrete updates to `01-idea.md` (section + what to change):

_(none — Result ok; Critical/Major clear)_

## Auto-approve?

- **Yes** — Result **ok**; Problem map / Core / Outcome★ aligned; **80/20 overall pass**; checklist acceptable → parent may check **Gate A**.

## Round notes

- Fresh end-user read of `01-idea.md` only. Idea would help real daily setup: stop guessing why the channel is off, get Add → active with clear stuck/fail cues, keep rare cert tooling out of chrome.
- Dual audience is tolerable for Gate A; settle who Settings optimizes for when wording conflicts (Enhancement, not blocking).
