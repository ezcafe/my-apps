import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unauthorized } from "@/lib/api-money";
import { fetchWorkspacesForUser } from "@/lib/workspace-list";
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

  const { workspaces } = await fetchWorkspacesForUser(userSub, appParsed.data);

  return NextResponse.json({
    data: workspaces,
  });
}
