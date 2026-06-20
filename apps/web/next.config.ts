import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

function buildContentSecurityPolicy(): string {
  const metaUrl = process.env.NEXT_PUBLIC_META_SUPABASE_URL ?? "";
  const extraConnect = process.env.CSP_EXTRA_CONNECT_SRC ?? "";
  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    metaUrl,
    ...extraConnect
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ].join(" ");

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${connectSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "frame-ancestors 'none'",
  ].join("; ");
}

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
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@supa-admin/auth",
    "@supa-admin/crypto",
    "@supa-admin/orpc-contract",
    "@supa-admin/projections",
    "@supa-admin/rls",
    "@supa-admin/schema",
    "@supa-admin/supabase-target",
    "@supa-admin/ui",
    "@supa-admin/utils",
  ],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
