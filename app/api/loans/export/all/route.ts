import { NextResponse } from "next/server";
import {
  rateLimited,
  requireLoansContext,
  withLoansWorkspaceRls,
} from "@/lib/api-loans";
import { exportLoansAllZip } from "@/lib/loans-export";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireLoansContext(req);
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "loans:export:all",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.LOANS_EXPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  try {
    return await withLoansWorkspaceRls(ctx, () =>
      exportLoansAllZip(ctx.workspaceId),
    );
  } catch (e: unknown) {
    console.error("[loans export all]", e);
    return NextResponse.json(
      { error: "Export failed", code: "bad_request" },
      { status: 400 },
    );
  }
}
