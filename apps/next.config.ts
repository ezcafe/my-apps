import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(packageDir, "..");

const nextConfig: NextConfig = {
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
    // `next` is hoisted to the workspace root node_modules; widen Turbopack root to the
    // monorepo so resolution matches npm workspaces and the multi-lockfile warning is explicit.
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    root: monorepoRoot,
  },
};

export default nextConfig;
