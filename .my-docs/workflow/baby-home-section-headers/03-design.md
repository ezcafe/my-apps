# Design: Baby home section headers + bottle chips + cleaner status

**Scope:** Add 3AM-readable section headers (breast/diaper tip, nap sleep blend, bottle ml + `n/N`), replace bottle face/± with Kind-like ml chips (last 3 history + snaps fill + Custom), clean feed status to `Feed (…) · {when}`, and tighten birth-date prompt (always until set; “Not now” = this visit only).

**Do not reopen:** nap lock, feed-session merge / `legs[]`, Kind sheet, Custom confirm-then-set, prior Gate 3 pauses.

**No new ADR:** reuse existing `baby_care_event` reads + age-guide pure helpers; optional GraphQL field only. Not a new auth model or table.

---

## Settled product picks (Gate 1 — do not relitigate)

| # | Pick | Meaning |
|---|------|---------|
| **1B** | Breast / diaper | Label + short tip |
| **2B** | Nap | One-line sleep blend (total + naps + typical length) |
| **3A** | Bottle chips | Last 3 from history; fill &lt;3 from age-band snaps |
| **4A** | Bottle UI | Chips replace face + ± |
| **5A** | Progress / birth | `0/N` + recommended ml when guide exists; no fake guide without birth date |
| **Status** | yes | Always `Feed (…) · {when}` — no progress, no leading duplicate ml |
| **Birth prompt** | **A** | Always until set (remove/replace 7-day snooze); “Not now” dismisses this visit only; ask on first load if unset |
| **Addendum** | — | Headers easy at 3AM |

---

## Design picks (this stage)

| Topic | Pick | Why |
|-------|------|-----|
| **Recent ml source** | Extend `babyHomeQuickStatus` with `recentBottleMl: [Int!]!` | History must be workspace-truthful across devices; local-only cannot satisfy 3A after refresh. |
| **Recent ml order** | Newest by `occurredAt` desc, then `id` desc | “Recently used” = last logged amounts, not last-edited bump. |
| **Chip fill (birth set)** | History first (distinct ml, newest session first), then age-band snaps skipping duplicates | Matches Gate 1 3A exactly. |
| **Chip fill (birth unset)** | History first, then fixed safe snaps `[60, 90, 120]` (not age-band / not “recommended”); Custom always | Keeps chips usable without a fake guide; never show recommended ml / `n/N`. |
| **Formula ml extract** | If `legs` is a **non-empty** array → formula leg `amountMl` only (null if no formula leg; **no** top-level fall-through). Else legacy top-level when formula ml present | One chip value per session; breast-only legs → null. |
| **Sleep bands** | Extend `lib/baby-age-guide.ts` with inclusive `maxDay` table (+ tests); age past 1–3y **keeps last toddler band** | Same pure-helper home as feed bands; no null blend after toddler. |
| **Breast/diaper tips** | Reuse `lib/baby-next-due.ts` + existing `home.nextIn` / `home.overdue` | No second due system. |
| **Layout** | Breast alone; **bottle → nap → diaper** share one `auto-fit` row on wide screens; bottle chips are **2×2** like Kind | One row for night scan on big screens; chips match diaper grid language. |
| **Birth prompt** | Visit-only dismiss via **`sessionStorage`** (survives refresh; clears when the tab/browser session ends); **ignore** old 7-day `localStorage` key on the show path | Gate 1 Birth prompt A; one store, one refresh vs new-session story. |
| **Fallback guide** | Keep `BABY_FEED_GUIDE_FALLBACK` only if leftover stepper math needs it; **never** show sleep blend, recommended ml, or `n/N` until `birthDate` is set | Gate 1 5A. |
| **Bottle suggested ml** | `babySuggestedBottleMl({ ageDays, weightKg: latestWeightKg })` from status | Home already has `latestWeightKg`; weight path under 6 mo stays honest. |
| **Header `n/N`** | `n` = `feedsToday` (all feed sessions today, breast + bottle) | Same progress count moved up from status — not bottle-only. |

---

## Option A — Client-only headers + local chip memory

**What it is:**  
Compose all headers on the client from today’s `babyHomeQuickStatus` + new pure helpers (sleep blend, tip strings). Bottle chips remember the last 3 tapped/saved ml amounts in `localStorage` (or session store), and fill gaps from `babyFormulaSnapList`. No new GraphQL field. Birth prompt becomes visit-only dismiss. Status line cleanup is client-only.

