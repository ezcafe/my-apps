import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["yahoo-finance2"],
  experimental: {
    // TypeScript 7 has no JS Compiler API; run project-local native tsc instead.
    useTypeScriptCli: true,
    optimizePackageImports: [
      "@tanstack/react-query",
      "@visx/curve",
      "@visx/group",
      "@visx/responsive",
      "@visx/scale",
      "@visx/sankey",
      "@visx/shape",
      "d3-shape",
      "next-auth/react",
    ],
  },
  async redirects() {
    return [
      { source: "/money/analytics", destination: "/money/insights", permanent: true },
      {
        source: "/money/analytics/:path*",
        destination: "/money/insights/:path*",
        permanent: true,
      },
      { source: "/savings", destination: "/money/savings", permanent: true },
      { source: "/savings/:path*", destination: "/money/savings", permanent: true },
      { source: "/investment/activities", destination: "/investments", permanent: true },
      {
        source: "/investment/activities/:path*",
        destination: "/investments",
        permanent: true,
      },
      { source: "/investment/new", destination: "/investments/new", permanent: true },
      {
        source: "/investment/settings",
        destination: "/investments/instruments",
        permanent: true,
      },
      { source: "/investment", destination: "/investments", permanent: true },
      { source: "/investment/:path*", destination: "/investments", permanent: true },
      { source: "/loans/manage", destination: "/loans", permanent: true },
      {
        source: "/money/loans/manage",
        destination: "/loans",
        permanent: false,
      },
      { source: "/money/loans", destination: "/loans", permanent: false },
      {
        source: "/money/loans/:path*",
        destination: "/loans/:path*",
        permanent: false,
      },
      { source: "/money/spending", destination: "/money", permanent: true },
      {
        source: "/money/spending/:path*",
        destination: "/money",
        permanent: true,
      },
      {
        source: "/money/investments/settings",
        destination: "/investments/settings",
        permanent: true,
      },
      {
        source: "/money/investments/portfolio",
        destination: "/investments",
        permanent: true,
      },
      { source: "/money/investments", destination: "/investments", permanent: true },
      {
        source: "/money/investments/:path*",
        destination: "/investments/:path*",
        permanent: true,
      },
      { source: "/money/transactions", destination: "/money", permanent: true },
    ];
  },
  async headers() {
    const scriptSrc = [
      "'self'",
      // Next.js injects small inline bootstrap/runtime scripts during initial HTML render.
      // Without nonce-based CSP plumbing, blocking inline scripts breaks first paint/hydration.
      "'unsafe-inline'",
      ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
    ].join(" ");
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `script-src-elem ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
