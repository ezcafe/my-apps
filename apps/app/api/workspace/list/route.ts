import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  userWorkspaceDefault,
  workspace,
  workspaceMember,
} from "@/db/schema/workspace";
import { unauthorized } from "@/lib/api-money";
import { workspaceAppKeySchema } from "@/lib/validators/workspace";

export async function GET(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const url = new URL(req.url);
  const appParsed = workspaceAppKeySchema.safeParse(url.searchParams.get("app"));
  if (!appParsed.success) {
    return NextResponse.json(
      { error: "Invalid or missing app query parameter", code: "bad_request" },
      { status: 400 },
    );
  }
  const appKey = appParsed.data;

  const rows = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      kind: workspace.kind,
      ownedByUserSub: workspace.ownedByUserSub,
      defaultCurrency: workspace.defaultCurrency,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
    .where(eq(workspaceMember.userSub, userSub));

  const prefRow = await db
    .select({ defaultWorkspaceId: userWorkspaceDefault.defaultWorkspaceId })
    .from(userWorkspaceDefault)
    .where(
      and(
        eq(userWorkspaceDefault.userSub, userSub),
        eq(userWorkspaceDefault.appKey, appKey),
      ),
    )
    .limit(1);
  const defaultWorkspaceId = prefRow[0]?.defaultWorkspaceId ?? null;

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      isDefault: r.id === defaultWorkspaceId,
    })),
  });
}