**Example:**

```ts
// Client after formula save
pushRecentBottleMl(workspaceKey, 90); // localStorage → [90, 120, 150]
const chips = buildBottleChips({
  recentMl: readRecentBottleMl(workspaceKey), // may be empty on new device
  snaps: babyFormulaSnapList(band),
  limit: 3,
});
// Header: "Bottle · ~120 ml · 0/8" from birthDate + feedsToday + suggested ml
```

**Pros:**

- Smallest API surface — no GraphQL / server change for chips.
- Fast to ship headers + status cleanup.
- Works offline for chip preferences after first local saves.

**Cons:**

- **Breaks 3AM multi-device:** second caregiver / new phone sees snaps only until they log bottles locally — not “history from this baby.”
- Chip set diverges from real DB history after clear site data.
- Harder e2e: must seed client storage, not just GraphQL fixtures.
- Analysis already flagged “today’s API cannot satisfy last 3 from history alone.”

---

## Option B — Server recent-ml + section stacks — **Recommended**

**What it is:**  
Extend `babyHomeQuickStatus` with `recentBottleMl` (0–3 distinct formula ml values from this baby’s recent feed events, newest by `occurredAt` first). Client builds chips = history + snap fill (age-band when birth set; fixed `[60, 90, 120]` when unset — not labeled recommended). Home restacks **breast → bottle → nap → diaper** with 3AM-short headers. Feed status drops progress and leading ml. Birth prompt always until set; “Not now” = **`sessionStorage`** visit dismiss (ignore old 7-day `localStorage`).

**Example:**

```graphql
query {
  babyHomeQuickStatus(dayFrom: "2026-09-13T00:00:00.000Z", dayTo: "2026-09-14T00:00:00.000Z") {
    feedsToday
    birthDate
    recentBottleMl   # e.g. [90, 120, 150]
    lastFeed { summary at payload }
  }
}
# UI chips: 90 | 120 | 150 | Custom  (Kind flush language)
# Bottle header: "Bottle · ~120 ml · 7/8"
# Status: "Feed (Formula 90 ml) · Just now"  — no "7/8 today", no leading "90 ml ·"
```

**Pros:**

- Honors Gate 1 **3A** with real baby history across devices.
- One fetch already used by home — additive field, easy tests.
- Clear section scan at 3AM; skeleton parity is straightforward.
- Server dedupe rules for merged `legs[]` stay testable in one place.

**Cons:**

- Small GraphQL + `home-quick-status` change (read path only).
- Slightly more layout churn vs bolting titles onto today’s three-column row2.
- Must define extract/dedupe carefully for merged sessions (one ml per event).

---

## Tradeoffs

| Factor | Option A | Option B |
|--------|----------|----------|
| Cost / time | Faster API-wise; weaker chip truth | One additive field + section restack |
| Complexity | Local store + sync drift | Server extract + pure chip fill helper |
| Usability | Fine on one phone; weak for family | Matches how caregivers already share workspace |
| Failure cases | Empty chips after wipe / new device | Query fail → empty history → snaps only (still usable) |
| Testability | localStorage fixtures | GraphQL / DB fixtures + pure unit tests |

## Recommendation

**Pick Option B.** Gate 1 explicitly wants last 3 from **this baby’s** history; analysis already says the current status payload cannot do that. Additive `recentBottleMl` keeps cost low while headers, status cleanup, and birth-prompt A stay mostly client/lib work.

## Chosen design

**Option B** — server `recentBottleMl` + section stacks + visit-only birth prompt (Gate 2 approved 2026-09-13).

**Preferred:** Option B — server `recentBottleMl` + section stacks + visit-only birth prompt.

---

## Patterns to reuse (required)

