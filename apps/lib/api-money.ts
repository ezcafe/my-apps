import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  assertWorkspaceMember,
  getWorkspaceIdForUser,
} from "@/lib/workspace";
import { setActiveWorkspaceCookie } from "@/lib/workspace-context";

export async function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message, code: "unauthorized" }, { status: 401 });
}

export async function badRequest(message: string) {
  return NextResponse.json({ error: message, code: "bad_request" }, { status: 400 });
}

export async function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message, code: "forbidden" }, { status: 403 });
}

export async function notFound(message = "Not found") {
  return NextResponse.json({ error: message, code: "not_found" }, { status: 404 });
}

export function moneyDbUnavailable() {
  return NextResponse.json(
    {
      error:
        "Cannot reach PostgreSQL. Start the database (from the apps folder: docker compose up -d) or fix DATABASE_URL.",
      code: "db_unavailable",
    },
    { status: 503 },
  );
}

export async function requireMoneyContext() {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) {
    return { error: await unauthorized() } as const;
  }

  let workspaceId: string | null;
  try {
    workspaceId = await getWorkspaceIdForUser(userSub);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: moneyDbUnavailable() } as const;
    throw e;
  }

  if (!workspaceId) {
    return { error: await forbidden("No workspace") } as const;
  }

  let ok: boolean;
  try {
    ok = await assertWorkspaceMember(userSub, workspaceId);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: moneyDbUnavailable() } as const;
    throw e;
  }

  if (!ok) {
    return { error: await forbidden() } as const;
  }

  return { userSub, workspaceId } as const;
}

export function withWorkspaceCookie(res: NextResponse, workspaceId: string) {
  return setActiveWorkspaceCookie(res, "money", workspaceId);
}
