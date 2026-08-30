import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userWorkspaceDefault } from "@/db/schema/workspace";
import {
  badRequest,
  forbidden,
  unauthorized,
} from "@/lib/api-money";
import {
  assertWorkspaceMember,
  setActiveWorkspaceCookie,
} from "@/lib/workspace-context";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";
import { workspaceAppKeySchema, workspaceDefaultPatchSchema } from "@/lib/validators/workspace";

export async function GET(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const url = new URL(req.url);
  const appParsed = workspaceAppKeySchema.safeParse(url.searchParams.get("app"));
  if (!appParsed.success) {
    return NextResponse.json(
      { error: "Invalid or missing app query parameter", code: "bad_request" },
      { status: 400 },
    );
  }

  const row = await db
    .select({ defaultWorkspaceId: userWorkspaceDefault.defaultWorkspaceId })
    .from(userWorkspaceDefault)
    .where(
      and(
        eq(userWorkspaceDefault.userSub, userSub),
        eq(userWorkspaceDefault.appKey, appParsed.data),
      ),
    )
    .limit(1);

  return NextResponse.json({
    data: { defaultWorkspaceId: row[0]?.defaultWorkspaceId ?? null },
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();
  const allowed = await enforceRateLimit({
    name: "workspace:set-default",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_DEFAULT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });
  if (!assertSameOriginStrict(req)) return badRequest("Cross-origin request blocked");

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = workspaceDefaultPatchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const ok = await assertWorkspaceMember(userSub, parsed.data.workspaceId);
  if (!ok) return forbidden();

  await db
    .insert(userWorkspaceDefault)
    .values({
      userSub,
      appKey: parsed.data.app,
      defaultWorkspaceId: parsed.data.workspaceId,
    })
    .onConflictDoUpdate({
      target: [userWorkspaceDefault.userSub, userWorkspaceDefault.appKey],
      set: { defaultWorkspaceId: parsed.data.workspaceId },
    });

  const res = NextResponse.json({
    data: { defaultWorkspaceId: parsed.data.workspaceId },
  });
  return setActiveWorkspaceCookie(res, parsed.data.app, parsed.data.workspaceId);
}
