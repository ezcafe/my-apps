import type { ApiTokenAppKey } from "@/lib/api-auth";

export const API_TOKEN_APP_KEYS = ["money"] as const satisfies readonly ApiTokenAppKey[];
