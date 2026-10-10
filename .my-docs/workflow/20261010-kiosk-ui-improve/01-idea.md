# Idea: Kiosk glance UI that answers “what needs me today?”

## Problem map (diagnose before framing)

**Mode full:** Steps 1–2 + mind map before Outcome.

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?
Objective symptoms, metrics, or factual observations (3–5):

- `/kiosk` stacks context strip → money metric cards → optional loan/investment insight bands → loan payments list (`kiosk-dashboard.tsx`, DESIGN_GUIDE “Kiosk glance pattern”).
- Defaults enable only weather, net this month, and loan payments; bills/savings/loan summary/investments are off (`widget-registry.ts`).
- Net / Bills / Savings cards share the same shape: large net + income/expense breakdown (`kiosk-net-card.tsx`, `kiosk-ledger-summary-card.tsx`).
- Optional insight bands reuse full `LoansInsightsStats` / `InvestmentInsightsStats` page variants — dense KPI grids, not glance chips.
- Overdue urgency lives inside the payments section (alert + rows), below metrics when those are on (`kiosk-loans-card.tsx`).

#### What is missing / wrong?
Gaps in resources, clarity, or alignment (3–5):

- No clear “attention first” above the fold when overdue or other time-sensitive items exist.
- Enabling more widgets lengthens a same-looking card stack; hierarchy does not re-rank by urgency.
- Insight bands compete with the glance job (status board) by importing Money Insights density.
- Bills/Savings “income/expense/net” labels may not match how a busy parent reads those ledgers at a glance.
- Widget toggles live in Settings; day-to-day users get defaults or an opaque all-on scroll with little guidance.

#### What are the consequences?
Downstream impacts if unsolved (3–5):

- Missed or late loan payments because urgency is below calm metric cards.
- Slow scan: similar type sizes and card chrome force full-page reading.
- Users avoid optional widgets or turn everything on and stop trusting the board.
- Kiosk feels like a second Money home instead of a status board (product intent mismatch).
- Weather/context stays useful while finance noise grows — mixed jobs on one scroll.

### Step 2 — Real core problem

- **Surface symptoms:** Long, similar metric/insight stacks; overdue not obvious first; glance takes too long.
- **Root cause:** Layout is “render enabled widgets in fixed bands,” not “answer today’s attention jobs in seconds.”
- **Core problem (one sentence):** A busy parent cannot tell what needs attention today in a few seconds because urgency and glance hierarchy lose to dense, look-alike summary stacks.

### Mind map (visual text)

```text
Problem: kiosk glance fails day-to-day
├── Happening: fixed stack; same card shape; dense insights; overdue mid-page
├── Missing: attention-first hierarchy; glance-sized insights; ledger meaning
├── Consequences: miss payments; slow scan; widget distrust; Money-home feel
├── Core: urgency + glance lost to widget-band density
└── ★ Top priority: reshape hierarchy so “needs me now” + key totals beat optional density
```

## Problem

Busy parents cannot answer “what needs me today?” in a few seconds on `/kiosk` because urgency and glance hierarchy lose to dense, look-alike summary stacks.

## User / audience

Primary: busy parent on mobile (DESIGN_GUIDE product context) who opens `/kiosk` for a quick status board between other tasks — not for deep Money analysis.

## Outcome

`/kiosk` lets that user see what needs attention now and the few key money totals in one short glance; optional detail stays secondary. Concrete layout options come later in Design (Mode full: two options).

## Metric

Time-to-answer (manual or moderated): from open `/kiosk` to stating (1) any urgent payment/action and (2) this month’s net — target under ~5 seconds on a phone-width viewport with default widgets; with overdue present, urgency named before scrolling past the first screen.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Busy parent, scannable totals, mobile-first | `docs/DESIGN_GUIDE.md` (Product context) | Audience + goals |
| Kiosk = status board; strip → metrics → insights → action list | `docs/DESIGN_GUIDE.md` (§ Kiosk glance pattern) | Intended IA |
| Page wiring + band order | `app/(shell)/kiosk/page.tsx`, `components/kiosk/kiosk-dashboard.tsx` | Actual stack |
| Context strip + weather link | `components/kiosk/kiosk-context-strip.tsx`, `app/(shell)/kiosk/weather/page.tsx` | Context job |
| Net / ledger card UI | `components/kiosk/kiosk-net-card.tsx`, `kiosk-ledger-summary-card.tsx` | Same card shape |
| Loans payments + overdue alert | `components/kiosk/kiosk-loans-card.tsx` | Action list / urgency |
| Widget ids, defaults, Settings labels | `lib/kiosk/widget-registry.ts`, `components/kiosk/kiosk-widget-settings.tsx` | Toggle model |
| Data load per enabled widget | `lib/kiosk/load-kiosk-page.ts` | What each band shows |
| Skeleton parity baseline | `components/kiosk/kiosk-dashboard-skeleton.tsx` | Loading mirror |
| Shell nav entry | `lib/features/registry.ts` (`kiosk`) | Surface exists in shell |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** Touch `/kiosk` dashboard stack (context strip, metric band, insight bands, payments list) + matching skeleton; Settings widget toggles only if hierarchy/defaults change; weather detail page is out of primary scope unless strip interaction changes. Two Design options in Mode full — no solution branches here.

