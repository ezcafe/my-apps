# Analysis: Baby home logging detail polish

## What exists today

Option B quick-care home from `baby-home-redesign` is already in the tree: three rows (breast · bottle/sleep/diaper · last care), one `babyHomeQuickStatus` read, one `babyQuickCare` write with durable idempotency and a shared nap lock.

**Diaper** is thin end-to-end: payload and validators allow only `wet | dirty | mixed` (+ optional `notes`). Home today cycles those three with `BabyQuickValueCard` `+` / centre save / `−`. **Chosen design supersedes that:** diaper becomes a **2×2 Kind tile grid** + Step 2 sheet (no diaper ↑↓ / ±; **not** 1×4); bottle keeps `BabyQuickValueCard` with **B1** stacked right ± + hero ml. The full form at `/baby/diaper` is the same three kind buttons — no color, texture, or amount anywhere.

**Bottle** uses age bands from `lib/baby-age-guide.ts` (UI guide only; server accepts any positive `amountMl`). Next-due copy uses `home.nextIn` / `home.overdue` with compact durations (`5m`) from `formatBabyDurationCompact`. Row 3 last feed shows `item.summary` (method/duration) and does **not** surface `payload.amountMl`, even though the status query already returns `payload`.

**Weight** lives only on `baby_growth_entry` (`kind: weight`, `valueNum` + `unit`). Profile has no weight field. Home does not read growth today.

## Dependencies

What else must change or stay compatible?

- **Extend Option B contracts — do not replace them.** Keep `babyQuickCare` ordered chain, `baby_quick_care_request` replay, nap lock scope, and Telegram notify rules (`createDiaper` still notifies; `endNap` silent). Extend DIAPER action / payload; do not invent a second home write path.
- **Shared diaper kind surface:** `BabyDiaperPayload`, `babyDiaperKindSchema`, `createBabyDiaper` (full form), `babyQuickCare` DIAPER branch, GraphQL `CreateBabyDiaperInput` / `BabyQuickActionInput.diaperKind`, `BABY_DIAPER_CYCLE` / steppers, EN+VI `diaper.*` + summaries, e2e diaper cycle tests.
- **Richer poop fields** (color / texture / amount) need Design to pick: jsonb payload extension vs notes-only encoding. Today’s column is already `jsonb`; no new care-event table is required for storage shape, but validators + summaries + Telegram wording must stay coherent for old rows that lack the new keys.
- **Layout (today → Chosen):** Today `BabyQuickValueCard` is vertical `+` / save / `−` for bottle **and** diaper. **Chosen:** bottle **B1** QuickValueCard — tall log = nap height, **+/− stacked RIGHT** at 50%, hero ml, quiet next-due subtitle, Custom under card, Done/Logged ~2s; **diaper is not a QuickValueCard** — one **2×2 Kind** control (Wet | Poop / Mixed | Dry) + Step 2 sheet; **no** diaper steppers; **not** 1×4. Skeleton (`BabyHomeSkeleton`) must stay in lockstep (CLS rule).
- **Age ml bands:** `babyFeedGuideForAge` bands differ from the Gate 1 table (no day 1–2 5–15 ml band; 2–4 weeks is 60–120 today). Interval bands in `lib/baby-next-due.ts` stay separate — do not merge day cuts.
- **Weight guide (settled 2A):** need a latest-weight read (extend `babyHomeQuickStatus` **or** a focused growth query). Units may not be `kg`; Design must define convert / ignore rules.
- **i18n:** VI `home.nextIn` is `"còn {duration}"`; duration helper is locale-blind compact English-style (`5m`). Fix is copy and/or a locale-aware duration helper — not a GraphQL change.
- **Coordination:** builds on unmerged redesign work in the same tree. Ship as follow-on on the same branch/PR series unless Gate 2 says otherwise (idea Q10).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `.my-docs/workflow/baby-home-redesign/03-design.md` | Option B contracts to **extend** (quick care, status read, card layout, Telegram). |
| `components/baby-home.tsx` | Wires rows, formula/diaper state, next-due, row 3 status lines. |
| `components/baby-quick-value-card.tsx` | **Bottle-only B1** layout target (height / stacked right ± / hero ml / demoted Custom). Diaper leaves this card for 2×2 Kind + sheet. |
| `components/baby-custom-ml-modal.tsx` | Existing home `Modal` pattern for Step 2 sheet. |
| `lib/baby-diaper-quick-plan.ts` (new in Design) | Kind → instantSave vs openSheet; W1 save-plan shape (Build). |
| `components/baby-diaper-form.tsx` | Full form — kind-only today; may stay thin or share new enums. |
| `components/baby-page-skeleton.tsx` | `BabyHomeSkeleton` must mirror **B1** bottle ± **and** **2×2 Kind** (no diaper steppers; not 1×4). |
| `lib/baby-quick-value-steppers.ts` | Formula step/clamp; drop home `BABY_DIAPER_CYCLE` for Kind segments. |
| `lib/baby-age-guide.ts` | Per-feed ml / feeds-day bands to retune + optional kg×150 helper. |
| `lib/baby-next-due.ts` | Due math; `formatBabyNextDueLabel` + duration formatting. |
| `lib/baby-format-duration.ts` | Compact `5m` / `1h 5m` — VI next-due pain point. |
| `lib/validators/baby.ts` | `babyDiaperKindSchema`, `createBabyDiaperSchema`, `babyQuickCareSchema`. |
| `db/schema/baby.ts` | `BabyDiaperPayload`, growth entry shape (weight source). |
| `features/baby/server/quick-care.ts` | DIAPER insert payload today: `{ kind, quickRequestId? }` only. |
| `features/baby/server/care-events.ts` | `createBabyDiaper` payload builder. |
| `features/baby/server/home-quick-status.ts` | Single home read; candidate place for latest weight. |
| `features/baby/server/growth.ts` | `listBabyGrowthEntries` ordered by `recordedAt` desc — latest weight pattern. |
| `features/baby/server/timeline.ts` | `careSummary` / `friendlyDiaperKind` for row 3 + Telegram. |
| `lib/graphql/baby-typeDefs.ts` | `BabyQuickActionInput`, `CreateBabyDiaperInput`. |
| `lib/baby-query-options.ts` | Home status query already fetches `lastFeed.payload` (ml available client-side). |
| `messages/baby/en.ts`, `messages/baby/vi.ts` | `home.nextIn`, `diaper.*`, summaries. |
| `e2e/baby-home-option-b.spec.ts` | Asserts wet→dirty→mixed cycle and `+`/`−` diaper UX — will need rewrite. |
| `docs/DESIGN_GUIDE.md` | Tokens, radii, hit areas, no `fx-hit-40` overlap on ≥44 px controls. |

