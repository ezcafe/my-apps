import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  badRequest,
  forbidden,
  notFound,
  unauthorized,
} from "@/lib/api-money";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";
import { workspaceMemberRemoveSchema } from "@/lib/validators/workspace";
import { removeWorkspaceMember } from "@/lib/workspace-members";

export async function POST(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const allowed = await enforceRateLimit({
    name: "workspace:members-remove",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_MEMBERS_RPM ?? 20),
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

  const parsed = workspaceMemberRemoveSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const result = await removeWorkspaceMember({
    ownerSub: userSub,
    workspaceId: parsed.data.workspaceId,
    userSub: parsed.data.userSub,
  });

  if ("error" in result) {
    if (result.error === "forbidden") return forbidden(result.message);
    if (result.error === "not_found") return notFound(result.message);
    return badRequest(result.message);
  }

  return NextResponse.json({ data: result.data });
}
