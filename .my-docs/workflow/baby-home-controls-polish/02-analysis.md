# Analysis: Baby home controls polish + feed-session merge

## What exists today

Home is the Option B quick-care surface from `baby-home-redesign` + `baby-home-logging-detail` (local, Gate 3 not reopened): three rows, one `babyHomeQuickStatus` read, one `babyQuickCare` write with durable replay and nap lock.

**UI chrome (polish target):** Kind is a 2×2 grid with **`gap-2` + outer `p-3` + per-tile borders** (`components/baby-diaper-kind-control.tsx`) — island tiles, not a flush segmented control. Bottle is **B1** (`BabyQuickValueCard`): face + stacked right ±, Custom still an **under-card text control** (`underCard` in `baby-home.tsx`), with **`gap-2`** between face/± and outer card padding. Row 2 uses `repeat(auto-fit, minmax(...))`; bottle’s under-card makes that column taller than Start nap / Kind. Selected state is weak (surface + border only). Breast running uses `IconSwap` accent, not a primary filled button.

**Feed count / summary (merge target):** Each breast stop/switch and each bottle save **inserts a new** `baby_care_event` `type: 'feed'` with a **single** `payload.method` (`breast_l` | `breast_r` | `formula` | `pump`). `feedsToday` is a plain **COUNT(*)** of feed rows in the local day window (`home-quick-status.ts`). `careSummary` prints one method only (`Feed ({method})`). So L → R → bottle becomes **three feeds** and can show `3/8 today`.

**Breast timer:** Client-only (`lib/baby-breast-timer-store.ts`, localStorage, 6h stale). Idle breast start writes **no** row (`BREAST` action with no `breastRunning`). Switch side / bottle while running sends `breastRunning` → server **`saveBreast` insert**, then local timer clear/start or formula insert.

## Dependencies

What else must change or stay compatible?

