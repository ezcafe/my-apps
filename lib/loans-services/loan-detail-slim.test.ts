import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanupInvestmentsLoansPerfFixture,
  seedInvestmentsLoansPerfFixture,
} from "@/lib/investments-loans-perf-fixture";
import { getLoanDetail } from "@/lib/loans-services/loans";

describe("getLoanDetail slim client path (P6)", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it(
    "returns installments=[] with count + nextPaymentMinor fields",
    { skip: !hasDb },
    async () => {
      const fixture = await seedInvestmentsLoansPerfFixture({
        now: new Date("2026-10-15T12:00:00"),
        txCount: 5,
        installmentCount: 60,
        // Distinct owner — personal workspace unique index blocks parallel same-owner seeds.
        workspaceId: "b2000000-0000-4000-8000-0000000000d1",
        ownerSub: "synthetic-investments-loans-list-perf-detail-unit",
      });
      try {
        const detail = await getLoanDetail(
          {
            userSub: fixture.ownerSub,
            workspaceId: fixture.workspaceId,
          },
          fixture.loanId,
        );
        assert.deepEqual(detail.installments, []);
        assert.equal(detail.installmentCount, 60);
        assert.ok(detail.paidInstallmentCount >= 0);
        assert.ok(detail.overdueInstallmentCount >= 0);
        assert.ok(
          detail.nextPaymentMinor == null ||
            typeof detail.nextPaymentMinor === "number",
        );
        assert.ok(detail.summary);
        assert.ok(Array.isArray(detail.chart));
      } finally {
        await cleanupInvestmentsLoansPerfFixture({
          workspaceId: fixture.workspaceId,
        });
      }
    },
  );
});
