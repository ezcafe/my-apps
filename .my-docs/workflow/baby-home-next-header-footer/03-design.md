# Design: Baby home next-only headers + age footers + stable errors

**Mode:** simple — from `00-run.md`

## Decision 1: which design approach?

### Option 1 — Shared section footer slot (recommended)

**What it is:**
Keep `BabyHomeSectionHeading` for **next session only**. Add one **section footer slot** under each section’s controls. That slot shows, in order: **pending recovery** → **status-check fail** → **age tip** (+ today progress when we have it). Drop `home.helper.*`. Nap next moves to the header; chip subtitle stays elapsed-only / blank. Breast and Pump use **one** shared footer for any side/amount pending (breast L/R; pump **L / R / amount** — not one timer). Gate B: replace birth strip with **birthday modal** (visit dismiss); **icons on status Row 4**; **title with months** when birthDate known. Pump UI stays **L + R + amount** as today (`BabyPumpSidePair` / `BabyPumpForm`). **Has API no** · **Has DB no**.

**Example:**
Breast healthy: header `Breast — Next feed is in about 12min.` · footer `About 6–8 feeds a day.`  
Breast pending on L: same header · footer `We could not confirm your last save. Try again  Discard` (inline wrap; age tip hidden).  
Nap status fail: chip shell stays `BABY_HOME_BIG_CONTROL_MIN_H` · footer `Could not check nap status` + Retry.  
Birthday unset (not dismissed): modal with date + Save / Not now — **no** muted `home.birthDatePrompt` strip.  
Status Row 4: each line has matching care icon. Title: `Baby Care · 3 months` when age known (Decision 7 Option 2).  
Pump: Pump L + Pump R timed chips + amount chips; one section footer for pending.

**Pros:**

- Matches locked ask + Analyze deep dive (one glance: when vs guide)
- Stable control height; errors stay under the section that owns them
- Reuses `dueBodyMarked`, next-due helpers, age/sleep bands, pending ownership ids

**Cons:**

- Subgrid / skeleton need a footer row (CLS work)
- Breast/Pump pending moves from per-chip to section footer (e2e + unit updates)
- Short breast/diaper/pump age lines must be wired from existing guide numbers/copy (few new i18n keys)
- Birthday modal + title chrome need birthDate sync after save; status icons + skeleton stubs

### Rejected alternative (≤3 lines)

Keep tips/helpers in the header and only restyle typography; leave nap next on the chip subtitle and stacked pending under helpers. Rejected: breaks “header = next / footer = age,” keeps height jump risk, ignores locked D3–D5.

**Also rejected (Gate B):** Merge Pump L/R into one Nap-like timer — user **withdrew** that delta; keep L/R as today.

## Tradeoffs

Simple mode: Option 1 costs a footer row + copy moves; rejected alternative is cheaper but fails the outcome. Single-pump merge was cheaper for tap cost but **user rejected** it.

## Recommendation

**Pick Option 1** — honors locked D1–D6 and Gate B deltas (birthday/status/title). Pump stays L/R + amount; shared footer only (D5).

## Chosen design (user-approved)

**Option 1** + Gate B deltas (birthday modal, status Row 4 icons, title age). **Decision 7 → Option 2** (full-word months). **Decision 8 withdrawn** — Pump L/R stay separate. **Has API no** · **Has DB no**.

## Sequence diagram

Client chrome; status/pending already exist. Birthday modal reuses existing profile mutation. Pump writes stay existing `createBabyFeed` (L/R duration or amount as today).

```mermaid
sequenceDiagram
  participant UI as BabyHome / BabyPumpForm
  participant Status as Existing status query
  participant LS as localStorage pending
  participant SS as sessionStorage visit dismiss
  participant GQL as Existing GraphQL

  UI->>Status: load care status (unchanged)
  Status-->>UI: feedsToday / openSleep / birthDate / errors
  UI->>LS: read pending owner (unchanged)
  LS-->>UI: pending or none

  alt pending for section owners
    UI-->>UI: footer = inline recovery (suppress age tip)
    note right of UI: breast L/R; pump L/R/amount — one footer
  else nap status-check fail
    UI-->>UI: fixed-height nap shell + footer fail+retry
  else healthy
    UI-->>UI: header next-only; footer age tip
  end

  alt status loaded OK and birthDate null and visit not dismissed
    UI-->>UI: open birthday modal (no strip)
    note right of UI: no open on statusError / statusLoading / status undefined
    alt Save valid date
      UI->>GQL: updateBabyProfile(birthDate)
      GQL-->>UI: invalidate status query (same cache as home)
      UI-->>UI: close modal; title may gain months from status.birthDate
    else Not now
      UI->>SS: mark visit dismissed
      UI-->>UI: close modal; logging stays available
    end
  end

  alt pump L or R timer stop
    UI->>GQL: createBabyFeed method pump_l or pump_r + durationSec
  else pump amount chip
    UI->>GQL: createBabyFeed method pump + amountMl
  end
```

