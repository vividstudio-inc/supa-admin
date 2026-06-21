import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** Monorepo root — shared by file tracing and Turbopack module resolution. */
const monorepoRoot = path.join(__dirname, "../..");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@supa-admin/auth",
    "@supa-admin/crypto",
    "@supa-admin/orpc-contract",
    "@supa-admin/projections",
    "@supa-admin/rate-limit",
    "@supa-admin/rls",
    "@supa-admin/schema",
    "@supa-admin/supabase-target",
    "@supa-admin/ui",
    "@supa-admin/utils",
  ],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    turbopackServerFastRefresh: false,
    turbopackFileSystemCacheForDev: true,
  },
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
