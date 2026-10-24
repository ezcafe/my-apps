# Tasks (TDD-ready)

Each task: behavior, failing test name first, files allowed, done evidence.

## Planned tests

| Case | Failing test name | Covers |
|------|-------------------|--------|
| Cache session key still isolates API vs cookie tenants after Yoga/plugin bump | `responseCacheSessionKey keys api tokens by token fingerprint` (extend/keep `money-yoga.test.ts`) | response-cache + yoga wiring |
| Cache session key includes money workspace cookie | `responseCacheSessionKey includes workspace cookie for session requests` | multi-tenant cache safety |
| Service errors still map to GraphQLError with extensions | `mapServiceError throws GraphQLError with code extension` (in `map-service-error.test.ts`) | graphql 17 GraphQLError shape |
| Money Yoga module loads after upgrade (no import-time throw) | `money yoga createYoga module imports cleanly` (new or extend) | yoga 6 / scalars / armor plugins |
| package.json no longer lists confirmed-unused deps | `package.json omits unused dependency rate-limiter-flexible` (unit reading package.json) | unused cleanup SoT |

## Build tasks (order)

1. **Failing tests first** — ensure Planned tests exist and fail or go red when GraphQL cluster is mid-break; add any missing cases before production bumps.
2. **GraphQL cluster** — bump packages; fix `lib/graphql/**` (+ client if needed) until Planned GraphQL tests + typecheck pass.
3. **Armor peers** — resolve as designed (upgrade → override → document pin).
4. **Next 16.4 family** — align pins; fix any breakages.
5. **Other outdated** — remaining bumps; fix call sites.
6. **Unused cleanup** — knip/depcheck; remove confirmed unused; make package.json assertion green; trim `next.config` optimize list if `d3-shape` removed.
7. **Verify bar** — typecheck, lint, unit, build, e2e all green.

## Done evidence

- Lockfile + `package.json` reflect latest agreed set; unused packages gone.
- Planned tests green; verify bar green.
- No intentional API/DB/auth behavior change.