| Pattern | Where | Use here |
|---------|-------|----------|
| Flush Kind chip grid | `components/baby-diaper-kind-control.tsx` | Bottle ml chips: gap-0, border, primary selected, `fx-ripple` |
| Custom ml modal confirm-then-set | `components/baby-custom-ml-modal.tsx` | Custom chip opens it; no auto-save change |
| Pure age-guide helpers | `lib/baby-age-guide.ts` | Sleep bands (`maxDay`) + blend builder + chip fill-from-snaps |
| `babyFormulaSnapList` / `babySuggestedBottleMl` | same | Fill &lt;3 chips when birth set; bottle header recommended ml (+ `latestWeightKg`) |
| Fixed safe snaps (no birth) | document constant e.g. `[60, 90, 120]` | Chip fill only — not labeled recommended |
| Next-due tips | `lib/baby-next-due.ts` + `home.nextIn` / `home.overdue` | Breast / diaper short tips (1B) |
| Birth-date prompt channel | `lib/baby-birth-date-prompt.ts` + home footer | Reuse UI; dismiss flag in **`sessionStorage`**; ignore old `localStorage` snooze key on show |
| Guide caveat | `home.guideCaveat` | Keep “guidelines only” — not medical claims |
| Half-open day + `feedsToday` | `home-quick-status.ts`, `lib/baby-home-day-window.ts` | Bottle header `n/N` only (`n` = all feeds today); do not change count rules |
| Skeleton parity | `components/baby-page-skeleton.tsx` | Headers + chip row in same change |
| Intrinsic grids | `repeat(auto-fit, minmax(...))` | No hardcoded content breakpoints |
| Done flash ~2s | `lib/baby-home-done-flash.ts` | Keep after bottle chip save |

---

## Sequence diagram (required)

Main path: open home → load status (incl. recent ml) → render headers/chips → tap ml chip → quick care → refresh status. Key errors: status fail, birth unset, quick-care fail.

```mermaid
sequenceDiagram
  participant UI as BabyHome
  participant Q as babyHomeQuickStatus
  participant Svc as home-quick-status
  participant DB as baby_care_event / profile
  participant QC as babyQuickCare
  participant Lib as age-guide + next-due + birth-prompt

  UI->>Q: query dayFrom/dayTo
  Q->>Svc: workspace-scoped load
  Svc->>DB: profile + last* + feedsToday + recent formula feeds
  alt unauthorized / workspace miss
    Svc-->>Q: error
    Q-->>UI: statusError (no fake guide)
  else ok
    DB-->>Svc: rows + birthDate
    Svc-->>Q: feedsToday, birthDate, recentBottleMl[], last*
    Q-->>UI: BabyHomeQuickStatus
  end

  UI->>Lib: ageDays, sleepBlend, tips, chips=history+snaps
  alt birthDate null
    UI->>Lib: shouldShow prompt (sessionStorage visit dismiss; ignore old localStorage snooze)
    UI-->>UI: show birth prompt; Bottle label-only; chips = history + fixed [60,90,120]; no sleep blend / n/N / recommended ml
  else birthDate set
    UI-->>UI: sections breast→bottle→nap→diaper; headers + Kind-like bottle chips
  end

  UI->>QC: FORMULA amountMl from chip (or Custom modal confirm)
  alt quick-care fail
    QC-->>UI: error message; chips unchanged
  else ok
    QC->>DB: insert/update feed (existing merge rules)
    DB-->>QC: event
    QC-->>UI: success + done flash
    UI->>Q: refetch status
    Q-->>UI: updated feedsToday + recentBottleMl + lastFeed
    UI-->>UI: status "Feed (…) · {when}" only; bottle header n/N
  end
```

---

## API contracts (required)

### GraphQL — extend `BabyHomeQuickStatus` (Option B)

```graphql
type BabyHomeQuickStatus {
  lastFeed: BabyTimelineItem
  lastSleep: BabyTimelineItem
  lastDiaper: BabyTimelineItem
  openSleep: BabyCareEvent
  feedsToday: Int!
  birthDate: String
  latestWeightKg: Float
  """Distinct formula ml from recent feed events, newest by occurredAt first, max 3. Empty if none."""
  recentBottleMl: [Int!]!
}
```

- **Ownership:** same workspace gate as today’s `babyHomeQuickStatus` (no IDOR).
- **Errors:** unchanged auth / validation for `dayFrom` / `dayTo`.
- **Mutations:** none new. Bottle chip still uses existing `babyQuickCare` `FORMULA` (+ session id rules from controls-polish).

### Client helpers (pure)

