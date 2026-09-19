# Idea: Activities colors + Home care feedback polish

## Problem

Two related pains for Baby caregivers:

1. **Activities scan** — On **Baby → Activities**, every row looks the same. Caregivers cannot **spot activity type at a glance** (feed vs sleep vs diaper vs pump vs growth), and they get **no visual cue** whether a logged **duration** or **ml amount** is low, typical, or high versus a simple “regular” range for the baby’s age. A reference History UI shows **per-activity accent colors** (vertical bar / tinted icon chip with thin colored border).

2. **Home care friction** — After saves, noisy **“Saved …”** messages (e.g. “Saved breast feed”) interrupt flow for **all** care actions. Starting/ending a timer **re-renders the whole Home chip grid**, which feels jumpy and can change **Nap button height**. Clicking **Pump** incorrectly **stops unrelated feed or nap timers**.

## User / audience

- **Primary:** Parents / caregivers who log care on Home and scan/correct past entries on Activities.
- **Secondary:** Partners who already learned type colors from similar baby apps (History-style).
- **Not this pass:** Clinics, medical advice product, custom caregiver-defined norms UI, full History page rebuild.

## Outcome

What “done” looks like:

### Activities (`/baby/activities`)

1. Rows use a **distinct accent color per activity family** (feed, sleep, diaper, pump, growth / other) — History-style vertical accent and/or tinted icon chip with thin colored border (see `ui-ref-source-history-borders.png`).
2. For **duration** or **ml** rows, the **colored border** encodes comparison to a simple **age-band “regular”**: below / near / above (readable without reading numbers first).
3. Rows **without** time or ml still get **type color**, but **no comparison border state**.
4. Filters, select, edit, delete stay as today. **No medical claim** in copy.

### Home (`/baby` care chips)

5. **No “Saved …” success message** after care saves — remove for **all** actions (breast, bottle, pump amount, diaper, sleep, and any sibling “Saved …” care copy). Keep non-care settings saves (e.g. birthday) unless they share the same care toast path.
6. **Timer start/end** updates **only related buttons** (the timed family in play). Unrelated chips do **not** remount or visually flash.
7. **Nap** control keeps **the same height** before and after start/stop (layout stable).
8. **Pump** start/tap does **not** stop **feed (breast) or nap** timers — unrelated actions stay independent.
9. **Status block** (info rows under the three control rows) includes a **recent pump** line alongside feed / sleep / diaper (Decision 2 → Option 1).

## Metric

**Primary:** Caregiver can tell activity type by color in ~1s on Activities and tell below/near/above from the border cue; on Home, save feels quiet (no Saved toast), timer ticks without jumpy full-grid redraw, Nap height stable, Pump never kills feed/nap; recent pump is visible in the status block.

**Supporting:** Unit tests for color map + banding + timer isolation + lastPump status; focused UI/e2e for toast absence, Nap height, Pump-vs-feed/nap independence, pump status line.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — two surfaces but one shared color language; 2–3 refs enough (Activities list + below/near/above border; optional Home Nap idle/running height)
- **Copy/token-only?** no — visual system + age-band logic + Home render/timer behavior

## 80/20 UI (day-to-day)

### Main user goals

- Scan Activities and **recognize type** fast; spot **unusual** time/ml vs age-regular.
- Log care on Home **without toast noise**; run timers without layout jump; use Pump without killing feed/nap; see **recent pump** in the status block.

### Vital few (high-impact ~20%)

- Per-activity **accent color** on Activities rows (History-style bar/chip border).
- **Border cue** for duration- and ml-based rows vs age-regular (below / near / above).
- Remove **“Saved …”** care messages for all actions.
- **Selective re-render** on timer start/end; **stable Nap height**.
- **Pump does not stop** feed or nap timers.
- **Recent pump** line in Home status block (Decision 2 → Option 1).

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Activities type + summary with color accent (and comparison border when applicable).
- **Important info / action #2 (always visible):** Home care chips that stay calm and stable while timers run; status block shows last feed / sleep / diaper / **pump**.
- **Core action placement:** Color + border on Activities row chrome; Home feedback via chip state only (done-flash on chip OK if already used — **not** a global “Saved …” banner/toast). Clarify in design whether chip done-flash stays.
- **Secondary actions:** deferred:
  - Full “regular” range explanation / guidelines deep link.
  - Caregiver-editable personal norms.
  - Full History timeline rebuild with duration-proportional bars.
  - Applying cues to Insights charts.

