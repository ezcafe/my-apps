import { NextResponse } from "next/server";
import {
  badRequest,
  requireFoodsContext,
  withFoodsWorkspaceCookie,
  withFoodsWorkspaceRls,
} from "@/lib/api-foods";
import {
  refreshFoodAnalysis,
  todayYmdLocal,
} from "@/features/foods/server/entries";
import { assertSameOriginStrict } from "@/lib/request-guards";

export async function POST(request: Request) {
  if (!assertSameOriginStrict(request)) {
    return await badRequest("Cross-origin request blocked");
  }
  const ctx = await requireFoodsContext(request, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  const analysis = await withFoodsWorkspaceRls(ctx, () =>
    refreshFoodAnalysis({
      workspaceId: ctx.workspaceId,
      todayYmd: todayYmdLocal(),
    }),
  );
  return withFoodsWorkspaceCookie(
    NextResponse.json({ analysis }),
    ctx.workspaceId,
  );
}
