import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  badRequest,
  forbidden,
  notFound,
  unauthorized,
} from "@/lib/api-money";
import {
  abortIdempotencyClaim,
  beginIdempotencyRequest,
  completeIdempotencyClaim,
} from "@/lib/http-idempotency";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  assertSameOriginStrict,
  readJsonBoundedWithRaw,
} from "@/lib/request-guards";
import { workspaceMemberRemoveSchema } from "@/lib/validators/workspace";
import { assertWorkspaceOwner } from "@/lib/workspace-context";
import { removeWorkspaceMember } from "@/lib/workspace-members";

const ROUTE_ID = "POST /api/workspace/members/remove";

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

  let json: unknown;
  let rawText: string;
  try {
    ({ json, rawText } = await readJsonBoundedWithRaw(
      req,
      Number(process.env.JSON_MAX_BYTES ?? 262144),
    ));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = workspaceMemberRemoveSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const workspaceId = parsed.data.workspaceId;
  if (!(await assertWorkspaceOwner(userSub, workspaceId))) {
    return forbidden();
  }

  const actor = {
    workspaceId,
    userSub,
    route: ROUTE_ID,
  };

  const began = await beginIdempotencyRequest({
    actor,
    keyHeader: req.headers.get("Idempotency-Key"),
    rawBody: rawText,
  });
  if (began.kind === "response") return began.response;
  const claimId = began.claimId;

  try {
    const result = await removeWorkspaceMember({
      ownerSub: userSub,
      workspaceId,
      userSub: parsed.data.userSub,
    });

    if ("error" in result) {
      await abortIdempotencyClaim(actor, claimId);
      if (result.error === "forbidden") return forbidden(result.message);
      if (result.error === "not_found") return notFound(result.message);
      return badRequest(result.message);
    }

    const body = { data: result.data };
    if (claimId) {
      await completeIdempotencyClaim(actor, claimId, 200, body);
    }
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    await abortIdempotencyClaim(actor, claimId);
    throw e;
  }
}