- **Extend Option B — do not replace it.** Keep `babyQuickCare` ordered chain, `baby_quick_care_request` replay, nap lock, pending client store, Custom ml modal (confirm sets ml, does not auto-save), birthday prompt, Wet/Dry Done flash, Poop/Mixed sheet.
- **Storage 7B:** today’s `BabyFeedPayload` is one `method` + optional `durationSec` / `amountMl`. One physical row for L+R+formula needs a **payload shape change** (and matching Zod / GraphQL / `careSummary` / Telegram / next-due method pick). Table stays `baby_care_event`; no new feed table required.
- **Quick-care write path:** `runBabyQuickCare` always **inserts** on `saveBreast` and `createFormula`. Merge means **insert once, then update** the same feed row inside the lock when still in-session / grace. Stored result step union (`BabyQuickCareStoredResult`) and notify kinds (`lib/baby-quick-care-notify.ts`) must stay coherent (avoid double Telegram “feed” for one session).
- **Client planner:** `planBabyQuickCare` / `localAfterFromQuickRequest` still drive timer clear/start. Grace-after-stop needs a **client (or server) session handle** Design must specify — timer store today only holds the *running* side, not “last closed session id + grace deadline”.
- **UI layout:** Kind + bottle become flush segmented clusters; Custom moves to **icon-only under ±** inside the cluster; row 2 outer heights match; skeleton (`BabyHomeSkeleton`) updates in the same change.
- **Money look 4B:** selected/active = **primary button** treatment (`bg-accent` / `Button` `variant="primary"`). **Ripple after click** is **not** in the repo today (only `fx-press` scale in `globals.css`). Design must add a CSS-only ripple (respect `prefers-reduced-motion`) without a motion library.
- **History 6A:** forward-only — old multi-row feeds stay as-is; no backfill.
- **Coordination:** ships on the same unmerged home branch series; do not reopen prior Gate 3.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `.my-docs/workflow/baby-home-logging-detail/03-design.md` | Settled B1 bottle + D-A Kind contracts to polish on top (not reopen). |
| `.my-docs/workflow/baby-home-redesign/03-design.md` | Option B quick-care / status / timer / Custom modal contracts. |
| `components/baby-home.tsx` | Wires rows, formula Custom under-card, breast presses, status lines. |
| `components/baby-diaper-kind-control.tsx` | Kind 2×2 — today’s gaps/padding/borders to collapse into segmented flush. |
| `components/baby-quick-value-card.tsx` | Bottle B1 layout; `underCard` → Design moves Custom into cluster as icon segment. |
| `components/baby-custom-ml-modal.tsx` | Keep confirm-sets-ml (no auto-save). |
| `components/baby-page-skeleton.tsx` | `BabyHomeSkeleton` must mirror new Kind + bottle cluster geometry. |
| `components/baby-diaper-detail-sheet.tsx` | Existing `aria-pressed` + accent selected chips (weaker than primary; contrast for 4B). |
| `components/ui/button.tsx` | **Primary** selected look to copy for 4B. |
| `lib/money-quick-pick-chip-cls.ts` | Segmented shell / selected chip pattern (accent mix) — secondary reference; Gate 1 prefers primary fill. |
| `app/globals.css` | `fx-press` only today; place for new ripple utility if Design adds one. |
| `docs/DESIGN_GUIDE.md` | Segmented controls, hit ≥44, concentric radii, transition specificity, skeleton parity. |
| `lib/baby-breast-timer-store.ts` | Running side + stale; candidate extension point for grace / session id. |
| `lib/baby-quick-care-plan.ts` | Wire request + localAfter; merge/grace rules likely live nearby as pure helpers. |
| `lib/baby-quick-care-notify.ts` | Which steps fire Telegram feed notifies. |
| `lib/baby-home-done-flash.ts` | Bottle / Wet-Dry Done timing pattern. |
| `db/schema/baby.ts` | `BabyFeedPayload`, `BabyQuickCareStoredResult` step names — **7B touch points**. |
| `lib/validators/baby.ts` | `createBabyFeedSchema`, feed update payload, `babyQuickCareSchema`. |
| `features/baby/server/quick-care.ts` | Insert-only breast/formula steps today — merge update logic. |
| `features/baby/server/care-events.ts` | `createBabyFeed` / `updateBabyEvent` (feed payload patch exists). |
| `features/baby/server/home-quick-status.ts` | `feedsToday` count + lastFeed summary wiring. |
| `features/baby/server/timeline.ts` | `careSummary` / `careDurationSec` — combined summary shape. |
| `lib/baby-next-due.ts` | Interval from `lastFeedMethod` — merged row must pick a method for due math. |
| `lib/graphql/baby-typeDefs.ts` / `baby-resolvers.ts` | Quick-care + notify loop over steps. |
| `messages/baby/en.ts`, `messages/baby/vi.ts` | Custom labels, summaries, feed method strings. |
| `components/icons/icon-baby-nav.tsx` | Existing baby glyphs; **no droplet** yet — new ml/droplet icon for 5B. |
| `e2e/baby-home-option-b.spec.ts` | Breast switch, B1 Custom-under, feedsToday mocks — will need merge + layout updates. |
| `components/baby-diaper-kind-control.test.ts`, `baby-quick-value-card.test.ts`, `baby-home.test.ts` | Layout / contract unit hooks. |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Option B one home mutation + lock + replay | `features/baby/server/quick-care.ts`, `baby_quick_care_request` | Do not add a second home write path for merge. |
| Pure `lib/` planner + `node:test` | `lib/baby-quick-care-plan.ts`, diaper quick-plan | Put merge window / grace / “same session?” rules in pure helpers first. |
| Client breast timer + localAfter | `lib/baby-breast-timer-store.ts`, `localAfterFromQuickRequest` | Keep timer client-local; extend carefully for grace. |
| Feed payload jsonb on `baby_care_event` | `db/schema/baby.ts` `BabyFeedPayload` | Extend payload for multi-leg; keep one row type `feed`. |
| `updateBabyEvent` feed patch | `care-events.ts` + `updateBabyEventFeedPayloadSchema` | Prefer update-in-lock over inventing a new mutation. |
| `careSummary` shared EN/VI | `features/baby/server/timeline.ts` | Combined “L + R + Formula 90 ml” must go through the same helper as timeline/Telegram. |
| Half-open day window + `feedsToday` | `home-quick-status.ts`, `lib/baby-home-day-window.ts` | Count rows; merge keeps count honest by not inserting extras. |
| Primary button selected | `components/ui/button.tsx` `variant="primary"` | Gate 1 **4B** — use this, not invent a new accent chip language. |
| Segmented control guidance | `docs/DESIGN_GUIDE.md` (radiogroup, outer md / inner sm, `fx-press`) | Flush Kind / bottle clusters. |
| Money segmented shell (optional) | `lib/money-quick-pick-chip-cls.ts` `quickPickGroupCls` | Gap/padding collapse reference; fill style still primary per 4B. |
| Icon-only ≥44 + `aria-label` | `Button` `iconOnly` / `fx-hit-40`; DESIGN_GUIDE | Custom droplet control (5B). |
| `IconSwap` for running breast | `components/ui/icon-swap.tsx` | Keep timer running indicator; pair with stronger selected surface if needed. |
| Done flash ~2s | `lib/baby-home-done-flash.ts` | Keep bottle logged feedback after save. |
| Skeleton parity | `components/baby-page-skeleton.tsx` | Mandatory with any layout change. |
| CSS-only motion | `app/globals.css` `fx-*` | New ripple must be CSS-only; no motion libs. |

