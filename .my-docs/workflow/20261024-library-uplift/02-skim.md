# Skim

**Result:** done

## Findings

### Stack surface
- Next 16.3.7 app (`app/`), React 19.3, pnpm 10, Node 22+/24+/26+.
- GraphQL server: Yoga + Armor + response-cache under `lib/graphql/*-yoga.ts`, routes `app/api/graphql/**`.
- Client: `graphql-request` via `lib/gql-client.ts` / `lib/gql-request-with-circuit.ts`.
- DB: Drizzle + postgres.js; Money/Foods/etc. workspace features.
- Auth: `next-auth` v5 beta + `@auth/core`.
- Charts: `@visx/*` + `d3-shape`; CSV: `csv-parse`; wallet: `passkit-generator`; quotes: `yahoo-finance2`.

### Outdated / break risk (ideation snapshot)
- **Majors:** `graphql` 16→17, `graphql-yoga` 5→6, `graphql-scalars` 1→2, `@graphql-yoga/plugin-response-cache` 3→4, `dotenv` 17→18.
- **Minors/patches:** Next/eslint-config-next/swc 16.3→16.4, React 19.3.0→19.3.1, Playwright, passkit 3.6→3.7, zod, tanstack query, rate-limiter, yahoo-finance2, drizzle-orm patch.
- Armor packages still resolve `graphql@16` today — peer alignment after graphql 17 is Analyze work.

### Hot touch points for GraphQL majors
- `lib/graphql/money-yoga.ts`, `baby-yoga.ts`, resolvers, `map-service-error.ts`.
- `app/api/graphql/**` route wiring.
- Client request helpers + any scalar usage from `graphql-scalars`.
- Schema export script `scripts/export-graphql-schema.mjs` / `docs/*.graphql`.

### Unused-package cleanup
- No `depcheck` in repo yet — Analyze/Design should pick a detection method (depcheck / knip / import graph).
- Candidates to verify (not proven unused): direct `d3-shape` if only reached via `@visx`; other direct deps need import audit before remove.

### Verify bar (guess → Design)
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` (and build if Next bump requires it).
