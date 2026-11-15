import type { Endpoint, PayloadRequest } from "payload";
import { z } from "zod";
import { isCmsStaff } from "@/lib/auth/access";
import { readCommerceJSON } from "../_shared/request-body";
import { doorCheckIn, doorCount, searchDoorAdmissions } from "./check-in";

const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/);
const checkInSchema = z.discriminatedUnion("method", [
  z.strictObject({
    eventID: id,
    method: z.literal("qr"),
    scan: z.string().min(1).max(4096)
  }),
  z.strictObject({ eventID: id, method: z.literal("name"), admissionID: id })
]);
const noStore = { "Cache-Control": "no-store" };

/** Staff session cookies authenticate these, so a write must come from our own page. */
function sameOrigin(req: PayloadRequest): boolean {
  if (!req.url) return false;
  return (
    req.headers.get("origin") === new URL(req.url).origin &&
    req.headers.get("sec-fetch-site") !== "cross-site"
  );
}

export const doorCheckInEndpoint: Endpoint = {
  path: "/commerce/door/check-in",
  method: "post",
  handler: async (req) => {
    if (!isCmsStaff(req.user))
      return Response.json(
        { error: "Door staff access required" },
        { status: 403, headers: noStore }
      );
    if (!sameOrigin(req))
      return Response.json(
        { error: "Request rejected" },
        { status: 403, headers: noStore }
      );
    try {
      const input = checkInSchema.parse(await readCommerceJSON(req));
      const result = await doorCheckIn({ req, ...input });
      return Response.json(
        { result, count: await doorCount({ req, eventID: input.eventID }) },
        { headers: noStore }
      );
    } catch (error) {
      req.payload.logger.error({ err: error, msg: "Door check-in failed" });
      return Response.json(
        { error: "Check-in could not be completed" },
        { status: 400, headers: noStore }
      );
    }
  }
};

export const doorSearchEndpoint: Endpoint = {
  path: "/commerce/door/events/:eventID/search",
  method: "get",
  handler: async (req) => {
    if (!isCmsStaff(req.user))
      return Response.json(
        { error: "Door staff access required" },
        { status: 403, headers: noStore }
      );
    try {
      const eventID = id.parse(req.routeParams?.eventID);
      const query = z
        .string()
        .max(100)
        .parse(req.query?.q ?? "");
      return Response.json(
        { results: await searchDoorAdmissions({ req, eventID, query }) },
        { headers: noStore }
      );
    } catch (error) {
      req.payload.logger.error({ err: error, msg: "Door search failed" });
      return Response.json(
        { error: "Search unavailable" },
        { status: 400, headers: noStore }
      );
    }
  }
};

export const doorCountEndpoint: Endpoint = {
  path: "/commerce/door/events/:eventID/count",
  method: "get",
  handler: async (req) => {
    if (!isCmsStaff(req.user))
      return Response.json(
        { error: "Door staff access required" },
        { status: 403, headers: noStore }
      );
    try {
      return Response.json(
        await doorCount({ req, eventID: id.parse(req.routeParams?.eventID) }),
        { headers: noStore }
      );
    } catch (error) {
      req.payload.logger.error({ err: error, msg: "Door count failed" });
      return Response.json(
        { error: "Count unavailable" },
        { status: 400, headers: noStore }
      );
    }
  }
};

export const doorEndpoints = [
  doorCheckInEndpoint,
  doorSearchEndpoint,
  doorCountEndpoint
];
