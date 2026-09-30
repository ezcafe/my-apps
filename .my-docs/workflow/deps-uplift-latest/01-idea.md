# Idea: Uplift dependencies to latest (stale >1 week)

## Problem

Root `package.json` / lockfile deps may lag latest releases by more than about one week. Stale packages miss fixes, security patches, and known migrations. Blind bumps without reading change notes risk breakages.

## User / audience

Maintainers of **my-apps** (developers / agents shipping the Next.js monorepo).

## Outcome

Dependencies older than ~1 week are uplifted to current latest (within intended major/policy). Where changelogs or upgrade guides require code/config changes, those migrations are applied. Build, unit, and relevant checks pass.

## Metric

- Outdated packages older than ~1 week are resolved or explicitly deferred with reason
- Breaking / migrate notes from primary sources are applied or documented as non-goals
- `pnpm` install + typecheck/lint/unit (smoke) green

## Has UI

**no** — dependency / tooling / library versions only; no product UI change as the goal.

## Copy/token-only?

No — may require code/config migration for breaking library upgrades.

## 80/20 UI

N/A — no UI

## Non-goals

- Redesigning product features
- Uplifting Apple **MyBaby** SPM/Cocoa deps in this run (unless expanded later)
- Forcing major bumps that the project pins for a deliberate reason without reading notes
- Changing app behavior beyond what upgrades require

## Assumptions to attack

- “Latest” is always safe without reading release notes
- Every outdated package must bump in one PR even if a major needs a separate migration plan
- Lockfile-only bumps never need app code changes

## Success criteria

1. Inventory of outdated deps (age / current vs latest) drives the work list
2. Primary change notes / upgrade guides read for packages that move (esp. majors or known-breaking)
3. `package.json` + lockfile updated; migrations applied when applicable
4. Smoke (build + unit) passes

## Open questions

- None blocking for Analyze — refine pin policy (e.g. Next major) during Analyze if discovered

## Sources (primary)

- `/Users/ptquang86/ws/my-apps/package.json` — declared deps and engines
- `pnpm outdated` / registry metadata — current vs latest versions
- Official release notes / changelogs / upgrade guides per package (npm package pages, GitHub releases, Next.js / React / Drizzle / Zod docs as applicable)
