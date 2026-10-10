# Review log: Kiosk attention-first glance

## Adversarial test review

**Round:** 2 · **Result:** clean — 0 Critical, 0 Major open, 3 Enhancement (deferred)
**Updated:** 2026-10-10
**Scope:** Re-verify after Fix R1. Confirm prior Majors are proven by dashboard tests (not mock theater) and no new Critical/Major on Design UI lock coverage.

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `kiosk-dashboard.test.ts` unavailable suite + `kiosk-dashboard.tsx:133-146` | **Unavailable title wiring unproven** (R1). Isolated `KioskNetUnavailable` prop test was insufficient. | fixed — verified R2 |
| Major | `kiosk-dashboard.test.ts` order suite | **Insights-below-metrics not locked** (R1). No insights-on fixture. | fixed — verified R2 |
| Enhancement | `app/(shell)/kiosk/weather/page.tsx` (no test) | **Weather empty / fetch-fail next action untested.** Muted KPI labels locked elsewhere; page `primaryAction` smoke still absent. | open (deferred) |
| Enhancement | `kiosk-dashboard.test.ts` empty payments | Soft empty asserts copy + `role="status"` + no overdue Alert; does not assert `/loans` CTA. | open (deferred) |
| Enhancement | `kiosk-dashboard-skeleton.test.ts` | Band order locked; no multi-metric / insights max-layout shape assert. | open (deferred) |

**Lock coverage (challenge summary):**

| Design UI lock | Proven by tests? | Note |
|----------------|------------------|------|
| Order strip → attention → metrics | yes | DOM-index units + skeleton markers; e2e skipped with note |
| Order metrics → insights (when on) | yes | R1 Fix + R2 verify: insights-on fixture; section `aria-label`s in parent (safe under `next/dynamic`) |
| Net first among metrics (D4) | yes | net+bills+savings fixture |
| Empties: no widgets / empty payments → `AnalyticsEmptyState` | yes | dashed custom empty banned on no-widgets |
| Empties: unavailable metric titles via dashboard | yes | R1 Fix + R2 verify: Bills/Savings titled Unavailable; no default Net |
| Colors: chart income/expense, not `--destructive` | yes | Net + ledger cards |
| Weather muted KPI labels | yes | `text-sm font-medium text-muted` on Temp/PM2.5/Rain |
| D2: `bills.summary` ≠ attention | yes | payments off + summary-only; Phase 2 bills-due `it.skip` stub OK |

**Fix ask (Critical/Major only):** none — prior Majors closed.

**Deferred Enhancements:** weather page empty/CTA smoke; empty-payments `/loans` CTA assert; skeleton multi-metric / insights max-layout parity.

**Round notes (R2 re-verify):**

- Fresh read of Fix R1 notes, `03-design.md` Design UI locks, `04-tasks.md`, `kiosk-dashboard.test.ts`, and `kiosk-dashboard.tsx` wiring.
- **Major unavailable titles:** suite mounts full `KioskDashboard` with `bills.summary` / `savings.summary` on and empty widgets; asserts `>Bills<` / `>Savings<` + Unavailable inside Money metrics and rejects `>Net<`. Would fail if dashboard dropped `title` (default Net). Product already passes `title="Bills"` / `"Savings"`.
- **Major insights order:** fixture enables `loans.summary` + `investments.summary`; asserts `Money metrics` index &lt; `Loan summary` &lt; `Investment summary`. Section wrappers live in parent — not false-green against dynamic children.
- Focused unit run: `kiosk-dashboard.test.ts` — 10 pass, 1 skip (Phase 2 stub), 0 fail.
- No new Critical/Major. Enhancements stay deferred (non-blocking).
- Adversarial test review: **clean.** Parent: proceed to Quality.

### Fix from review (Round 1) — Adversarial Majors

**Updated:** 2026-10-10  
**Result:** both Majors addressed in tests; product already correct (no product edit)

| Finding | Fix |
|---------|-----|
| Major — unavailable Bills title via dashboard | `kiosk-dashboard.test.ts`: `bills.summary` on, empty widgets → Money metrics has `>Bills<` + Unavailable, no `>Net<`. Twin for `savings.summary` → Savings. |
| Major — insights below metrics | Order suite: enable `loans.summary` + `investments.summary` with net + payments; assert `Money metrics` index &lt; `Loan summary` &lt; `Investment summary` (section wrappers; no dynamic payload needed). |

**Round notes:**

- TDD: added dashboard render locks first; focused run green immediately — `kiosk-dashboard.tsx` already passes `title="Bills"` / `"Savings"` and renders metrics section before insight sections.
- No product code change (tests proved wiring already matches Design UI).
- Enhancements left deferred / open (non-blocking).
- Parent: re-run Adversarial until clean → then Quality. Fix does not self-approve.

---

## Quality

**Round:** 2 · **Result:** clean — 0 Critical, 0 Major open, 1 Enhancement (deferred)
**Updated:** 2026-10-10
**Scope:** Re-verify after checklist Fix. Axes: correctness, architecture, readability; UI lock hard-fails Major on clear drift. Perf deferred to Lens plan.

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `docs/DESIGN_GUIDE.md:563` | Guide checklist still shipped old IA (R1). | fixed — checklist now `context strip → attention (action list) → metrics → optional insights` |
| Enhancement | `kiosk-dashboard-skeleton.tsx` | Max-layout shape (multi-metric slots + insights band) not mirrored; defaults-shaped skeleton only. | open (deferred) |

**UI lock checklist (Gate A #1/#2 + Design UI):**

| Lock | Match? | Note |
|------|--------|------|
| Gate A #1 attention before calm metrics (defaults) | yes | Loans section before Money metrics |
| Gate A #2 net as money #1 | yes | `METRIC_BAND_IDS` net → bills → savings; net title first |
| Stack strip → attention → metrics → insights | yes | Live + skeleton order markers |
| Empties: `AnalyticsEmptyState` (no dashed panels) | yes | No-widgets + empty payments + weather fail |
| Unavailable titles (not always Net) | yes | Bills / Savings / Loans / Investments titled |
| Money colors chart tokens, not `--destructive` | yes | Net + ledger cards |
| Weather muted KPI labels + grid + fail CTA | yes | `text-sm font-medium text-muted`; Reload/Settings |
| DESIGN_GUIDE attention-first sync | yes | Body § + checklist L563 aligned |

**Fix ask (Critical/Major only):** none

**Round notes:**

- Parent main-thread Fix: updated DESIGN_GUIDE checklist Kiosk line to attention-first stack.
- Quality R2: **clean.** Parent: proceed to perf lens (Lens plan: perf only → copy Result into Merged lenses).

---

## Merged lenses (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

Parent copy (1 lens only — no Merge Task). Raw: `05-lens-performance.md`.

**Round:** 1
**Result:** clean

### Winners (fix these)

| Severity | Sources | Finding | Decision |
|----------|---------|---------|----------|
| — | perf | No Critical/Major | keep — clean |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| — | — | none |

### Fix ask (for Fix agent)

none

**Round notes:**

- Lens plan = perf only. Perf Result clean → review clean overall. Parent → full test.

---

## Deferred (Enhancements — do not block clean)

Optional polish / Enhancements logged but not in Fix ask:

- Weather page empty / fetch-fail `primaryAction` smoke (Adversarial R1)
- Empty payments `/loans` CTA assert (Adversarial R1)
- Skeleton multi-metric / insights max-layout parity (Adversarial R1)

---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:

- None this Fix round — both Adversarial Majors covered with dashboard unit tests (TDD verify green; no product edit).
