import { z } from "zod";
import { WORKSPACE_APP_KEYS } from "@/db/schema/workspace";

export const workspaceAppKeySchema = z.enum(WORKSPACE_APP_KEYS);

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
