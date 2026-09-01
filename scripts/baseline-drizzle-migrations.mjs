#!/usr/bin/env node
/**
 * Records a Drizzle migration as already applied when the DB schema was created
 * via db:push or an empty drizzle.__drizzle_migrations table.
 *
 * Drizzle compares only the latest row's created_at (journal `when`) against each
 * migration; inserting one row for `--through` skips all earlier tags and runs later ones.
 *
 * Requires ALLOW_BASELINE_DRIZZLE=1. Does not run SQL — schema must already match.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, "../db/migrations");

function parseArgs(argv) {
  let through = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--through" && argv[i + 1]) {
      through = argv[++i];
    }
  }
  return { through };
}

const { through } = parseArgs(process.argv);
if (!through) {
  console.error("Usage: node scripts/baseline-drizzle-migrations.mjs --through <migration_tag>");
  console.error("Example: --through 0023_money_tx_exclude_from_reports");
  process.exit(1);
}

if (process.env.ALLOW_BASELINE_DRIZZLE !== "1") {
  console.error(
    "Refusing to baseline: set ALLOW_BASELINE_DRIZZLE=1 (only when the DB already matches migrations through that tag).",
  );
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const journal = JSON.parse(
  readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
);
const entry = journal.entries.find((e) => e.tag === through);
if (!entry) {
  console.error(`Tag not found in meta/_journal.json: ${through}`);
  process.exit(1);
}

const sqlPath = join(migrationsFolder, `${through}.sql`);
const query = readFileSync(sqlPath, "utf8");
const hash = createHash("sha256").update(query).digest("hex");
const createdAt = entry.when;

const sql = postgres(url, { max: 1 });
try {
  const existing = await sql`
    SELECT id, hash, created_at FROM drizzle.__drizzle_migrations
    ORDER BY created_at DESC LIMIT 1
  `;

  if (existing[0] && Number(existing[0].created_at) >= createdAt) {
    console.log(
      `Already baselined through ${through} (latest created_at=${existing[0].created_at}).`,
    );
    process.exit(0);
  }

  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${hash}, ${createdAt})
  `;

  console.log(`Baselined through ${through} (created_at=${createdAt}). Run: pnpm run db:migrate`);
} finally {
  await sql.end({ timeout: 10 });
}
