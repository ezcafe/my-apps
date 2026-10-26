import { NextResponse } from "next/server";
import {
  rateLimited,
  requireMoneyContext,
  withMoneyWorkspaceRls,
} from "@/lib/api-money";
import { exportMoneyAllZip } from "@/lib/money-export";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireMoneyContext(req);
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "money:export:all",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.MONEY_EXPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  try {
    return await withMoneyWorkspaceRls(ctx, () =>
      exportMoneyAllZip(ctx.workspaceId),
    );
  } catch (e: unknown) {
    console.error("[money export all]", e);
    return NextResponse.json(
      { error: "Export failed", code: "bad_request" },
      { status: 400 },
    );
  }
}
