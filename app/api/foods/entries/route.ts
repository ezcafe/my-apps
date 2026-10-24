import { NextResponse } from "next/server";
import {
  badRequest,
  requireFoodsContext,
  withFoodsWorkspaceCookie,
  withFoodsWorkspaceRls,
} from "@/lib/api-foods";
import {
  createFoodEntry,
  listFoodEntries,
  todayYmdLocal,
} from "@/features/foods/server/entries";
import { foodsEntryCreateSchema } from "@/lib/validators/foods";
import { assertSameOriginStrict } from "@/lib/request-guards";

export async function GET(request: Request) {
  const ctx = await requireFoodsContext(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (
    !from ||
    !to ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to)
  ) {
    return await badRequest("from and to (YYYY-MM-DD) are required");
  }

  const entries = await withFoodsWorkspaceRls(ctx, () =>
    listFoodEntries({ workspaceId: ctx.workspaceId, from, to }),
  );
  return withFoodsWorkspaceCookie(
    NextResponse.json({ entries }),
    ctx.workspaceId,
  );
}

export async function POST(request: Request) {
  if (!assertSameOriginStrict(request)) {
    return await badRequest("Cross-origin request blocked");
  }
  const ctx = await requireFoodsContext(request, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return await badRequest("Invalid JSON");
  }
  const parsed = foodsEntryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return await badRequest("Validation failed", parsed.error.flatten());
  }

  const result = await withFoodsWorkspaceRls(ctx, () =>
    createFoodEntry({
      workspaceId: ctx.workspaceId,
      userSub: ctx.userSub,
      loggedOn: parsed.data.loggedOn,
      foodType: parsed.data.foodType,
      mealSlot: parsed.data.mealSlot ?? null,
      note: parsed.data.note ?? null,
      todayYmd: todayYmdLocal(),
    }),
  );

  return withFoodsWorkspaceCookie(
    NextResponse.json(result, { status: 201 }),
    ctx.workspaceId,
  );
}