## Constraints and risks

- **Tribal — prior Gate 3 pause:** polish + merge only; do not relitigate nap lock, Custom modal confirm-then-save, Kind 2×2 vs 1×4, or Wet/Dry sheet rules.
- **Single-method payload:** `method` is required for create and drives next-due + summaries. Multi-leg 7B needs an explicit Design shape (e.g. legs array + primary `method` for due bands) or next-due/Telegram will break or lie.
- **Insert → update race:** two caregivers / double-tap must stay safe under `withBabyCareLock` + `clientRequestId` replay. Updating “last feed within grace” without a stored session id is racy — Design should prefer an explicit session id or last-event id known to the client after first save.
- **Grace minutes:** Gate 1 left exact minutes to Design. Too long → over-merge across real separate feeds; too short → bottle add-on still bumps count.
- **Breast start still empty steps:** first tap starts timer only. First physical row appears on stop/switch/bottle — Design must say when the session row is created and how L duration is accumulated when switching mid-session.
- **Telegram:** today each `saveBreast` / `createFormula` step can notify. One-row merge must not spam N feed messages for one session.
- **e2e coupling:** option-b already asserts breast switch with `breastRunning`, B1 Custom under-card text, and feedsToday bumps — expect rewrites for merge + icon Custom + flush layouts.
- **Ripple is new:** no existing ripple utility; must honor reduced motion and not fight `fx-press` / primary hover lift.
- **Row 2 height:** putting Custom inside the bottle cluster removes under-card height; Kind flush grid must still share **outer** height with nap — assert in unit/e2e layout contracts.
- **Hit targets:** collapsing gaps must keep ≥44×44; avoid overlapping `fx-hit-40` on adjacent segments.
- **Front-end local knowledge:** `dev-decision-routing` context-mode MCP was **unavailable** this run; rely on repo `DESIGN_GUIDE.md` + Money/button patterns above (auto-fit grids, concentric radii, no hardcoded content breakpoints).

## Settled decisions (do not relitigate)

From Gate 1 (`01-idea.md`):

| # | Decision |
|---|----------|
| **1A + grace** | Merge while breast session open; short grace after stop for bottle add-on. **Design picks exact grace minutes.** |
| **2A** | Bottle mid-breast = **one** merged session (L + R + formula). |
| **3A** | After stop/save **and** grace expired → always a **new** feed. |
| **4B** | Selected/active = **primary button** look; **ripple after click**. |
| **5B** | Custom = **ml/droplet-style icon** + `aria-label` (not under-card text link). |
| **6A** | History **forward-only** (no backfill of old split feeds). |
| **7B** | **One physical feed row** for the whole session. |

Also settled by idea framing: Kind flush segmented 2×2; bottle face + ± + Custom as one flush cluster; row 2 outer heights match; EN+VI; light/dark; skeleton parity; no undo; no pump/solids on home; no live multi-device timer sync.

## Blocking questions

**None** after Gate 1.

### Non-blocking (Design may choose; do not block Analyze)

1. **Exact grace minutes** (and whether grace is client-only clock vs server `occurredAt` skew-tolerant window).
2. **Merged payload shape** for 7B (e.g. `legs: [{method, durationSec?, amountMl?}]` + which field is “primary” for next-due).
3. **When the first row is inserted** (on first side stop vs on first switch vs deferred until session closes).
4. **Telegram:** one notify per session update vs notify only when session closes vs keep per-step with dedupe.
5. **Ripple:** new global `fx-ripple` utility vs scoped baby-control class; duration / opacity tokens.
6. **Combined summary order / omit rules** (skip zero-duration sides; EN/VI join string for `Breast L + Breast R + Formula 90 ml`).
7. **Running breast selected chrome:** primary fill on the active side card in addition to `IconSwap`, or ripple-only on press?

## Grounding notes for Design

- Prefer **pure merge helpers + failing unit tests first** (window open? grace? update vs insert?) then wire `quick-care.ts`.
- Prefer **extend `BabyFeedPayload` jsonb** over a new table or multiple rows + client-side “virtual merge” (7B forbids virtual-only).
- Prefer **primary button classes** for selected Kind / pressed segments; reuse DESIGN_GUIDE segmented geometry for flush borders (`gap-0`, shared borders / `divide-*` or overlapping hairlines).
- Keep Custom confirm → focus bottle save; only change **Chrome** to icon-under-±.
- Do not invent a second home mutation for “patch feed session”.

---

**Clarity check:** Are the instructions and reference files clear enough to design?
