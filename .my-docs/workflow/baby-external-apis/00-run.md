# Workflow run: baby-external-apis

**Status:** gate-a2

**Mode:** full

**Complexity:** complex — new Baby public/external API surface for third-party apps (auth + contracts)

**Review profile:** full

**SPM plan:** (set before code review; expect api + security; refine Has DB)

**Last stage:** Gate A2 paused — need real Settings screenshot

## Resolved models

| Tier | Slug | Notes |
|------|------|-------|
| High | claude-opus-5-thinking-high | Analyze, Design, Update; UI concept when Has UI |
| Medium | composer-2.5-fast | Preferred Medium `gpt-5.6-sol-medium` unavailable → Fast |
| Fast | composer-2.5-fast | Build, Fix, Smoke, Test, Merge; mechanical stages |

**Preferred defaults:** High `claude-opus-5-thinking-high` · Medium `gpt-5.6-sol-medium` · Fast `composer-2.5-fast`

**Fallback:** Medium → Fast. Mechanical stages use Fast.

## Repo

- **Root:** /Users/ptquang86/ws/my-apps
- **Branch:** main
- **Started:** 2026-09-22
- **Last stage:** Gate A2 paused
- **Has UI:** yes — lean Settings → API tokens (Baby app option)
- **Has API:** yes — external Baby HTTP/GraphQL contracts for third-party callers
- **Has DB:** unknown — refine if new token prefix / scopes / tables needed (likely reuse `api_token` row shape)
- **UI concept skip:** none — lean UI concept; screenshot pending

## Orchestrator card

| Field | Value |
|-------|-------|
| Phase | design |
| Next step | Gate A2 — human approve UI look (after screenshot) |
| Task description | (human gate) |
| Stage id | gate-a2 |
| stages.md section | my-design-workflow — Gate A2 |
| Model tier | n/a |
| Prereq Result | skim done; 01b lean drafted; ui-ref pending |
| Artifact to check | ui-refs/01-settings-api-tokens-light.png |
| Main-thread fallback | ideation, gate-a, skim (usage limit) |

## Gates

- [x] Gate A — Day-to-day + 80/20 (auto when `01a` Result ok)
- [ ] Gate A2 — UI look approved from `ui-refs/` (human; Has UI only; before Analyze)
- [ ] Gate B — Design + tasks + tests approved
- [ ] Gate C — Merge approved

## Notes

- Complexity: complex — Baby public API was deferred in original baby-care design; Money/Investment already have Bearer tokens (`mny_` / `inv_`); Baby has GraphQL at `/api/graphql/baby` and Telegram webhook today.
- Sibling run `extract-reusable-code` paused at Gate C — separate; do not mix.
- User ask: "support baby apis for external app to call"
- Task subagents hit usage limit — parent ran Ideation, Gate A, skim on main thread.
- Gate A2 blocked: no live `localhost:3000` + no e2e auth state for Settings screenshot. Do not GenerateImage for existing Settings surface.

## Run log

- **19:12** · done · Step 0 — Classify + resolve models · Mode full, Review profile full, Has API yes
- **19:14** · done · Step 1 — Ideation · ok · main-thread fallback — usage limit · Has UI yes
- **19:15** · done · Gate A — ok · auto-approved · main-thread fallback — usage limit
- **19:16** · done · Step 1s — Light repo skim · ok · main-thread fallback — usage limit
- **19:17** · paused · Gate A2 — UI images · need real Settings → API tokens screenshot
