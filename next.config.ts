import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
      },
      {
        source: "/reading/:path*",
        destination: "/read/:path*",
        permanent: true
      }
    ];
  },
  output: "standalone",
  turbopack: {
    rules: {
      "*.glsl": { type: "text" },
      "*.frag": { type: "text" },
      "*.vert": { type: "text" }
    }
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.glsl$|\.frag$|\.vert$/i,
      type: "asset/source"
    });
    return config;
  }
};

export default withPayload(withNextIntl(nextConfig));
