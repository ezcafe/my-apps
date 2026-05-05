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
import { workspaceActiveSchema } from "@/lib/validators/workspace";

export async function POST(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
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
