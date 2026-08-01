/**
 * Preload for `npm test`: money GraphQL modules import auth at load time.
 * Unit tests do not exercise real OIDC; provide a non-production secret when unset.
 */
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests";
}
