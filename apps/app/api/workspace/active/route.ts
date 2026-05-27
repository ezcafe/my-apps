import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
import { assertSameOrigin, readJsonBounded } from "@/lib/request-guards";
import { workspaceActiveSchema } from "@/lib/validators/workspace";

export async function POST(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();
  const allowed = await enforceRateLimit({
    name: "workspace:set-active",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_ACTIVE_RPM ?? 60),
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

  const parsed = workspaceActiveSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const ok = await assertWorkspaceMember(userSub, parsed.data.workspaceId);
  if (!ok) return forbidden();

  const res = NextResponse.json({ data: { workspaceId: parsed.data.workspaceId } });
  return setActiveWorkspaceCookie(res, parsed.data.app, parsed.data.workspaceId);
}
