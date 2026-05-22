import { NextResponse } from "next/server";
import {
  notFound,
  unauthorized,
} from "@/lib/api-money";
import { revokeApiTokenForUser } from "@/lib/api-token-service";
import { resolveSessionUserSub } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const userSub = await resolveSessionUserSub();
  if (!userSub) return unauthorized();

  const { id } = await ctx.params;
  const ok = await revokeApiTokenForUser(userSub, id);
  if (!ok) return notFound("Token not found");

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
