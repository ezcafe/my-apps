import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, withBypassRls } from "@/db";

type PreviewCtx = { userSub: string; workspaceId: string };

const PREVIEW_TTL_MS = 60 * 60 * 1000;
const MAX_PREVIEWS_PER_USER = 5;
const MAX_PREVIEWS_GLOBAL = 250;

export async function pruneExpiredBabyImportPreviews() {
  await withBypassRls(async () => {
    await db.execute(
      sql`DELETE FROM baby_import_preview WHERE expires_at <= now()`,
    );
  });
}

async function pruneExpired() {
  await pruneExpiredBabyImportPreviews();
}

async function enforcePreviewCaps(ctx: PreviewCtx) {
  const userRows = await db.execute(sql`
    SELECT id::text AS id
    FROM baby_import_preview
    WHERE user_sub = ${ctx.userSub}
      AND workspace_id = ${ctx.workspaceId}::uuid
    ORDER BY created_at ASC
  `);
  const userIds = Array.from(userRows as Iterable<{ id: string }>).map(
    (row) => row.id,
  );
  if (userIds.length >= MAX_PREVIEWS_PER_USER) {
    const removeIds = userIds.slice(
      0,
      userIds.length - MAX_PREVIEWS_PER_USER + 1,
    );
    await db.execute(sql`
      DELETE FROM baby_import_preview
      WHERE id IN (${sql.join(removeIds.map((id) => sql`${id}::uuid`), sql`, `)})
    `);
  }

  await withBypassRls(async () => {
    await db.execute(sql`
      DELETE FROM baby_import_preview
      WHERE id IN (
        SELECT id
        FROM baby_import_preview
        ORDER BY created_at ASC
        OFFSET ${MAX_PREVIEWS_GLOBAL}
      )
    `);
  });
}

export async function stashBabyImportPreview(
  ctx: PreviewCtx,
  rows: unknown[],
): Promise<string> {
  await pruneExpired();
  await enforcePreviewCaps(ctx);
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO baby_import_preview (id, user_sub, workspace_id, rows, expires_at)
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

type PreviewReadOpts = { skipPrune?: boolean };

export async function getBabyImportPreview(
  ctx: PreviewCtx,
  id: string,
  opts?: PreviewReadOpts,
): Promise<unknown[] | null> {
  if (!opts?.skipPrune) await pruneExpired();
  const rows = await db.execute(sql`
    SELECT rows
    FROM baby_import_preview
    WHERE id = ${id}::uuid
      AND user_sub = ${ctx.userSub}
      AND workspace_id = ${ctx.workspaceId}::uuid
    LIMIT 1
  `);
  const found = Array.from(rows as Iterable<{ rows: unknown[] }>)[0];
  return found?.rows ?? null;
}

export async function deleteBabyImportPreview(
  ctx: PreviewCtx,
  id: string,
  opts?: PreviewReadOpts,
): Promise<void> {
  if (!opts?.skipPrune) await pruneExpired();
  await db.execute(sql`
    DELETE FROM baby_import_preview
    WHERE id = ${id}::uuid
      AND user_sub = ${ctx.userSub}
      AND workspace_id = ${ctx.workspaceId}::uuid
  `);
}
