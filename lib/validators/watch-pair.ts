import { z } from "zod";
import { API_TOKEN_SCOPES } from "@/db/schema/api-token";
import { SHAREABLE_WORKSPACE_APP_KEYS } from "@/lib/workspace-shareable-apps";

const shareableAppSchema = z.enum(SHAREABLE_WORKSPACE_APP_KEYS);
const apiTokenScopeSchema = z.enum(API_TOKEN_SCOPES);

export const watchPairMintSchema = z
  .object({
    workspaceId: z.string().uuid().optional(),
    apps: z.array(shareableAppSchema).min(1, "Select at least one app"),
    scopes: z
      .array(apiTokenScopeSchema)
      .min(1)
      .refine((s) => s.includes("read"), { message: "scopes must include read" })
      .optional(),
  })
  .strict();

export const watchPairRedeemSchema = z
  .object({
    code: z.string().min(1).max(32),
  })
  .strict();
