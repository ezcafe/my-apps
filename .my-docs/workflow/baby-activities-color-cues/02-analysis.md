# Analysis: Activities colors + Home care feedback polish

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.

## Deep dive (required)

### Overall

#### What is this?
Make Activities rows scannable with per-type colors and age-regular border cues for time/ml, and calm Home care: no Saved banners, stable Nap height, timer updates only related chips, Pump does not stop feed or nap.

#### Why do we need this?
Caregivers cannot tell activity type at a glance; unusual ml/duration is buried in text. Home “Saved …” banners interrupt; Pump currently stops breast and ends open naps (client + server). Layout jumps on timer start hurt trust.

#### How to do this?
- **Activities:** pure helpers for type → accent token + value → below/near/above; row chrome (left bar + chip border) on list/table + skeleton.
- **Home quiet save:** stop setting success `message` from step keys; keep chip done-flash; keep error/blocked messages.
- **Timers:** dual care-timer slots (breast family vs pump family); stop sending `breastRunning` / auto-`endNap` for Pump actions; isolate elapsed ticks in children; reserve Nap subtitle space.
- **Other ways:** full History timeline rebuild (rejected — out of scope); single shared timer with flags only (too weak — server still ends nap).
- **Best practices:** reuse `lib/baby-age-guide.ts` ml bands; DESIGN_GUIDE tokens; existing `BabyTimedCareChip` / done-flash; TDD for plan/localAfter + banding.

### Solution pieces

#### 1. Activities type colors + age-regular borders

##### What is this?
Accent color per activity family on Activities rows; border state for duration/ml vs age-regular.

##### Why do we need this?
Scan + “is this unusual?” without Edit. Skipping leaves plain ledger.

##### How to do this?
- Approach: `lib/baby-activity-color.ts` (family → CSS var) + `lib/baby-activity-regular-cue.ts` (extract ml/minutes from row payload/summary fields → below/near/above vs guide). Wire into `baby-activities-page` mobile cards + desktop event cell; update skeleton.
- Other ways: full timeline rail (deferred); Insights-only colors (misses Activities ask).
- Best practices: token vars under `:root` / baby scope; second channel via `aria-label` or sr-only cue text; unknown age → type only.

#### 2. Remove Saved … success messages (all care actions)

##### What is this?
Stop post-success banner copy (“Saved breast feed”, “Started nap”, etc.).

##### Why do we need this?
Noise on every log. Chip Done flash already confirms.

##### How to do this?
- Approach: in `runQuick` success path, do not `setMessage` from `babyQuickCareStepMessageKey` / `home.savedFeed`. Keep `home.saveBlocked`, `home.chainFailed`, recovery copy.
- Other ways: empty string toast (still layout flash) — worse.
- Best practices: match Gate A — quiet chip flash, loud errors only.

#### 3. Selective re-render + Nap height

##### What is this?
Timer start/end and 1 Hz elapsed should not remount/redraw unrelated chips; Nap card height stable idle↔running.

##### Why do we need this?
Jank and Nap height jump feel broken.

##### How to do this?
- Approach: keep elapsed in existing 1 Hz child for breast; same for nap/pump running faces; avoid parent `clock` driving nap elapsed; reserve `min-h` / always-on subtitle slot on Nap chip so dropping `nextSleepLabel` does not shrink.
- Other ways: React.memo entire Home (brittle with shared `saving`).
- Best practices: repo already isolates breast tick (`BabyBreastElapsedTick` pattern) — extend.

#### 4. Pump must not stop feed or nap

##### What is this?
Pump L/R and pump-amount must not clear breast timer or end open nap.

##### Why do we need this?
Unrelated actions fighting destroys concurrent care logging.

