# Analysis: Baby home next-only headers + age footers + stable errors

## Deep dive (required)

### Overall

#### What is this?
- Restructure baby home **section chrome**: header = **when next**; footer = **age tip** (+ today progress when we have it); keep care buttons stable when status check fails; put save/pending errors **where the footer was**, with **Try again / Discard** on the same line. Gate B adds: **birthday modal** (no muted strip), **status-line icons**, **title with age months**. Pump stays **L + R + amount** as today (single-timer merge withdrawn).

#### Why do we need this?
- Tired caregivers need one glance: next session vs age guide — today those lines share the header and mix roles by section.
- Nap status-fail replaces the chip with a taller box → row alignment / height jump.
- Pending recovery sits under helpers as a stacked block — not the footer slot, not inline actions.
- Birthday strip + settings link is weak; status text lacks care-kind icons; title never shows age.

#### How to do this?
- **Approach:** Keep `BabyHomeSectionHeading` for next-only body; add a section **footer** slot (age / progress, or pending recovery that replaces it); fix nap fail-closed to preserve `BABY_HOME_BIG_CONTROL_MIN_H`; i18n move keys as needed (EN/VI). Birthday: modal + existing `updateBabyProfile`. Status: care icons on Row 4. Title: `home.titleWithAge` from floor months. Pump: keep `BabyPumpSidePair` L/R + amount on home and `BabyPumpForm`; shared section footer for pending (D5). **Has API no** · **Has DB no**.
- **Other ways:** Keep everything in the header with stronger typography only (fails scan + height goals); global toast for errors (loses section ownership already shipped); force birthday (blocks 3AM logging — rejected); merge Pump L/R into one timer (**user rejected** — withdrawn).
- **Best practices:** Repo — fixed control height (`lib/baby-home-control-height.ts`), under-owner pending (`renderPendingRecovery`), marked sentences + `«…»` i18n, settings birth save, Nap timed chip. Industry — reserve one line for status, don’t grow primary controls on error, inline recovery next to the message.

---

### Solution pieces

#### 1. Header = next session only

##### What is this?
- Section lead + **one** next/overdue/empty-next line. Age tips leave the header.

##### Why do we need this?
- Today: breast/diaper headers already mix next vs empty tip; bottle/nap put **age** in the header; nap **next** lives on the chip subtitle. Hard to scan.

##### How to do this?
- **Approach:** Drive header body from existing `babyNextFeedDue` / `babyNextDiaperDue` / `babyNextSleepDue` (+ empty keys when `hidden` / no due). Move bottle ml+progress and nap blends out of header.
- **Other ways:** Leave bottle/nap age in header and only “clean” breast/diaper (inconsistent).
- **Best practices:** Reuse `dueBodyMarked` + `home.header.*Next` / `*Overdue` / empty keys; e2e already asserts breast/diaper next/overdue on headers.

**Decision 1 — Nap next location**

| | Option A — Header owns next (recommended) | Option B — Keep next on chip subtitle |
|--|--|--|
| **What** | Nap header uses next/overdue/empty; chip subtitle stays blank / elapsed-only | Header = age or empty; subtitle keeps `nextSleepLabel` |
| **Example** | `Nap — Next nap is in about 40min.` | Header still nap blend; chip shows next |
| **Pros** | Matches outcome; one rule for all sections | Less chip churn |
| **Cons** | Must clear/repurpose subtitle; update e2e | Breaks “header = next only” |
| **Recommendation** | **A** | |

**Settled (D1):** Pump header = **lead only** until a next-due model exists (no empty tip body). Do **not** fill header with Pump L/R empty tip.

---

#### 2. Footer = age recommendation (+ today progress)

##### What is this?
- Under each section’s controls: age guide line; bottle also “Today n of max”. Replaces today’s muted `home.helper.*` **or** sits as the real footer (helpers go away / stay — see Decision 2).

##### Why do we need this?
- Age guidance is useful but steals the “when next” glance when it shares the header.

##### How to do this?
- **Approach:** New footer node per section; bottle reuse `home.header.bottleMl` + `bottleProgress` (rename keys in Design if needed); nap reuse `home.header.nap.blend*`; breast/diaper/pump need copy sourced from age guide or short placeholders.
- **Other ways:** Footer only for bottle+nap (where copy exists); others keep helpers only.
- **Best practices:** `lib/baby-age-guide.ts` + `babySleepGuideForAge`; marked sentence renderer; skeleton gains a footer stub for CLS.

