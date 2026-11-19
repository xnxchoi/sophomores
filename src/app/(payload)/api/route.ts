import configPromise from "@payload-config";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT
} from "@payloadcms/next/routes";

// The bare API root belongs to Payload, not to the site's 404 (owner, 2026-11-16: admin and the rest get
// separate 404s). [...slug] needs at least one segment, so `/api` alone would fall through to the site's
// global-not-found; this hands it to Payload's REST handlers with an empty path, which answer with their own
// JSON "Route not found", for the same methods as [...slug].
const params = { params: Promise.resolve({ slug: [] as string[] }) };

export const GET = (request: Request) =>
  REST_GET(configPromise)(request, params);
export const POST = (request: Request) =>
  REST_POST(configPromise)(request, params);
export const DELETE = (request: Request) =>
  REST_DELETE(configPromise)(request, params);
export const PATCH = (request: Request) =>
  REST_PATCH(configPromise)(request, params);
export const PUT = (request: Request) =>
  REST_PUT(configPromise)(request, params);
export const OPTIONS = (request: Request) =>
  REST_OPTIONS(configPromise)(request, params);
