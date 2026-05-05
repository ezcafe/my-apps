import { randomUUID } from "node:crypto";

type PreviewCtx = { userSub: string; workspaceId: string };

type Entry = PreviewCtx & {
  rows: unknown[];
  expiresAt: number;
};

const store = new Map<string, Entry>();

/** Bound by CSV size cap; entries are short-lived. Not shared across serverless instances. */
const PREVIEW_TTL_MS = 60 * 60 * 1000;

function pruneExpired() {
  const now = Date.now();
  for (const [id, e] of store) {
    if (e.expiresAt <= now) store.delete(id);
  }
}

function matchesCtx(e: Entry, ctx: PreviewCtx) {
  return e.userSub === ctx.userSub && e.workspaceId === ctx.workspaceId;
}

export function stashImportPreview(
  ctx: PreviewCtx,
  rows: unknown[],
): string {
  pruneExpired();
  const id = randomUUID();
  store.set(id, {
    userSub: ctx.userSub,
    workspaceId: ctx.workspaceId,
    rows: structuredClone(rows),
    expiresAt: Date.now() + PREVIEW_TTL_MS,
  });
  return id;
}

/** Returns stashed rows if the id is valid; does not remove (caller deletes after successful commit). */
export function getImportPreview(
  ctx: PreviewCtx,
  id: string,
): unknown[] | null {
  pruneExpired();
  const e = store.get(id);
  if (!e || !matchesCtx(e, ctx)) return null;
  return e.rows;
}

/** Idempotent: missing or wrong workspace is a no-op. */
export function deleteImportPreview(ctx: PreviewCtx, id: string): void {
  pruneExpired();
  const e = store.get(id);
  if (!e || !matchesCtx(e, ctx)) return;
  store.delete(id);
}
