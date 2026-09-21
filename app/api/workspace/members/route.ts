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
import {
  workspaceMemberCreateSchema,
  workspaceMemberPatchSchema,
  workspaceMembersQuerySchema,
} from "@/lib/validators/workspace";
import {
  addWorkspaceMember,
  listWorkspaceMembersForOwner,
  patchWorkspaceMemberApps,
} from "@/lib/workspace-members";

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
  if (!allowed) return new Response("Too many requests", { status: 429 });
  if (!assertSameOriginStrict(req)) return badRequest("Cross-origin request blocked");

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = workspaceMemberCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const result = await addWorkspaceMember({
    ownerSub: userSub,
    workspaceId: parsed.data.workspaceId,
    email: parsed.data.email,
    apps: parsed.data.apps,
  });

  if ("error" in result) {
    if (result.error === "forbidden") return forbidden(result.message);
    if (result.error === "not_found" || result.error === "user_not_found") {
      return NextResponse.json(
        { error: result.message, code: result.error },
        { status: 404 },
      );
    }
    if (result.error === "conflict") {
      return NextResponse.json(
        { error: result.message, code: "conflict" },
        { status: 409 },
      );
    }
    return badRequest(result.message);
  }

  return NextResponse.json({ data: result.data });
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
  if (!allowed) return new Response("Too many requests", { status: 429 });
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
