# Idea: Baby-care e-ink kiosk widgets

## Problem map (diagnose before framing)

**Mode:** full

### Step 1 — Deep exploration (3 WHAT branches)

#### What is happening?
- Kiosk is a core status board of toggled widget cells (`/kiosk`); layout/on-off live in user preferences.
- Registry today has context + money/loans/investments/bills/savings only — **no baby widgets**.
- Money insights already ship e-ink monochrome cells (dither bars, footer chrome) as the visual pattern to reuse.
- Baby Care exists as a first-class feature (`/baby`) with home quick status, care events, open sleep, profile name/age.
- Three screenshot refs define the target look: Funny Time quote, next-event chrome, full nursery dashboard.

#### What is missing / wrong?
- No Baby feature group or ids in `KIOSK_WIDGET_REGISTRY` / dashboard render / load path.
- No kiosk cells that match the three refs at 100% e-ink fidelity (capsules, dither accents, footer brand bars).
- Funny Time needs a small local time-keyed quote set for v1 (no first-party quote SoT in-repo today).
- Nursery “schedule” capsule (rise/naps/asleep) is not a first-class baby schedule API like the Huckleberry-style ref shows.
- Today `resolveKioskWidgets` only applies defaults for null prefs; stored lists do not get new `defaultEnabled` ids — day-one baby glance needs a one-time inject of the three new ids.

#### What are the consequences?
- Wall/phone kiosk cannot glance baby status beside money — parents leave the board for `/baby`.
- Partial or “theme-token” restyle would break the user’s hard 100% screenshot fidelity rule.
- Without prefs inject, parents who already saved a widget list never see the new cells until they hunt Settings.
- Booking/investor copy on the next-event cell would confuse parents about baby care.

### Step 2 — Real core problem

- **Surface symptoms:** Kiosk shows money/context/loans; baby glance surfaces from the screenshots are absent.
- **Root cause:** Baby Care is not wired into the kiosk widget system, and the three e-ink layouts (plus some data) are not productized as kiosk cells.
- **Core problem (one sentence):** Parents cannot see baby-care insights on the kiosk board in the exact e-ink layouts from the three screenshots, with those widgets on by default.

### Mind map (visual text)

```text
Problem: no baby e-ink kiosk cells
├── Happening: kiosk = money/context; baby data on /baby only
├── Missing: registry + 3 screenshot-faithful widgets + data map
├── Consequences: no glance; fidelity risk; defaults miss stored prefs
├── Core: baby insights not on kiosk at screenshot fidelity / default-on
└── ★ Top priority: ship 3 baby e-ink widgets (100% ref match), defaultEnabled + inject
```

## Problem

Parents cannot see baby-care insights on the kiosk board in the exact e-ink layouts from the three screenshots, with those widgets on by default.

## User / audience

Parents (and household viewers) who use `/kiosk` as a glance board and already log care in Baby Care.

## Outcome

Three kiosk widgets match `refs/funny-time.png`, `refs/next-event.png`, and `refs/nursery-dashboard.png` at 100% design fidelity; each is `defaultEnabled: true`.

- **Next-event (ref 2):** Baby “next care” glance — centered title = next nap / feed / schedule label (e.g. `1st Nap`); time range underneath (e.g. `11:45 AM – 1:00 PM`). Body and footer must **not** keep booking / investor / “Next booking” copy.
- **Funny Time (ref 1):** Small local time-keyed quote set so the cell is never empty on day one.
- **Nursery (ref 3):** Hero status + recent activity ship even if the schedule capsule is empty/hidden when data is missing.
- **Defaults:** Null prefs use `defaultEnabled`; existing saved `kiosk_widgets` lists get a **one-time inject** of the three new baby ids when resolve finds them missing (same day-one board for new and returning parents).

## Metric

Visual side-by-side vs the three refs (structure, dither, footer chrome) passes review; `resolveKioskWidgets(null)` and resolve of stored lists that omit the three ids both include those baby widget ids; Settings lists them under a Baby group as on by default.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Project shape (shell + Money + Baby) | `README.md`, `docs/ARCHITECTURE.md`, `lib/features/registry.ts` | Baby = feature `workspaceAppKey: "baby"` |
| Kiosk = widget status board | `docs/DESIGN_GUIDE.md` (Kiosk section), `components/kiosk/kiosk-dashboard.tsx` | Not a Money home |
| Widget ids / defaults / resolve | `lib/kiosk/widget-registry.ts`, `lib/kiosk/widget-registry.test.ts` | No baby ids; stored prefs not auto-injected today |
| Prefs storage ADR | `docs/decisions/ADR-003-kiosk-layout-in-user-preferences.md` | Widgets + layout in `user_preferences` |
| E-ink money pattern | `components/kiosk/kiosk-insights-footer.tsx`, `app/globals.css` (`.kiosk-eink-insights*`), GLOSSARY kiosk insights entries | Footer + dither tokens |
| Baby home status / open sleep / last events | `features/baby/server/home-quick-status.ts`, `db/schema/baby.ts` (`baby_profile`, care events) | Name/age/status feed candidates |
| Care timeline summaries | `features/baby/server/timeline.ts` | Activity-row copy |
| Guidelines ≠ timed schedule | `lib/baby-care-guideline-content.ts`, `components/baby-care-guidelines.tsx` | Quiet guide text, not rise/nap capsule |
| Visual SoT | `.my-docs/workflow/20261018-kiosk-baby-care-insights/refs/*.png` | Funny Time / next-event / nursery |
| Load path (no baby today) | `lib/kiosk/load-kiosk-page.ts` | Money insights gated by enabled ids only |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** Three new kiosk cells + Settings widget toggles; reuse e-ink dither/footer CSS patterns; match refs pixel-faithfully (monochrome, capsules, dither bars, footer left/right labels). Skeleton parity with live cells. Next-event = baby next-care chrome only (no booking language). Funny Time = local time-keyed quotes. Prefs: one-time inject of the three new defaultEnabled ids into stored lists that omit them — Analyze/Design picks exact resolve/persist shape.

