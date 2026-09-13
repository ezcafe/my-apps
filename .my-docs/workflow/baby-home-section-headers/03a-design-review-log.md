# Design review log: baby-home-section-headers

**Result:** clean  
**Round:** 2  
**Updated:** 2026-09-13

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | idea | `01-idea.md` open question #4 still asks snooze vs always-until-set; Gate 1 / design already picked visit-only `sessionStorage`. | Optional later cleanup — mark Q4 settled (does not block). |
| Nit | ui-ux | Locked stack is breast → bottle → nap → diaper; caveat + status are only “still present / under controls,” not named in that list. | Optional one-line: after diaper → guide caveat (when birth set) → status (matches today’s rhythm + skeleton). |
| Nit | ui-ux | Chip selected = “last saved formula ml from status / last successful save.” When `lastFeed` is breast/pump, whether any chip stays selected is easy to misread. | Optional: no primary chip unless last formula save / matching formula on status; or match `recentBottleMl[0]`. |
| Nit | security-owasp | OWASP A01–A10 still complete; workspace scope + scan cap + no fake guide without birth remain sound. | No change required. |

## Fix ask for my-design-workflow

None — Result is **clean**. No Critical / Major / Enhancement findings.

## Round notes

- Verifier did not author 01–04; review only. No edits to 01–04; no production code.
- **Round 1 claimed fixed vs Round 2 check:**

| Round 1 item | Still open? | Evidence in 03/04 |
|--------------|-------------|-------------------|
| Sleep `maxDay` table | Closed | 30 / 60 / 122 / 183 / 365 / 1095; Task 1 boundaries |
| Past 1–3y sleep | Closed | Keep last toddler band; Task 1 day 1096 |
| No-birth chips | Closed | History + `[60, 90, 120]` not recommended; Tasks 2/8 |
| Birth dismiss store | Closed | `sessionStorage`; ignore old `localStorage` snooze; Task 5 |
| Section order | Closed | breast → bottle → nap → diaper; Tasks 7/9/10 |
| Legs extract algorithm | Closed | Non-empty legs → formula only, no top-level fall-through; Task 3 |
| Client query + fixtures | Closed | Task 4 lists `lib/baby-query-options.ts` + e2e helpers |
| VI nap blends | Closed | EN+VI table; Task 7 both locales |
| `occurredAt` recent-ml order | Closed | Design picks + example query + Task 4 |
| Chip selected / done-flash | Closed | Primary on last saved ml + ~2s flash; Task 8 |
| `latestWeightKg` + `n` = all feeds | Closed | Design picks + Task 7 |

- Gate 1 picks and Option B still fit; sequence + OWASP table remain adequate for this additive read.
- Residual rows are **Nit** only — they do not block clean.
- Next: Gate 2 (if needed) → `my-code-workflow`.
