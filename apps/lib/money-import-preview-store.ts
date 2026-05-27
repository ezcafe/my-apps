import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

type PreviewCtx = { userSub: string; workspaceId: string };

/** Bound by CSV size cap; entries are short-lived. Not shared across serverless instances. */
const PREVIEW_TTL_MS = 60 * 60 * 1000;
const MAX_PREVIEWS_PER_USER = 5;
const MAX_PREVIEWS_GLOBAL = 250;

async function pruneExpired() {
  await db.execute(
    sql`DELETE FROM money_import_preview WHERE expires_at <= now()`,
  );
}

async function enforcePreviewCaps(ctx: PreviewCtx) {
  const userRows = await db.execute(sql`
    SELECT id::text AS id
    FROM money_import_preview
    WHERE user_sub = ${ctx.userSub}
      AND workspace_id = ${ctx.workspaceId}::uuid
    ORDER BY created_at ASC
  `);
  const userIds = Array.from(userRows as Iterable<{ id: string }>).map(
    (row) => row.id,
  );
  if (userIds.length >= MAX_PREVIEWS_PER_USER) {
    const removeIds = userIds.slice(0, userIds.length - MAX_PREVIEWS_PER_USER + 1);
    await db.execute(sql`
      DELETE FROM money_import_preview
      WHERE id = ANY(${removeIds}::uuid[])
    `);
  }

  const allRows = await db.execute(sql`
    SELECT id::text AS id
    FROM money_import_preview
    ORDER BY created_at ASC
  `);
  const allIds = Array.from(allRows as Iterable<{ id: string }>).map((row) => row.id);
  if (allIds.length >= MAX_PREVIEWS_GLOBAL) {
    const removeIds = allIds.slice(0, allIds.length - MAX_PREVIEWS_GLOBAL + 1);
    await db.execute(sql`
      DELETE FROM money_import_preview
      WHERE id = ANY(${removeIds}::uuid[])
    `);
  }
}

export async function stashImportPreview(
  ctx: PreviewCtx,
  rows: unknown[],
): Promise<string> {
  await pruneExpired();
  await enforcePreviewCaps(ctx);
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO money_import_preview (id, user_sub, workspace_id, rows, expires_at)
    VALUES (
      ${id}::uuid,
      ${ctx.userSub},
      ${ctx.workspaceId}::uuid,
      ${JSON.stringify(rows)}::jsonb,
      now() + make_interval(secs => ${Math.floor(PREVIEW_TTL_MS / 1000)})
    )
  `);
  return id;
}

/** Returns stashed rows if the id is valid; does not remove (caller deletes after successful commit). */
export async function getImportPreview(
  ctx: PreviewCtx,
  id: string,
): Promise<unknown[] | null> {
  await pruneExpired();
  const rows = await db.execute(sql`
    SELECT rows
    FROM money_import_preview
    WHERE id = ${id}::uuid
      AND user_sub = ${ctx.userSub}
      AND workspace_id = ${ctx.workspaceId}::uuid
    LIMIT 1
  `);
  const found = Array.from(rows as Iterable<{ rows: unknown[] }>)[0];
  return found?.rows ?? null;
}

/** Idempotent: missing or wrong workspace is a no-op. */
export async function deleteImportPreview(
  ctx: PreviewCtx,
  id: string,
): Promise<void> {
  await pruneExpired();
  await db.execute(sql`
    DELETE FROM money_import_preview
    WHERE id = ${id}::uuid
      AND user_sub = ${ctx.userSub}
      AND workspace_id = ${ctx.workspaceId}::uuid
  `);
}
