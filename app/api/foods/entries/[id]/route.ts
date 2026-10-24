import { NextResponse } from "next/server";
import {
  badRequest,
  notFound,
  requireFoodsContext,
  withFoodsWorkspaceCookie,
  withFoodsWorkspaceRls,
} from "@/lib/api-foods";
import {
  deleteFoodEntry,
  todayYmdLocal,
  updateFoodEntry,
} from "@/features/foods/server/entries";
import { foodsEntryUpdateSchema } from "@/lib/validators/foods";
import { assertSameOriginStrict } from "@/lib/request-guards";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!assertSameOriginStrict(request)) {
    return await badRequest("Cross-origin request blocked");
  }
  const ctx = await requireFoodsContext(request, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return await badRequest("Invalid JSON");
  }
  const parsed = foodsEntryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return await badRequest("Validation failed", parsed.error.flatten());
  }

  const result = await withFoodsWorkspaceRls(ctx, () =>
    updateFoodEntry({
      workspaceId: ctx.workspaceId,
      id,
      patch: parsed.data,
      todayYmd: todayYmdLocal(),
    }),
  );
  if (!result) return await notFound("Entry not found");

  return withFoodsWorkspaceCookie(
    NextResponse.json(result),
    ctx.workspaceId,
  );
}

export async function DELETE(request: Request, { params }: Params) {
  if (!assertSameOriginStrict(request)) {
    return await badRequest("Cross-origin request blocked");
  }
  const ctx = await requireFoodsContext(request, { requireWrite: true });
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  const result = await withFoodsWorkspaceRls(ctx, () =>
    deleteFoodEntry({
      workspaceId: ctx.workspaceId,
      id,
      todayYmd: todayYmdLocal(),
    }),
  );
  if (!result) return await notFound("Entry not found");

  return withFoodsWorkspaceCookie(
    NextResponse.json(result),
    ctx.workspaceId,
  );
}
