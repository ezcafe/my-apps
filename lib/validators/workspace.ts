import { z } from "zod";
import { WORKSPACE_APP_KEYS } from "@/db/schema/workspace";
import { SHAREABLE_WORKSPACE_APP_KEYS } from "@/lib/workspace-shareable-apps";

export const workspaceAppKeySchema = z.enum(WORKSPACE_APP_KEYS);

export const shareableWorkspaceAppKeySchema = z.enum(SHAREABLE_WORKSPACE_APP_KEYS);

export const workspaceActiveSchema = z.object({
  workspaceId: z.string().uuid(),
  app: workspaceAppKeySchema,
});

export const workspaceDefaultPatchSchema = z.object({
  workspaceId: z.string().uuid(),
  app: workspaceAppKeySchema,
});

export const workspaceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  defaultCurrency: z.string().length(3).optional(),
  /** When `"money"`, seed Money defaults (accounts/categories) on the new shared workspace */
  seedApp: workspaceAppKeySchema.optional(),
});

export const workspaceCurrencyPatchSchema = z.object({
  workspaceId: z.string().uuid(),
  defaultCurrency: z.string().length(3),
});

export const workspaceResetSchema = z.object({
  workspaceId: z.string().uuid(),
});

/** IANA timezone name for analytics date bucketing (e.g. Asia/Ho_Chi_Minh). */
export const workspaceTimezonePatchSchema = z.object({
  workspaceId: z.string().uuid(),
  tzName: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_+\/-]+$/, "Invalid timezone name"),
});

export const workspaceMembersQuerySchema = z.object({
  workspaceId: z.string().uuid(),
});

export const workspaceMemberCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email().max(320),
  apps: z.array(shareableWorkspaceAppKeySchema).min(1),
});

export const workspaceMemberPatchSchema = z.object({
  workspaceId: z.string().uuid(),
  userSub: z.string().min(1).max(200),
  apps: z.array(shareableWorkspaceAppKeySchema).min(1),
});

export const workspaceMemberRemoveSchema = z.object({
  workspaceId: z.string().uuid(),
  userSub: z.string().min(1).max(200),
});
