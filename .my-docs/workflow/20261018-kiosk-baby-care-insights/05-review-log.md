# Review log: 20261018-kiosk-baby-care-insights

## Adversarial test review

**Result:** clean

**Round:** 3 (re-check after Quality Fix CSS/markup) · **Result:** clean  
**Updated:** 2026-10-18  
**Scope:** Light re-check only. Quality Fix changed nursery capsule `--radius-sm` + new `.kiosk-eink-baby-dither-strip`. Confirm units lock the new classes; no new Critical/Major test gaps. Do not re-litigate R2 Majors unless broken. Do not fix.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/kiosk/baby-next-care.test.ts:62-78` | **Overdue nap title** — R1→R2 fixed. Not re-opened. | fixed |
| Major | `lib/kiosk/load-baby-kiosk-workspace.test.ts` (+ gated units) | **Task 4 load path** — R1→R2 fixed. Not re-opened. | fixed |
| Major | `components/kiosk/kiosk-dashboard.test.ts:376-410` | **Baby Unavailable** — R1→R2 fixed. Not re-opened. | fixed |
| Enhancement | `lib/kiosk/baby-defaults-inject.test.ts:93-106` | **“Write-back then resolve/get” is planner-only.** Never `getUserPreferences` / `loadKioskPageData` patch path. E2E inject covers load path. | open |
| Enhancement | `components/kiosk/kiosk-widget-settings.test.ts` | **Baby Settings group unasserted.** No `Baby` / nursery / next care / Funny Time labels. | open |
| Enhancement | `lib/kiosk/baby-nursery.test.ts:21-56` | **“Under-4 quiet” overclaims.** Length 3 + no Solids; no quiet empty-slot pad assert. | open |
| Nit | `lib/validators/user-preferences.test.ts:39-40` | Hard-codes `KIOSK_WIDGET_IDS.length === 14`. | open |

### Post-fix class locks (R3)

| Lock | Proven? | Note |
|------|---------|------|
| Nursery capsule not pill | yes | `kiosk-nursery-card.test.ts` forbids `rounded-full`/`999px` on card; skel asserts `rounded-[var(--radius-sm)]` |
| Nursery uses baby dither strip | yes | Card + skel match `kiosk-eink-baby-dither-strip`; forbid `kiosk-eink-insights-metric-bar` |
| Funny Time uses baby dither strip | yes | `kiosk-funny-time-card.test.ts` card + skel: strip present / metric-bar absent |
| CSS SoT | yes | `globals.css` `.kiosk-eink-nursery-capsule` → `border-radius: var(--radius-sm)`; `.kiosk-eink-baby-dither-strip` thin `0.35rem`; money KPI still fat metric-bar |

### Lock / 04-tasks coverage check

| Lock / planned red | Proven? | Note |
|--------------------|---------|------|
| Registry `resolve(null)` includes three baby ids | yes | `widget-registry.test.ts` |
| Zod accept baby ids / reject unknown / max = registry length | yes | `user-preferences.test.ts` |
| `resolveKioskLayout` round-trips `babyDefaultsInjected` | yes | `kiosk-layout.test.ts` |
| Inject: omit all baby → merge + full layout flag | yes | `baby-defaults-inject.test.ts` |
| Inject: any one missing → all three + flag | yes | same |
| `[]` empty; null → defaults incl. baby | yes | same |
| Flag true + missing → no merge; planner round-trip flag sticks | yes | same (get/load path = Enhancement) |
| Money no-inject unchanged | yes | `widget-registry.test.ts` |
| Quotes by hour buckets non-blank | yes | `baby-funny-time.test.ts` |
| Soonest feed vs nap; next clock; hidden empty | yes | `baby-next-care.test.ts` |
| Overdue keeps Next feed **or nap** title | yes | feed + sleep overdue units |
| Nursery capsule name\|age, no bed time | yes | `baby-nursery.test.ts` + card |
| Activity map / no Solids | yes | nursery mapper unit |
| Task 4 baby workspace / gated / soft-empty | yes | workspace suite + gated loaders |
| Footer mark none / shutter / circle | yes | footer + cards |
| Cards + skeletons + forbidden booking / no schedule | yes | funny / next-care / nursery |
| Capsule radius-sm + baby dither strip (post-Quality Fix) | yes | nursery + funny units (R3) |
| Dashboard baby Unavailable | yes | dashboard units `:376-410` |
| E2E inject → three cells; `[]` stays empty | yes (spec) | `e2e/kiosk-baby.spec.ts` |

### Security (surface)

- Prefs stay session + Zod enum. Baby workspace spy locks enabled path. Quality Fix was CSS/markup only — no new Critical authz gap.

### Fix ask (Critical/Major only)

None — Result clean.

**Deferred Enhancements:** planner-only write-back “get”; Settings Baby group labels; nursery quiet-slot naming; Zod length hard-code nit.

### Round notes

- **R1:** needs fix — overdue nap half-lock; Task 4 soft-empty/workspace/gates missing; dashboard baby Unavailable untested. Fix ask ×3 Majors.
- **Fix (adversarial-tests):** verify-pass — three Majors closed with tests only (see Fix section below).
- **R2 re-check:** Confirmed all three Majors against draft tests. No new Critical/Major. Next: Quality.
- **R3 (post-Quality Fix):** Structure changed (capsule `--radius-sm`; `.kiosk-eink-baby-dither-strip`). Units lock strip present / metric-bar absent (funny + nursery card/skel) and forbid pill radius on nursery. R2 Majors still closed. No new Critical/Major. Enhancements/Nit unchanged.
- Result **clean** — zero open Critical/Major. Next: api lens (Lens plan).

## Fix (adversarial-tests)

**Result:** verify-pass  
**Updated:** 2026-10-18

### Fix notes

1. **Major — overdue nap title:** Added `overdue sleep keeps Next nap title` in `baby-next-care.test.ts` (title `Next nap`, `timeLine` `/^Overdue · /`, no range/booking). Kept feed overdue. Production mapper already correct — tests only.
2. **Major — Task 4 load path:** Added `load-baby-kiosk-workspace.test.ts` (mock.module pool + `run-unit-tests.mjs` entry): enabled → `getBabyWorkspaceIdForUser` spy; money `getWorkspaceIdForUser` not called; all baby off → no workspace call; null workspace → soft-empty DTOs. Gated skip spies for next-care/nursery loaders when disabled.
3. **Major — dashboard Unavailable:** `kiosk-dashboard.test.ts` — enabled `baby.nursery` / `baby.next_care` / `baby.funny_time` + empty `widgets` → cell + testid + Unavailable (heatmap twin). Production shells already present — tests only.

**Deferred Enhancements:** unchanged (planner write-back get; Settings Baby labels; nursery quiet-slot naming; Zod length nit).

### Round notes

- Verify attempt 1: `npm test` cancelled flake in unrelated `sendTelegramMessage` timeout; re-ran green. `npm run build` green.
- Behavior/production code unchanged; tests + mock suite registry only. Parent: re-run Adversarial.

## Quality

**Result:** clean

**Round:** 3 (re-check after independent Smoke E1 + fix-tests)  
**Updated:** 2026-10-19  
**Scope:** Fresh verifier. Baby-kiosk was Quality R2 clean. Re-verify UI fidelity locks + ADR-004 inject still hold. Spot-check `lib/telegram/send.ts` AbortController timeout only for Critical regressions (out of baby-kiosk scope). API depth deferred (Lens plan: api). Has DB no. Stale-review Notes token cleared.

### Checklist

- [x] Context understood
- [x] Correctness + tests adequate (Adv R3 clean; UI Fix units still lock strip / no pill; Smoke smoke-pass re-run)
- [x] Security (surface — session prefs + baby workspace; telegram timeout not a Critical authz/data-loss risk; deep API → lens)
- [x] Architecture (Option 1 + ADR-004 + Patterns 1–3; Pattern 3 chrome unchanged since R2)
- [x] Readability
- [x] Performance (funny-only load weight — Enhancement only)
- [x] Deps/lockfile if touched — N/A (telegram-only post-R2)
- [x] Verdict: Approve

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `app/globals.css` `.kiosk-eink-nursery-capsule` (+ skel) | **Nursery ID capsule** — R1 pill `999px`. Still `border-radius: var(--radius-sm)`; skel `rounded-[var(--radius-sm)]`; tests forbid `rounded-full`/`999px`. R3: baby CSS/cards mtime unchanged since R2. | fixed |
| Major | Funny Time + nursery accents | **Thin dither strip** — Still `.kiosk-eink-baby-dither-strip` (`width: 0.35rem`); money `.kiosk-eink-insights-metric-bar` still fat. Card/skel tests strip present / metric-bar absent. R3: unchanged. | fixed |
| Enhancement | `lib/kiosk/load-baby-kiosk.ts` | Only `baby.funny_time` enabled still fetches care loaders. | open |
| Enhancement | Adv deferred | Settings Baby labels; planner-only inject get; quiet-slot naming. | open |
| Nit | Adv deferred | Zod length `=== 14` hard-code. | open |

### UI lock (Gate A #1/#2 + Design UI + refs) — R3

| Lock | Draft | Note |
|------|-------|------|
| #1 Hero / title / quote dominant | pass | Nursery Sleeping/Awake; next-care title; Funny Time quote |
| #2 Support + footer bar | pass | since/activity/timeLine + brand footers |
| Funny Time hierarchy + labels | pass | Parent \| Funny Time; `mark="none"` |
| Funny Time dither accent **size** | **pass** | Thin baby strip vs ref (unchanged post-Smoke) |
| Next care titles/time + footer | pass | Baby Care + shutter \| Updated; no booking copy |
| Nursery capsule texts | pass | `Name \| age`; no bed time; no schedule; omit Solids |
| Nursery capsule **shape** | **pass** | `--radius-sm` rounded-rect vs ref |
| Nursery dither accents **size** | **pass** | Thin baby strip on hero + 2×2 |
| Footer marks table | pass | none / shutter / open-circle |
| Skeleton parity | pass | radius-sm capsule stub + baby strips |
| Monochrome inside cell | pass | ink/paper + stipple |
| ADR-004 inject | pass | `planBabyDefaultsInject` + `load-kiosk-page` full layout write-back; `[]` empty; flag stops re-inject |

### System design / patterns

| Item | Honored? | Note |
|------|----------|------|
| Concept 1–3 | yes | Baby workspace; ADR-004 inject; page-composed (API lens next) |
| Pattern 1–2 | yes | Gated load; pure mappers |
| Pattern 3 e-ink chrome | **yes** | Capsule `--radius-sm` + thin baby dither; marks/labels OK |

### Telegram spot-check (post–fix-tests; not baby scope)

| Check | Verdict | Note |
|-------|---------|------|
| Critical regression from ref’d `AbortController` + `setTimeout` | none | Timeout still returns `telegram_timeout`; `clearTimeout` + external-signal cleanup in `finally`; Smoke unit suite green (0 cancelled). No baby-kiosk coupling. |

### Fix ask (Critical/Major only)

None — Result clean.

**Deferred Enhancements:** funny-only load weight; Adv Settings/inject/quiet-slot/Zod nits.

### Round notes

- **R1:** needs fix — capsule pill + fat metric-bar dither (2 Majors).
- **Fix (quality):** verify-pass — `--radius-sm` capsule; `.kiosk-eink-baby-dither-strip`; tests.
- **R2 re-check:** Confirmed both Majors in CSS + cards + skeletons vs three PNG refs; money KPI bar still fat (correct). No new Critical/Major.
- **R3 (post–Smoke E1 + telegram fix-tests):** Baby-kiosk UI/CSS/cards/inject sources unchanged since R2. Capsule + thin dither + footer marks + ADR-004 inject still pass. Telegram timeout swap is out of scope; spot-check found no Critical. Stale-review Notes token cleared. Zero open Critical/Major.
- Result **clean** — Next: api lens (Lens plan).

## Fix (quality)

**Result:** verify-pass  
**Updated:** 2026-10-18

### Fix notes

1. **Major — nursery capsule:** `.kiosk-eink-nursery-capsule` `border-radius` → `var(--radius-sm)` (was `999px`). Skeleton capsule `rounded-full` → `rounded-[var(--radius-sm)]`.
2. **Major — baby dither accents:** New `.kiosk-eink-baby-dither-strip` (thin `0.35rem`, stretch to text height, stipple). Funny Time quote + nursery hero/activity (+ skeletons) use it; stop using fat `.kiosk-eink-insights-metric-bar` (money KPIs unchanged).
3. **Tests:** Card units assert baby strip present / metric-bar absent; nursery asserts no `rounded-full`/`999px`; skeleton radius-sm + strip parity.
4. **Adversarial:** Explicit `**Result: clean**` line under Adv heading (lint derive).

**Deferred Enhancements:** unchanged (funny-only load weight; Adv Settings/inject/quiet-slot/Zod nits).

### Round notes

- Verify attempt 1: `npm run build` green; `npm test` cancelled flake in unrelated `sendTelegramMessage` timeout.
- Verify attempt 2: `npm test` green (exit 0). Behavior/CSS + unit asserts changed. Parent: re-run Quality.

## Merged lenses

**Result:** clean  
**Lenses:** api only (Has DB no) — `05-lens-api.md` Result clean. No Merge Task (single lens). Deferred A1–A2 Nit / A3 Enhancement.
