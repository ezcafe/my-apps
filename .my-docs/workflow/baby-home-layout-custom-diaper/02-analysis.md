# Analysis: Baby care layout — custom, Diaper row, timer copy

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

**Has API (recommendation):** **no** for confirmed layout / width / copy / Done / Custom-ml re-open. Flip to **yes** only if “custom time” means new `occurredAt` (or similar) on `babyQuickCare` — see Blocking questions.

**Has DB (recommendation):** **no** — no schema / migration / new persistence queries; `occurred_at` already exists if we only wire UI to existing inputs.

## Deep dive (required)

### Overall

#### What is this?
- Polish baby **home** and shared **log pages** (`/baby/feed`, `/baby/sleep`, `/baby/diaper`, `/baby/pump`): Custom control behavior, Nap custom parity with Pump’s Custom affordance, Pump L/R width = Breast L/R, Diaper on its own row **above** Pump with a Custom button, merge running stop hint into the button title, center Done in the button.

#### Why do we need this?
- Care controls feel uneven: Nap lacks Pump’s Custom, Pump L/R look narrower than Breast, Diaper shares Nap’s row, stop copy is split across title + subtitle, Done can feel off-center.
- Skip cost: one-handed logging stays inconsistent across home vs log; caregivers hunt for Custom / mis-tap widths / miss stop affordance.

#### How to do this?
- **Approach:** Reuse existing chips (`BabyTimedCareChip`, side pairs, `BabyBottleMlChips` / diaper 2×2, `BabyCustomMlModal`), fixed height token, and Breast+Bottle **12rem section** grid. Reorder home rows + skeleton. Unify running title copy. Fix Done centering in the shared face. Apply same patterns on log forms that already share components.
- **Other ways:** Invent a new control family or only change home (breaks “apply to baby/log *”).
- **Best practices:** Repo — `asContents` vs nested pair, `BABY_HOME_BIG_CONTROL_MIN_H`, Custom-ml confirm-then-chip-save, skeleton parity. Industry — one primary action per control; don’t bury secondary Custom; keep running state copy on the control itself.

---

### Solution pieces

#### 1. Row layout — Diaper above Pump; Nap / Custom surfaces

##### What is this?
- Today: Row1 Breast|Bottle → Row2 Nap|Diaper → Row3 Pump L+R+amount.
- Target: Diaper on a **new row above Pump**, with a **Custom** button; Nap gets Custom parity with Pump’s Custom pattern; same idea on log pages where those sections appear.

##### Why do we need this?
- Diaper beside Nap couples unrelated actions and leaves no room for Diaper Custom; Nap/Pump Custom parity is missing.

##### How to do this?
- **Approach:** Home: Nap row (Nap + Custom slot if confirmed) → Diaper row (kind 2×2 + Custom) → Pump row (L/R + amount). Update `baby-page-skeleton` markers/order in the same change. Log: `BabyDiaperForm` / `BabySleepForm` / `BabyPumpForm` / `BabyFeedForm` keep shared controls.
- **Other ways:** Keep Nap|Diaper and only add Custom under Diaper (fails “new row above Pump”).
- **Best practices:** Match Breast|Bottle `minmax(12rem)` section grid; keep CLS via skeleton parity.

**Decision 1 — What “Custom” means for Nap / Diaper**

- **Option 1 — Custom clock time (`occurredAt` / end time)**  
  - **What it is:** Modal to set when the nap/diaper (or next care save) happened, like Insights edit’s `datetime-local`.  
  - **Example:** Tap Custom on Nap → pick 6:40 → Start/End nap uses that time.  
  - **Pros:** Matches “custom **time**” wording; create mutations already accept `occurredAt` / `endedAt`.  
  - **Cons:** Home path is `babyQuickCare` (no `occurredAt` today) → contract work (**Has API yes**); new modal + validation; Nap/Diaper Custom ≠ Pump’s Custom **ml**.  
  - **Recommendation:** Only if user confirms time backdating.

- **Option 2 — Same Custom **ml** pattern only where amount exists; Diaper Custom = reopen/edit pending value or detail**  
  - **What it is:** Keep `BabyCustomMlModal` for Bottle/Pump; Nap has no ml — do not fake ml on Nap; Diaper Custom opens detail/time-adjacent UI only if product clarifies.  
  - **Example:** Pump Custom still sets ml; Nap Custom deferred or is a no-op until product picks Option 1.  
  - **Pros:** Reuses shipped Custom ml; **Has API no**.  
  - **Cons:** Does not literally give Nap “custom time like Pump.”  
  - **Recommendation:** Interim only if Option 1 is rejected.

- **Recommendation:** **Ask user (Blocking Q1).** Idea assumed custom **time**; codebase Pump Custom is **ml**. Do not invent a conflicting control.

#### 2. Custom modal can change an already-set custom value

