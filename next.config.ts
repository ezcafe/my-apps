import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["yahoo-finance2"],
  experimental: {
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
      { source: "/money", destination: "/money/analytics", permanent: true },
      { source: "/savings", destination: "/money/savings", permanent: true },
      { source: "/savings/:path*", destination: "/money/savings", permanent: true },
      { source: "/investment", destination: "/money/investments", permanent: true },
      {
        source: "/investment/activities",
        destination: "/money/spending",
        permanent: true,
      },
      {
        source: "/investment/activities/:path*",
        destination: "/money/spending",
        permanent: true,
      },
      {
        source: "/investment/new",
        destination: "/money/investments/new",
        permanent: true,
      },
      {
        source: "/investment/settings",
        destination: "/money/investments/settings",
        permanent: true,
      },
      { source: "/investment/:path*", destination: "/money/investments", permanent: true },
      { source: "/loans", destination: "/money/loans", permanent: true },
      { source: "/loans/new", destination: "/money/loans/new", permanent: true },
      { source: "/loans/settings", destination: "/money/loans/settings", permanent: true },
      { source: "/loans/manage", destination: "/money/loans", permanent: true },
      {
        source: "/money/loans/manage",
        destination: "/money/loans",
        permanent: true,
      },
      {
        source: "/money/investments/portfolio",
        destination: "/money/investments",
        permanent: true,
      },
      { source: "/money/transactions", destination: "/money/spending", permanent: true },
      { source: "/money/transactions/:path*", destination: "/money/spending", permanent: true },
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

export default nextConfig;
