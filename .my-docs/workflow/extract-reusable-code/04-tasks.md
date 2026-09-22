# Tasks: Whole-app reusable code extract (wave 1)

## Task 1: Shared Money-family route chrome

**Description:**
Add `components/money-family-route-chrome.tsx` that renders GraphQL Money provider, header override provider, shell grid, `PageHeading` with `MoneyAppMenu`, override merge, and default primary CTA link. Accept `resolveHeader(pathname)` and optional `actions?: ReactNode`. Shared chrome must **not** call `useAppHeaderActions`; Loans wrapper owns that hook and passes `actions` in.

**Acceptance:**

- [ ] Shared module used by Investments and Loans
- [ ] Visual/behavior parity with current headings (title, crumbs, meta, CTA, Loans actions)
- [ ] When `actions` provided → no default CTA link; when omitted → default CTA from resolver
- [ ] No DESIGN_GUIDE token violations

**Tests (TDD — what turns red first):**

- [ ] Unit: override wins over resolved title/crumbs/cta
- [ ] Unit: when no override and no `actions`, resolved CTA renders link with label
- [ ] Unit: when `actions` provided, that node renders and default CTA link is absent
- [ ] Unit: when override includes `cta: null` and resolved has CTA, default CTA link is absent

**Files likely touched:** `components/money-family-route-chrome.tsx`, `components/money-family-route-chrome.test.tsx`

**Scope:** M

**Dependencies:** none

---

## Task 2: Adopt chrome in Investment + Loans

**Description:**
Replace duplicated markup in `investment-route-layout.tsx` and `loan-route-layout.tsx` with thin wrappers calling the shared chrome + existing resolvers.

**Acceptance:**

- [ ] Both features import shared chrome
- [ ] Layout public exports unchanged (`InvestmentRouteChrome`, `LoanRouteChrome`)
- [ ] Existing e2e that touch investments/loans headers still pass (smoke/lite later)

**Tests (TDD — what turns red first):**

- [ ] Unit smoke: wrappers call shared chrome with correct resolver (mock/spy or shallow render)
- [ ] Keep/extend any existing header resolver tests

**Files likely touched:** `components/investment-route-layout.tsx`, `components/loan-route-layout.tsx`

**Scope:** S

**Dependencies:** Task 1

---

## Task 3: Small header path helper reuse (optional ride-along)

**Description:**
If cheap: replace local `isTabActive` in `money-app-header.ts` with shared helper from `lib/app-section-nav.ts` (or extract tiny `isPathActive` used by both). Skip if API shape mismatch needs awkward adapters.

**Acceptance:**

- [ ] Money header tests still green
- [ ] No behavior change for section tab active state

**Tests (TDD — what turns red first):**

- [ ] Existing `money-app-header` tests fail if active logic regresses — run them first

**Files likely touched:** `lib/money-app-header.ts`, `lib/app-section-nav.ts` (export only if needed)

**Scope:** S

**Dependencies:** none (parallel OK)

---

## Task 4: Document inventory + wave 2 note

**Description:**
Add a short note in design or `docs/` only if the team wants a durable pointer; otherwise keep backlog in `03-design.md` Wave 2 table (already present) — **prefer no new docs file** unless Gate B asks. Mark task done by ensuring `03-design.md` backlog lists `require*Context` factory and skeleton rules.

**Acceptance:**

- [ ] Wave 2 backlog visible in `03-design.md` (already) — verify only
- [ ] No drive-by ARCHITECTURE rewrite

**Tests (TDD — what turns red first):**

- [ ] N/A — docs check

**Files likely touched:** `03-design.md` only if backlog gaps

**Scope:** S

**Dependencies:** none

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit tests pass
- [ ] Manual light/dark glance on `/investments` and `/loans` headings
- [ ] No new public API/DB surface

## Security / UI checks

- [ ] Client chrome does not add auth/workspace trust logic
- [ ] CTA hit area / `responsiveIconOnly` preserved
- [ ] Concentric radii / tokens unchanged
