import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, forbidden, unauthorized } from "@/lib/api-money";
import { writeAuditEvent } from "@/lib/audit-log";
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
import { assertWorkspaceOwner } from "@/lib/workspace-context";
import { resetWorkspaceData } from "@/lib/workspace-reset";
import { workspaceResetSchema } from "@/lib/validators/workspace";

const ROUTE_ID = "POST /api/workspace/reset";

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

  const parsed = workspaceResetSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  // Owner verify before claim — never INSERT http_idempotency under a client workspaceId alone.
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
    await resetWorkspaceData(workspaceId);

    await writeAuditEvent({
      action: "workspace.data.reset",
      userSub,
      workspaceId,
    });

    const body = {
      ok: true,
      data: { workspaceId },
    };
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
