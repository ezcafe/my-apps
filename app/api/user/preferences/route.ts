import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, unauthorized } from "@/lib/api-money";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";
import {
  getUserPreferences,
  patchUserPreferences,
} from "@/lib/user-preferences-service";

async function requireSessionUserSub(req: Request): Promise<string | NextResponse> {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const allowed = await enforceRateLimit({
    name: "user:preferences",
    request: req,
    userKey: userSub,
    points: Number(process.env.USER_PREFERENCES_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return userSub;
}

export async function GET(req: Request) {
  const userSub = await requireSessionUserSub(req);
  if (userSub instanceof NextResponse) return userSub;

  const data = await getUserPreferences(userSub);
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const userSub = await requireSessionUserSub(req);
  if (userSub instanceof NextResponse) return userSub;
  if (!assertSameOriginStrict(req)) return badRequest("Cross-origin request blocked");

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  try {
    const data = await patchUserPreferences(userSub, body);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    return badRequest(message);
  }
}
