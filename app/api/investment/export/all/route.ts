import { NextResponse } from "next/server";
import {
  rateLimited,
  requireInvestmentContext,
  withInvestmentWorkspaceRls,
} from "@/lib/api-investment";
import { exportInvestmentAllZip } from "@/lib/investment-export";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireInvestmentContext(req);
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "investment:export:all",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.INVESTMENT_EXPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  try {
    return await withInvestmentWorkspaceRls(ctx, () =>
      exportInvestmentAllZip(ctx.workspaceId),
    );
  } catch (e: unknown) {
    console.error("[investment export all]", e);
    return NextResponse.json(
      { error: "Export failed", code: "bad_request" },
      { status: 400 },
    );
  }
}