##### How to do this?
- Approach (required client + server):
  1. **Store:** allow concurrent breast_* and pump_* timers (two slots or keyed map) — today one `BabyCareTimer` side.
  2. **Plan:** `localAfterFromQuickRequest` — pump sides only preempt pump sides; breast only breast; `PUMP_AMOUNT` / pump BREAST must not `clearBreastTimer` for breast_* .
  3. **Wire:** do not attach breast_* `breastRunning` when action is pump family.
  4. **Server** (`features/baby/server/quick-care.ts`): today **every** action ends open nap before the action — skip `endNap` for pump family; do not require saving breast when pump starts.
- Other ways: UI-only ignore (fails — server still ends nap / saveBreast).
- Best practices: fix at plan + server order; unit tests on fixtures + quick-care tests.

#### 5. Recent pump status line (Decision 2 → Option 1)

##### What is this?
Fourth info line in `baby-home-status`: last pump detail + when (or empty copy).

##### Why do we need this?
Feed status may bury pump inside merged last-feed; caregivers want pump history at a glance like diaper/sleep.

##### How to do this?
- Approach: add `lastPump` on home quick status — newest feed event whose method/legs include `pump` | `pump_l` | `pump_r`. UI `statusLine("pump")` + i18n empty/item keys. Skeleton: 4 status placeholders.
- Other ways: derive only from `lastFeed` if pump (misses pump when last feed is breast/formula).
- Best practices: mirror feed/diaper status sentence pattern (`home.status.*`).

## What exists today

Activities rows are plain title + summary (`baby-activities-page.tsx`). Home uses one care-timer (`baby-breast-timer-store.ts`); `localAfterFromQuickRequest` clears any running timer on non-BREAST actions and switches sides on BREAST; server ends open sleep on every quick-care. Feed ml bands live in `baby-age-guide.ts`; sleep bands are copy-only (no duration min/max). Success banners from `setMessage` + step keys.

## Dependencies

- Client plan + localAfter + store shape
- Server quick-care step order (endNap / saveBreast gates)
- Age guide: add sleep (and optional breast) duration windows for cues
- Activities skeleton parity
- E2E that assumed Pump ends nap / Saved toast may need updates

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-activities-page.tsx` | Row chrome |
| `components/baby-page-skeleton.tsx` | CLS |
| `lib/baby-insights-activity-log.ts` | Row shape / payload |
| `lib/baby-age-guide.ts` | ml bands; extend duration |
| `components/baby-home.tsx` | message, chips, clock |
| `components/baby-timed-care-chip.tsx` | Nap height |
| `lib/baby-breast-timer-store.ts` | Dual timer |
| `lib/baby-quick-care-plan.ts` | localAfter / breastRunning |
| `features/baby/server/quick-care.ts` | endNap + saveBreast |
| `features/baby/server/home-quick-status.ts` | Add `lastPump` |
| `messages/baby/en.ts` | stepSave* keys + status.pump* |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Feed ml age bands | `lib/baby-age-guide.ts` | Same “regular” source as Home chips |
| Timed chip + done-flash | `baby-timed-care-chip.tsx` | Quiet confirm |
| Isolated elapsed tick | `baby-home.tsx` breast tick | Selective re-render |
| Activity log merge | `baby-insights-activity-log.ts` | Cue inputs |

## Constraints and risks

- Server auto-`endNap` is the real Pump→nap killer — must change server, not only UI.
- Dual timers need storage migrate from single-side JSON.
- Sleep duration “regular” not in guide yet — invent soft bands carefully (not medical).
- Do not remove error messages with success banners.

## Settled decisions (do not relitigate)

- Keep chip done-flash; drop Saved success banners.
- Breast L/R may still preempt each other; Pump family independent of breast and nap.
- Gate A2 UI: left accent + chip border; soft below/near/above (not alarm red).
- Scope: Activities + Home (not Insights charts).
- **Decision 2 → Option 1:** recent pump as fourth line in Home status block (not a new control row; not header-only).

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Server quick-care order | Does Pump end nap? | Yes — open sleep always ended before action | Keep — drives Design Option |

## Blocking questions

None — clear enough to design. (Sleep duration band numbers chosen in Design from soft caregiver defaults.)

## Clear to design?

yes
