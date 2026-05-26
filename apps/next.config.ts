import { existsSync } from "node:fs";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const candidateMonorepoRoot = path.resolve(packageDir, "..");
const monorepoRoot = existsSync(path.join(candidateMonorepoRoot, "package.json"))
  ? candidateMonorepoRoot
  : packageDir;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  experimental: {
    optimizePackageImports: [
      "@visx/curve",
      "@visx/group",
      "@visx/responsive",
      "@visx/scale",
      "@visx/sankey",
      "@visx/shape",
      "d3-shape",
    ],
  },
  turbopack: {
    // When Docker builds from `apps/` alone there is no parent workspace, so fall back to the
    // package directory; locally we still widen the root to the monorepo for npm workspace parity.
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    root: monorepoRoot,
  },
};

export default nextConfig;
