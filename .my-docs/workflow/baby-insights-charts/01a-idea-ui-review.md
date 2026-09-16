# Idea day-to-day review (Gate 2-UI): baby-insights-charts

**Result:** ok
**Round:** 2
**Updated:** 2026-09-14
**Role:** end user (day-to-day usage) — fresh context only

## 80/20 UI rule (required)

Primary UI must always show **only the 2 most important pieces of information** for day-to-day use. Everything else goes behind **expand**, **modal**, or **context menu** — never compete with those 2 on the default view.

| Item | Value |
|------|-------|
| Important info #1 (must be visible by default) | **Hydration Monitor** (Feeding ↔ Wet Diaper correlation) — short purpose + light alert when rule fires |
| Important info #2 (must be visible by default) | **Night Sleep Efficiency** (crib time vs actual sleep) — short purpose text |
| What is deferred (expand / modal / context menu) | Pattern Finder; Awake Window Trend; Diaper Output Breakdown; full three-KPI strip; long guidance; unified activity table behind **“Activity log”** (edit in **modal**); legacy growth / care-count charts behind **“More insights”** |
| 80/20 pass? | **yes** |

## Day-to-day checklist

| Focus | Pass? | Note |
|-------|-------|------|
| 80/20 UI (2 most important facts only on primary UI; rest deferred) | yes | #1/#2 named; Outcome, Metric, Success criteria, and Open Q3 all lock default to those two charts only; KPI strip + Activity log + other charts deferred |
| Convenience (few steps, low friction in daily use) | yes | Open Insights → answer hydration + night rest without expanding; More insights / Activity log / edit modal are one extra step each |
| Easy to use (clear actions, low learning cost) | yes | “More insights,” “Activity log,” and Money-style edit modal are easy to learn; purpose lines explain what to look for |
| Understanding (problem + outcome make sense to a real user) | yes | Counts-only Insights don’t answer “hydrated?” / “restful night?” — two default charts + guidance fix that |
| Mobile usability (usable on phone / on the go if relevant; N/A ok) | yes | Phone is primary; two charts fit a small screen; dense matrix stays deferred |
| Eye reading flow (scannable top-to-bottom; clear hierarchy in the idea) | yes | Problem → audience → outcome → 80/20 → non-goals; rejected default pair is clear |

## Findings

| Severity | Finding | Suggestion for 01-idea.md |
|----------|---------|---------------------------|
| Nit | Edit field scope and wet-diaper age bands stay open (Q4, Q7) | Fine for Design; no idea change needed for Gate 2-UI |

## Fix ask for Ideation

None — Round 1 Fix ask items are reflected in current `01-idea.md`.

## Auto-approve?

- **Yes** if Result is **ok** (all Critical/Major cleared; **80/20 UI pass**; day-to-day checklist acceptable).
- **No** if **needs update** or **escalate**. Failing 80/20 without a clear #1/#2 → **needs update** (not ok).

**This round:** **Yes** — Result is **ok** (80/20 pass; no Critical/Major; checklist acceptable). Parent may auto-approve Gate 1 + Gate 2-UI.

## Round notes

- **Round 1:** Result **needs update**. #1/#2 were clear, but Outcome still allowed an always-on KPI strip and activity table only “below the fold.” Fix ask: lock default to two charts; KPI strip behind “More insights”; Activity log expand; prefer legacy charts deferred + soft empty.
- **Round 2:** Re-read current `01-idea.md` only. Round 1 majors are fixed: default = Hydration Monitor + Night Sleep Efficiency; full KPI strip and Activity log deferred; Open Q3 settled; Metric matches “without expanding.” **Result: ok.**