```ts
// lib/baby-age-guide.ts (extend) — sleep bands (inclusive maxDay, feed-band style)
// ageDays 0 on birth calendar day. Gaps between Gate month labels roll into the next band.
type BabySleepGuideBand = {
  labelKey: string;
  // blend facts via message keys (EN + VI tables below)
};
function babySleepGuideForAge(ageDays: number | null): BabySleepGuideBand | null;
// null when ageDays null → no fake nap header blend
// ageDays > 1095 (past 1–3y) → keep last toddler band (do not return null)

/** Fixed safe snaps when birthday unset — usability only, never “recommended”. */
const BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS = [60, 90, 120] as const;

function buildBabyBottleChipMls(input: {
  recentBottleMl: number[];
  snaps: number[]; // age-band snaps OR BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS
  limit?: number; // default 3
}): number[]; // history first, then snaps, distinct, length ≤ limit

// extractFormulaMlFromPayload(payload):
// 1. If payload.legs is a non-empty array → sum/use formula-leg amountMl only;
//    if no formula leg → return null (NO fall-through to top-level amountMl).
// 2. Else (missing/empty legs) → legacy top-level amountMl when method/formula ml present.
// Breast-only legs → null.

// lib/baby-birth-date-prompt.ts
// Store: sessionStorage key e.g. "baby.birthDatePrompt.dismissedThisVisit" = "1"
// Show when birthDate == null && sessionStorage flag unset.
// Refresh in same tab: flag remains → stay dismissed.
// New browser session / new tab session after close: flag gone → prompt again.
// Show path: do NOT read old localStorage key "baby.birthDatePrompt.dismissedUntil"
// (7-day snooze). Stop writing that key; ignore any leftover value.
```

### Sleep band day cutoffs (required)

Inclusive `maxDay` chain (same style as feed bands in `lib/baby-age-guide.ts`):

| Gate 1 label | Inclusive `maxDay` | `ageDays` covered | Notes |
|--------------|--------------------|-------------------|--------|
| 0–1 mo | **30** | 0..30 | Newborn |
| 1–2 mo | **60** | 31..60 | |
| 3–4 mo | **122** | 61..122 | Includes late ~2 mo so the chain stays contiguous |
| 5–6 mo | **183** | 123..183 | Includes late ~4 mo |
| 7–12 mo | **365** | 184..365 | Includes late ~6 mo |
| 1–3 y | **1095** | 366..1095 | Toddler |
| Past 1–3 y | — | `ageDays` &gt; 1095 | **Keep last toddler band** (still show blend; do not go label-only / null) |

`babySleepGuideForAge(null)` → `null` (no fake blend).

### Status line contract (client)

| Case | Render |
|------|--------|
| Feed with item | `{summary} · {when}` only |
| Feed empty | empty copy only — **no** `n/N today` on status |
| Sleep / diaper | unchanged `summary · when` (or open sleep) |

Progress lives **only** on the bottle section header when guide max is finite and birth date is set.

### Header copy contract (EN examples — 3AM-short)

| Section | EN example | Notes |
|---------|------------|--------|
| **Breast** | `Breast` + tip `Next in 1 hr` / `Overdue 20 min` / `Tap Left or Right` | Tip from next-due; VI via existing keys |
| **Diaper** | `Diaper` + tip `Next in 2 hr` / `Overdue 10 min` / `Tap a kind` | Same tip pattern |
| **Nap** | `Nap · recommend · ~16–18h sleep / day · 4–6 naps / day · often 30m–3h / nap` | One line; “recommend” marks age guide; total / nap count / length per nap when known |
| **Bottle** (guide) | `Bottle · recommend ~120 ml / times · today 7/8` | Recommended ≈ `babySuggestedBottleMl({ ageDays, weightKg: latestWeightKg })`; empty day `today 0/8`. **`n` = total feeds today** (breast + bottle), not bottle-only. |
| **Bottle** (no birth) | `Bottle` | No ml, no `n/N`; prompt asks for birthday |

**Nap blend EN + VI (same facts; message keys e.g. `home.header.nap.blend0to1Mo`):**

