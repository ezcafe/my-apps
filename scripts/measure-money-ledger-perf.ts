/**
 * One-shot measure: seed ≥10k under Spending first-load predicates, time spans,
 * print ranked table (no full row dumps).
 *
 * Usage: pnpm exec tsx --import dotenv/config scripts/measure-money-ledger-perf.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatMoneyLedgerPerfRankTable,
  measureMoneyLedgerFirstLoad,
} from "../lib/money-ledger-perf-measure";
import { MONEY_LEDGER_PERF_FIXTURE_MIN_TX } from "../lib/money-ledger-perf-fixture";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const keep = process.argv.includes("--keep");
  const result = await measureMoneyLedgerFirstLoad({
    keepFixture: keep,
    includeSummary: true,
  });

  if (result.fixture.txCount < MONEY_LEDGER_PERF_FIXTURE_MIN_TX) {
    console.error(
      `Fixture txCount ${result.fixture.txCount} < ${MONEY_LEDGER_PERF_FIXTURE_MIN_TX}`,
    );
    process.exit(1);
  }

  const table = formatMoneyLedgerPerfRankTable(result.ranked);
  const md = [
    "# Money ledger perf measure",
    "",
    `**Updated:** ${new Date().toISOString()}`,
    `**Fixture txs:** ${result.fixture.txCount}`,
    `**Workspace:** synthetic (\`ownedByUserSub=synthetic-money-ledger-perf\`)`,
    `**Window:** \`${result.fixture.window.from}\` → \`${result.fixture.window.to}\``,
    "",
    "## Ranked read-path spans (top N — gates Tasks 3/6)",
    "",
    table,
    "",
    "## All spans (includes `fixture.seed` write)",
    "",
    formatMoneyLedgerPerfRankTable(result.spans),
    "",
    "## Gate notes",
    "",
    `- Task 3 (COUNT/hasMore): ${
      result.ranked.some((s) => s.name === "list.count") &&
      result.ranked[0]?.name === "list.count"
        ? "APPLY — `list.count` ranks #1 on read path"
        : result.ranked.some((s) => s.name === "list.count")
          ? "APPLY — `list.count` is in top ranked read spans"
          : "SKIP — `list.count` not in top ranked read spans"
    }`,
    "- Task 4 (defer SSR summary): APPLY per Grill default (not COUNT-gated).",
    "- Task 6 (targeted invalidation): SKIP — no post-mutation refetch span in this harness.",
    "",
    "## Notes",
    "",
    "- Seed rows are inside the Spending first-load month + excludeAccountTypes lock.",
    "- No full row dumps.",
    keep ? "- Fixture kept (`--keep`)." : "- Fixture cleaned after measure.",
    "",
  ].join("\n");

  const outPath = join(
    process.cwd(),
    ".my-docs/workflow/20261027-transactions-perf/05-measure-notes.md",
  );
  writeFileSync(outPath, md, "utf8");
  console.log(md);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
