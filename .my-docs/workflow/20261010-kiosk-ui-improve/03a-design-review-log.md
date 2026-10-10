# Design review log: 20261010-kiosk-ui-improve

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-10

**Isolated reviews (parallel-safe):** Has API = no · Has DB = no — skipped (`03a-api-contract-review.md` / `03a-db-design-review.md` not created). Overall **clean** requires those Results **clean|skipped** and this log **clean**.

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | system-design | Overview calls the path a “Money-workspace RSC path,” but `/kiosk` is `CoreShellPage` under the shell (no Money layout provider); it only reuses workspace-scoped Money loaders. | In `03-design.md` Overview, say shell RSC → `load-kiosk-page` (workspace Money reads) — not Money-workspace layout bootstrap. |
| Enhancement | diagram | Sequence covers the happy path and Phase 1/2 notes, but has no alt for auth redirect, missing workspace, or loader failure returns. | Add one short `alt` (e.g. no session → login; no workspace → empty/safe defaults) so failure returns match Overview. |
| Enhancement | pattern | Analysis listed reusable patterns (Overdue Alert, auto-fit metric grid, prefs toggles). Design reuses them in UI/Overview but does not teach them under Design patterns (only glance / widget-gated / progressive disclosure). | Optional: one short subsection each, or one line “reuse as-is; see Analysis table” so Mode-full pattern map is complete. |
| Nit | tasks | Task 4 “agreed empty rule” is slightly loose vs Design “omit when no rows.” | In Task 4 acceptance, spell: no payments section chrome when overdue+upcoming both empty (not only hide Alert). |
| Nit | design | Chosen design block still empty (Gate B fill). Recommendation + Phase 1/2 UI locks are enough to Build later. | Fill Chosen design = Option 1 at Gate B; no design rewrite needed for clean. |

## Fix ask for my-dev-flow-design

None — zero Critical / Major.

## Deferred Enhancements

- Clarify System design Overview: shell RSC + Money loaders, not Money-workspace layout path.
- Add sequence failure `alt`s (auth / workspace / load).
- Optionally map Analysis reusable patterns (Overdue Alert, auto-fit, prefs) in Design patterns or an explicit “reuse as-is” note.
- Tighten Task 4 empty-attention acceptance wording.
- Fill Chosen design at Gate B.

## Round notes

- **Special check (D2 / Option 1 phasing):** Pass. Grill Settled D2 = loans + bills-due (not `bills.summary`). Design Decision 1 Option 1 ships loans attention now and keeps dual-attention product scope via Phase 2 (UI section + Task 5 stub: honest due only; never ledger). Does **not** reopen D2 as “loans only forever.”
- **Problem map / Analyze / Grill:** Mode full OK — Steps 1–2 + ★ mind map; What/Why/How + Solution branches; `02b-grill.md` frontier-empty; Design honors D1–D5 + one attention zone.
- **Gate A / UI locks:** Phase 1 Important #1/#2 match Gate A (loan urgency, then net). Layout strip → attention → metrics → insights locked; skeleton + guide tasks present.
- **System design / patterns:** Overview required (Mode full) and present; teaches shape without contract dump. Three patterns taught with What/How/Why/anti-patterns. ADR skipped with reason (OK).
- **Security:** OWASP table present; A04 calls out no fake due — aligns with Grill residual.
- **Has API / Has DB:** correctly N/A; no isolated review files.
- Result **clean** — zero Critical/Major; Enhancements deferred.
