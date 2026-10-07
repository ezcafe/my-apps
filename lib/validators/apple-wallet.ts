import { z } from "zod";

/** Optional workspace body for mint issue-token and unlink subscription. */
export const appleWalletWorkspaceBodySchema = z
  .object({
    workspaceId: z.string().uuid().optional(),
  })
  .strict();
