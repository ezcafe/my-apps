import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { httpIdempotency } from "@/db/schema/http-idempotency";
import { badRequest, conflict } from "@/lib/api-http";

export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;
export const IDEMPOTENCY_TTL_HOURS = 24;
export const IDEMPOTENCY_REPLAYED_HEADER = "Idempotency-Replayed";
/** Max expired completed rows deleted per prune call (claim-path best-effort). */
export const IDEMPOTENCY_PRUNE_BATCH_SIZE = 500;

export type IdempotencyActor = {
  workspaceId: string;
  userSub: string;
  route: string;
};

export type IdempotencyClaimResult =
  | { kind: "claimed"; claimId: string }
  | { kind: "replay"; status: number; body: unknown }
  | { kind: "in_progress" }
  | { kind: "body_mismatch" };

export function hashRawBodyBytes(rawText: string): string {
  return createHash("sha256").update(rawText, "utf8").digest("hex");
}

export function parseIdempotencyKeyHeader(
  header: string | null,
):
  | { present: false }
  | { present: true; key: string }
  | { present: true; error: "too_long" } {
  if (header == null || header.trim() === "") {
    return { present: false };
  }
  const key = header.trim();
  if ([...key].length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    return { present: true, error: "too_long" };
  }
  return { present: true, key };
}

function expiresAtFromNow(): Date {
  return new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);
}

