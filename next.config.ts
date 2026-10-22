import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The optimizer does not forward auth headers. Serve existing WebP assets
  // directly so the browser supplies its session cookie without public bypasses.
  images: { unoptimized: true },
  // The auth gate must see raw data/Flight requests, not normalized HTML URLs.
  skipProxyUrlNormalize: true,
  async redirects() {
    return [
      {
        destination: "/ie-incompatible.html",
        has: [
          {
            type: "header",
            key: "user-agent",
            value: "(.*Trident.*)" // all ie browsers
          }
        ],
        permanent: false,
        source: "/:path((?!ie-incompatible.html$).*)" // all pages except the incompatibility page
      }
    ];
  },
  output: "standalone"
};

export default nextConfig;