| Age band | One-line blend (EN) | One-line blend (VI) |
|----------|---------------------|---------------------|
| 0–1 mo | `~16–18h sleep / day · 4–6 naps / day · often 30m–3h / nap` | `~16–18g ngủ / ngày · 4–6 giấc / ngày · thường 30p–3g / giấc` |
| 1–2 mo | `~15–16h sleep / day · 3–5 naps / day · often 45m–2h / nap` | `~15–16g ngủ / ngày · 3–5 giấc / ngày · thường 45p–2g / giấc` |
| 3–4 mo | `~14–15h sleep / day · 3–4 naps / day · more set` | `~14–15g ngủ / ngày · 3–4 giấc / ngày · ổn định hơn` |
| 5–6 mo | `~14h sleep / day · 2–3 naps / day · night ~8–11h` | `~14g ngủ / ngày · 2–3 giấc / ngày · đêm ~8–11g` |
| 7–12 mo | `~13–14h sleep / day · 2 naps / day · night ~10–12h` | `~13–14g ngủ / ngày · 2 giấc / ngày · đêm ~10–12g` |
| 1–3 y | `~12–13h sleep / day · 1 nap / day · often 1.5–2.5h / nap` | `~12–13g ngủ / ngày · 1 giấc / ngày · thường 1,5–2,5g / giấc` |

Full nap header: `Nap · recommend · {blend}` / `Ngủ · gợi ý · {blend}`.

Keep shared `home.guideCaveat` — guidelines only; no medical claims. Both locales required at build.

---

## Database contracts (required)

**N/A — no schema / migration change.**

**Why:** recent bottle ml is a **read** of existing `baby_care_event` (`type = 'feed'`, jsonb `payload.amountMl` / `payload.legs`). Birth date already on baby profile. Headers and tips are derived client/lib copy.

---

## Example queries (required)

### Read recent formula ml (server helper — conceptual)

```ts
// Newest by logged time (occurredAt), not edit bump (updatedAt); one value per event; stop at 3 distinct
const rows = await db
  .select()
  .from(babyCareEvent)
  .where(
    and(
      eq(babyCareEvent.workspaceId, workspaceId),
      eq(babyCareEvent.babyId, babyId),
      eq(babyCareEvent.type, "feed"),
    ),
  )
  .orderBy(desc(babyCareEvent.occurredAt), desc(babyCareEvent.id))
  .limit(40); // scan cap — enough to find 3 distinct ml

const recentBottleMl: number[] = [];
for (const row of rows) {
  // extract: non-empty legs → formula leg only (null if none); else legacy top-level
  const ml = extractFormulaMlFromPayload(row.payload);
  if (ml == null || ml <= 0) continue;
  if (recentBottleMl.includes(ml)) continue; // distinct values, keep newest-logged order
  recentBottleMl.push(ml);
  if (recentBottleMl.length >= 3) break;
}
```

### Existing day count (unchanged)

```ts
// still half-open [dayFrom, dayTo)
countFeedsInWindow(workspaceId, babyId, dayFrom, dayTo);
```

### Chip fill (pure)

```ts
// Birth set — age-band snaps
buildBabyBottleChipMls({
  recentBottleMl: [90],
  snaps: [60, 70, 80, 90, 100, 110, 120],
  limit: 3,
});
// → [90, 60, 70]  (history first, then snaps skipping 90)

// Birth unset — fixed safe snaps only (not recommended guide)
buildBabyBottleChipMls({
  recentBottleMl: [],
  snaps: [...BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS], // [60, 90, 120]
  limit: 3,
});
// → [60, 90, 120]
```

---

## UI / UX / mobile (required)

