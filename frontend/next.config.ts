import type { NextConfig } from "next";

// Where the Express API lives. Browser calls go to same-origin /api/* and are proxied there, so the
// httpOnly auth cookies stay first-party (SameSite=Lax works, no CORS preflights).
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8082").replace(/\/+$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Modern equivalent of X-Frame-Options; kept to frame-ancestors so Next's inline scripts need no nonce.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Static shell prerendered, request data streamed behind <Suspense> (Next 16 caching model).
  cacheComponents: true,
  // Links prefetch only the static part of a route by default.
  partialPrefetching: true,
  // Automatic memoization: components and values re-render only when their inputs change.
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
