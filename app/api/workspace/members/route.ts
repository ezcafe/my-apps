import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withDbTransaction } from "@/db";
import {
  badRequest,
  forbidden,
  notFound,
  rateLimited,
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
  readJsonBounded,
  readJsonBoundedWithRaw,
} from "@/lib/request-guards";
import {
  workspaceMemberCreateSchema,
  workspaceMemberPatchSchema,
  workspaceMembersQuerySchema,
} from "@/lib/validators/workspace";
import { assertWorkspaceOwner } from "@/lib/workspace-context";
import {
  addWorkspaceMember,
  listWorkspaceMembersForOwner,
  patchWorkspaceMemberApps,
} from "@/lib/workspace-members";

const MEMBERS_ADD_ROUTE = "POST /api/workspace/members";

/** Replay store omits email (PII); live 200 still returns full member row. */
function membersIdempotencyReplayBody(data: {
  userSub: string;
  role: "owner" | "member";
  apps: unknown;
}) {
  return {
    data: {
      userSub: data.userSub,
      role: data.role,
      apps: data.apps,
    },
  };
}

export async function GET(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const url = new URL(req.url);
  const parsed = workspaceMembersQuerySchema.safeParse({
    workspaceId: url.searchParams.get("workspaceId"),
  });
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const result = await listWorkspaceMembersForOwner(
    userSub,
    parsed.data.workspaceId,
  );
  if ("error" in result) {
    if (result.error === "forbidden") return forbidden();
    return notFound("Workspace not found");
  }

  return NextResponse.json({ data: result });
}

export async function POST(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const allowed = await enforceRateLimit({
    name: "workspace:members-add",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_MEMBERS_RPM ?? 20),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();
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

  const parsed = workspaceMemberCreateSchema.safeParse(json);
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
    route: MEMBERS_ADD_ROUTE,
  };

  const began = await beginIdempotencyRequest({
    actor,
    keyHeader: req.headers.get("Idempotency-Key"),
    rawBody: rawText,
  });
  if (began.kind === "response") return began.response;
  const claimId = began.claimId;

  try {
    class SoftMemberError {
      readonly soft = true as const;
      constructor(readonly response: NextResponse) {}
    }

    const outcome = await withDbTransaction(async () => {
      const result = await addWorkspaceMember({
        ownerSub: userSub,
        workspaceId,
        email: parsed.data.email,
        apps: parsed.data.apps,
      });

      if ("error" in result) {
        let response: NextResponse;
        if (result.error === "forbidden") {
          response = await forbidden(result.message);
        } else if (
          result.error === "not_found" ||
          result.error === "user_not_found"
        ) {
          response = NextResponse.json(
            { error: result.message, code: result.error },
            { status: 404 },
          );
        } else if (result.error === "conflict") {
          response = NextResponse.json(
            { error: result.message, code: "conflict" },
            { status: 409 },
          );
        } else {
          response = await badRequest(result.message);
        }
        throw new SoftMemberError(response);
      }

      const body = { data: result.data };
      if (claimId) {
        await completeIdempotencyClaim(
          actor,
          claimId,
          200,
          membersIdempotencyReplayBody(result.data),
        );
      }
      return body;
    });

    return NextResponse.json(outcome);
  } catch (e: unknown) {
    await abortIdempotencyClaim(actor, claimId);
    if (e && typeof e === "object" && "soft" in e && "response" in e) {
      return (e as { response: NextResponse }).response;
    }
    throw e;
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const allowed = await enforceRateLimit({
    name: "workspace:members-patch",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_MEMBERS_RPM ?? 20),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();
  if (!assertSameOriginStrict(req)) return badRequest("Cross-origin request blocked");

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = workspaceMemberPatchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const result = await patchWorkspaceMemberApps({
    ownerSub: userSub,
    workspaceId: parsed.data.workspaceId,
    userSub: parsed.data.userSub,
    apps: parsed.data.apps,
  });

  if ("error" in result) {
    if (result.error === "forbidden") return forbidden(result.message);
    if (result.error === "not_found") return notFound(result.message);
    return badRequest(result.message);
  }

  return NextResponse.json({ data: result.data });
}
