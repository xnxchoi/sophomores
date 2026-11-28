import configPromise from "@payload-config";
import { readCommerceJSONText } from "@/lib/commerce/_shared/request-body";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

type PayloadREST = ReturnType<typeof REST_POST>;
function privateCartResponse(handler: PayloadREST): PayloadREST {
  return async (request, context) => {
    const slug = (await context.params).slug;
    const response = await handler(request, context);
    if (slug?.[0] === "carts" || (slug?.[0] === "users" && slug[1] === "me" && slug.length === 2)) {
      response.headers.set("Cache-Control", "private, no-store");
    }
    return response;
  };
}

function boundCartWrites(handler: PayloadREST): PayloadREST {
  return async (request, context) => {
    const slug = (await context.params).slug;
    if (slug?.[0] !== "carts" || (slug.length !== 1 && request.method !== "PATCH")) return handler(request, context);
    let body: string;
    try { body = await readCommerceJSONText(request); }
    catch (error) {
      const status = typeof error === "object" && error && "status" in error &&
        (error.status === 408 || error.status === 413 || error.status === 415) ? error.status : 400;
      return Response.json({ errors: [{ message: "Cart request could not be read." }] }, { status });
    }
    // Reuse the normal Payload handler for parsing, authorization, and the Local API write.
    return handler(new Request(request.url, { method: request.method, headers: request.headers, body, signal: request.signal }), context);
  };
}

export const GET = privateCartResponse(REST_GET(configPromise));
export const POST = privateCartResponse(boundCartWrites(REST_POST(configPromise)));
export const DELETE = REST_DELETE(configPromise);
export const PATCH = privateCartResponse(boundCartWrites(REST_PATCH(configPromise)));
export const PUT = REST_PUT(configPromise);
export const OPTIONS = REST_OPTIONS(configPromise);
