# TDD test-case review: drawer-nav-assessment

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-26

## Summary

Tasks 1–4 cover grouping units, source contract for menu wiring, DESIGN_GUIDE, and one e2e structure assert. Gaps below folded into `04-tasks.md`.

## Gaps → fold into tasks

1. **Task 1:** Add unit that `appSectionItemsByGroup` **omits empty groups** (e.g. if a future app has no capture items).
2. **Task 2:** Assert source does **not** set `showAppHeading={true}` for current-app panel when groups are shown (avoids double “Baby Care” + Browse headers) — or document intentional heading policy in acceptance.
3. **Task 4:** Prefer asserting accessible names of links still match today (`Log feed`, etc.) so group labels don’t break e2e `getByRole('link', { name })`.

## Fix ask (folded)

Applied into `04-tasks.md` Task 1 / 2 / 4 acceptance + TDD notes.

## Round notes

- Main-thread fallback — TDD review — usage limit.
- After fold → treat as ready for Gate B (no Critical/Major left open).
