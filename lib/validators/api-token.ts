import { z } from "zod";
import { API_TOKEN_SCOPES } from "@/db/schema/api-token";
import { SHAREABLE_WORKSPACE_APP_KEYS } from "@/lib/workspace-shareable-apps";

const apiTokenScopeSchema = z.enum(API_TOKEN_SCOPES);
const shareableAppSchema = z.enum(SHAREABLE_WORKSPACE_APP_KEYS);

export const apiTokenCreateSchema = z
  .object({
    name: z.string().min(1).max(120),
    workspaceId: z.string().uuid(),
    /** Preferred: Money/Baby grants (min 1). */
    apps: z.array(shareableAppSchema).min(1).optional(),
    /** Legacy alias → single-app grant. */
    appKey: shareableAppSchema.optional(),
    scopes: z
      .array(apiTokenScopeSchema)
      .min(1)
      .refine((s) => s.includes("read"), { message: "scopes must include read" })
      .optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.apps == null && val.appKey == null) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one app (money, baby)",
        path: ["apps"],
      });
    }
  });
