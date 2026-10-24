# Design

**Result:** done

**Design present** only when Result **`done`** (file alone / `pending` never pays).

## Option A — Single coordinated uplift PR (recommended)

**What:** One draft branch that follows Grill order: GraphQL cluster (`graphql` 17, `graphql-yoga` 6, `graphql-scalars` 2, `@graphql-yoga/plugin-response-cache` 4) + code fixes → Next 16.4 family alignment → remaining outdated bumps → remove unused packages (knip/depcheck + false-positive check). Prove with typecheck, lint, unit, e2e, and build.

**Example:**

```bash
pnpm add graphql@^17 graphql-yoga@^6 graphql-scalars@^2 @graphql-yoga/plugin-response-cache@^4
# fix Yoga logger / re-export / scalar call sites under lib/graphql/**
pnpm add next@16.4.3 eslint-config-next@16.4.3 @next/bundle-analyzer@16.4.3
pnpm add -D @next/swc-darwin-arm64@16.4.3   # keep exact match with next
pnpm update   # remaining outdated within agreed set
# knip/depcheck → remove unused (e.g. candidate rate-limiter-flexible, d3-shape if confirmed)
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e
```

**Pros:** Matches locked ask (latest + GraphQL majors + unused cleanup); one verify bar; no half-upgraded mainline.  
**Cons:** Larger blast radius; Armor peer issues block the whole PR until resolved.

## Option B — Split PRs (GraphQL first, then rest)

**What:** PR1 = GraphQL cluster + code only; PR2 = Next + other bumps + unused removals. Same verify bar per PR.

**Example:** PR1 touches only `package.json` GraphQL lines + `lib/graphql/**` + related tests; PR2 bumps Next/React/etc. and deletes unused deps.

**Pros:** Smaller reviews; GraphQL risk isolated.  
**Cons:** Two Gate C cycles; temporary mixed versions on main; slower for one “latest” outcome.

## Recommendation

**Pick Option A.** Grill already locked a single ordered plan and one proof bar; splitting adds process cost without changing the end state. Use Option B only if Armor/graphql 17 forces a long investigation that blocks unrelated bumps.

## Chosen design (Option A)

### Order of work (Build)

1. **GraphQL cluster install** — bump `graphql`, `graphql-yoga`, `graphql-scalars`, `@graphql-yoga/plugin-response-cache` together; refresh lockfile.
2. **Code migration** — apply Yoga v5→v6 + GraphQL 17 + scalars 2 deltas only where this repo uses them:
   - Prefer existing `GraphQLError` from `graphql` (already pattern in resolvers/yoga).
   - Rename any `yoga.logger` / plugin `logger` → `log` if present after bump.
   - Replace removed Yoga re-exports if any appear at typecheck.
   - Confirm scalar imports (`GraphQLJSON`, `GraphQLJSONObject`, `BigIntResolver`) still resolve.
   - Re-check `useResponseCache` options for v4 + Yoga 6.
3. **Armor peers** — if install/peer warnings: try Armor latest, then `pnpm.overrides` for graphql alignment; document any temporary pin in tasks/notes — do not drop graphql 17.
4. **Next 16.4 alignment** — `next`, `eslint-config-next`, `@next/bundle-analyzer`, optional `@next/swc-darwin-arm64` same version string.
5. **Remaining outdated** — React patch, Playwright, passkit, zod, query, drizzle-orm patch, dotenv 18, eslint patch, etc. per `pnpm outdated`.
6. **Unused cleanup** — run knip (fallback depcheck); remove only confirmed unused (candidates: `rate-limiter-flexible`; `d3-shape` if not imported and only in `optimizePackageImports`). Keep dynamic/script/config deps (`yahoo-finance2`, `dotenv`, …).
7. **Verify bar** — `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.

### Non-goals

- New product features / UX redesign.
- Overlap consolidation of still-used libraries.
- Schema migrations unless a library bump forces them.
- next-auth major move beyond what “latest” already resolves on the current beta line (stay on Auth.js v5 line unless outdated forces a safe bump).

### Hot files

- `package.json`, `pnpm-lock.yaml`
- `lib/graphql/money-yoga.ts`, `baby-yoga.ts`, resolvers, `map-service-error.ts`
- `lib/gql-client.ts`, `lib/gql-request-with-circuit.ts`
- `next.config.ts` (if removing `d3-shape` from optimize list)
- Tests: `lib/graphql/money-yoga.test.ts`, `map-service-error.test.ts`

### API / DB impact

- **API:** GraphQL HTTP behavior must stay equivalent (auth context, cache session key, error codes). No intentional new operations.
- **DB:** No schema change expected; drizzle-orm patch only unless install forces otherwise.
- **Auth:** Session cookie names in cache key stay as today.

## Proposed Has (parent applies to card)

Stage records proposed values only — parent writes card Has via Always §4.

## Has API / DB (proposed)

- **Has UI:** yes  
- **Has API:** yes  
- **Has DB:** yes (drizzle in tree; no migration expected — still yes for lens/review)  
- **Has auth/PII/schema:** yes  

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)