## Constraints and risks

- **Tribal — redesign pause:** this pass must not re-litigate Option B (server chain, Custom ml modal, birthday prompt, nap lock). Only polish logging detail on top.
- **e2e coupling:** option-b specs hard-code the diaper cycle and vertical `+`/`−` card. Kind-row + Step 2 will break those tests by design — plan rewrites early.
- **`dirty` storage vs “Poop Only” UI (settled 3A):** keep enum; change labels only. Summaries / Telegram currently print raw `kind` via `friendlyDiaperKind` — update display mapping so caregivers do not see “dirty” if product copy says “Poop Only”.
- **New kind `dry` (settled 1A):** touch every kind enum/cycle/i18n/e2e path. Old events stay fine; unknown kind display must not crash.
- **Poop detail optional amount (settled 5B):** default Medium on skip — Design must say whether default is written into payload or omitted until user picks.
- **Weight units:** growth `unit` is free text. kg×150 on a `g` or `lb` value without conversion is wrong. Prefer ignore-if-not-kg (or explicit convert) in Design.
- **Age band overhaul:** changing bands changes default bottle ml and stepper clamp for every age — high UX impact; keep interval (next-due) bands untouched.
- **Layout / a11y:** redesign chose stacked steppers so no two extended hit areas overlap. Side-by-side steppers must keep each control ≥44 px and still avoid `fx-hit-40` overlap.
- **Skeleton parity:** any row 2 structure change updates `BabyHomeSkeleton` in the same change.
- **Medical copy:** guidelines only; no clinical / Insights alerts. Color red-flags and watery/hard texture caution are **in-sheet warn + store** (settled in Design #6 / #6b).
- **Front-end local knowledge:** `dev-decision-routing` context-mode MCP was unavailable; skimmed qan CSS notes (intrinsic layout, concentric radii, tabular nums) — already aligned with repo `DESIGN_GUIDE.md`. Prefer auto-fit / container queries; no hardcoded breakpoints.

## Settled decisions (do not relitigate)

From Gate 1 (`01-idea.md` / `00-run.md`):

| # | Decision |
|---|----------|
| 1A | **Dry** is a 4th Kind; tap **instant-saves** like Wet Only; new kind `dry` in schema/API. |
| 2A | Weight guide uses **latest growth weight** when present; no profile weight field. |
| 3A | Keep storage `wet \| dirty \| mixed` (+ `dry`); UI label **Poop Only** for `dirty`. |
| 4A | Suggested / remaining ml on **bottle/formula only** — not breast. |
| 5B | Poop/Mixed **amount optional**; default **Medium** if skipped. |

Also settled by idea framing: VI next-due minutes → clear “lần tiếp theo trong xx phút” (or agreed equivalent); EN stays clear; no undo; no pump/solids on home; no medical diagnosis tool.

## Blocking questions

**None** after Gate 1.

### Non-blocking (Design may choose; do not block Analyze)

6. Red-flag colors (White/Pale, Red/Bloody): warn in-sheet only vs also tag saved event for later Insights?
7. Step 2 notes field in this pass?
8. Exact EN next-due minutes phrasing (“next in 5 min” vs “next in 5m”).
9. Age-guide overhaul: full replace of redesign bands vs add 1–2 day band + retune edges only?
10. Ship on same branch/PR series as unmerged redesign, or strict follow-on after that merge?
11. **(Analyze add)** Latest weight: fold into `babyHomeQuickStatus` vs separate `babyGrowthEntries(kind: weight, limit: 1)` client read?
12. **(Analyze add)** Poop color/texture/amount: first-class jsonb fields on diaper payload vs encode into `notes`?
13. **(Analyze add)** When amount is skipped, write `amount: "medium"` explicitly or omit and treat missing as Medium only in UI?

## Grounding notes for Design

- Prefer **pure `lib/` helpers + `node:test`** for kind mapping, age/weight ml suggestion, duration copy, and default amount — same pattern as redesign steppers / next-due.
- Prefer extending **`babyQuickCare` DIAPER action** (and matching `createBabyDiaper` for parity) over a new mutation.
- Prefer **client display of last ml** from existing `lastFeed.payload.amountMl` before adding server fields.
- Keep full forms working; home may grow richer than `/baby/diaper` in this pass (idea allows home-first detail).

---

**Clarity check:** Are the instructions and reference files clear enough to design?
