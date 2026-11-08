import canUseDOM from "./canUseDOM";

export const getServerSideURL = () => {
  let url = process.env.NEXT_PUBLIC_SERVER_URL;

  if (!url && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (!url) {
    url = "http://localhost:3000";
  }

  return url;
};

export const getClientSideURL = () => {
  if (canUseDOM) {
    const { protocol } = window.location;
    const domain = window.location.hostname;
    const { port } = window.location;

    return `${protocol}//${domain}${port ? `:${port}` : ""}`;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return process.env.NEXT_PUBLIC_SERVER_URL || "";
};

// Strip our own origin from `url` so Next.js Image Optimization treats it as
// same-origin and fetches via the internal in-process route. Without this,
// dev URLs like `http://localhost:3000/api/userMedia/...` resolve to
// 127.0.0.1 / ::1 and are rejected by Next 16's SSRF guard. In production it
// also avoids an unnecessary public-hostname round-trip back to the origin.
export const toRelativeIfSameOrigin = (url: string): string => {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("//") || !/^https?:\/\//i.test(url)) return url;

  const ownOrigins: string[] = [];
  if (process.env.NEXT_PUBLIC_SERVER_URL)
    ownOrigins.push(process.env.NEXT_PUBLIC_SERVER_URL);
  if (canUseDOM)
    ownOrigins.push(`${window.location.protocol}//${window.location.host}`);

  for (const origin of ownOrigins) {
    const trimmed = origin.replace(/\/$/, "");
    if (url === trimmed) return "/";
    if (url.startsWith(trimmed + "/")) return url.slice(trimmed.length);
  }
  return url;
};
