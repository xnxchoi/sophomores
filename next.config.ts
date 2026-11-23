import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The site's 404, rendered on the server by src/app/global-not-found.tsx: a path no route matches.
const siteNotFound = "/not-found";
// An order id the order pages accept (z.uuid(), versions 1-8). Nil and max UUIDs, which z.uuid() also
// accepts, are left out: they are never order ids, and leaving them out keeps this exact under Next's
// case-insensitive route matching (z.uuid() takes the max UUID in lowercase only).
const orderId =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The optimizer does not forward auth headers. Serve existing WebP assets
  // directly so the browser supplies its session cookie without public bypasses.
  images: { unoptimized: true },
  // The auth gate must see raw data/Flight requests, not normalized HTML URLs.
  skipProxyUrlNormalize: true,
  // Default redirects run before Proxy and retain the query. NFC must reject
  // noncanonical paths itself, and the dev server must not log tap URLs.
  skipTrailingSlashRedirect: true,
  logging: { incomingRequests: { ignore: [/^\/+nfc(?:[/?\\]|$)/i] } },
  // Three route groups each own a root layout and none is the app root, so a thrown notFound() has no
  // root not-found to render and is served as Next's bare error shell. Unmatched URLs get
  // src/app/global-not-found.tsx instead, a whole document that holds dark from its first frame.
  experimental: { globalNotFound: true },
  // Order ids the order pages would reject go to the unmatched-route 404 before any page renders. A
  // missing essay or setlist calls notFound(), which renders (site)/not-found.tsx.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: `/:section(shop|me)/orders/:id((?!(?:${orderId})$)[^/]+)`,
          destination: siteNotFound
        }
      ],
      afterFiles: [],
      fallback: []
    };
  },
  async redirects() {
    return [
      {
        // Preserve Next's normal slash redirect (before site redirects), except NFC.
        source: "/:path((?![Nn][Ff][Cc](?:/|$))[^/]+(?:/[^/]+)*)/",
        destination: "/:path",
        permanent: true,
        missing: [{ type: "header", key: "x-nextjs-data" }]
      },
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
        source: "/:path((?!ie-incompatible.html$|[Nn][Ff][Cc](?:/|$)).*)" // all pages except the incompatibility page
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
