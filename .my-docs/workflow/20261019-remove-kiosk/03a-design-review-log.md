# Design review log: 20261019-remove-kiosk

**Result:** clean
**Round:** 1
**Updated:** 2026-10-19

**Isolated reviews (parallel-safe):** `03a-api-contract-review.md` = clean (Round 2). `03a-db-design-review.md` = clean (Round 2). Overall clean requires those Results clean|skipped and this log clean.

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | analysis | `02-analysis.md` Settled / piece 3 still describe field-strip + `DROP COLUMN` + stale PATCH → 400. Build SoT is full route retire + `DROP TABLE` + 404 (`03`/`04`). | Optional sync of Analysis Settled / piece 3 to match Design; do not change contracts. |
| Enhancement | grill | Grill edge still locks stale PATCH → Zod 400. Design supersedes with route retire (404) using bag-only-kiosk/weather evidence (API review accepted). | Optional Grill note: 400 lock superseded by full prefs retire. |
| Enhancement | pattern | Analysis reusable “Settings sections” not taught as Pattern N (≤3 patterns; UI locks + Task 4 cover strip). | Optional one-liner under Patterns: Settings IA → see UI locks / Task 4. |
| Enhancement | tasks | Task 4 files list omits `settings-client-layout.tsx` / `kioskContent` wiring (live Settings still passes kiosk slot). | Add those paths to Task 4 Files likely touched so Build does not miss category plumbing. |
| Enhancement | tasks | Gate A vital few includes clean `/kiosk` gone behavior; Task 5 redirect assert is optional (“else manual”). | Prefer one required unit/e2e redirect check to `/money` in Task 5 TDD. |
| Enhancement | practice | `00-run.md` Task count says 11; `04-tasks.md` has 7 tasks. | Parent metrics: Task count = 7. |
| Nit | design | “Chosen design (user-approved)” empty — expected pre–Gate B. | Fill after Gate B yes. |
| Nit | glossary-adr | ADR-006 + 003–005 Superseded already on disk; Task 6 reads as write. | Treat Task 6 as verify/align remaining ARCHITECTURE / DESIGN_GUIDE / glossary. |

## Fix ask for my-dev-flow-design

(none — zero Critical/Major)

## Deferred Enhancements (do not block clean)

- Sync Analysis/Grill Settled language to prefs retire + DROP TABLE (Build SoT remains `03`/`04`).
- Optional Pattern pointer for Settings sections; Task 4 file list for client-layout/`kioskContent`.
- Require automated redirect assert in Task 5; parent Task count = 7.
- API/DB deferred nits from Round 2 isolated logs (HTML vs JSON 404 body; migrate breakpoint style).

## Round notes

- Fresh verifier; did not author 01–04; did not rewrite them.
- Mode **full** · Has UI yes · Has API yes · Has DB yes · Has auth/PII/schema yes.
- **Problem map:** Steps 1–2 + mind map ★ present and clear.
- **Analyze:** What/Why/How + Solution branches (★ systemic) present; weather consumer spike aligns with Gate A drop.
- **Grill:** Frontier-empty; Design honors redirect `/money` permanent, weather drop, ADR-006, keep Popover/MoreMenu. Prefs 400→404 retire has schema evidence (`user_preferences` = PK + six kiosk/weather columns only) — not a silent reopen.
- **System design / patterns:** Overview + Concepts teach ordered teardown, prefs resource retire, redirects; three patterns taught with What/How/Why/anti-patterns/refs; no fake `WorkspaceAppKey`.
- **UI vs Gate A:** #1 remaining shell nav, #2 Settings without widgets/weather; no stub; redirect to Money; UI locks in Design + Tasks 4–5.
- **OWASP:** Trust boundaries + abuse cases + A01–A10 table; location PII drop with weather; prefs mutate surface removed.
- **Tasks:** Acceptance + TDD red-first; API 404 + DROP TABLE + deploy order covered; cross-cutting matches clean API/DB reviews.
- Live check: schema and Settings callers match Design claim (prefs bag is kiosk/weather-only; theme = client `ThemeSettings`).
- Zero Critical / Major → **clean**.
