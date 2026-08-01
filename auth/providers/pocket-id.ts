import type { OIDCConfig } from "@auth/core/providers";

export default function PocketId(options: {
  issuer: string;
  clientId: string;
  clientSecret: string;
}): OIDCConfig<Record<string, unknown>> {
  return {
    id: "pocket-id",
    name: "Pocket ID",
    type: "oidc",
    issuer: options.issuer,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      params: {
        scope: "openid email profile",
      },
    },
    checks: ["pkce", "state"],
    profile(profile) {
      const p = profile as {
        sub: string;
        name?: string;
        preferred_username?: string;
        email?: string;
        picture?: string;
      };
      return {
        id: p.sub,
        name: p.name ?? p.preferred_username ?? p.email,
        email: p.email,
        image: p.picture,
      };
    },
  };
}
