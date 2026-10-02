import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,

  cacheComponents: true,

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
