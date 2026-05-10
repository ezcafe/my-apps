# Performance checks (initial load)

Use this doc to verify regressions after changes that affect bundles, data fetching, or DB indexes.

## Frontend

1. **Production build** (from `apps/`):

   ```bash
   npm run build
   ```

2. **Chrome DevTools → Performance / Lighthouse** (mobile + desktop):

   - LCP, TBT, and **JS transfer size** for `/`, `/login`, `/money`, `/money/analytics`.
   - Compare **number of requests** before first meaningful paint on Money tabs.

3. **Next.js bundles**: inspect `.next` build output and route chunks after `next build` (or use `@next/bundle-analyzer` if added later).

## Backend / API

1. **Money bootstrap** (single call replaces init + list + lookups):

   - `GET /api/money/workspace/bootstrap` — measure p50/p95 latency with realistic auth + data volume.

2. **Heavy endpoints** (PostgreSQL):

   - `GET /api/money/analytics`
   - `GET /api/money/budgets?includeSpent=1&from=…&to=…`
   - `GET /api/money/transactions`

   Use `EXPLAIN (ANALYZE, BUFFERS)` on the underlying queries when tuning indexes. See [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html).

## Database migrations

After pulling changes, apply new migrations (e.g. `0005_money_tx_perf_indexes.sql`) so index definitions exist in your database.

## References

- [Next.js dynamic import](https://nextjs.org/docs/app/api-reference/functions/dynamic)
- [Next.js optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)
- [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
