export type CronAuthResult = "ok" | "unauthorized" | "not_configured";

/** Require CRON_SECRET in all environments; Bearer token must match. */
export function verifyCronRequest(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return "not_configured";
  const auth = request.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}`) return "unauthorized";
  return "ok";
}

export function cronAuthResponse(result: CronAuthResult): Response | null {
  if (result === "ok") return null;
  if (result === "not_configured") {
    return Response.json(
      { error: "CRON_SECRET not configured", code: "bad_request" },
      { status: 503 },
    );
  }
  return Response.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
}