**Decision 2 — What replaces `home.helper.*`**

| | Option A — Footer = age tip; drop helpers (recommended if copy exists) | Option B — Keep helpers; age footer is an extra line |
|--|--|--|
| **What** | One footer line = age (+ progress) | Helper + age = two muted lines |
| **Example** | `About 90 ml each time. Today 3 of 8 feeds.` | `Volume when needed` + age line |
| **Pros** | Cleaner; matches idea examples | No new breast/diaper/pump age copy |
| **Cons** | Need age strings for every section | Crowded; weaker scan |
| **Recommendation** | **A** when age copy exists; for sections without modeled tips, Design must pick short age line or temporary empty footer — **do not guess copy** |

**Settled (D2 / D3):** Age footers from **existing guide** (paraphrase only; thin `home.footer.*` keys). Drop `home.helper.*` when footers ship.

---

#### 3. Status-check errors without changing button height

##### What is this?
- When nap (or similar) status check fails, show the error **without** growing/shrinking the care control vs healthy `BABY_HOME_BIG_CONTROL_MIN_H`.

##### Why do we need this?
- Today `sleepFailClosed` swaps the nap chip for a bordered box + Retry — height can differ from the fixed big control → row subgrid misalignment.

##### How to do this?
- **Approach:** Keep a control shell at `BABY_HOME_BIG_CONTROL_MIN_H` (disabled/placeholder chip); put `home.napCheckFailed` + retry **outside** that height (footer slot or below shell, not inside a taller replacement).
- **Other ways:** Overlay error on the chip; toast only (worse ownership).
- **Best practices:** Repo comment on fixed height vs `h-full` stretch; industry — errors adjacent, primary target size stable.

**Decision 3 — Where the status-check message lives**

| | Option A — Footer slot under fixed-height shell (recommended) | Option B — Inside chip as muted subtitle only |
|--|--|--|
| **What** | Shell stays fixed; fail copy + retry in footer row | Chip body shows fail text; no extra row |
| **Pros** | Clear; matches “errors don’t change button height” | Fewer DOM rows |
| **Cons** | Footer contested with pending (pending wins when both? unlikely together) | Retry affordance cramped; easy to miss |
| **Recommendation** | **A** | |

---

#### 4. Save/pending errors replace footer with inline actions

##### What is this?
- On pending/unknown/too-old recovery: **hide** the age footer; show title + **Try again** / **Discard** (and too-old: Activities link) **inline on one line**.

##### Why do we need this?
- Today recovery is a `space-y-2` block under helpers — title then action row — not “in place of footer,” not same-line.

##### How to do this?
- **Approach:** Change `renderPendingRecovery` layout to single-line flex wrap (`text-sm` + accent actions); render in footer slot; suppress age footer when `recoveryVisible` for that owner. Keep under-owner ownership (breast_l vs breast_r, pump_l / pump_r / pump_amount).
- **Other ways:** Keep stacked layout; page-level strip (already removed — don’t bring back).
- **Best practices:** Existing `data-testid="baby-home-pending-recovery"` + e2e helpers; min tap targets (`min-h-11` / Design Guide).

**Decision 4 — Inline wrap vs truncate**

| | Option A — Flex wrap, full message (recommended) | Option B — Truncate message, actions always visible |
|--|--|--|
| **What** | `title · Try again · Discard` wraps on narrow | Ellipsis title; actions pinned |
| **Pros** | Full EN/VI strings readable | Actions never drop |
| **Cons** | Two lines on tiny widths | VI/EN titles may hide |
| **Recommendation** | **A** with wrap; keep ≥44px hit on actions |

**Settled (D4 / D5 / D6):** Nap next lives in **header** (chip subtitle cleared of next). Breast uses **one shared section footer** for pending (`breast_l` / `breast_r`). Pump uses **one shared section footer** for pending (`pump_l` / `pump_r` / `pump_amount`) with tie-break **L → R → amount**. Too-old stays **inline** (Open Activities + Discard with title).

---

#### 5. Birthday modal (replace muted strip)

