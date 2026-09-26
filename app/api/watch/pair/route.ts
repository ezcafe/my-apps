import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  rateLimited,
  unauthorized,
} from "@/lib/api-money";
import { resolveSessionUserSub } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";
import { watchPairMintSchema } from "@/lib/validators/watch-pair";
import { WatchPairError } from "@/lib/watch-pairing-codes";
import { mintWatchPairingCodeForUser } from "@/lib/watch-pairing-db";

export const dynamic = "force-dynamic";

function pairErrorResponse(e: WatchPairError) {
  const status =
    e.code === "UNAUTHORIZED"
      ? 401
      : e.code === "FORBIDDEN"
        ? 403
        : e.code === "RATE_LIMITED"
          ? 429
          : 400;
  return NextResponse.json(
    { error: e.message, code: e.code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const userSub = await resolveSessionUserSub();
  if (!userSub) return unauthorized();

  const allowed = await enforceRateLimit({
    name: "watch-pair:mint",
    request: req,
    userKey: userSub,
    points: Number(process.env.WATCH_PAIR_MINT_RPM ?? 20),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();
  if (!assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }

  let body: unknown = {};
  try {
    body = await readJsonBounded(
      req,
      Number(process.env.JSON_MAX_BYTES ?? 262144),
    );
  } catch {
    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > 0) return badRequest("Invalid JSON");
    body = {};
  }

  const parsed = watchPairMintSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") ||
        "Validation failed",
    );
  }

  try {
    const result = await mintWatchPairingCodeForUser(userSub, {
      workspaceId: parsed.data.workspaceId,
      apps: parsed.data.apps,
      scopes: parsed.data.scopes,
    });
    return NextResponse.json(
      { data: result },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof WatchPairError) return pairErrorResponse(e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "FORBIDDEN") return forbidden();
    return badRequest(msg);
  }
}
