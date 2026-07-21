import { NextResponse } from "next/server";
import type { ApiTokenScope } from "@/db/schema/api-token";
import {
  badRequest,
  forbidden,
  unauthorized,
} from "@/lib/api-money";
import {
  createApiTokenForUser,
  listApiTokensForUser,
} from "@/lib/api-token-service";
import { resolveSessionUserSub } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, readJsonBounded } from "@/lib/request-guards";
import { apiTokenCreateSchema } from "@/lib/validators/api-token";

export const dynamic = "force-dynamic";

export async function GET() {
  const userSub = await resolveSessionUserSub();
  if (!userSub) return unauthorized();

  const data = await listApiTokensForUser(userSub);
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const userSub = await resolveSessionUserSub();
  if (!userSub) return unauthorized();
  const allowed = await enforceRateLimit({
    name: "tokens:create",
    request: req,
    userKey: userSub,
    points: Number(process.env.API_TOKEN_CREATE_RPM ?? 20),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });
  if (!assertSameOrigin(req)) return badRequest("Cross-origin request blocked");

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = apiTokenCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const scopes: ApiTokenScope[] = parsed.data.scopes ?? ["read", "write"];
  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : null;

  try {
    const { token, item } = await createApiTokenForUser(userSub, {
      name: parsed.data.name,
      workspaceId: parsed.data.workspaceId,
      appKey: parsed.data.appKey,
      scopes,
      expiresAt,
    });
    return NextResponse.json(
      { data: { token, item } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "FORBIDDEN") return forbidden();
    return badRequest(msg);
  }
}