##### What is this?
- When status has **loaded OK** and `birthDate` is unset, open a **modal** with a date field + Save (and **Not now**). Do **not** open on `statusError` or while status is loading/undefined (same guard as today’s strip). Do **not** render muted strip copy `home.birthDatePrompt` / settings-only link CTA.

##### Why do we need this?
- Gate B: caregivers must set birthday **in place** for age-based amounts; a strip + link to settings breaks the 3AM flow. Visit dismiss must stay so logging is never blocked.

##### How to do this?
- **Approach:** Reuse `shouldShowBabyBirthDatePrompt` / visit-dismiss sessionStorage; replace strip UI with a modal (date `Input` + Save). Open only when `!statusError` and status is ready (`!statusLoading` / defined) and `status.birthDate == null` and visit not dismissed. Call existing `updateBabyProfile` mutation; reuse `babyBirthDateErrorKey` + `settings.birthDate*` validation/error keys (or thin `home.birthDate*` wrappers that point at the same rules). On save success: invalidate the shared status query; close modal. **Not now** → `markBabyBirthDatePromptVisitDismissed` (same as today).
- **Other ways:** Force until set (blocks logging — rejected at Gate B); keep strip + add modal (duplicate surfaces — rejected).
- **Best practices:** Match settings Field/date/`max=today` patterns; polite focus trap via existing modal primitives if any (`BabyCustomMlModal` family or Dialog); ≥44px actions.

**Settled (Gate B):** Keep **visit dismiss** (“Not now”). Do **not** force birthday before care logs.

---

#### 6. Status block icons (Row 4)

##### What is this?
- Last-care block after pump (`data-testid="baby-home-status"`): each status line (feed / sleep / diaper / pump) shows a leading icon that matches the care-button icon for that kind.

##### Why do we need this?
- Gate B: status lines are text-only today; icons make scan match the care grid above.

##### How to do this?
- **Approach:** Wrap each `statusLine` row with the locked icon map (see Design). Feed is special: bottle vs breast care buttons → pick icon from last feed kind; empty/unknown → `IconBabyBottle`. Pump line stays one `IconBabyPump` (one status line for pump kind — unchanged).
- **Other ways:** One generic “status” glyph (weaker match); emoji (against DESIGN_GUIDE).
- **Best practices:** Same SVG components as care chips (`components/icons/icon-baby-nav.tsx`); `aria-hidden` on decorative icons; keep sentence markup.

---

#### 7. Page title with age in months

##### What is this?
- When birthDate is known, page header title appends current age in months via `home.titleWithAge`. When unknown, keep `home.title` only (modal owns birthday).

##### Why do we need this?
- Gate B: one glance at how old the baby is without opening settings or guidelines.

##### How to do this?
- **Approach:** `babyAgeInDays` already exists — no months helper today. Add thin `babyAgeInMonthsFloor(ageDays) = Math.floor(ageDays / 30.4375)`. Wire `/baby` chrome title: birthDate set → `t("home.titleWithAge", { n })`; else `t("home.title")`. **Pinned birthDate source:** status `birthDate` only (same care-status query/cache as home quick status / bands / footers). Invalidate that query after modal save. Do not fetch settings `babyProfile` in chrome for title months.
- **Other ways:** Calendar months from birth Y/M/D (rejected — Decision 7 locked floor); short `mo`/`th` abbreviations (rejected — Option 1).
- **Best practices:** i18n template with «n» or `{n}` per repo marked/fill style; breadcrumbs elsewhere still use `home.title` unless Design says otherwise (keep crumb “Baby Care” without age).

**Settled (Decision 7 → Option 2):** EN `Baby Care · {n} months` · VI `Chăm bé · {n} tháng`. Months = floor(`ageDays` / 30.4375) from `status.birthDate`.

---

#### 8. Pump L/R (current behavior — merge withdrawn)

##### What is this?
- Home and log pump keep **Pump L** + **Pump R** timed chips (`BabyPumpSidePair`) + amount chips / Custom. Shared pump section footer (D5) still shows one recovery for any of `pump_l` / `pump_r` / `pump_amount`. Status Row 4 pump line stays one `IconBabyPump`.

##### Why do we need this?
- User **rejected** merging into a single Nap-like timer. L/R remains the product behavior caregivers already use.

