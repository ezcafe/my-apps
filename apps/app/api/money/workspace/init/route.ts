import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { moneyDbUnavailable, unauthorized, withWorkspaceCookie } from "@/lib/api-money";
import { isDbUnreachable } from "@/lib/db-errors";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { getWorkspaceIdForUser } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  let workspaceId: string | null;
  try {
    await ensureUserBootstrap(userSub);
    workspaceId = await getWorkspaceIdForUser(userSub);
  } catch (e) {
    if (isDbUnreachable(e)) return moneyDbUnavailable();
    throw e;
  }
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace unavailable", code: "workspace_error" },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ data: { workspaceId } });
  return withWorkspaceCookie(res, workspaceId);
}
