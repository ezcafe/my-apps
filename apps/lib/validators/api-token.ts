import { z } from "zod";
import { API_TOKEN_SCOPES } from "@/db/schema/api-token";
import { API_TOKEN_APP_KEYS } from "@/lib/api-token-app-keys";

const apiTokenScopeSchema = z.enum(API_TOKEN_SCOPES);

export const apiTokenCreateSchema = z.object({
  name: z.string().min(1).max(120),
  workspaceId: z.string().uuid(),
  appKey: z.enum(API_TOKEN_APP_KEYS).optional().default("money"),
  scopes: z
    .array(apiTokenScopeSchema)
    .min(1)
    .refine((s) => s.includes("read"), { message: "scopes must include read" })
    .optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});