### Top user journey to optimize

Home: start Nap → height unchanged → start Pump without stopping Nap → stop Nap quietly (no Saved toast) → see recent pump in status → open Activities → scan colored rows → notice border cue → Edit if needed.

### Sensible defaults

- Age band from baby **birth date**; unknown age → type color only (no comparison).
- “Near regular” when inside typical window; border uses activity theme color.
- Below / above use distinct border treatments (design picks one a11y-safe system).
- Timers: breast/feed family independent from pump family and from nap/sleep.

### Biggest usability risks to fix first

- Border read as **health alarm** → soft wording; avoid red scare.
- Color-only meaning fails a11y → second channel for below/near/above.
- Removing Saved toast leaves **no save confirmation** → keep chip-level done-flash if it already works; do not reintroduce banners.
- Selective re-render accidentally breaks shared pending/status wiring.
- Pump isolation vs shared timer store — must not break intentional “one breast side at a time” rules inside feed.

## Non-goals

- Full Huckleberry-style History page rebuild as required deliverable.
- Medical advice or WHO percentile engines as the comparison source.
- Caregiver-editable “my regular” settings UI.
- Applying cues to Insights KPIs/charts this pass.
- Changing Growth capture forms beyond shared color tokens if reused.
- Hard-coded one-off hex outside design-system tokens / CSS variables.

## Assumptions to attack

- **Assumption:** “Border” = History-style **thin colored stroke on type/icon chip** and/or short **vertical accent bar**, not a full timeline rebuild. *Attack:* if too weak on Spending-style table, add left accent only.
- **Assumption:** “Regular” = static **age-band tables** for feed ml and sleep/session duration. *Attack:* confirm source in Analyze/Design.
- **Assumption:** “Remove Saved message” = remove **toast / step banner copy** (`home.stepSave*`), not necessarily remove **chip done-flash**. *Attack:* confirm with Gate A — prefer quiet chip flash over silent no-feedback.
- **Assumption:** Selective re-render = React state split / memoized chip islands, not a new framework. *Attack:* measure what currently causes full Home redraw.
- **Assumption:** Pump vs feed/nap = separate timer namespaces or non-preemptive start. *Attack:* shared `baby-breast-timer-store` may currently hold one active side — design must allow concurrent nap + pump + breast rules explicitly.
- **Assumption:** Scope is Activities + Home only. *Attack:* do not expand to Insights unless trivial.

## Success criteria

- [ ] Distinct accent per major activity family on Activities (mobile + desktop).
- [ ] Duration- and ml-based rows show below / near / above border cue when age known; unknown age → type color only.
- [ ] No “Saved …” care toast/banner after Home care actions (all action types in scope).
- [ ] Timer start/end does not remount/redraw unrelated care buttons.
- [ ] Nap button height unchanged idle ↔ running.
- [ ] Starting/using Pump does not stop feed or nap timers.
- [ ] Home status block shows recent pump (or empty copy) with skeleton parity (4 lines).
- [ ] Edit / delete / filters unchanged; light + dark readable; skeleton parity for new row chrome.
- [ ] Tests cover color map, banding, toast absence, Nap height, Pump isolation, recent pump status line.

## Open questions

1. Exact **color map** per type — align with reference photo mood, map to clean-minimal tokens.
2. Exact **age bands + regular windows** (ml and minutes) and citation.
3. How border encodes below / near / above (hue / weight / dashed / badge) — pick one a11y-safe system.
4. Desktop **table**: same chip+border vs left accent column only.
5. Keep **chip done-flash** (“Done” on button) after removing Saved toasts? (Recommend: yes.)
6. May **breast L/R** still preempt each other while Pump and Nap stay independent? (Recommend: yes — only Pump must not stop feed/nap.)

## Project shape (quick scan)

Next.js multi-app shell; Baby Care has `/baby/activities` (Spending-style ledger) and Home quick-care chips with a shared care-timer store (breast + pump sides) plus nap/sleep and done-flash helpers. Design must follow `docs/DESIGN_GUIDE.md` tokens; skeleton parity required for Activities row chrome.
