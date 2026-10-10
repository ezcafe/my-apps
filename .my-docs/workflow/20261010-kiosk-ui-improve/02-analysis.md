# Analysis: Kiosk glance hierarchy

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

## Deep dive (required)

### Overall

#### What is this?
Improve `/kiosk` so a busy parent can answer “what needs me today?” in a few seconds. Today the page renders enabled widgets in fixed bands (context → metrics → optional dense insights → loan payments). Urgency (overdue) sits inside the payments band, after calm look-alike cards. Aligns with Core problem / ★ in `01-idea.md` and Gate A 80/20.

#### Why do we need this?
Missed or late loan payments and slow scans when similar cards and insight grids dominate. Skipping leaves kiosk feeling like a second Money home instead of a status board (`DESIGN_GUIDE` Kiosk glance pattern).

#### How to do this?
Reshape hierarchy so “needs me now” + primary net beat optional density; keep Settings toggles and existing loader/prefs; update skeleton + glance docs with any new stack order.

**Decision 1 — Attention placement (★)**

| | **Option 1 — Reorder bands** | **Option 2 — Attention callout + keep list below** |
|--|------------------------------|-----------------------------------------------------|
| **What** | Move loan-payments (action list) above metrics (and keep insights below metrics or further down). Update `DESIGN_GUIDE` glance stack. | Keep guide’s metrics-before-list order; when overdue/due-soon exists, show a compact attention strip above metrics; full list stays lower. |
| **Example** | strip → payments → net grid → optional insights | strip → “2 overdue” chip/alert → net → … → payments list |
| **Pros** | One clear stack; urgency is the first finance block; matches journey Open → urgency → net | Smaller IA change; “all clear” stays metrics-led; less scroll when no urgency |
| **Cons** | Conflicts with current guide wording until updated; calm “all clear” may feel payments-first | Two urgency surfaces (callout + list) risk duplication; easy to miss if callout is too quiet |
| **Recommendation** | **Option 1** for this pass — Gate A fix-first is “urgency buried under calm metrics”; one reorder + guide update is clearer than dual surfaces. Use Option 2 only if user wants metrics still above the list when nothing is overdue (conditional order). |

- **Other ways:** Visual-only type hierarchy (bigger overdue, smaller cards) without reorder — helps scan but does not fix band position.
- **Best practices:** Repo: status board IA, widget-gated `load-kiosk-page`, skeleton parity, clean-minimal tokens. Industry: progressive disclosure, attention before overview KPIs on glance boards.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Elevate overdue styling; payments before insights; keep defaults (weather/net/payments) | Low / CLS if skeleton lags | yes — early tasks |
| **2. Systemic fixes** ★ | Attention-first stack (Decision 1); glance rules when many widgets on; guide + skeleton sync | Med / guide + layout drift | yes — Design Option 1/2 |
| **3. Creative / lateral** | Compact kiosk insight variant; “all clear” calm state; in-page “more” vs Settings-only | Med–high / scope creep | later / optional Option |

- **★ Priority branch for this pass:** **2. Systemic fixes** (matches idea mind-map ★).
- **Map to Design:** Mode full → two UI options from systemic (e.g. full reorder vs conditional attention-first); quick wins → early tasks; creative compact insights → Option B or Non-goals if deferred.

### Solution pieces

#### 1. Attention-first hierarchy

##### What is this?
Dashboard band order and where overdue / next-due show first (`kiosk-dashboard.tsx` + `kiosk-loans-card.tsx`).

##### Why do we need this?
Default path must name urgency before scrolling past the first screen (Outcome / Metric).

##### How to do this?
- Approach: Decision 1 Option 1 (or conditional Option 2 if settled in Grill).
- Other ways: Callout-only; or leave order and only restyle.
- Best practices: DESIGN_GUIDE action list not in a Card; semantic warning Alert already used for overdue.

#### 2. Primary money total (net) glance

##### What is this?
Net card as #2 always-visible signal when `money.net_month` is on; optional bills/savings stay secondary and less “same as net.”

##### Why do we need this?
Answers “how am I doing this month?” without a Money tour.

##### How to do this?
- Approach: Keep net as primary; optional visual weight difference vs ledger cards; label tweaks only if needed.
- Other ways: Promote bills as #1 — only if user rejects net (Open question).
- Best practices: Large display number already on `KioskNetCard`; auto-fit metrics grid.

#### 3. Insight density control

##### What is this?
Optional `loans.summary` / `investments.summary` reuse `*InsightsStats` `variant="page"` — dense KPI grids on the critical path when enabled.

##### Why do we need this?
Enabled insights compete with the glance job (Gate A secondary).

##### How to do this?
- Approach: Prefer keep opt-in + below attention/net; optional compact/chip variant later.
- Other ways: Always hide on kiosk; or new `variant="kiosk"`.
- Best practices: Progressive disclosure; do not elevate full Insights pages to glance.

#### 4. Skeleton + glance-doc parity

##### What is this?
`kiosk-dashboard-skeleton.tsx` and `DESIGN_GUIDE` § Kiosk glance must match the live stack.

##### Why do we need this?
CLS / trust; skim hard constraint #4.