##### What is this?
- Bottle/Pump: once Custom ml is pending (`*FromCustom` + override), tapping Custom **saves** that ml instead of reopening the modal to edit.

##### Why do we need this?
- Caregivers cannot correct a wrong custom amount without clearing state; “change the custom” fails.

##### How to do this?
- **Approach:** Always open `BabyCustomMlModal` on Custom tap (seed with `babyHomeCustomInitialMl` / override). Keep save on ml chip tap (or explicit Use). Mirror on home + feed/pump forms.
- **Other ways:** Long-press Custom to edit / short-press to save (harder to discover).
- **Best practices:** Repo already seeds `initialMl` from override; Insights edit reopens fields — same idea.

**Decision 2 — Custom tap when value already pending**

- **Option 1 — Always open modal to edit (recommended)**  
  - **What / Example:** Pending 135 ml → Custom → modal shows 135 → change to 150 → Use.  
  - **Pros:** Matches “allows us to change”; one mental model.  
  - **Cons:** Removes one-tap “Custom = save again” shortcut.  
- **Option 2 — Keep save-on-second-tap; add Edit affordance**  
  - **Pros:** Keeps fast re-log. **Cons:** Extra chrome; easy to miss.  
- **Recommendation:** **Option 1** unless product wants the re-save shortcut.

#### 3. Pump L/R width = Breast L/R

##### What is this?
- Breast: nested L/R pair inside a 12rem section beside Bottle. Pump: `asContents` L+R+amount in one `8rem` auto-fit grid → each Pump side is ~⅓ row, narrower than Breast sides.

##### Why do we need this?
- Unequal hit targets; Pump feels cramped next to amount chips.

##### How to do this?
- **Approach:** Restructure Pump home (and pump page if needed) like Breast|Bottle: **Pump sides section** (pair **without** sharing a 3-col with amount) + **amount section**, same `minmax(min(100%, 12rem), 1fr)` section grid; pair keeps internal `8rem` L/R. Drop or limit `asContents` where it forces 3 equal columns.
- **Other ways:** CSS `grid-template-columns: 1fr 1fr 1fr` weights only (fragile vs container queries).
- **Best practices:** Feed form already documents “asContents breast + ml in one row” for Feed — prefer **section parity with Breast row**, not forcing Pump into Feed’s 3-col pattern if widths must match Breast home.

#### 4. Running title merges “Tap to stop”

##### What is this?
- Today: title stays “End nap” / side label; subtitle (or value) shows “Tap to stop” separately.
- Target: e.g. `End nap - Tap to stop` (EN) / VI equivalent.

##### Why do we need this?
- Stop hint is easy to miss; title alone looks like a static label while running.

##### How to do this?
- **Approach:** In `BabyTimedCareChip` (or callers): when `running`, set **label** (or single face line) to `{endTitle} - {tapToStop}`; keep elapsed on value; avoid duplicating stop in subtitle. i18n: prefer one key with placeholders or compose `home.sleepEnd` + `home.tapToStop`. Update unit/e2e that expect separate subtitle text.
- **Other ways:** Only change Nap (inconsistent with Breast/Pump).
- **Best practices:** One running chrome path for all timed chips; watch narrow wrap — use short connector (` - `).

#### 5. Done status horizontally centered in the button

##### What is this?
- Done flash overlay on timed chips / ml / diaper tiles should sit in the **horizontal center** of the control.

##### Why do we need this?
- Off-center Done reads broken during the success flash.

##### How to do this?
- **Approach:** Audit `BabyQuickSimpleCard` / bottle / diaper Done slots (`absolute inset-0 flex … justify-center`). If already centered in markup, fix visual skew (invisible reserved slots, `text-left`, padding, icon row). Shared fix > per-surface hacks. Add/adjust unit asserts on `justify-center` / face-slot.
- **Other ways:** Replace face with Done-only layout (more CLS risk vs current invisible reserve).
- **Best practices:** Keep height reserve (existing invisible slots) for zero CLS; center the overlay only.

## What exists today

Baby home (`components/baby-home.tsx`) owns three care rows and Custom **ml** modals for bottle + pump amount. Timed chips use `BabyTimedCareChip` → `BabyQuickSimpleCard`. Log routes mount `BabyFeedForm` / `BabySleepForm` / `BabyDiaperForm` / `BabyPumpForm` with the same pairs/chips. Create GraphQL inputs already allow `occurredAt` on feed/diaper/sleep start; **`babyQuickCare` does not**. No home Custom-**time** modal exists — only `BabyCustomMlModal` and Insights `datetime-local` edit.

## Dependencies

