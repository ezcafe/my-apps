# Performance checks (initial load)

Use this doc to verify regressions after changes that affect bundles, data fetching, or DB indexes.

## Frontend

1. **Production build**:

   ```bash
   npm run build
   ```

2. **Chrome DevTools → Performance / Lighthouse** (mobile + desktop):

   - LCP, TBT, and **JS transfer size** for `/`, `/login`, `/money/analytics`.
   - Compare **number of requests** before first meaningful paint on Money tabs.
   - **SSR hydration check:** on a cold load of `/money/analytics` (signed in; `/money` redirects here), Network should show GraphQL for bootstrap/summary/distribution during the document/RSC work; the client should **not** immediately re-request the same query keys while `staleTime` holds (30s default). Repeat for `/money/spending`, `/money/loans`, `/money/investments`.
   - **Mutation check:** after create/edit transaction or loan pay, lists/KPIs update via React Query invalidate — no full page reload.

3. **Next.js bundles**: inspect `.next` build output and route chunks after `next build` (or use `@next/bundle-analyzer` if added later).

## Backend / API

1. **Money bootstrap** (single GraphQL call for workspace + chart lookups):

   - `POST /api/graphql` — operation `MoneyBootstrap`
   - Measure p50/p95 latency with realistic auth + data volume.

2. **Analytics** (combined above-the-fold + parallel lazy sections):

   - `POST /api/graphql` — **`MoneyAnalyticsDashboard`** (summary + overview in one request)
   - `POST /api/graphql` — `MoneyAnalyticsBudgets`, `MoneyAnalyticsSankey`, `MoneyAnalyticsDistribution`, `MoneyAnalyticsLeaders` (lazy, in-view)
   - `POST /api/graphql` — `MoneyTransactions` (transactions table)

   Legacy single-field ops (`MoneyAnalyticsSummary`, `MoneyAnalyticsOverview`) remain available for prefetch/tests.

3. **Other heavy endpoints**:

   - `POST /api/graphql` — `moneyBudgets`, form/list lookups as needed

   Use `EXPLAIN (ANALYZE, BUFFERS)` on the underlying queries when tuning indexes. See [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html).

## GraphQL hardening (per pod)

| Mechanism | Config |
|-----------|--------|
| Response cache | In-memory via `@graphql-yoga/plugin-response-cache`; session = `Cookie` header; analytics TTLs 30–45 s; `moneyBootstrap` 60 s; `invalidateViaMutation: true` |
| Rate limit | `MONEY_GRAPHQL_RPM` (default 60/min per `userSub`, else first `x-forwarded-for` IP) |
| Query guards | max depth 10, max tokens 1000 (`graphql-armor`) |
| DB pool | `PG_POOL_MAX` (default 10), `statement_timeout` 5 s |

### Server-Timing

Successful GraphQL responses include a `Server-Timing` header, e.g. `gql;desc="MoneyAnalyticsDashboard";dur=42.3`. Inspect in Chrome DevTools → Network → response headers. Operations slower than 500 ms are logged as `[graphql] slow operation …`.

### Load smoke (local)

With the dev server running:

```bash
npx autocannon -c 100 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"query":"query { __typename }"}' \
  http://localhost:3000/api/graphql
```

Expect fast 429s at `-c 500` when rate limit is hit; repeat requests should hit the response cache after the first miss.

## Environment knobs

| Variable | Default | Purpose |
|----------|---------|---------|
| `PG_POOL_MAX` | `10` | Max Postgres connections per Node process |
| `MONEY_GRAPHQL_RPM` | `60` | GraphQL requests per minute per user or IP |

## Out of scope (follow-up)

- PgBouncer / managed Postgres pooler (required for true 100k concurrent)
- Redis-backed shared response cache (cache hits across pods)
- Edge caching of authenticated page HTML

## Database housekeeping jobs

Schedule these jobs from a cron sidecar (or `pg_cron` when available):

```sql
DELETE FROM security_rate_limit
WHERE bucket_start < now() - interval '1 hour';

DELETE FROM money_import_preview
WHERE expires_at < now();
```

## pg_stat_statements quick checks

After enabling `pg_stat_statements`, list top heavy queries:

```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

## Partitioning thresholds (watch list)

- Consider partitioning `money_transaction` by `occurred_at` when table size exceeds ~10M rows or autovacuum falls behind.
- Consider partitioning `audit_event` by `created_at` when retention exceeds ~50M rows.
- Keep unpartitioned tables until one of these thresholds is hit; partitioning adds migration and query complexity.

## Database migrations

After pulling changes, apply new migrations (e.g. `0012_money_perf_indexes.sql`) so index definitions exist in your database.

## References

- [Next.js dynamic import](https://nextjs.org/docs/app/api-reference/functions/dynamic)
- [Next.js optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)
- [Yoga response cache](https://the-guild.dev/graphql/yoga-server/docs/features/response-caching)
- [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
- [PostgreSQL statement_timeout](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-STATEMENT-TIMEOUT)
