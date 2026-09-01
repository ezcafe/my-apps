#!/usr/bin/env node
/**
 * Drops `public` and `drizzle` schemas so a baseline Drizzle migration can run cleanly.
 * Needed when the DB still has rows in drizzle.__drizzle_migrations or objects from an
 * older schema while db/migrations was replaced (e.g. new 0000_*.sql baseline).
 *
 * Destroys all data in those schemas. Requires ALLOW_DESTRUCTIVE_DB_RESET=1.
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
if (process.env.ALLOW_DESTRUCTIVE_DB_RESET !== "1") {
  console.error(
    "Refusing to reset: set ALLOW_DESTRUCTIVE_DB_RESET=1 first (this drops public + drizzle)."
  );
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
try {
  await sql.unsafe(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await sql.unsafe(`DROP SCHEMA IF EXISTS public CASCADE`);
  await sql.unsafe(`CREATE SCHEMA public`);
  await sql.unsafe(`GRANT ALL ON SCHEMA public TO public`);
  await sql.unsafe(`GRANT ALL ON SCHEMA public TO CURRENT_USER`);

  console.log("Reset complete. Run: pnpm run db:migrate");
} finally {
  await sql.end({ timeout: 10 });
}