- Skeleton + e2e row order (`home-row-nap-diaper`, pump markers, Tap to stop / End nap asserts).
- i18n EN/VI for merged stop title.
- Shared components so home and log stay in sync.
- If custom **time**: wire `occurredAt` (and sleep `endedAt`) through home quick path or dedicated mutations; validators already partially exist.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | Row layout, Custom open/save, Nap/Diaper/Pump wiring |
| `components/baby-page-skeleton.tsx` | CLS / row order parity |
| `components/baby-timed-care-chip.tsx` | Running / Done chrome |
| `components/baby-quick-value-card.tsx` | Done overlay + face slots |
| `components/baby-breast-side-pair.tsx` / `baby-pump-side-pair.tsx` | L/R width / `asContents` |
| `components/baby-bottle-ml-chips.tsx` | Custom ml tile behavior |
| `components/baby-custom-ml-modal.tsx` | Custom ml modal |
| `components/baby-{feed,pump,sleep,diaper}-form.tsx` | baby/log * surfaces |
| `lib/baby-home-control-height.ts` | Shared big/small control height |
| `lib/baby-home-bottle-selection.ts` | Custom selected / initial ml |
| `lib/graphql/baby-typeDefs.ts` | `occurredAt` vs `BabyQuickCareInput` |
| `messages/baby/en.ts` / `vi.ts` | Stop / Done / Custom copy |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Section grid 12rem + nested L/R | Breast\|Bottle in `baby-home.tsx` | Pump width parity without new tokens |
| Timed care chip chrome | `baby-timed-care-chip.tsx` | One place for merged stop title + Done |
| Custom ml modal + selected helpers | `BabyCustomMlModal`, `baby-home-bottle-selection.ts` | Edit-pending Custom without new modal type |
| Flush 2×2 kind/ml grids | `baby-diaper-kind-control`, `baby-bottle-ml-chips` | Diaper row + Custom sibling layout |
| Fixed control height | `lib/baby-home-control-height.ts` | Row alignment after Diaper move |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Shared presentational chips, page owns save | Home + log forms | Keep API/DB out of chrome polish |
| Quick-care vs dedicated mutations | `babyQuickCare` vs `startBabySleep` / `createBabyDiaper` | Only if custom **time** is confirmed |
| N/A for layout-only | — | Simple mode: no new runtime boundary if Has API stays no |

## Constraints and risks

- Merged stop title may wrap on narrow widths / VI strings.
- Diaper 2×2 already uses four kind tiles — Custom is likely a **sibling** control, not a fifth kind.
- Changing Custom second-tap from save → edit changes muscle memory (cover with tests).
- Skeleton / e2e row-order tests will fail until updated.
- Do not invent a new Custom UI that conflicts with Pump’s Custom ml look if product meant clock time — resolve Q1 first.

## Settled decisions (do not relitigate)

- Has UI **yes**; Mode **simple**; reuse Pump/Breast patterns — no new care types or shell chrome.
- Apply to baby home **and** baby/log * shared controls.
- Non-goals: guidelines, header/footer redesign, insights, new design tokens (unless Analyze’s custom-time path needs a tiny contract — only after Q1).
- **D1 Option 1:** Nap/Diaper Custom = clock time (`occurredAt`); Diaper **kind types stay on 2×2** (still selectable).
- **D2 Option 1:** Diaper Custom sibling beside 2×2; **same control size as Nap button**.
- **D3 Option 1:** Merged stop title on **all** timed chips.
- **D4 Option 2:** Custom ml keeps save-on-second-tap; add separate **Edit** affordance.
- **Has API yes** (wire `occurredAt` on quick-care / sleep+diaper paths as needed). **Has DB no**.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Custom vs time in repo | Find existing Custom-time UI | Only Custom **ml** on home/log; Insights edit has `datetime-local`; creates accept `occurredAt`; quickCare does not | Keep — drives Q1 / Has API |
| Pump vs Breast grid | Why width differs | Pump `asContents` + amount in 8rem 3-col; Breast nested in 12rem section | Keep — width fix approach |

## Blocking questions

**Status:** Settled — do not relitigate. Answers locked in [Settled decisions](#settled-decisions-do-not-relitigate) and `00-run.md` Notes **Decision 1–4**.

1. **Custom for Nap / Diaper — clock time or something else?**  
   **Settled (D1 Option 1):** Nap/Diaper Custom = clock time (`occurredAt` / nap end); Diaper kinds stay on 2×2. See Settled + `00-run` Decision 1.

2. **Diaper Custom placement:** sibling button beside the 2×2 kind grid, row under the grid, or replace a kind tile?  
   **Settled (D2 Option 1):** Sibling beside 2×2; **same size as Nap button**. See Settled + `00-run` Decision 2.

3. **Merged stop title:** apply to **all** timed chips (Nap + Breast L/R + Pump L/R), or Nap only?  
   **Settled (D3 Option 1):** All timed chips. See Settled + `00-run` Decision 3.

4. **Custom ml second tap:** confirm always **re-open modal to edit** (recommended), or keep second-tap = save?  
   **Settled (D4 Option 2):** Keep save-on-second-tap; add separate **Edit** affordance. See Settled + `00-run` Decision 4.
