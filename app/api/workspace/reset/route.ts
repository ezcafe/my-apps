import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, forbidden, unauthorized } from "@/lib/api-money";
import { writeAuditEvent } from "@/lib/audit-log";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";
import { assertWorkspaceOwner } from "@/lib/workspace-context";
import { resetWorkspaceData } from "@/lib/workspace-reset";
import { workspaceResetSchema } from "@/lib/validators/workspace";

export async function POST(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const allowed = await enforceRateLimit({
    name: "workspace:reset",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_RESET_RPM ?? 10),
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

  const parsed = workspaceResetSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const isOwner = await assertWorkspaceOwner(userSub, parsed.data.workspaceId);
  if (!isOwner) return forbidden();

  await resetWorkspaceData(parsed.data.workspaceId);

  await writeAuditEvent({
    action: "workspace.data.reset",
    userSub,
    workspaceId: parsed.data.workspaceId,
  });

  return NextResponse.json({
    ok: true,
    data: { workspaceId: parsed.data.workspaceId },
  });
}
