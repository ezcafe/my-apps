/**
 * One-shot measure: seed dual fixture, time investment + loan spans,
 * write ranked tables (no full row dumps).
 *
 * Usage: pnpm exec tsx --import dotenv/config scripts/measure-investments-loans-perf.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS,
  INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX,
} from "../lib/investments-loans-perf-fixture";
import {
  formatInvestmentsLoansPerfRankTable,
  measureInvestmentsLoansListPerf,
} from "../lib/investments-loans-perf-measure";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const keep = process.argv.includes("--keep");
  const result = await measureInvestmentsLoansListPerf({
    keepFixture: keep,
  });

  if (result.fixture.txCount < INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX) {
    console.error(
      `Fixture txCount ${result.fixture.txCount} < ${INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX}`,
    );
    process.exit(1);
  }
  if (
    result.fixture.installmentCount <
    INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS
  ) {
    console.error(
      `Fixture installmentCount ${result.fixture.installmentCount} < ${INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS}`,
    );
    process.exit(1);
  }

  const invTable = formatInvestmentsLoansPerfRankTable(
    result.rankedInvestments,
  );
  const loanTable = formatInvestmentsLoansPerfRankTable(result.rankedLoans);
  const md = [
    "# Investments + loans list perf measure",
    "",
    `**Updated:** ${new Date().toISOString()}`,
    `**Fixture txs:** ${result.fixture.txCount}`,
    `**Fixture installments:** ${result.fixture.installmentCount}`,
    `**Workspace:** synthetic (\`ownedByUserSub=synthetic-investments-loans-list-perf\`)`,
    `**Loan id:** \`${result.fixture.loanId}\``,
    `**Window:** \`${result.fixture.window.from}\` → \`${result.fixture.window.to}\``,
    "",
    "## Ranked investment spans (gates Task 3)",
    "",
    invTable,
    "",
    "## Ranked loan spans (gates Task 4)",
    "",
    loanTable,
    "",
    "## Combined read-path ranks",
    "",
    formatInvestmentsLoansPerfRankTable(result.ranked),
    "",
    "## All spans (includes `fixture.seed` write)",
    "",
    formatInvestmentsLoansPerfRankTable(result.spans),
    "",
    "## Gate notes",
    "",
    `- Task 3 (investment list-read cuts): APPLY per Grill default (omit SSR summary + warm-cache hydrate + includeTotal key parity) — measure ranks: ${result.rankedInvestments.map((s) => s.name).join(", ") || "none"}`,
    `- Task 4 (loan slim detail + paged table): APPLY per Grill default — measure ranks: ${result.rankedLoans.map((s) => s.name).join(", ") || "none"}`,
    "- Task 6 (C-items): SKIP unless leftover ranks still show structural cost after Tasks 3–4.",
    "",
    "## Notes",
    "",
    "- Investment seed rows are inside MONEY_LEDGER_INVESTMENT current-month + accountTypes investment lock.",
    "- Loan fixture is list-visible under listLoansInstallments (paired status; page-1 hasMore).",
    "- No full row dumps.",
    keep ? "- Fixture kept (`--keep`)." : "- Fixture cleaned after measure.",
    "",
  ].join("\n");

  const outPath = join(
    process.cwd(),
    ".my-docs/workflow/20261027-investments-loans-list-perf/05-measure-notes.md",
  );
  writeFileSync(outPath, md, "utf8");
  console.log(md);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
