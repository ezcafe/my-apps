# Design review log: baby-insights-charts

**Result:** clean  
**Round:** 5  
**Updated:** 2026-09-14

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | idea-ui-review | `01a-idea-ui-review.md` still names Important #2 as Night Sleep Efficiency (historical Gate 2-UI). | Optional historical note; do not re-open Gate 2-UI. |
| Nit | design | **Chosen design** still blank (Recommendation = Option 1 only). | Fill after Gate 2 option pick. |
| Nit | security-owasp | OWASP A01–A10 complete; trust boundaries + abuse cases present; no fail rows. | Keep Build security checklist; no design-security rewrite. |
| Nit | ui-concept | Light (and matching dark/mobile) legend says “Wet diapers” without “mixed”; contract counts `wet`+`mixed` under `wetCount`. | OK for parent-facing label if Build/copy notes wetness includes mixed; no contract change needed. |
| FYI | ui-refs | Default product range is **today** (table-style); ui-refs show a 7-day populated demo range for chart readability. | Fine for Gate 2 drafts; Build still ships today default per `03-design` / tasks. |

## Fix ask for my-design-workflow

None — Result **clean**. No Critical / Major / Enhancement remaining.

## Round notes

- **Round 4 Fix ask verified:**
  1. **Dark + mobile ui-refs match locked default — fixed.** Visually inspected `01-default-light.png`, `02-default-dark.png`, `03-default-mobile.png`. All three show Hydration Monitor (feeds count vs wet-diaper count by day), Night Rest (minutes by day), More insights / Activity log collapsed. No oz-intake, fluid-%, mL/kg, goal lines, or topic filter chips. Dark and mobile mirror light SoT hierarchy and chart contracts.
  2. **SoT note present — fixed.** `01b-ui-concept.md` has **ui-refs rule** (light = visual SoT; dark/mobile must mirror). `03-design.md` UI section has matching **ui-refs** SoT line.
- Fresh read of `01`–`04`, `01b`, and visual read of all three ui-refs. Option 1, sequence diagram, Night Rest path, hydration wet+mixed + `low_wet`/`nextCursor` rules, Pattern matrix / Awake Trend contracts, skeleton/mobile/a11y, OWASP table, and TDD task shape remain strong. No Critical / Major / Enhancement.
- **Result: clean** — ready for TDD test-case review → Gate B → Build.
