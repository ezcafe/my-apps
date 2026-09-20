# Idea: Baby home next-only headers + age footers + stable errors

## Problem

On baby home quick-care sections, headers and footers mix next-due, age tips, and empty prompts in ways that are hard to scan. Errors also hurt layout: some status-check failures change button height; save failures are not clearly in the footer row with inline actions. Birthday is only a muted strip CTA to settings; last-care status lines have no care-kind icons; the page title never shows age in months.

## User / audience

Tired caregivers on baby home (EN/VI) who need one glance: when is the next session, and what does the guide say for this age — without buttons jumping when something fails. When birthday is missing, they should set it in place without leaving the logging flow (unless they choose Not now).

## Outcome

- **Section headers** show **next session only** (plus section lead), e.g. `Breast — Next feed is in about 12min.` (and overdue / empty equivalents per section when no next due).
- **Section footers** show **recommendation at current age**, e.g. `About 90 ml each time. Today 3 of 8 feeds.` (and matching nap/diaper/pump age guidance where already modeled).
- **Status-check errors** (e.g. `Could not check nap status`) must **not** change care button heights — keep control height as today when healthy.
- **Save / pending errors** (e.g. `We could not confirm your last save.`) show **in place of the section footer**, with actions **inline** on the same line: `We could not confirm your last save. Try again  Discard`.
- **Birthday unset:** do **not** show muted strip `home.birthDatePrompt`. Open a **modal** with date field + save (reuse settings validation/save). Keep visit dismiss (**Not now**) so 3AM logging is not blocked.
- **Row 4 / last-care status** (`data-testid="baby-home-status"`): each feed / sleep / diaper / pump line shows an **icon matching that care kind’s button icons**.
- **Page title:** when birthDate known, append age in months via `home.titleWithAge` (Decision 7 Option 2: EN `Baby Care · {n} months` / VI `Chăm bé · {n} tháng`); when unknown, stay `home.title` only (modal handles birthday).
- **Pump controls:** keep **Pump L** and **Pump R** timed chips + amount chips as **current behavior** on home and log pump (`BabyPumpSidePair` / `BabyPumpForm`). Pump header stays **lead only** (D1). Shared pump section footer (D5) still owns pending for L/R/amount. Status pump line stays one `IconBabyPump`.

## Scope

- Baby home section header / footer copy placement and error UI layout.
- Birthday modal on home (input + save; no settings-only CTA strip).
- Status-block icons + page title age months.
- Pump L/R + amount stay as today (no single-timer merge).
- Reuse existing next-due, age-guide, i18n, pending-save, and `updateBabyProfile` patterns where possible.

## Non-goals

- New care types, new guideline stages, or redesign of the whole home grid.
- Changing save/retry backend behavior beyond where the error is shown (except reusing existing profile birthDate mutation from the home modal).
- Merging Pump L + Pump R into one timer (user rejected).
- New DB schema / migrations (Has DB no). New CreateBabyFeed public contract (Has API no).
- Merging or finishing other paused baby-home workflows.
- Forcing birthday before any care log (visit dismiss stays).
- Inventing medical copy for footers or pump guidance.

## Has UI

**yes** — baby home section chrome, error placement, birthday modal, status icons, title age; pump L/R UI unchanged.

## Assumptions

| Assumption | Must be true? | If false |
|------------|---------------|----------|
| “Next session only” in header means due/next/overdue line; tips/progress move to footer | Yes | Clarify with user |
| Age recommendation footer uses existing guide + progress copy (bottle example given) | Yes | Extend copy per section in Design |
| Status-check error is separate from pending-save error placement | Yes | Unify only if Design finds one surface |
| Birthday modal reuses existing `updateBabyProfile` + settings validation keys | Yes | Flag Has API yes only if a new public contract is required |
| Visit dismiss (“Not now”) stays — do not block logging | Yes | Only change if user overrides Gate B |
| Title months use floor months from `babyAgeInDays` (no calendar-month helper today) | Yes | Locked Decision 7 Option 2 — floor only |
| Pump L/R + amount stay as current behavior on home + log pump | Yes | Only change if user reopens merge |

## Settled (Gate B)

- **Decision 7 → Option 2:** title age full word — EN `Baby Care · {n} months` / VI `Chăm bé · {n} tháng`; months = floor(`ageDays` / 30.4375) from `status.birthDate`.
- Option 1 design + Gate B deltas (birthday modal, status icons, title age) **approved**; Pump L/R stay separate (Decision 8 withdrawn).
