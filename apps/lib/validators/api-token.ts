import { z } from "zod";
import { API_TOKEN_SCOPES } from "@/db/schema/api-token";

const apiTokenScopeSchema = z.enum(API_TOKEN_SCOPES);

export const apiTokenCreateSchema = z.object({
  name: z.string().min(1).max(120),
  workspaceId: z.string().uuid(),
  scopes: z
    .array(apiTokenScopeSchema)
    .min(1)
    .refine((s) => s.includes("read"), { message: "scopes must include read" })
    .optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});