## Contracts

### API contracts

**None new.** Birthday reuses existing `updateBabyProfile`. Pump writes stay existing `createBabyFeed` (method `pump_l` / `pump_r` + duration, or `pump` + amount) — no validator change.

### Database contracts

**None.** No schema, migrations, or persistence query changes.

### Example queries

N/A — no DB work this run. Birthday write path is the existing GraphQL mutation only. Pump writes stay existing `createBabyFeed`.

## Patterns to reuse

| Pattern | Why it fits | Reference |
|---------|-------------|-----------|
| `BabyHomeSectionHeading` + marked sentences | Lead + one body line | `components/baby-home.tsx` |
| `dueBodyMarked` / next-due | Header next/overdue/empty | `baby-home.tsx`, `lib/baby-next-due.ts` |
| Feed / sleep age bands | Footer tip numbers & nap blend | `lib/baby-age-guide.ts` |
| `babyAgeInDays` + thin months floor | Title age months | `lib/baby-age-guide.ts` (+ new helper) |
| Birth visit dismiss | Modal open / Not now | `lib/baby-birth-date-prompt.ts` |
| Settings birth save / errors | Modal validation + `updateBabyProfile` | `baby-settings-page.tsx`, `baby-birth-date-errors.ts` |
| Care icons | Status Row 4 | `components/icons/icon-baby-nav.tsx` |
| Under-owner pending ids | Ownership: breast L/R; pump **L/R/amount**; **render** once per section | `renderPendingRecovery`, `baby-quick-care-pending.ts` |
| `BabyPumpSidePair` | Pump L/R timed chips + amount (current behavior) | `baby-pump-side-pair.tsx`, `baby-pump-form.tsx` |
| Fixed big control height | Status fail must not grow chip | `lib/baby-home-control-height.ts` |
| DESIGN_GUIDE tokens / ≥44px hits | Footer actions, radii, muted tip, modal | `docs/DESIGN_GUIDE.md` |

Front-end routing note: qan context-mode MCP not available this run — follow repo baby-home + DESIGN_GUIDE patterns above.

## Locked copy / placement rules

### Footer slot priority (all sections)

1. **Pending recovery** (any matching owner for that section)  
2. **Status-check fail** (nap today; same slot pattern if others appear)  
3. **Age tip** (+ bottle today progress)

Pending **wins** over age tip. Do not stack tip + recovery. Drop `home.helper.*` when age footer ships (D3).

### Per section

| Section | Header body | Footer (healthy) | Pending owners → one section footer | Notes |
|---------|-------------|------------------|-------------------------------------|-------|
| **Breast** | Next / overdue / empty (`breastNext` / `Overdue` / `Empty`) | Short age line from **feed band** `feedsMin`–`feedsMax` (reuse `babyFeedGuideForAge`; new thin `home.footer.breastFeeds` with «min»/«max») | `breast_l` **or** `breast_r` | One footer under L·R row |
| **Bottle** | **Birth band known** → lead only (no body — not ml+progress). **No birth band** → empty/pick (`home.header.bottleEmpty` / pick amount). | Move today’s `bottleMl` + `bottleProgress` here (rename to `home.footer.*` optional) | `bottle` | Progress stays bottle-only; tip only when band exists |
| **Nap** | Next / overdue / empty via `babyNextSleepDue` + `dueBodyMarked` | Move current `home.header.nap.blend*` here (same keys OK under footer render) | `nap` | Chip subtitle: elapsed when running, else blank — **clear** `nextSleepLabel` (D4) |
| **Diaper** | Next / overdue / empty (unchanged keys) | One-line per guide stage — see **Pinned diaper/pump footer keys** below | `diaper` | Paraphrase guide only; no tip when age unknown |
| **Pump** | **Lead only** — no empty tip body until a next-due model exists (D1). Do **not** fill header with Pump L/R empty tip. | One-line per guide stage — see **Pinned diaper/pump footer keys** below | `pump_l` **or** `pump_r` **or** `pump_amount` | **Keep** `BabyPumpSidePair` L/R + amount chips on home and `BabyPumpForm` (current behavior). One pump section footer owns all three. |

### Pending owner tie-break (shared footer)

