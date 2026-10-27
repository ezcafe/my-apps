#!/usr/bin/env node
/**
 * Seed ≥10k synthetic txs (Spending first-load window) and print ranked spans.
 *
 * Usage:
 *   pnpm exec tsx --import dotenv/config scripts/measure-money-ledger-perf.ts
 *
 * Or this wrapper (loads dotenv, then runs the TS entry):
 *   node --import dotenv/config --import tsx scripts/measure-money-ledger-perf.mjs
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "measure-money-ledger-perf.ts");
const result = spawnSync(
  "pnpm",
  ["exec", "tsx", "--import", "dotenv/config", entry, ...process.argv.slice(2)],
  { stdio: "inherit", shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