##### How to do this?
- **Approach:** No UI merge. No CreateBabyFeed contract change. Keep existing timer store sides, pending owners, validator, and e2e Pump L/R flows. Only chrome work for pump in this run: lead-only header (D1), age footer tip (D2), shared pending footer + tie-break **L → R → amount** (D5).
- **Other ways:** Single timed Pump + Decision 8 persistence — **rejected / withdrawn** by user at Gate B.
- **Best practices:** Reuse `BabyPumpSidePair` / `BabyPumpForm` as today; do not invent medical copy.

**Decision 8 — Timed pump persistence (rejected / withdrawn)**

User rejected merging Pump L/R into one timer. Decision 8 (method `pump` + duration vs write fixed `pump_l`) is **withdrawn**. Do not reopen unless the user asks again.

---

## What exists today

Headers mix next-due, age blends, bottle progress, and empty tips by section. Helpers are short muted tips under chips. Pending recovery is under-owner but stacked below helpers. Nap status fail replaces the chip. Fixed heights live in `lib/baby-home-control-height.ts`. Skeleton mirrors header + controls only (no footer stub). Birth unset shows muted strip + link to settings (`home.birthDatePrompt`) with visit dismiss. Status block is text-only after pump. Page header always `home.title` via `resolveBabyAppHeader` / `BabyRouteChrome`. Pump home + log pump use `BabyPumpSidePair` (L/R timed chips) + amount; timer store sides `pump_l`/`pump_r`; validator requires duration for L/R and amount for method `pump`; pending owners `pump_l` / `pump_r` / `pump_amount`.

## Dependencies

- `components/baby-home.tsx` (+ tests), chip sections that accept `helperText` / `recovery`
- `components/baby-pump-form.tsx`, `components/baby-pump-side-pair.tsx` (keep L/R pair UI)
- `components/baby-settings-page.tsx`, `lib/baby-birth-date-errors.ts`, `lib/baby-birth-date-prompt.ts`
- `components/baby-route-layout.tsx`, `lib/baby-app-header.ts`
- `messages/baby/en.ts` + `vi.ts`
- `lib/baby-next-due.ts`, `lib/baby-age-guide.ts`, control-height helper
- `lib/baby-breast-timer-store.ts`, `lib/baby-quick-care-pending.ts`, `lib/baby-feed-session.ts` (read-only for pump — no merge)
- `components/icons/icon-baby-nav.tsx` (care + status icons)
- `components/baby-page-skeleton.tsx` (+ skeleton tests) for footer / title / status parity (pump stubs stay L/R)
- `e2e/baby-home-option-b.spec.ts`, `e2e/baby-care.spec.ts` (keep Pump L/R flows)

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | Heading, body builders, nap fail-closed, `renderPendingRecovery`, status block, birth strip, pump L/R row |
| `components/baby-pump-form.tsx` | Log pump page L/R + amount |
| `components/baby-pump-side-pair.tsx` | Shared L/R pair — keep as current behavior |
| `components/baby-settings-page.tsx` | Birth date Field + `updateBabyProfile` save / validation |
| `lib/baby-birth-date-prompt.ts` / `baby-birth-date-errors.ts` | Visit dismiss + error key map |
| `components/baby-route-layout.tsx` / `lib/baby-app-header.ts` | Page title `home.title` |
| `components/icons/icon-baby-nav.tsx` | Care button icons to reuse on status lines |
| `components/baby-timed-care-chip.tsx` / `baby-ml-chip-section.tsx` | helper + recovery slots |
| `lib/baby-home-control-height.ts` | Stable big/small control height |
| `lib/baby-breast-timer-store.ts` | Pump timer sides `pump_l`/`pump_r` |
| `lib/baby-quick-care-pending.ts` | Pending owners including pump L/R/amount |
| `lib/baby-next-due.ts` / `lib/baby-age-guide.ts` | Next-due + sleep blend / feed bands / `babyAgeInDays` |
| `messages/baby/en.ts`, `vi.ts` | `home.header.*`, `home.pending*`, `home.napCheckFailed`, `home.birthDate*`, `home.title`, `home.status.*`, `home.pumpL`/`pumpR` |
| `components/baby-page-skeleton.tsx` | CLS parity when footer / status / title change |
| `e2e/baby-home-option-b.spec.ts` | Header next/overdue, bottle progress, pending recovery, Pump L/R |
| `e2e/baby-care.spec.ts` | Log pump Pump L/R duration posts |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| `BabyHomeSectionHeading` + marked sentences | `baby-home.tsx` | Same lead — body chrome |
| `dueBodyMarked` / next-due helpers | `baby-home.tsx`, `baby-next-due.ts` | Don’t recompute intervals |
| Under-owner pending | `renderPendingRecovery`, e2e `pendingRecoveryUnder` | Keep ownership tests |
| Fixed control height | `baby-home-control-height.ts` | Stop height jump |
| Sleep / feed age bands | `baby-age-guide.ts` | Footer copy source |
| Birth visit dismiss | `baby-birth-date-prompt.ts` | Modal open rules stay visit-scoped |
| Profile birth save | settings + `updateBabyProfile` | No new public API for birthday |
| Care icons | `icon-baby-nav.tsx` | Status line icons match buttons |
| Pump L/R pair | `baby-pump-side-pair.tsx` | Keep current home + log pump controls |

