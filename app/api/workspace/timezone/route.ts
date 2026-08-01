import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, forbidden, unauthorized } from "@/lib/api-money";
import { patchWorkspaceTimezone } from "@/lib/money-services/workspace-money";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, readJsonBounded } from "@/lib/request-guards";

export async function PATCH(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();
  const allowed = await enforceRateLimit({
    name: "workspace:timezone",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_TIMEZONE_RPM ?? 30),
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

  try {
    const updated = await patchWorkspaceTimezone(userSub, body);
    return NextResponse.json({ data: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    if (message === "FORBIDDEN") return forbidden();
    if (message === "NOT_FOUND") {
      return new Response("Workspace not found", { status: 404 });
    }
    return badRequest(message);
  }
}
