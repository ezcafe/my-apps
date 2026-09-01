#!/usr/bin/env node
/**
 * Runs drizzle-kit migrate with clearer failure output.
 * Suppresses PostgreSQL NOTICE spam (often printed as JSON) that can confuse CI/logs.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["drizzle-kit", "migrate"],
  {
    cwd: appRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PGOPTIONS: "-c client_min_messages=warning",
    },
  },
);

if (result.error) {
  console.error("db:migrate failed to start drizzle-kit:", result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    `\ndb:migrate failed (exit ${result.status ?? "unknown"}).`,
  );
  console.error(
    "If the schema was created with db:push, baseline first, e.g.:",
  );
  console.error(
    "  ALLOW_BASELINE_DRIZZLE=1 pnpm run db:baseline -- --through 0026_drop_legacy_finance_tables",
  );
  process.exit(result.status ?? 1);
}

console.log("db:migrate finished successfully.");
