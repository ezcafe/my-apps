import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspace } from "@/db/schema/workspace";
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

  const [ws] = await db
    .select({ defaultCurrency: workspace.defaultCurrency })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  const defaultCurrency = ws?.defaultCurrency ?? null;
  const res = NextResponse.json({
    data: {
      workspaceId,
      defaultCurrency,
      needsCurrencySetup: !defaultCurrency,
    },
  });
  return withWorkspaceCookie(res, workspaceId);
}
