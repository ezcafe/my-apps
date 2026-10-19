# TDD test-case review: 20261019-kiosk-widget-edit-menu

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-19  
**Prereq:** design-review R2 clean (`03a-api` · `03a-db` · general clean)

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real / edge | Catalog membership lengths + ids; same-topic pass; cross-topic / empty / >3 fail | yes — planned |
| 1 | real | feature→topic; Source-enabled / Resize-only sets match Design | yes — planned |
| 2 | real | Zod happy `loans.summary` + sources; heatmap `{ size }` only | yes — planned |
| 2 | edge | Zod rejects `sources` on Resize-only; cross-topic; loan under money; unknown signal; non-editable keys | yes — planned |
| 2 | edge | Source-enabled missing / empty sources / `{}` key → 400 | **no** — acceptance length rule only; `{}` Build lock unnamed |
| 2 | real / edge | omit `cells` preserve; present replace; clear-by-omit id; widgets-only copy `cells` | yes — planned |
| 2 | edge | `resolveKioskLayout` keeps valid `cells` + siblings; missing → M defaults | yes — planned |
| 2 | edge | resolve drops corrupt `cells` keys on read | **no** — acceptance only |
| 3 | real / edge | S–XL distinct footprint; unknown/missing → M | yes — planned |
| 4 | real | Compose helpers for three Source-enabled ids; untuned = today | yes — planned |
| 4 | edge | Resize-only + stray sources → no Source path | yes — planned |
| 5 | real | Edit ↔ Done strip; Source-enabled shows Source; Resize-only / weather no Source / no menu | yes — planned |
| 5 | real | Save payload shapes (sources vs size-only; siblings preserved) | yes — planned |
| 5 | real / edge | PATCH on each Resize/Source apply; Done exits with **no** extra PATCH | **no** — acceptance + Design lock; not in TDD bullets |
| 6 | edge | Fullscreen ignores size display; off widget keeps override; Settings omit `cells`; widgets-only preserve | yes — planned |
| 6 | edge | Baby-inject write-back copies existing `cells` | **no** — acceptance only; current inject tests have no `cells` |
| 7 | real | E2E Resize + Source persist across reload; Done quiet | yes — planned |
| 7 | edge | E2E Resize-only no Source; weather no menu; cross-topic | **partial** — acceptance only; Task 5 units cover |

