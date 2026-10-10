# Design review log: 20261009-kiosk-weather-detail

**Result:** clean
**Round:** 1
**Updated:** 2026-10-10 (UTC+7)

**Isolated reviews (parallel-safe):** Has API = no → API contract review **skipped**. Has DB = no → DB design review **skipped**. Overall **clean** when this log has zero Critical/Major.

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | diagram | Kiosk path in the sequence note says “cached only if AQ ok”; grill Q5 and tasks require **both** forecast and AQ to succeed before cache. | Tighten the diagram note to “cached only when both APIs succeed” so Build does not misread. |
| Enhancement | system-design / pattern | Fail-soft and “no partial cache” appear in System design Overview and Pattern 2. | OK for teaching; optional trim in Overview to “see Pattern 2” if the doc grows. |
| Enhancement | tasks | Auth redirect on `/kiosk/weather` is manual-only in Task 6; no automated repro. | Acceptable for Mode simple (same pattern as `/kiosk`). Optional: one shared helper test or comment pointing at kiosk page pattern. |
| Enhancement | design | Grill residual risk: two 15-min caches (snapshot vs day) can drift slightly. | Already noted in grill; optional one line in System design Consistency. |
| Nit | security-owasp | A03 note mentions coords “set via URL.searchParams”; lat/lon actually come from saved prefs. | Fix wording at Build time in OWASP table (React escape + DB numbers). |
| Nit | idea | Open questions on menu and route remain in `01-idea.md` but are settled in Analyze/Design. | Optional close-out line in idea Notes after Gate B; not blocking. |

## Fix ask for my-dev-flow-design

None — zero Critical/Major.

## Deferred Enhancements

- WHO 15 µg/m³ guide line / color band (grill Q3, design Challenges).
- Multi-day forecast, live refresh, user date-format pref (design Challenges).
- Sequence cache note precision; optional auth test note; two-cache drift callout.

## Round notes

- **Mode:** simple — Problem map stub + Core problem + ★ mind map OK. Solution branches table present. Grill **frontier-empty**; Design honors Q1–Q6 (meta city·date, rain mm + prob tooltip, city-local day, no partial cache, rounded `current.pm2_5`, WHO deferred).
- **Analyze:** Overall and four solution pieces answer What / Why / How with repo-first best practices. Settled decisions match Has API/DB = no and route `/kiosk/weather`.
- **Design:** One recommended option + short rejected API alternative (simple mode). **System design** Overview teaches boundaries, flow, chrome wiring, failure/cache without replacing the sequence. **Design patterns used:** three taught patterns match Analysis reusable list (RSC, fail-soft, ChartShell). OWASP Top 10 table covers design-time risks (session auth, fixed upstream hosts, no URL coords). **UI locks** are explicit (strip 4 lines, link rules, skeleton parity, chart order, states, a11y). Aligns with idea outcomes; does not re-litigate Gate A (skipped).
- **Tasks:** Six scoped tasks with TDD “red first” tests for chrome, pure helpers, fetch/cache rules, chart helpers; manual checks for page/auth/light-dark where e2e is out of scope (documented reason). Acceptance maps to design acceptance criteria.
- **Severity counts:** Critical **0**, Major **0**, Enhancement **4**, Nit **2**.
- **Next:** TDD test-case review (`04a`) if planned → Gate B → Build.