When more than one owner for a section is pending at once, show **only one** recovery (still priority over age tip). Stable order:

- **Breast:** `breast_l` → `breast_r`
- **Pump:** `pump_l` → `pump_r` → `pump_amount`

Use the first matching owner in that order for the footer `data-pending-owner` and recovery copy.

### Decision 8 — Timed pump persistence (rejected / withdrawn)

**Status:** **Rejected / withdrawn** by user at Gate B (2026-09-20). Do **not** merge Pump L/R into one timer. Do **not** change CreateBabyFeed validation for method `pump` duration-only. Keep Pump L+R as today on home and log pump.

Former Option 1 (method `pump` + duration) and Option 2 (UI-only write `pump_l`) are **void**. Task 7 removed. Reopen only if the user asks again.

### Gate B — Pump UI (locked: keep L/R)

| Rule | Detail |
|------|--------|
| **Surfaces** | Baby **home** pump section + **log pump** page (`BabyPumpForm`). |
| **Controls** | Keep **Pump L** + **Pump R** timed chips (`BabyPumpSidePair`) + existing **amount** chips / Custom. |
| **Footer (home)** | Still **one** shared pump section footer (D5). Owners: `pump_l`, `pump_r`, `pump_amount`. Tie-break **L → R → amount**. |
| **Status Row 4** | Pump line stays one line with `IconBabyPump` (unchanged icon — one status line for pump kind). |
| **Skeleton** | `BabyPumpSkeleton` / home pump stubs stay **L/R pair** + amount (current shape) plus footer stub when live UI gains footers. |
| **i18n** | Keep `home.pumpL` / `home.pumpR` on home/log pump surfaces. |
| **E2E** | Keep Pump L / Pump R timer flows (home + log pump). |

Refs today: `components/baby-home.tsx` pump row, `components/baby-pump-form.tsx`, `components/baby-pump-side-pair.tsx`, `lib/baby-breast-timer-store.ts`, `lib/baby-quick-care-pending.ts`.

### Pinned diaper/pump footer keys (D2 — reuse guide only)

Map `ageDays` → `BabyCareGuideStageId` (same cuts as guide titles): `newborn` 0–30d · `m1_3` 31–90 · `m3_6` 91–182 · `m6_12` 183–364 · `m12_24` ≥365. No birth / null age → **empty footer** (no tip). **Do not invent medical claims** — only paraphrase the source fields below.

#### Diaper — keys `home.footer.diaper.{stageId}`

| Key | EN (one line) | VI (one line) | Source field |
|-----|---------------|---------------|--------------|
| `home.footer.diaper.newborn` | Change about every 2–3 hours, or right after a poop. | Thay tã khoảng mỗi 2–3 tiếng, hoặc ngay khi bé đi nặng. | `home.guide.stage.newborn.diaper.body` (cadence clause) |
| `home.footer.diaper.m1_3` | Tape diapers Size S (4–8kg); wipe front to back. | Tã dán Size S (4–8kg); lau từ trước ra sau. | `home.guide.stage.m1_3.diaper.body` |
| `home.footer.diaper.m3_6` | Pants diapers Size M (6–11kg). | Tã quần Size M (6–11kg). | `home.guide.stage.m3_6.diaper.body` |
| `home.footer.diaper.m6_12` | Pants diapers Size L (9–14kg). | Tã quần Size L (9–14kg). | `home.guide.stage.m6_12.diaper.body` |
| `home.footer.diaper.m12_24` | Pants Size XL/XXL (>12kg); potty practice from 18–24 months. | Tã quần Size XL/XXL (>12kg); tập bô từ 18–24 tháng. | `home.guide.stage.m12_24.diaper.body` |

#### Pump — keys `home.footer.pump.{stageId}`

| Key | EN (one line) | VI (one line) | Source field |
|-----|---------------|---------------|--------------|
| `home.footer.pump.newborn` | Pump about every 2–3 hours (8–10 times/day). | Hút khoảng mỗi 2–3 tiếng (8–10 lần/ngày). | Pumping Output line in `home.guide.stage.newborn.nutrition.body` |
| `home.footer.pump.m1_3` | About 90–150 ml/session; 6–8 times/day. | Khoảng 90–150 ml/lần; 6–8 lần/ngày. | Pumping Output in `home.guide.stage.m1_3.nutrition.body` |
| `home.footer.pump.m3_6` | About 120–180 ml/session; 4–6 times/day. | Khoảng 120–180 ml/lần; 4–6 lần/ngày. | Pumping Output in `home.guide.stage.m3_6.nutrition.body` |
| `home.footer.pump.m6_12` | About 150–220 ml/session; 3–4 times/day. | Khoảng 150–220 ml/lần; 3–4 lần/ngày. | Pumping Output in `home.guide.stage.m6_12.nutrition.body` |
| `home.footer.pump.m12_24` | Pump 1–2 times/day if still pumping. | Hút 1–2 lần/ngày nếu còn duy trì. | Pumping clause in `home.guide.stage.m12_24.nutrition.body` |

