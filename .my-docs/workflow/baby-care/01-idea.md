# Idea: Baby care workspace app

## Problem

Parents and caregivers juggle feeds, diapers, sleep, and growth notes across memory, chats, and sticky notes. At 3am, with one hand free, switching apps or debating “who logged what” is painful. Offline edits and multiple caregivers make shared logs unreliable without a clear merge rule.

## User / audience

- **Primary:** Sleep-deprived parents who need one-handed, low-decision logging (feed, diaper, sleep) and a shared timeline.
- **Secondary:** Other caregivers in the same household (partner, nanny, grandparent) who need the same schedule without asking.
- **Later consumers:** Pediatric visits (reports/PDF) and external apps via a public API.

## Outcome

A new **workspace-backed Baby Care feature** in this shell (same pattern as Money: own `WorkspaceAppKey`, routes, APIs, provider) where caregivers can:

1. **Log care events fast** — feeding (breast L/R, formula, pump with timers/counters), diaper (wet / dirty / mixed), sleep (start/end).
2. **See one shared timeline** — daily view first on home; weekly/monthly summaries and PDF export later.
3. **Stay in sync** — multiple caregivers see the same schedule (online sync in MVP; offline + CRDT merge later).
4. **Track growth & health** — weight, height, head circumference, temperature, medication logs with charts.
5. **Use it one-handed** — large targets; home = Log feed · Log nap · Timeline.
6. **Get Telegram help** — notifications and add-log for sleep, feed, diaper, health.
7. **Use EN/VI** — English and Vietnamese UI strings.
8. **Call from outside later** — public external API deferred; keep internal contracts clean for later.

## Metric

**Primary signal:** A caregiver can open the app (or Telegram) and record a feed, diaper, or sleep start/end in under ~10 seconds with one hand, and a second caregiver sees that event on the shared timeline without a chat ask.

## Non-goals (this pass / MVP)

- Sleep prediction (deferred; target later: next sleep, next diaper, next feeding).
- Weekly/monthly reports + PDF export.
- Offline sync and conflict merge (deferred; preferred model when built: **CRDT**).
- Public external API.
- Medical diagnosis / clinical advice.
- Wearables / native mobile apps.
- Multi-baby or role-limited caregivers.

## Gate 1 decisions (approved)

| Topic | Decision |
|-------|----------|
| MVP must-have | Full feeding, diaper, sleep log, growth/meds, Telegram (notify + add log), EN + VI |
| MVP later | Sleep prediction; reports + PDF; offline/conflict merge; public API |
| Babies / workspace | One |
| Caregiver roles | Everyone edits |
| Home screen | Log feed · Log nap · Timeline |
| Telegram events | sleep, feed, diaper, health (notify + create logs) |
| Sleep prediction (later) | next sleep, next diaper, next feeding |
| Conflict model (later) | CRDT |
| First users / deadline | End of month (2026-09) |
| Privacy | Normal workspace auth only; no extra Telegram privacy bar |

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| One baby per workspace is enough | Yes (Gate 1) | — | Multi-baby UI later |
| Home = three actions | Yes (Gate 1) | — | — |
| Online sync without offline/CRDT is OK for MVP | Yes (Gate 1) | Caregivers lose data offline in field | Pull offline+CRDT into MVP |
| Telegram bot + web both in MVP | Yes (Gate 1) | Bot blocked / hard to ship by month end | Web-first, Telegram thin |
| EN+VI together in MVP | Yes (Gate 1) | i18n slows ship | Ship EN strings keys early |

## What we should not build

- Cluttered dashboard on first open.
- Fake sleep-prediction precision in MVP.
- Over-engineered CRDT before offline is in scope.
- Role matrices (everyone edits).
- Public API surface in this pass.

## Success criteria (MVP)

- [ ] Baby Care registered as its own workspace-backed app.
- [ ] One-handed home: Log feed, Log nap, Timeline.
- [ ] Feeding (L/R, formula, pump + timers/counters), diaper types, sleep start/end.
- [ ] Growth/health entries + charts (weight, height, head, temp/meds).
- [ ] Shared timeline for all workspace editors.
- [ ] Telegram notify + add-log for sleep, feed, diaper, health.
- [ ] UI in English and Vietnamese.
- [ ] Design system: large hit targets, light+dark, skeleton parity.
- [ ] Explicit deferrals documented: prediction, reports/PDF, offline/CRDT, public API.

## Open questions (non-blocking for Analyze)

- Telegram bot hosting / token management pattern in this repo (if any).
- Whether “real-time” in MVP means polling, SSE, or websocket (Design).
- Growth chart library: visx per repo rules.

---

*Gate 1 answers recorded 2026-09-06. Ideation approved pending explicit user “approve” — treated as approved via answered decisions.*
