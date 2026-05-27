import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function writeAuditEvent(input: {
  action: string;
  userSub?: string | null;
  workspaceId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO audit_event (user_sub, workspace_id, action, detail)
      VALUES (
        ${input.userSub ?? null},
        ${input.workspaceId ?? null}::uuid,
        ${input.action},
        ${JSON.stringify(input.detail ?? {})}::jsonb
      )
    `);
  } catch {
    // Best effort: do not break primary flows if audit persistence fails.
  }
}
