import { NextResponse } from "next/server";
import {
  badRequest,
  notFound,
  rateLimited,
  unauthorized,
} from "@/lib/api-money";
import { revokeApiTokenForUser } from "@/lib/api-token-service";
import { resolveSessionUserSub } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: RouteCtx) {
  const userSub = await resolveSessionUserSub();
  if (!userSub) return unauthorized();
  const allowed = await enforceRateLimit({
    name: "tokens:revoke",
    request: req,
    userKey: userSub,
    points: Number(process.env.API_TOKEN_REVOKE_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();
  if (!assertSameOriginStrict(req)) return badRequest("Cross-origin request blocked");

  const { id } = await ctx.params;
  const ok = await revokeApiTokenForUser(userSub, id);
  if (!ok) return notFound("Token not found");

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