Refs: `messages/baby/en.ts`, `messages/baby/vi.ts`, `lib/baby-care-guideline-content.ts` (`BABY_CARE_GUIDE_STAGE_IDS`).

### Pending / status-fail UI

- **Layout:** single `flex flex-wrap` row: message + actions (`Try again` / `Discard`, or too-old: `Open Activities` + `Discard`) — D6 too-old also inline wrap.
- **Hit targets:** actions `min-h-11` (≥44px); `text-sm` / destructive title; accent on primary action; `rounded-[var(--radius-sm)]`.
- **Nap status fail:** keep disabled/placeholder chip shell at `BABY_HOME_BIG_CONTROL_MIN_H`; put `home.napCheckFailed` + retry in footer slot — not a taller replacement box.
- **Testids:** keep `baby-home-pending-recovery` + `data-pending-owner`; e2e may assert under section footer instead of per-chip.
- **Live region:** when the footer swaps to pending recovery or status-fail, put that message (and actions) in a **polite** live region (`aria-live="polite"` or `role="status"`) so screen readers hear the change without stealing focus.

### Skeleton parity (mandatory)

`components/baby-page-skeleton.tsx` (and tests): add a muted footer stub under each section that gains a footer in live UI — same order, gap, and radii — zero CLS. If status Row 4 gains leading icon slots, mirror icon-sized stubs. Title chrome: skeleton / loading heading must not jump when `home.title` vs `home.titleWithAge` lengths differ (prefer reserved title line height already used by `PageHeading`). **Pump:** keep L/R pair stubs + amount (current) plus footer stub.

### Gate B — Birthday modal (locked)

| Rule | Detail |
|------|--------|
| **No strip** | Do **not** render muted copy `home.birthDatePrompt` or the settings-link strip (`data-testid="baby-birth-date-prompt"` as today’s strip). Remove that surface. |
| **When open** | Open **only when all** are true: (1) status has **loaded successfully** — `!statusError` **and** status is defined / `!statusLoading` (no first-paint flash); (2) `birthDate == null` from that status payload (`status?.birthDate ?? null`, same as today’s strip); (3) visit not dismissed (`shouldShowBabyBirthDatePrompt` / sessionStorage). **Do not** open on status error or while status is still loading/undefined — a missing `birthDate` in those states is not “unset.” Mirrors today’s strip guard. |
| **Contents** | Date field (`type="date"`, `max=today`) + **Save** + **Not now**. Optional short hint (reuse `settings.birthDateHint` or thin home key) — not the old prompt strip sentence as the only CTA. |
| **Save** | Same rules as settings: call existing `updateBabyProfile`; map errors via `babyBirthDateErrorKey` → `settings.birthDate*` (or home aliases of the same keys). Invalidate the **shared status** query after success so home + title refresh; close modal. |
| **Dismiss** | **Keep visit dismiss** — Not now calls `markBabyBirthDatePromptVisitDismissed`. Do **not** force until set (3AM logging must stay available). |
| **Clear birth** | Modal is for **setting** birthday when unset; clearing remains settings-only (no empty-save from home modal unless Build mirrors settings clear — **default: require a date to Save**). |

### Gate B — Status Row 4 icons (locked)

Row 4 = last-care block after pump: `data-testid="baby-home-status"`. Each line gets a leading decorative icon (`aria-hidden`) matching care buttons:

| Status line | Icon component | Rule |
|-------------|----------------|------|
| **feed** | `IconBabyBottle` or `IconBabyBreast` | From last feed kind: bottle → `IconBabyBottle`; breast L/R/generic → `IconBabyBreast`; empty / unknown → `IconBabyBottle` |
| **sleep** | `IconBabySleep` | Always |
| **diaper** | `IconBabyDiaper` | Always (not wet/poop variants — match the diaper **section** care glyph) |
| **pump** | `IconBabyPump` | Always |

Source icons: `components/icons/icon-baby-nav.tsx` (same components as breast/bottle/nap/diaper/pump care controls).

### Gate B — Page title with age months (locked)

