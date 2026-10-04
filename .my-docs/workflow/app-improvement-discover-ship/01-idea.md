# Idea: Ranked app improvements → ship one

**Project shape:** Next.js shell app (`my-apps`) with workspace-backed features Money, Investments, Loans, and Baby Care, plus core Kiosk / Help / Settings. Auth is Pocket ID; data is Postgres via Drizzle. UI must follow clean-minimal tokens in `docs/DESIGN_GUIDE.md`.

## Problem

The product has many surfaces and past workflow drafts, but there is no short, ranked list of the next high-value day-to-day improvements. Without that, work tends to polish one area (often Baby) or leave finished drafts at Gate C, while cross-app gaps (trust, speed, consistency) stay unranked.

## User / audience

- **Primary:** Busy household users — caregivers logging Baby Care at odd hours; spenders capturing Money and scanning Insights; people checking Loans / Investments.
- **Secondary:** Maintainers who need a clear “ship one slice” pick after discovery.
- **Not this pass:** New product modules (Tasks, Notes), marketing site, Watch-native apps.

## Outcome

What “done” looks like for **this run**:

1. **Discovery:** A short ranked backlog (vital few, ~5–8 items) grounded in day-to-day user jobs across Money, Investments, Loans, Baby Care, and shell — prefer user value over pure tech debt; include tech debt only when it blocks trust or speed of those jobs.
2. **Pick:** After Design, the human picks **exactly one** backlog item (Decision N).
3. **Ship:** That one item goes through design-review → Gate B → Build → review → Gate C in this same run.
4. **Criteria for a shippable slice:** one clear user job; fits existing shell/feature patterns; can finish with tests in one PR; Has UI / Has API / Has DB set honestly for that item.

## Metric

After Design, a human can pick one item in under five minutes using the ranked backlog + ship criteria; after Gate C (if approved), that one item is merged or ready with explicit commit/push/PR/merge yes.

## Has UI

**yes** — discovery and most candidate improvements touch product UI. If the chosen ship item is API/docs-only, refine Has UI in `00-run.md` after the pick.

## Copy/token-only?

No — discovery may include UI, API, or data-model slices; not limited to copy/tokens.

## 80/20 UI (day-to-day)

### Main user goals

- Log care / money quickly without wrong taps.
- See “where did it go?” / next loan urgency / baby status without hunting.
- Move between apps in the shell without relearning patterns.

### Vital few (high-impact ~20%)

1. Rank improvements by **daily job impact** (capture, scan Insights, act on due items) before polish-only or deep refactors.
2. Prefer **cross-app consistency** gaps users already learned on one surface (e.g. Money patterns) when another surface lags.
3. Prefer **finishable one-PR slices** over multi-month platforms.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Ranked backlog with user-job label (#1 job impact first).
- **Important info / action #2 (always visible):** Ship criteria + rough size (S/M) so the pick is safe.
- **Secondary:** Full past-workflow inventory, tech-debt-only items, “nice polish” below the vital few.

### Top user journey to optimize

Open discovery Design → skim ranked list → pick one shippable item → approve Gate B → use the shipped slice in the real app.

### Sensible defaults

- Prefer caregiver/spender day-to-day value over maintainer convenience.
- Prefer completing a paused high-value draft only if it still matches current product (re-verify vs main).
- Exclude “unify everything” platform work unless it is the chosen ship item and scoped tightly.

### Biggest usability risks to fix first (candidates for Analyze)

- Inconsistent list/pagination dialects confuse clients (`docs/ARCHITECTURE.md` follow-up).
- Insights / chart interaction parity gaps across domains (prior workflow evidence).
- Settings / shell length vs rare controls (prior `settings-page-optimize` framing).
- Baby 3AM capture polish vs Money capture parity (many Baby workflows already shipped or at Gate C).
- Trust gaps: idempotency only on a few REST paths; Non-RLS tables need careful ownership filters.

## Non-goals

- Shipping more than one backlog item in this run.
- Redesigning the whole shell or inventing a new feature app.
- Merging every paused Gate C workflow without re-ranking.
- Unifying all pagination / GraphQL dialects unless that item is explicitly picked and scoped.
- Replacing Pocket ID, Postgres, or the clean-minimal design system.

## Assumptions to attack

- “More Baby polish” is always the highest value next step.
- Tech debt (pagination unify) automatically beats a small UX win.
- Paused Gate C drafts are still merge-ready without re-checking main.
- Discovery can rank without talking to a real caregiver — product judgment + primary sources only for this pass.

## Success criteria

1. `01`–`04` describe discovery Outcome + ranked backlog + pick criteria.
2. Human picks one item (Decision N); `00-run.md` records the pick and refined Has UI / Has API / Has DB.
3. Design-review is clean for that ship slice; Gate B approved; Build + smoke + review + tests succeed for that slice.
4. Gate C only after explicit yes for commit / push / PR / merge as needed.

## Open questions

1. Prefer caregiver (Baby) vs spender (Money) if ranks are close? (Default: higher daily-frequency job wins.)
2. Allow “finish a paused Gate C draft” as a backlog item if still valid? (Default: yes, if re-verified.)
3. Cap ship size at “one PR this week”? (Default: yes — reject XXL platform items at pick time.)

## Delivery note (locked)

**Decision 1 → Option 2:** discover ranked backlog, then human picks **one** item to ship in this run. Do not implement before that pick + Gate B.

## Sources (primary)

- `/Users/ptquang86/ws/my-apps/README.md` — product shape, local/prod runbook
- `/Users/ptquang86/ws/my-apps/AGENTS.md` — shell vs feature, design/debug rules
- `/Users/ptquang86/ws/my-apps/docs/ARCHITECTURE.md` — layers, workspace model, pagination follow-up, idempotency
- `/Users/ptquang86/ws/my-apps/docs/DESIGN_GUIDE.md` — mandatory UI system
- `/Users/ptquang86/ws/my-apps/docs/SPEC.md` — clean-minimal + progressive disclosure IA
- `/Users/ptquang86/ws/my-apps/docs/ADDING_A_FEATURE.md` — how new features must plug in
- `/Users/ptquang86/ws/my-apps/docs/PERFORMANCE.md` — load/SSR expectations
- `/Users/ptquang86/ws/my-apps/lib/features/registry.ts` — shell nav source of truth
- `/Users/ptquang86/ws/my-apps/app/(shell)/**/page.tsx` — live product surfaces
- `/Users/ptquang86/ws/my-apps/.my-docs/workflow/*/00-run.md` — prior runs (many paused at Gate C; evidence of unfinished shippable work)