**Existing harness skim:** `kiosk-layout.test.ts` (mode/columns/focus + `babyDefaultsInjected`; no `cells`). `user-preferences.test.ts` / `user-preferences-service.test.ts` (layout + widgets-only; no `cells` omit/preserve). `baby-defaults-inject.test.ts` (merge/flag; layout has no `cells`). `widget-registry.test.ts` (defaults/order). `kiosk-dashboard.test.ts` / skeleton tests (no edit strip/menu). `e2e/kiosk-layout.spec.ts` (Settings → `/kiosk`; no Edit menu). No `signal-catalog` / `cell-size` / compose-filter modules yet.

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 2 | Empty override object `{}` for a cell key → 400 (Contracts write #4) | Unit Zod: `cells: { "loans.summary": {} }` → fail. Name: `rejects empty cell override object`. |
| Major | 2 | Source-enabled without sources / `sources: []` / length >3 → 400 | Unit Zod: missing `sources`; `[]`; four same-topic ids → fail. Name: `rejects Source-enabled sources length outside 1..3`. |
| Major | 2 | Corrupt / non-editable key in stored `cells` dropped on resolve | Unit: stored `cells` with `weather…` or bad shape → resolved layout omits bad keys; valid siblings kept. Name: `resolveKioskLayout drops corrupt cells keys`. |
| Major | 5 | Save timing lock: apply PATCHes; Done does not | Unit/component: Resize (or Source) apply → prefs PATCH spy called once with payload; Done → spy **not** called again. Name: `apply patches layout; Done does not patch`. |
| Major | 6 | Baby-inject rewrite must copy `cells` (persist integrity) | Unit: inject plan/write-back with prior `cells` on `loans.summary` → next layout still has that override + flag/widgets merge. Name: `baby inject write-back preserves cells`. |
| Enhancement | 5 | Two stored overrides → edit one → PATCH `cells` still includes both (replace-whole) | Optional unit (also deferred in `03a`). |
| Enhancement | 4 | Named chart-without-`money.spend` / tuned loans APR-hide asserts | Strengthen compose fixtures (acceptance already states). |
| Enhancement | 7 | E2E Resize-only / weather / cross-topic | Optional; Task 5 units enough for Gate B. |

## Real scenarios checked

- **Happy path:** Catalog sets; Zod Source-enabled + Resize-only; resolve pass-through; compose three ids; Edit/Done + menus; e2e persist reload — mostly named.
- **User-visible failures:** Zod rejects (cross-topic, Resize-only+sources, non-editable keys) planned. PATCH error toast / 401 unchanged — OK not to re-test. **Save timing (apply vs Done)** not named.
- **Empty / loading / permission:** Empty Source blocked via Zod (needs named length/`{}` reds). Skeleton parity in acceptance, no automated red — Enhancement. Permission N/A beyond existing prefs auth.

## Edge scenarios checked

- **Boundaries / invalid input:** Cross-topic, unknown signal/size, non-editable keys, Resize-only+sources — planned. **`{}` key**, Source-enabled length 0/>3, corrupt resolve drop — gaps.
- **Concurrency / double-submit / idempotency:** Done-no-second-PATCH is the v1 idempotency edge — missing. Multi-tab race OK to skip.
- **Offline / partial data / race:** Off-widget keeps override + fullscreen ignore display planned. **Baby-inject wipe of `cells`** not named. Widgets-only preserve planned.

## Fix ask for Build

Fold into `04-tasks.md` TDD bullets (prefer few strong reds):

1. **Task 2 (Major):** `it("rejects empty cell override object")` — `cells[id]: {}` → Zod fail (clear = omit key, not empty object).
2. **Task 2 (Major):** `it("rejects Source-enabled sources length outside 1..3")` — missing / `[]` / four ids → fail; length 1..3 same-topic still pass (happy already planned).
3. **Task 2 (Major):** `it("resolveKioskLayout drops corrupt cells keys")` — bad/non-editable key in stored `cells` omitted after resolve; valid overrides + mode/columns/focus/`babyDefaultsInjected` kept.
4. **Task 5 (Major):** `it("apply patches layout; Done does not patch")` — Resize or Source apply → PATCH spy once; Done → no further PATCH.
5. **Task 6 (Major):** `it("baby inject write-back preserves cells")` — prior `cells` present → inject next layout copies them (not wiped).

**Keep as-is (already strong enough):** Task 1 catalog/topic/sets; Task 2 happy paths + Resize-only sources reject + cross-topic + non-editable keys + omit/preserve/replace/clear + widgets-only copy; Task 3 size tokens; Task 4 three compose maps + untuned + Resize-only ignore; Task 5 strip/menu visibility + payload shapes; Task 6 fullscreen/off/Settings omit; Task 7 e2e persist + quiet Done.

**Explicit non-goals (OK):** Pixel/e-ink S readability (manual); 401/429 prefs re-test; multi-tab PATCH race; full skeleton CLS automation; optional multi-override merge unit / extra e2e negatives (Enhancement).

## Round notes

- Parent folded Fix ask Majors into `04-tasks.md` Task 2/5/6 TDD bullets → treat Result **clean** for Gate B.
- Mapped against Design Contracts (omit/preserve vs replace; `{}` reject; Source-enabled vs Resize-only Zod; baby-inject/`cells` copy), UI save-timing lock, and Task acceptance.
- Strongest planned reds: catalog membership, Zod topic/key locks, write omit/replace, compose three ids, Edit menu visibility, e2e reload persist.
- Highest remaining risk before Gate B: empty/`{}` and Source length not named; corrupt resolve drop unnamed; Done vs apply save timing untested; inject can wipe `cells` without a red.
- No production code in this stage. Parent: fold Fix ask into `04-tasks.md` → Gate B.