async function selectExisting(actor: IdempotencyActor, key: string) {
  const rows = await db
    .select({
      id: httpIdempotency.id,
      requestHash: httpIdempotency.requestHash,
      status: httpIdempotency.status,
      responseStatus: httpIdempotency.responseStatus,
      responseBody: httpIdempotency.responseBody,
      expiresAt: httpIdempotency.expiresAt,
    })
    .from(httpIdempotency)
    .where(
      and(
        eq(httpIdempotency.workspaceId, actor.workspaceId),
        eq(httpIdempotency.userSub, actor.userSub),
        eq(httpIdempotency.route, actor.route),
        eq(httpIdempotency.key, key),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function insertClaim(
  actor: IdempotencyActor,
  key: string,
  requestHash: string,
): Promise<string | null> {
  const rows = await db
    .insert(httpIdempotency)
    .values({
      workspaceId: actor.workspaceId,
      userSub: actor.userSub,
      route: actor.route,
      key,
      requestHash,
      status: "in_progress",
      expiresAt: expiresAtFromNow(),
    })
    .onConflictDoNothing()
    .returning({ id: httpIdempotency.id });
  return rows[0]?.id ?? null;
}

/**
 * Short committed claim INSERT (visible to peers). On conflict: replay,
 * in_progress 409, body mismatch, or expired UNIQUE reclaim.
 */
export async function claimIdempotencyKey(
  actor: IdempotencyActor,
  key: string,
  requestHash: string,
): Promise<IdempotencyClaimResult> {
  // Best-effort prune of expired completed rows only.
  await pruneExpiredIdempotencyCompleted();

  const claimId = await insertClaim(actor, key, requestHash);
  if (claimId) return { kind: "claimed", claimId };

  const existing = await selectExisting(actor, key);
  if (!existing) {
    // Race: conflict then row vanished — retry once.
    const retryId = await insertClaim(actor, key, requestHash);
    if (retryId) return { kind: "claimed", claimId: retryId };
    return { kind: "in_progress" };
  }

  const expired = existing.expiresAt.getTime() <= Date.now();
  if (expired) {
    await db
      .delete(httpIdempotency)
      .where(
        and(
          eq(httpIdempotency.id, existing.id),
          eq(httpIdempotency.workspaceId, actor.workspaceId),
          eq(httpIdempotency.userSub, actor.userSub),
          sql`${httpIdempotency.expiresAt} <= now()`,
        ),
      );
    const reclaimed = await insertClaim(actor, key, requestHash);
    if (reclaimed) return { kind: "claimed", claimId: reclaimed };
    return { kind: "in_progress" };
  }

  if (existing.status === "in_progress") {
    return { kind: "in_progress" };
  }

  if (existing.requestHash !== requestHash) {
    return { kind: "body_mismatch" };
  }

  return {
    kind: "replay",
    status: existing.responseStatus ?? 200,
    body: existing.responseBody,
  };
}

/** Complete claim in the current ALS / mutator transaction (same connection as side effect). */
export async function completeIdempotencyClaim(
  actor: IdempotencyActor,
  claimId: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> {
  await db
    .update(httpIdempotency)
    .set({
      status: "completed",
      responseStatus,
      responseBody,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(httpIdempotency.id, claimId),
        eq(httpIdempotency.workspaceId, actor.workspaceId),
        eq(httpIdempotency.userSub, actor.userSub),
        eq(httpIdempotency.status, "in_progress"),
      ),
    );
}

/** DELETE claim after caught failure so the same key+body may retry. */
export async function deleteIdempotencyClaim(
  actor: IdempotencyActor,
  claimId: string,
): Promise<void> {
  await db
    .delete(httpIdempotency)
    .where(
      and(
        eq(httpIdempotency.id, claimId),
        eq(httpIdempotency.workspaceId, actor.workspaceId),
        eq(httpIdempotency.userSub, actor.userSub),
        eq(httpIdempotency.status, "in_progress"),
      ),
    );
}

/** TTL prune — completed expired only (never in_progress). Batched to bound lock time. */
export async function pruneExpiredIdempotencyCompleted(): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM http_idempotency
    WHERE id IN (
      SELECT id FROM http_idempotency
      WHERE expires_at <= now()
        AND status = 'completed'
      LIMIT ${IDEMPOTENCY_PRUNE_BATCH_SIZE}
    )
  `);
  // postgres.js / drizzle may return count differently; treat as best-effort.
  const count =
    typeof result === "object" &&
    result !== null &&
    "count" in result &&
    typeof (result as { count: unknown }).count === "number"
      ? (result as { count: number }).count
      : 0;
  return count;
}

/** Shared replay response — always no-store + Idempotency-Replayed. */
export function idempotencyReplayResponse(
  status: number,
  body: unknown,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      [IDEMPOTENCY_REPLAYED_HEADER]: "true",
    },
  });
}

export type BeginIdempotencyResult =
  | { kind: "proceed"; claimId: string | null }
  | { kind: "response"; response: NextResponse };

/**
 * Parse Idempotency-Key, claim, and map replay / 409 / mismatch to one response shape.
 * Callers validate the body first, then call this, then complete inside the mutator tx.
 */
export async function beginIdempotencyRequest(opts: {
  actor: IdempotencyActor;
  keyHeader: string | null;
  rawBody: string;
}): Promise<BeginIdempotencyResult> {
  const keyParsed = parseIdempotencyKeyHeader(opts.keyHeader);
  if (keyParsed.present && "error" in keyParsed) {
    return {
      kind: "response",
      response: await badRequest(
        "Idempotency-Key must be at most 128 characters",
      ),
    };
  }
  if (!keyParsed.present || !("key" in keyParsed)) {
    return { kind: "proceed", claimId: null };
  }

  const requestHash = hashRawBodyBytes(opts.rawBody);
  const claim = await claimIdempotencyKey(
    opts.actor,
    keyParsed.key,
    requestHash,
  );

  if (claim.kind === "replay") {
    return {
      kind: "response",
      response: idempotencyReplayResponse(claim.status, claim.body),
    };
  }
  if (claim.kind === "in_progress") {
    return {
      kind: "response",
      response: await conflict(
        "A request with this Idempotency-Key is already in progress",
        "idempotency_in_progress",
      ),
    };
  }
  if (claim.kind === "body_mismatch") {
    return {
      kind: "response",
      response: await conflict(
        "Idempotency-Key was reused with a different request body",
        "idempotency_body_mismatch",
      ),
    };
  }
  return { kind: "proceed", claimId: claim.claimId };
}

/** Best-effort DELETE after caught failure so the same key may retry. */
export async function abortIdempotencyClaim(
  actor: IdempotencyActor,
  claimId: string | null,
): Promise<void> {
  if (!claimId) return;
  try {
    await deleteIdempotencyClaim(actor, claimId);
  } catch {
    /* ignore */
  }
}
