import { NextResponse } from "next/server";
import {
  requireFoodsContext,
  withFoodsWorkspaceCookie,
  withFoodsWorkspaceRls,
} from "@/lib/api-foods";
import { getFoodAnalysis } from "@/features/foods/server/entries";

export async function GET(request: Request) {
  const ctx = await requireFoodsContext(request);
  if ("error" in ctx) return ctx.error;

  const analysis = await withFoodsWorkspaceRls(ctx, () =>
    getFoodAnalysis(ctx.workspaceId),
  );
  return withFoodsWorkspaceCookie(
    NextResponse.json({ analysis }),
    ctx.workspaceId,
  );
}
