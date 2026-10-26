import { NextResponse } from "next/server";
import {
  badRequest,
  rateLimited,
  requireLoansContext,
  withLoansWorkspaceRls,
} from "@/lib/api-loans";
import { isLoansImportKind } from "@/lib/loans-import-kinds";
import { exportLoansKindCsv } from "@/lib/loans-export";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ kind: string }> };

export async function GET(req: Request, context: RouteCtx) {
  const ctx = await requireLoansContext(req);
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "loans:export",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.LOANS_EXPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  const { kind: kindParam } = await context.params;
  if (!isLoansImportKind(kindParam)) {
    return badRequest("Unknown export kind");
  }

  try {
    return await withLoansWorkspaceRls(ctx, () =>
      exportLoansKindCsv(ctx.workspaceId, kindParam),
    );
  } catch (e: unknown) {
    console.error("[loans export]", e);
    return NextResponse.json(
      { error: "Export failed", code: "bad_request" },
      { status: 400 },
    );
  }
}
