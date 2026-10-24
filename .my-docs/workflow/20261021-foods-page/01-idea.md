# Idea / framing

## Intent

Ship a new **Foods** workspace feature: users log what they ate by food type (e.g. pork, beef, vegetable, fish), see a **calendar with icons** per day, and **after logging** run **AI analysis** and **show the result in the Foods product UI** (user confirmed — not workflow-only).

## Goals

- New shell nav item **Foods** with `WorkspaceAppKey` + thin `app/api/foods/**` + domain tables (per `docs/ADDING_A_FEATURE.md`).
- Log **several** food types on the **same day** (user confirmed).
- Each entry: date + food type; **optional** meal slot (breakfast / lunch / dinner) **and/or** short note (user confirmed).
- Calendar view: days show icons for all logged types that day.
- Design-system parity (tokens, skeletons, light/dark).
- After the user logs food: **automatically** call AI analysis (server-side) right after each save and display suggestions/results on the Foods UI.
- Analysis focus: **variety / balance of types** + **suggestions for the next day** (user confirmed).

## Non-goals

- Full nutrition / calorie / recipe tracking (unless user expands scope).
- Meal photos, barcode scan, or external food databases in v1.
- Free-form chat with the AI (analysis result panel is enough unless expanded).

## Anti-goals

- Mount Foods bootstrap in global shell layout.
- Hard-coded colors/radii or one-off calendar that ignores DESIGN_GUIDE.

## Constraints

- Follow `docs/ADDING_A_FEATURE.md` + `docs/ARCHITECTURE.md` + `docs/DESIGN_GUIDE.md`.
- Workspace-scoped; auth via existing session/workspace helpers.
- Mode **full** / profile **full** — Gate B blocking; Gate C blocking for commit/push/PR/merge.

## Has UI (tentative)

yes (page + calendar + log UI). Card Has also: API yes, DB yes, auth/PII/schema yes.

## Shared understanding

- [x] User confirmed (brainstorm hard-gate) — `yes, foods v1 looks good`

## Decisions (from chat)

- Same day: **several** food types allowed.
- Entry fields: date + type required; meal slot and short note **optional**.
- AI: **in-product** — analyze after log, show result in Foods UI (not Cursor-CLI-only workflow).
- Trigger: **auto right after each save** (user confirmed). Scope for prompt context *guess*: recent days + today’s entries.
- Result content: **variety/balance** + **next-day suggestions** (user confirmed). Not medical advice — short disclaimer in UI (*guess*).

## Open (parent) — defaults if confirmed

- Starter presets: pork, beef, vegetable, fish + a few more (*guess*); editable catalog can wait for v2.
- AI provider: new server-side LLM call via env (*guess*); exact vendor chosen in Design.
