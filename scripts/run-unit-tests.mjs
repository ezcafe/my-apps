/**
 * Unit test runner: default suites without experimental module mocks;
 * mock.module suites in a separate process with --experimental-test-module-mocks.
 *
 * Blast radius: the experimental flag never applies to the default unit pool.
 * Only the four listed files run under that flag (dedicated process).
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["lib", "components", "db", "features"];

/** Suites that call mock.module — must use --experimental-test-module-mocks. */
const MODULE_MOCK_FILES = new Set([
  "lib/api-http-transport.test.ts",
  "lib/api-investment-context.test.ts",
  "lib/investment-rest-hardening.test.ts",
  "lib/http-idempotency-route.test.ts",
]);

function collectTests(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      collectTests(p, out);
      continue;
    }
    if (!name.endsWith(".test.ts")) continue;
    const rel = relative(process.cwd(), p).split("\\").join("/");
    if (MODULE_MOCK_FILES.has(rel)) continue;
    out.push(rel);
  }
  return out;
}

function run(args) {
  const result = spawnSync("pnpm", ["exec", "tsx", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

const unitFiles = ROOTS.flatMap((root) => collectTests(root));
const mockFiles = [...MODULE_MOCK_FILES];

const importEnv = ["--import", "./scripts/test-env.mjs", "--test"];

let code = run([...importEnv, ...unitFiles]);
if (code !== 0) process.exit(code);

code = run([
  "--experimental-test-module-mocks",
  ...importEnv,
  ...mockFiles,
]);
process.exit(code);
