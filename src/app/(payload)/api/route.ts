import configPromise from "@payload-config";
import { REST_GET, REST_OPTIONS } from "@payloadcms/next/routes";

// The bare API root belongs to Payload, not to the site's 404 (owner, 2026-11-16: admin and the rest get
// separate 404s). [...slug] needs at least one segment, so `/api` alone would fall through to the site's
// global-not-found; this hands it to Payload's REST handler with an empty path, which answers with its own
// JSON "Route not found".
const params = { params: Promise.resolve({ slug: [] as string[] }) };

export const GET = (request: Request) =>
  REST_GET(configPromise)(request, params);
export const OPTIONS = (request: Request) =>
  REST_OPTIONS(configPromise)(request, params);