## Constraints and risks

- Subgrid rows: adding a footer row needs template-row / skeleton updates or CLS.
- Pending + age footer: only one should show.
- VI string length may force wrap on inline recovery.
- Title age needs birthDate in chrome (layout vs home) — avoid double-fetch thrash; invalidate after modal save.
- Separate from paused `baby-home-polish-guideline-pump` — don’t merge that work.
- Front-end: qan context-mode MCP not available this run; relied on repo patterns above.

## Settled decisions (do not relitigate)

- Scope = home section header/footer placement + error UI layout + Gate B birthday modal / status icons / title age. **Pump L/R stay** (single-timer merge withdrawn).
- No new care types / guideline stages.
- Status-check vs pending-save stay separate surfaces.
- Has UI: yes. Mode: simple.
- **Has DB: no.**
- **Has API: no** — birthday reuses `updateBabyProfile`; no CreateBabyFeed contract change.
- **D1 — Pump header:** lead only (no empty tip body) until a next-due model exists. Do not fill header with Pump L/R empty tip.
- **D2 — Age footers:** reuse / paraphrase existing guide (`home.guide.stage.*`, feed/sleep bands); thin `home.footer.*` keys — do not invent medical claims.
- **D3 — Helpers:** drop `home.helper.*` when age footer ships (footer replaces helpers).
- **D4 — Nap next:** header owns next/overdue/empty; chip subtitle clears `nextSleepLabel` (elapsed-only or blank).
- **D5 — Pending ownership:** one shared section footer. Breast: `breast_l` / `breast_r` (tie-break L → R). Pump: `pump_l` / `pump_r` / `pump_amount` (tie-break **L → R → amount**) — still one footer, **not** one timer.
- **D6 — Too-old:** Open Activities + Discard stay inline on the same wrap row as the title.
- **Gate B — Birthday:** no `home.birthDatePrompt` strip; modal with date + save; open only when status loaded OK (`!statusError`, `!statusLoading`/defined) + `status.birthDate == null` + visit not dismissed; **keep visit dismiss** (Not now) — do not force until set.
- **Gate B — Status icons:** Row 4 = `baby-home-status`; icon map locked in Design; pump stays `IconBabyPump` (one line).
- **Gate B — Title age:** `home.titleWithAge` when birthDate known; **Decision 7 Option 2** EN `Baby Care · {n} months` / VI `Chăm bé · {n} tháng`; months = floor(`ageDays` / 30.4375); **birthDate source pinned** to status query only (invalidate on modal save).
- **Decision 7 → Option 2:** full-word months title format locked (Gate B approve 2026-09-20).
- **Decision 8 / single timed Pump:** **rejected / withdrawn** — keep Pump L+R as today.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| — | — | Not needed for Analyze | — |

## Blocking questions

- None. Decision 7 locked Option 2. Decision 8 withdrawn.

## Clarity check

Are the instructions and reference files clear enough to design? Any gaps in What / Why / How?

## Has API / Has DB (for parent)

- **Has API:** **no** — birthday reuses `updateBabyProfile`; single-pump / Decision 8 withdrawn.
- **Has DB:** **no** — no schema / migrations / persistence query change.