| Rule | Detail |
|------|--------|
| **Unknown birthDate** | Title = `home.title` only (`Baby Care` / `Chăm bé`). Modal handles birthday. |
| **Known birthDate** | Title = `home.titleWithAge` with months `n`. |
| **EN (Decision 7 Option 2)** | `Baby Care · {n} months` |
| **VI (Decision 7 Option 2)** | `Chăm bé · {n} tháng` |
| **Months formula** | Prefer existing `babyAgeInDays(birthDate, now)`. Add `babyAgeInMonthsFloor(ageDays) = Math.floor(ageDays / 30.4375)` (average month length). **Locked** — floor from `status.birthDate` ageDays; not calendar months. |
| **birthDate source (pinned)** | **Only** `status.birthDate` from the same care-status query/cache home already uses for quick status / age bands / footers. Do **not** fetch `babyProfile` in chrome for title months. After modal Save, invalidate that status query so title, footers, and bands update together. |
| **Where** | `/baby` page header via `BabyRouteChrome` / `PageHeading` (today always `t(resolveBabyAppHeader().titleKey)`). Read months from pinned status `birthDate` above. Breadcrumbs on other routes keep `home.title` without age. |

## UI / UX / mobile

- **UI concept (01b):** skipped (simple bootstrap) — align to idea outcome + this placement table; do not invent a new grid.
- **80/20:** Important #1 = next session in header; Important #2 = age tip or recovery in footer; care chips stay dominant; helpers gone; birthday in modal when needed; status icons for scan; title age when known.
- **Layout / hierarchy:** section = heading → controls → one footer slot; breast shares footer across L/R; pump shares footer across **L / R / amount**; then status Row 4 (with icons); guidelines last. No birth strip after status.
- **Loading / empty / error / success:** empty next keys when no due; age tip when healthy; pending/status fail replace tip; birthday modal errors inline on field; saves unchanged except profile birth from modal; pump L/R stop/amount as today.
- **Skeleton parity:** footer stub + status icon stubs as needed (above); pump L/R stubs stay.
- **Mobile:** wrap OK on narrow VI/EN; no hover-only; ≥44px recovery/retry/modal actions.
- **Accessibility:** header `aria-labelledby` unchanged; recovery stays in section DOM; links/buttons remain keyboard reachable; pending / status-fail footer uses polite `aria-live` / `role="status"` when it replaces the tip; birthday modal focus trap + Escape/Not now; status icons decorative (`aria-hidden`).
- **Day-to-day:** tired caregiver glance — when next, then guide or fix-save — without button jump; set birthday without leaving home; see age in title when known; pump L/R as today.

## Security design review (OWASP)

Trust boundaries:

- Browser UI + existing auth’d status/quick-care; localStorage pending stays client-owned.
- Birthday modal uses **existing** auth’d `updateBabyProfile` write (same trust boundary as settings).

Abuse cases:

- Spam retry on pending (existing behavior; no new write surface beyond existing mutation).
- Misleading recovery on wrong section (mitigate: still match `pendingOwner` to section owner set).
- Spam / invalid birthday from home modal (mitigate: same server validation + `babyBirthDateErrorKey` as settings; date `max=today`; no new endpoint).

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | pass | Reuse auth’d mutations only; no new CreateBabyFeed field rules |
| A02 Cryptographic Failures | N/A | No secrets/crypto |
| A03 Injection | pass | i18n templates + existing marked fill; date string validated server-side as today |
| A04 Insecure Design | pass | Errors stay section-scoped; no silent discard without action; birthday not forced (visit dismiss) |
| A05 Security Misconfiguration | N/A | UI chrome + existing mutations |
| A06 Vulnerable Components | N/A | No new deps |
| A07 Auth Failures | N/A | Unchanged auth |
| A08 Software / Data Integrity | pass | Pending retry/discard unchanged; profile birth write unchanged |
| A09 Logging / Monitoring Failures | N/A | No new logging requirement |
| A10 SSRF | N/A | No server fetches added |

Source: https://owasp.org/Top10/

## Challenges answered

- **Do we need this?** Yes — mixed header roles and height-jumping nap fail hurt glance + layout; Gate B birthday/status/title gaps are real caregiver issues.
- **What fails?** Missing stage→footer wiring; VI wrap; subgrid CLS if skeleton lags; pending owner set / tie-break wrong for shared footer; title/chrome birthDate sync after modal save; title string drift from locked Decision 7 Option 2.
- **Is this overspecified?** No — placement + priority + Gate B locks are the product; Has API no; thin i18n only where guide numbers / title already needed. No invented medical copy. Single-pump merge withdrawn.