- **Layout (locked order):** Four stacked sections top → bottom: **breast → bottle → nap → diaper**. Each has header (label + tip/blend/progress) above its controls. Intrinsic `auto-fit` / `minmax` — no hardcoded content breakpoints. Skeleton + e2e must assert this same order.
- **Bottle chips:** Kind cousin — flush segmented row (or wrap) of up to 3 ml + Custom; ≥44×44 hit; `fx-ripple`; `rounded-[var(--radius-md)]` outer, nested edges like Kind.
- **Chip selected / done-flash:** Primary fill on the chip whose ml matches the **last saved formula ml** (from status / last successful save). During ~2s done flash after save, that same chip keeps primary fill (Kind-like). No other chip looks selected. Pending in-flight tap may briefly show pressed state only — selection follows last saved ml, not a separate “pending selection” chip.
- **No-birth chips:** Same chip UI from history + `[60, 90, 120]` fill; **do not** show recommended ml or `n/N` in the header; do not label chips as “recommended.”
- **Bottle header ml:** Pass `latestWeightKg` from `babyHomeQuickStatus` into `babySuggestedBottleMl` when birth is set.
- **Remove:** bottle face big number + ± steppers from home (4A). Custom modal stays.
- **Typography:** Header label ≈ body/medium; tip/blend muted, short, readable at night (contrast via tokens — light + dark).
- **Status row:** Feed / sleep / diaper remain under controls; feed copy only `summary · when`.
- **Birth prompt:** On first paint when `birthDate` null and `sessionStorage` dismiss flag unset; “Not now” sets the flag (survives refresh in this tab; clears when the browser session ends). Setting birthday clears prompt and unlocks guides. Old 7-day `localStorage` snooze is ignored.
- **Skeleton:** `BabyHomeSkeleton` mirrors section headers + chip row in the **same** change and the **same section order** (zero CLS).
- **a11y:** `role="group"` + aria-labels per section; chips are real `<button>`s; no hover-only actions.
- **i18n:** EN + VI keys for headers, blends (table above), tips; no hard-coded medical certainty.
- **Tokens:** `docs/DESIGN_GUIDE.md` / clean-minimal — semantic colors, concentric radii, list exact transition properties.

---

## Security design review (required)

**Threat boundaries:** GraphQL home query (workspace cookie/session), client local/session storage for visit dismiss, care-event payload jsonb, i18n strings rendered as text.

**Abuse cases:** IDOR on another workspace’s recent ml; oversized scan DoS; XSS via notes in summary (existing path); trusting client to invent `n/N` without birth date.

| ID | Name | Verdict | Note |
|----|------|---------|------|
| **A01** | Broken Access Control | **Pass** | `recentBottleMl` uses same workspace + baby scope as today’s status; no cross-tenant id input. |
| **A02** | Cryptographic Failures | **N/A** | No new secrets or sensitive crypto; ml amounts are care data already returned on timeline. |
| **A03** | Injection | **Pass** | Drizzle parameterized queries only; React text escaping for headers/status; no `dangerouslySetInnerHTML`. |
| **A04** | Insecure Design | **Pass** | No fake age guide without birth date; `sessionStorage` visit dismiss is UX only (not auth); server owns history list; fixed no-birth snaps are not presented as recommended. |
| **A05** | Security Misconfiguration | **N/A** | No CORS / header / debug changes. |
| **A06** | Vulnerable Components | **Pass** | No new npm deps planned. |
| **A07** | Auth Failures | **Pass** | Reuse existing GraphQL auth; no new login surface. |
| **A08** | Software / Data Integrity | **Pass** | Read-only additive field; mutations unchanged + existing care lock / idempotency. |
| **A09** | Logging / Monitoring Failures | **Pass** | Do not log full care payloads in new paths; keep existing error messages user-safe. |
| **A10** | SSRF | **N/A** | No server fetch of user URLs. |

Primary reference: https://owasp.org/Top10/

---

## Aggressive challenges answered

| Challenge | Answer |
|-----------|--------|
| **Do we need this?** | Yes — Gate 1: headers, chip parity with Kind, cleaner status, honest guides. Night caregivers currently infer groups and read noisy status. |
| **What fails first?** | Missing `recentBottleMl` → chips fall back to snaps only (usable). Status query fail → existing error line. Birth unset → prompt + no fake `n/N`/blend. |
| **Is this overspecified?** | No new tables; one additive list field; pure helpers for sleep/chips; reuse Kind + Custom + next-due. Option A under-delivers multi-device history. |
| **Medical risk?** | Copy stays “guidelines only” via caveat; bands are caregiver guide, not diagnosis. |
| **Layout risk?** | Skeleton + e2e rewrite expected; locked order breast → bottle → nap → diaper for 3AM scan. |
| **Merge / nap reopen?** | Out of scope — chip save uses existing quick-care; no merge-rule edits. |

---

## Clarity for Gate 2 (later)

Design review runs next. Prefer **Option B** unless you want client-only chips (Option A) despite multi-device gaps.

**Ask:** Is this design clear? Which option do you prefer (A or B)? Any concerns before build?
