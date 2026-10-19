# TDD test-case review: 20261018-kiosk-baby-care-insights

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-10-18  
**Prereq:** design-review R2 clean (`03a` light API folded · DB skipped · general clean)

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | `resolveKioskWidgets(null)` includes three baby ids | yes — planned |
| 1 | real / edge | Prefs Zod accepts baby ids; rejects unknown; max = registry length | yes — planned |
| 1 | real / edge | Layout Zod + `resolveKioskLayout` round-trip `babyDefaultsInjected: true` with mode/columns/focus | yes — planned |
| 2 | real | Non-empty list omitting baby → merge widgets + flag on **full** layout | **partial** — does not name **any one** of three missing |
| 2 | edge | `[]` stays empty; null → defaults including baby | yes — planned |
| 2 | edge | Flag true + missing baby → no merge; write-back resolve round-trip flag stays | yes — planned |
| 2 | edge | Money no-inject cases unchanged | yes — planned (existing harness) |
| 3 | real | Quotes by hour buckets; never blank happy path | yes — planned |
| 3 | real / edge | Next vs nap soonest; `next` clock; `overdue` duration; `hidden` empty | **partial** — overdue title “Next feed/nap” not named |
| 3 | real / edge | Activity map + under-4 quiet slots; no Solids | yes — planned |
| 3 | real | ID capsule name\|age; no bed time | **no** — acceptance only |
| 4 | real / edge | Baby workspace spy; money not used; all off skip; no workspace soft-empty | yes — planned |
| 5 | real | Footer mark modes none / shutter / open-circle | yes — planned |
| 6–8 | real | Card happy render + footer marks + forbidden booking; empty next-care quiet; skeletons | yes — planned |
| 8 | edge | No schedule node | yes — planned |
| 8 | edge | No bed time in capsule UI | **no** — only schedule named |
| 9 | real | E2E inject and/or toggle → baby cells | **partial** — one vague red; no named asserts |
| 9 | edge | E2E `[]` stays empty | **no** — acceptance only (unit in Task 2) |
| 10 | — | Docs only | N/A |

**Existing harness skim:** `widget-registry.test.ts` (defaults + money no-inject), `kiosk-layout.test.ts` (no flag yet), `user-preferences.test.ts` (Zod widgets/layout), `kiosk-insights-footer.test.ts` (Money/Insights labels only — no mark API), `e2e/kiosk-layout.spec.ts` (Settings → `/kiosk`; no baby). No baby mapper/load/card modules yet.

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 2 | Inject when **any one** baby id missing (Design: missing any of three) | Unit: stored money-only + only `baby.funny_time` absent → merge **all three** baby ids + `babyDefaultsInjected: true` + mode/columns/focus kept. Name: `injects all baby defaults when any one id missing`. |
| Major | 3 | Overdue keeps care title (R1 / Design display rules) | Unit: `kind: "overdue"` → `title` is `Next feed` or `Next nap`; `timeLine` matches `Overdue · …`; no booking / start–end range. Name: `overdue keeps Next feed or nap title`. |
| Major | 3 | Nursery capsule hides bed time | Unit: fixture with bed time / schedule fields → capsule `Name \| age` only; no bed-time string in DTO. Name: `nursery capsule is name and age without bed time`. |
| Major | 9 | Gate A inject journey + empty board | E2E: (1) non-empty saved list without baby ids → after `/kiosk` load, three baby cells (or test ids) visible. (2) prefs `kioskWidgets: []` → board stays empty (no baby inject). Names: `baby defaults inject on kiosk load`; `empty kiosk widgets stays empty`. |
| Enhancement | 3 | Funny Time every hour non-blank | Unit: sample hours 0, 6, 12, 18, 23 → non-empty `quoteLine` (buckets already planned). |
| Enhancement | 9 | Offs stick in UI | E2E optional: after inject, turn off Funny Time → reload still off (unit flag already strong). |

## Real scenarios checked

- **Happy path:** Defaults + Zod + inject merge/flag + mappers + baby workspace load + three cards/footers/skeletons — mostly named.
- **User-visible failures:** Unknown widget id / max Zod planned. Auth/rate-limit unchanged — OK not to re-test. Booking copy forbidden on next-care card planned.
- **Empty / loading / permission:** Soft-empty load + quiet next-care + skeletons planned. E2E empty `[]` board **not** named. Permission N/A beyond existing prefs auth.

## Edge scenarios checked

- **Boundaries / invalid input:** Zod unknown/max; next-care three kinds; activity under-4 / no Solids — planned. Capsule/bed-time and overdue title need named asserts.
- **Concurrency / double-submit / idempotency:** Flag stops re-inject planned. Two-tab race OK to skip (Design note).
- **Offline / partial data / race:** No workspace soft-empty + gated skip planned. Inject-on-any-missing and e2e inject/`[]` need names. Inject patch-fail deferred (03a Enhancement).

## Fix ask for Build

Fold into `04-tasks.md` TDD bullets (prefer few strong reds):

1. **Task 2 (Major):** `it("injects all baby defaults when any one id missing")` — non-empty stored set missing only one baby id → all three present + full layout flag; mode/columns/focus unchanged.
2. **Task 3 (Major):** `it("overdue keeps Next feed or nap title")` — overdue fixture → title Next feed/nap; `timeLine` `Overdue · {duration}`; no range / booking strings.
3. **Task 3 (Major):** `it("nursery capsule is name and age without bed time")` — mapper DTO capsule excludes bed time even if loader fixture has it.
4. **Task 9 (Major):** E2E `baby defaults inject on kiosk load` + `empty kiosk widgets stays empty` — inject shows baby cells; `[]` does not.

**Keep as-is (already strong enough):** Task 1 defaults/Zod/flag pass-through; Task 2 `[]`/null/flag-true/no-merge/money no-inject/round-trip; Task 3 hour quotes + soonest + hidden empty + activity/no Solids; Task 4 workspace/gated/soft-empty; Task 5 mark modes; Tasks 6–8 card/footer/skeleton/no schedule; money no-inject regression.

**Explicit non-goals (OK):** Pixel diff vs refs (manual checkpoint); two-tab inject race; inject patch-fail path; 401/429 prefs re-test; CLS for non-default prefs; Task 10 docs tests.

## Round notes

- Mapped against Design Contracts (next-care rules, inject any-of-three, full layout merge), UI footer marks, ADR-004, and Task acceptance.
- Strongest planned reds: registry/Zod/flag, inject no-remerge, due kinds, baby workspace gate, per-mark footers, card skeletons.
- Highest remaining risk before Gate B: inject rule tested only as “omitting baby” (all vs any); overdue title + bed-time capsule not named; e2e still one vague line for the Gate A inject journey.
- No production code in this stage. Parent: fold Fix ask into `04-tasks.md` → Gate B.
