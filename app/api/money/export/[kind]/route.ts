import { NextResponse } from "next/server";
import {
  badRequest,
  rateLimited,
  requireMoneyContext,
  withMoneyWorkspaceRls,
} from "@/lib/api-money";
import {
  exportMoneyKindCsv,
  isExportableMoneyKind,
} from "@/lib/money-export";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ kind: string }> };

export async function GET(req: Request, context: RouteCtx) {
  const ctx = await requireMoneyContext(req);
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "money:export",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.MONEY_EXPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  const { kind: kindParam } = await context.params;
  if (!isExportableMoneyKind(kindParam)) {
    return badRequest("Unknown export kind");
  }

  try {
    return await withMoneyWorkspaceRls(ctx, () =>
      exportMoneyKindCsv(ctx.workspaceId, kindParam),
    );
  } catch (e: unknown) {
    console.error("[money export]", e);
    return NextResponse.json(
      { error: "Export failed", code: "bad_request" },
      { status: 400 },
    );
  }
}