## 80/20 UI (day-to-day)

### Main user goals

- Glance current baby state (e.g. sleeping / awake) without opening Baby Home.
- See recent care activity and “what’s next” at a distance.
- Optionally get a light parent-facing Funny Time line for mood/context.

### Vital few (high-impact ~20%)

- Nursery dashboard hero status + recent activity (ref 3).
- Next-event baby “next care” cell: centered schedule/care label + time range (ref 2); no booking copy.
- Default-on for null prefs **and** one-time inject into saved lists so parents see all three without hunting Settings.
- Funny Time never empty (small local time-keyed quote set).
- 100% e-ink chrome match (dither + footer).

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Hero status / centered next-care title / Funny Time quote line (per widget).
- **Important info / action #2 (always visible):** Supporting time or activity detail + footer brand bar.
- **Core action placement:** Read-only glance cells on `/kiosk`; Settings toggles for on/off (secondary to glance).
- **Secondary actions:** Widget on/off and layout mode in Settings; deep care logging stays on `/baby` (out of kiosk cell chrome).

### Top user journey to optimize

Open `/kiosk` → see all three baby widgets without enabling (null prefs **or** after one-time inject into a saved list that omitted them) → read status / next care / quote at a glance → (optional) open Settings only to turn off.

### Sensible defaults

- All three new baby widgets `defaultEnabled: true`.
- **Saved prefs:** when resolving a stored `kiosk_widgets` list that omits any of the three new defaultEnabled baby ids, **one-time inject** those missing ids (product lean; today money widgets do not inject — baby day-one glance overrides that for these three ids only). Empty `[]` still means empty board (user cleared all).
- Focus/fullscreen behavior follows existing kiosk layout prefs.

### Biggest usability risks to fix first

- Fidelity drift (grey fills instead of dither; wrong footer shape/labels).
- Empty / no-baby-workspace states that look broken vs quiet empty.
- Inject vs leave-off: must match Top journey (day-one board without Settings).
- Booking/investor leftovers on next-event body or footer.
- Funny Time empty if quote set missing.

## Non-goals

- Rebuilding Baby Home / Insights pages.
- Live Huckleberry sync or third-party nursery API.
- New kiosk layout modes or widget drag-builder.
- Changing money insights widgets’ default-on/off set (except incidental shared chrome reuse).
- Pixel-perfect beyond the three attached refs.
- Injecting unrelated historical money widgets into old saved lists (only the three new baby defaultEnabled ids).

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Three widgets = three refs (1:1) | Preferred | Confirm at Gate A | Merge/split widgets in Analyze |
| next-event = baby next care (label + time range); no booking copy | **Yes (settled)** | Design vs `refs/next-event.png` | Drop widget or re-open Gate A |
| Funny Time = small local time-keyed quote set for v1 | **Yes (settled)** | Ship quotes in Build | Only then fall back to one static line |
| Nursery schedule capsule can be approximated from existing baby data or deferred partial | Soft | Map fields in Analyze | Show status+activity only; schedule empty/hidden |
| One-time inject of the three new baby ids into stored lists that omit them | **Yes (settled)** | Align resolve/persist in Design + tests | Re-open only if inject proves unsafe |

## What we should not build

- Interactive timers or log buttons inside these e-ink cells.
- Colorful themed baby UI on kiosk (breaks monochrome refs).
- Auto-import of Huckleberry branding as a product dependency beyond footer label choices decided in Design.

## Success criteria

- [ ] Three widgets exist in registry under a Baby feature group with `defaultEnabled: true`.
- [ ] Rendered cells match the three refs for layout hierarchy, dither accents, and footer chrome (review vs PNGs).
- [ ] Null/unset `kiosk_widgets` includes the new ids; stored lists that omitted them get one-time inject of those three ids; Settings shows them on by default.
- [ ] Next-event body/footer use baby next-care labels only (no booking / investor / “Next booking” copy); example shape: title `1st Nap`, time `11:45 AM – 1:00 PM`.
- [ ] Funny Time always shows a time-keyed line from the local quote set (never blank on happy path).
- [ ] Empty / missing baby workspace fails softly (no crash; quiet empty or unavailable cell).
- [ ] Skeletons match live cell structure (CLS parity).

## Open questions

- Next-event SoT field: next nap vs next feed due vs next logged schedule item — which existing baby loader wins in Analyze?
- Nursery schedule pill: invent from guidelines, hide until we have schedule data, or show only known times from recent sleep/feed?
- Footer labels: keep “Huckleberry” / “Parent” / “Funny Time” as in refs, or remap to “Baby Care”?
- Inject persist shape: mutate prefs on read once, or resolve-time merge that matches money patterns Design chooses?