## 80/20 UI (day-to-day)

### Main user goals

- See if anything needs action today (especially loan payments overdue / due soon).
- Glance this month’s money position (net; optionally bills/savings).
- Orient with today + weather without leaving the board (drill to weather only if needed).

### Vital few (high-impact ~20%)

- Attention / urgency for loan payments (overdue first).
- One primary money total (net this month) that is instantly scannable.
- Context strip (date + weather) that stays calm and secondary to money urgency when both matter.
- Avoid dense insight grids on the critical path for most users.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Urgent loan payment state (overdue / next due) when loans payments widget is on.
- **Important info / action #2 (always visible):** Net (or agreed primary money total) for the current month when that widget is on.
- **Core action placement:** Attention signals and primary total above optional dense bands; clear labels; pay/deep-link actions on payment rows stay one step; defaults favor glance over “show everything.”
- **Secondary actions:** Full loans / investments insight KPI grids; enabling many optional widgets; city/widget setup in Settings; weather day detail at `/kiosk/weather`.

### Top user journey to optimize

Open `/kiosk` → notice urgency (if any) → read net / key totals → (optional) pay or open loan → (optional) weather or Settings — without scrolling a wall of similar cards first.

### Sensible defaults

Keep a small default set oriented to glance + payments (current defaults: weather, net, loan payments). Optional insight/ledger widgets stay off unless the user opts in — Design may refine order/defaults, not invent a builder.

### Biggest usability risks to fix first

- Urgency buried below calm metrics.
- Look-alike cards and dense insight reuse that force reading, not scanning.
- Enabling optional widgets destroying the glance job with no re-hierarchy.

## Non-goals

- New dashboard builder / drag-and-drop widget layout (DESIGN_GUIDE out of scope for dashboards).
- Redesigning Money home, Loans Insights, or Investments Insights pages themselves.
- Full weather product redesign (prior run: weather detail); only strip interaction if needed.
- New finance APIs or new widget data domains in this ideation pass.
- Capture flows (add spend) as a kiosk primary job unless Design later proves a tiny entry is needed.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Primary glance job is “attention + net,” not “all Money KPIs” | Yes for Outcome | Ask user / Gate A | Widen Outcome to multi-KPI parity with Money Insights |
| Loan overdue is the main urgency signal on kiosk today | Strongly for defaults | Check real prefs / overdue usage | Elevate other urgencies (bills due, etc.) in Design |
| Optional insight bands are the main density problem when enabled | Likely | Review with all widgets on | Focus on metric-card sameness only |
| Settings toggles stay the way to choose widgets | Yes unless user rejects | Gate A / later Decision | In-page “more” disclosure instead |

## What we should not build

- Per-user freeform dashboard builder; rainbow status chrome; replacing the shell with a true physical kiosk OS.

## Success criteria

- [ ] Core problem and ★ priority stay stable through Gate A (day-to-day + 80/20).
- [ ] Design delivers two Mode-full UI options that both put attention + key totals ahead of optional density.
- [ ] Default-widget path answers urgency + net without scrolling past a dense insight wall.
- [ ] Skeleton and live stack stay aligned (CLS / skeleton parity) when UI changes ship later.

## Open questions

- Decision (later): stop after Design suggestions vs continue full Build pipeline (`00-run.md` Notes).
- Should “attention” ever include non-loan signals (e.g. bills) in this pass, or stay loan-payments-only given current widgets?
- When insight widgets are enabled, is a compact kiosk variant required, or is “keep them below the fold / opt-in only” enough?
- Any household preference for which money total is #1 if net is not enough (bills vs savings)?
)