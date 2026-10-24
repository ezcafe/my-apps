# Analysis

**Result:** done

## Context

**Ask:** Uplift deps to latest (incl. GraphQL majors), fix breaking call sites, remove unused packages; success = all features still work.

**Repo:** Next 16 App Router monorepo-style single app; GraphQL via Yoga at `lib/graphql/*-yoga.ts` + `app/api/graphql/**`; client via `graphql-request`; Drizzle/postgres; Auth.js; visx charts.

**Node engines already OK for Yoga 6 / GraphQL 17:** `^22.22.2 || ^24.15.0 || >=26.0.0` (Yoga 6 and GraphQL 17 need Node 22+).

**Primary upgrade clusters**

| Cluster | Current → latest | Code impact |
|---------|------------------|-------------|
| GraphQL.js | 16.14 → 17.x | Upgrade guide: [v16→v17](https://www.graphql-js.org/upgrade-guides/v16-v17/). App already uses `new GraphQLError(msg, { extensions })` (good). Watch deep imports, `graphql/subscription`, defaultValue shapes, conditional exports. |
| Yoga | 5.24 → 6.x | Migration: [Yoga v5→v6](https://the-guild.dev/graphql/yoga-server/docs/migration/migration-from-yoga-v5). Hive Logger; `logger`→`log`; drop re-exports (`createGraphQLError`, etc.); body size default 25MB; response-cache plugin major with it. |
| graphql-scalars | 1.25 → 2.x | Used in `money-resolvers.ts`, `baby-resolvers.ts` (`GraphQLJSON`, `GraphQLJSONObject`, `BigIntResolver`). Confirm v2 export paths. |
| response-cache | 3 → 4 | `useResponseCache` in money/baby yoga; align with Yoga 6 / envelop; rename `logger`→`log` if passed. |
| Next line | 16.3.7 → 16.4.x | Align `next`, `eslint-config-next`, `@next/bundle-analyzer`, `@next/swc-*`. |
| Other outdated | React patch, Playwright, passkit 3.7, zod, query, drizzle-orm patch, dotenv 18, eslint patch | Mostly range bumps + smoke; passkit/dotenv may need small API checks. |

**Unused cleanup (preliminary import audit)**

| Package | Evidence | Likely action |
|---------|----------|---------------|
| `rate-limiter-flexible` | Only in `package.json` / lock — no app imports | Remove if Build confirms unused |
| `d3-shape` | Only listed in `next.config.ts` `optimizePackageImports`; no source imports (visx may pull transitively) | Remove direct dep + config entry if unused |
| Others sampled | `csv-parse`, `passkit-generator`, `yahoo-finance2` (dynamic), `web-push`, `qrcode`, `dotenv` (scripts), `@auth/core`, `node-forge` — still referenced | Keep |

Use knip or depcheck in Build to confirm before removals; do not remove packages required only via config/scripts without checking those paths.

**Armor peer risk:** `@escape.tech/graphql-armor-*` currently resolve `graphql@16`. After bumping to graphql 17, verify peers install cleanly or need armor upgrades / overrides.

## Risks

1. **Yoga 6 + GraphQL 17 together** — largest behavior surface (logger, plugins, fetch body limits, peer graph). Order: bump graphql + yoga + scalars + response-cache as one coordinated set; fix typecheck before other majors.
2. **Armor / envelop peers** — may block clean install or break plugins at runtime.
3. **False-positive “unused”** — dynamic `import()`, `serverExternalPackages`, optimizePackageImports, scripts — audit those before delete.
4. **Next 16.4** — smaller than GraphQL, but can affect build/dev; keep aligned optional SWC package.
5. **E2E flakiness** — “all features still work” depends on green `test:e2e`; GraphQL route regressions show up there.
6. **dotenv 18** — scripts use `import "dotenv/config"`; confirm v18 still supports that entry.

## Open questions

1. Proof bar for Gate C: typecheck + lint + unit + e2e (+ `next build`?) — still a guess unless Design locks it. *(Recommend: typecheck, lint, unit, e2e; build if Next bump.)*
2. If Armor does not support graphql 17 yet: override vs pin Armor vs delay graphql 17 — Design must pick with evidence from install.
3. knip vs depcheck vs manual list for unused — Design picks one SoT method.
