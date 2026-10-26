import { NextResponse } from "next/server";
import {
  badRequest,
  rateLimited,
  requireBabyContext,
  withBabyWorkspaceRls,
} from "@/lib/api-baby";
import { isBabyImportKind } from "@/lib/baby-import-kinds";
import { exportBabyKindCsv } from "@/lib/baby-export";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ kind: string }> };

export async function GET(req: Request, context: RouteCtx) {
  const ctx = await requireBabyContext(req);
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "baby:export",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.BABY_EXPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  const { kind: kindParam } = await context.params;
  if (!isBabyImportKind(kindParam)) {
    return badRequest("Unknown export kind");
  }

  try {
    return await withBabyWorkspaceRls(ctx, () =>
      exportBabyKindCsv(ctx.workspaceId, kindParam),
    );
  } catch (e: unknown) {
    console.error("[baby export]", e);
    return NextResponse.json(
      { error: "Export failed", code: "bad_request" },
      { status: 400 },
    );
  }
}
