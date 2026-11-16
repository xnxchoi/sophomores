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
  // Three route groups each own a root layout and none is the app root, so a thrown notFound() has no
  // root not-found to render and is served as Next's bare error shell. Unmatched URLs get
  // src/app/global-not-found.tsx instead, a whole document that holds dark from its first frame.
  experimental: { globalNotFound: true },
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
        source: "/read/:path*",
        destination: "/essays/:path*",
        permanent: true
      },
      {
        source: "/reading/:path*",
        destination: "/essays/:path*",
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
