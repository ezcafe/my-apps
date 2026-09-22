# Idea: Whole-app reusable code extract

## Problem

Across Baby, Money, Investments, Loans, and the shell, the same patterns are copied instead of shared: page headers, skeletons, filter/chip toolbars, workspace bootstrap pieces, and API/context helpers. That slows new features, causes small UI/behavior drift, and makes hardening fixes land in many places.

## User / audience

- **Primary:** developers and agents who add or change features in this repo.
- **Secondary:** end users who should see the same clean-minimal look and behavior across apps (no new product surface — parity and fewer regressions).

## Outcome

A ranked inventory of duplicated UI and shared-lib patterns, plus a designed first extract wave that moves the highest-value duplicates into clear shared homes (`components/ui/`, shared layout helpers, or `lib/` modules) without changing product behavior or inventing a new look.

## Metric

At least one high-duplication cluster (e.g. app headers, page skeletons, or API HTTP/context helpers) is extracted to a single shared module and adopted by 2+ feature surfaces with tests proving behavior/look parity; remaining candidates are listed for later waves.

## Has UI

**yes** — extract work includes user-facing components (headers, skeletons, toolbars, shared chrome). Look must stay the real app (DESIGN_GUIDE / clean-minimal). No brand-new product screen.

## Lean / skip hints

- **Lean UI concept?** yes — one primary “before/after parity” surface (or a small collage of existing chrome) is enough; prove shared pieces match live UI, do not invent a new product look.
- **Copy/token-only?** no — structure and module boundaries change, not only copy/tokens.

## 80/20 UI (day-to-day)

### Main user goals

- Use Money / Baby / Investments / Loans without noticing a redesign.
- Rely on the same chrome patterns (headers, filters, loading, empty) so muscle memory transfers across apps.
- (Developer) Find and reuse one shared component instead of copying a feature-local twin.

### Vital few (high-impact ~20%)

- Shared page header / section CTA patterns already split across `*-app-header` helpers.
- Shared loading skeletons that must stay layout-parity with live pages.
- Shared filter / chip / toolbar patterns that repeat across insights and list pages.
- Shared API HTTP + workspace context helpers (reuse, not new public product API).

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Existing app chrome and primary page actions stay where they are today (no new “reuse admin” UI for end users).
- **Important info / action #2 (always visible):** Loading skeletons remain visually matched to live layout (zero CLS).
- **Core action placement:** Extract behind the same labels, placement, and tokens; callers change imports, not UX copy.
- **Secondary actions:** Deep feature-only widgets, one-off charts, and experimental Baby home controls stay local until a later wave.

### Top user journey to optimize

Open any feature page → scan header/filters → load content (skeleton → data) → act — same path before and after extract; only implementation sharedness changes.

### Sensible defaults

Prefer extending `components/ui/` and existing shared `lib/` modules over new packages or deep abstraction layers. Default extract wave = highest duplication + lowest behavior risk.

### Biggest usability risks to fix first

- Visual drift after extract (wrong radii, spacing, skeleton mismatch).
- Over-abstracting (generic props that make call sites harder).
- Breaking feature isolation (Money-only logic leaking into “shared” wrongly).

## Non-goals

- Unifying pagination dialects across Money / Investment / Baby (called out in ARCHITECTURE as a separate follow-up).
- Rewriting product UX or inventing a new design system.
- Extracting every duplicate in one PR — wave 1 only for the vital few.
- Finishing or merging sibling run `app-api-db-hardening` (stays independent at Gate C).
- New public REST/GraphQL product endpoints for “reuse catalog”.

## Assumptions to attack

- “Whole-app” means every duplicate must ship now — false; inventory + one extract wave is enough for done.
- Shared UI always belongs in `components/ui/` — maybe some patterns stay as feature-agnostic helpers under `components/` or `lib/` without becoming primitives.
- API helper reuse always means Has API = yes — refine in Analyze; internal refactors with no public contract change may be Has API = no.
- End users need a new screen to “manage reuse” — no.

## Success criteria

- [ ] `01`–`04` name the top duplicate clusters and the chosen extract approach.
- [ ] Wave 1 extracts ≥1 shared module used by ≥2 features with parity tests.
- [ ] No intentional visual redesign; DESIGN_GUIDE tokens/primitives respected.
- [ ] Feature isolation preserved (shell vs feature vs shared layers in ARCHITECTURE).
- [ ] Remaining candidates documented for later waves.

## Open questions

- Which cluster is wave 1 if Analyze finds headers, skeletons, and API helpers all high value? (Decide in Design with options.)
- Should wave 1 be UI-only, lib-only, or mixed if capacity is limited?
- Any hard “do not touch” surfaces during this pass (e.g. Baby home one-tap)?

## Notes for Gate A

Day-to-day success for end users is **no regression**. Day-to-day success for developers is **one place to change shared chrome**. Judge 80/20 on keeping vital chrome stable and deferring deep feature-only widgets.
