import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema/workspace";
import { isDbUnreachable } from "@/lib/db-errors";
import { cloneMoneyWorkspaceStructure } from "@/lib/money-clone-workspace";
import { resetWorkspaceData } from "@/lib/workspace-reset";
import { writeAuditEvent } from "@/lib/audit-log";
import {
  assertWorkspaceMember,
  assertWorkspaceOwner,
  isWorkspaceIdCookieSafe,
} from "@/lib/workspace-context";
import {
  workspaceCurrencyPatchSchema,
  workspaceTimezonePatchSchema,
} from "@/lib/validators/workspace";
import type { WorkspaceAppKey } from "@/db/schema/workspace";

const cloneBodySchema = z.object({
  targetWorkspaceId: z.string().uuid(),
});

export async function patchWorkspaceCurrency(userSub: string, body: unknown) {
  const parsed = workspaceCurrencyPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const member = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userSub, userSub),
        eq(workspaceMember.workspaceId, parsed.data.workspaceId),
      ),
    )
    .limit(1);
  if (member.length === 0) throw new Error("FORBIDDEN");

  const [updated] = await db
    .update(workspace)
    .set({ defaultCurrency: parsed.data.defaultCurrency.trim().toUpperCase() })
    .where(eq(workspace.id, parsed.data.workspaceId))
    .returning({
      workspaceId: workspace.id,
      defaultCurrency: workspace.defaultCurrency,
    });

  return updated!;
}

export async function patchWorkspaceTimezone(userSub: string, body: unknown) {
  const parsed = workspaceTimezonePatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const member = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userSub, userSub),
        eq(workspaceMember.workspaceId, parsed.data.workspaceId),
      ),
    )
    .limit(1);
  if (member.length === 0) throw new Error("FORBIDDEN");

  const [existing] = await db
    .select({ tzName: workspace.tzName })
    .from(workspace)
    .where(eq(workspace.id, parsed.data.workspaceId))
    .limit(1);
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.tzName === parsed.data.tzName) {
    return {
      workspaceId: parsed.data.workspaceId,
      tzName: existing.tzName,
      unchanged: true as const,
    };
  }

  const [updated] = await db
    .update(workspace)
    .set({ tzName: parsed.data.tzName })
    .where(eq(workspace.id, parsed.data.workspaceId))
    .returning({
      workspaceId: workspace.id,
      tzName: workspace.tzName,
    });

  return { ...updated!, unchanged: false as const };
}

export async function cloneMoneyWorkspaceApi(
  userSub: string,
  sourceWorkspaceId: string,
  body: unknown,
) {
  const parsed = cloneBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const { targetWorkspaceId } = parsed.data;
  if (targetWorkspaceId === sourceWorkspaceId) {
    throw new Error("Source and target must differ");
  }

  const sourceOk = await assertWorkspaceMember(userSub, sourceWorkspaceId);
  if (!sourceOk) throw new Error("FORBIDDEN");

  const ownerOk = await assertWorkspaceOwner(userSub, targetWorkspaceId);
  if (!ownerOk) throw new Error("FORBIDDEN");

  await cloneMoneyWorkspaceStructure(sourceWorkspaceId, targetWorkspaceId);
  await writeAuditEvent({
    action: "workspace.money.cloned",
    userSub,
    workspaceId: targetWorkspaceId,
    detail: { sourceWorkspaceId },
  });
  return { ok: true as const };
}

export async function resetMoneyWorkspaceApi(
  userSub: string,
  workspaceId: string,
) {
  const ownerOk = await assertWorkspaceOwner(userSub, workspaceId);
  if (!ownerOk) throw new Error("FORBIDDEN");

  try {
    await resetWorkspaceData(workspaceId);
  } catch (e) {
    if (isDbUnreachable(e)) throw new Error("DB_UNAVAILABLE");
    throw e;
  }
  await writeAuditEvent({
    action: "workspace.money.reset",
    userSub,
    workspaceId,
  });
  return { ok: true as const };
}

export async function setActiveWorkspaceApi(
  userSub: string,
  workspaceId: string,
  app: WorkspaceAppKey,
): Promise<void> {
  if (!isWorkspaceIdCookieSafe(workspaceId)) {
    throw new Error("BAD_REQUEST");
  }
  const ok = await assertWorkspaceMember(userSub, workspaceId);
  if (!ok) throw new Error("FORBIDDEN");
  if (app !== "money") throw new Error("Unsupported app");
}