##### How to do this?
- Approach: Same section order/grid as live after hierarchy change; update guide wording in same change.
- Other ways: Skeleton-only — insufficient if guide still documents old IA.
- Best practices: UI skeleton parity rule; concentric radii tokens.

#### 5. Widget defaults / Settings (light touch)

##### What is this?
Registry defaults + Settings `#settings-kiosk` toggles via existing prefs.

##### Why do we need this?
Defaults already protect glance; only touch if Design changes order guidance or default set.

##### How to do this?
- Approach: Keep weather + net + payments on; extras off unless Design changes.
- Other ways: In-page “more widgets” — creative branch; not required by Gate A.
- Best practices: `resolveKioskWidgets` / `normalizeKioskWidgets`; no dashboard builder.

## What exists today

Server page loads widget-gated data (`load-kiosk-page.ts`); dashboard renders fixed bands; overdue Alert lives inside payments after metrics/insights. Prefs: `kiosk_widgets` via `PATCH /api/user/preferences`. Weather detail OOS.

## Dependencies

- `docs/DESIGN_GUIDE.md` glance stack text if order changes.
- Skeleton + any tests that assume band order.
- Existing Money/loans/weather loaders — no new data domains (non-goal).
- Decision later: stop after Design suggestions vs full Build (`00-run.md`).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/kiosk/kiosk-dashboard.tsx` | Band order / hierarchy |
| `components/kiosk/kiosk-loans-card.tsx` | Overdue alert + rows |
| `components/kiosk/kiosk-net-card.tsx` (+ ledger card) | Primary vs secondary metrics |
| `components/kiosk/kiosk-dashboard-skeleton.tsx` | Skeleton parity |
| `lib/kiosk/widget-registry.ts` | Defaults / ids |
| `lib/kiosk/load-kiosk-page.ts` | Data per widget |
| `docs/DESIGN_GUIDE.md` § Kiosk glance | Hard IA constraint |
| `components/loans-insights-stats.tsx` (+ invest) | Dense insight reuse |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Kiosk glance stack | `DESIGN_GUIDE` + dashboard | Status board IA; extend, don’t invent Money-home |
| Widget-gated load | `load-kiosk-page` + registry | Enabled-only data; no new APIs |
| Overdue warning Alert | `kiosk-loans-card` | Existing urgency chrome |
| Auto-fit metric grid | dashboard metrics section | Responsive without breakpoints |
| Prefs toggles | `kiosk-widget-settings` + PATCH prefs | Opt-in density without a builder |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Status board (not dashboard builder) | DESIGN_GUIDE | Product intent / Non-goals |
| Attention → totals → optional density | Gate A / Core ★ | Hierarchy rule for both Design options |
| Progressive disclosure | Settings + defaultEnabled | Protect glance when extras exist |

## Constraints and risks

- Must not become Money home or a drag-and-drop builder.
- Reorder without skeleton/loader/guide → CLS or empty bands.
- Full `variant="page"` insights at glance depth fights status-board job.
- No new finance APIs / widget domains this pass.
- Clean-minimal tokens only; weather detail OOS.

## Settled decisions (do not relitigate)

- Gate A ok; ★ = needs-me-now + key totals ahead of optional density.
- Has UI yes; primary audience busy parent on phone.
- Defaults: weather, net, loan payments on; insights/ledgers opt-in.
- Settings remain the widget chooser unless user later rejects.
- Weather detail / Money Insights page redesigns out of scope.
- **Grill (2026-10-10):** Decision 1 → Option 1 — payments band above metrics; guide + skeleton same change.
- **Grill:** Decision 2 → Option 2 — attention = loans overdue/due-soon + bills-due signals; `bills.summary` month ledger is **not** attention.
- **Grill:** Decision 3 → Option 1 — insights stay dense, below fold, opt-in only (no compact kiosk variant this pass).
- **Grill:** Decision 4 → Option 1 — net stays money #1.
- **Grill:** Decision 5 → Option 1 — stop after Design suggestions at Gate B (no Build unless user reopens).
- **Grill:** one attention zone above metrics (loans list primary; bills-due co-located when data exists).

## Design tree (frontier)

### Settled
- Core problem + Gate A 80/20; status board; no builder; reuse loader/prefs; skeleton parity mandatory.
- Stack target: context strip → **attention** (loans payments + bills-due when available) → **metrics** (net #1, optional ledgers) → **optional dense insights**.
- Dual-attention product scope locked; no new finance domain; no fake due from bills month totals.
- Design Option pair unlocked (both honor attention-first + net #1 + insights below/opt-in).
- Pipeline: Design suggestions only this run.

### Open frontier
- (empty)

### Blocked
- none

**Grill recommended?** **no** — frontier empty (`02b-grill.md` Result: frontier-empty).

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| — | None required for Analyze | — | — |

## Parent flags (for `00-run.md`)

- **Has API:** **no** — UI/hierarchy + existing prefs PATCH / loader only; no new public contracts.
- **Has DB:** **no** — no schema/migration/query ownership change; `kiosk_widgets` already exists.

## Blocking questions

None — Grill settled D1–D5 + dual-attention boundary. See `02b-grill.md`.

## Clear to grill / design?

**yes** for Design — frontier empty; two Mode-full UI options must both put attention + net ahead of optional density; stop after Design suggestions (Gate B).
