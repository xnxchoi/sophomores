import { APIError, type Endpoint, type PayloadRequest, type Plugin } from "payload";
import { z } from "zod";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";
import { hasConfiguredRequestAuthority } from "@/lib/phone-verification/server/local-request";
import { CommerceEvents } from "@/payload/collections/commerce-events";
import { CommerceReservations } from "@/payload/collections/commerce-reservations";
import { CommerceAllowances } from "@/payload/collections/commerce-allowances";
import { CommerceReconciliations } from "@/payload/collections/commerce-reconciliations";
import { CommerceAdmissions } from "@/payload/collections/commerce-admissions";
import { CommerceClaims } from "@/payload/collections/commerce-claims";
import { CommerceRedemptions } from "@/payload/collections/commerce-redemptions";
import { inClaimTransaction, inCommerceTransaction } from "./_shared/transaction";
import { guestClaimRejectionSchema } from "./contracts";
import { readCommerceJSON } from "./_shared/request-body";
import { assignGuestName, buyerAdmissions, checkInGuest, claimGuestAdmission, guestManifest, issueGuestClaim, redeemGuestBenefit } from "./guests";
import { updateOrderFulfillment } from "./fulfillment";
import { acceptUnitReturns, disposeReturnedUnits } from "./returns";

const id = z.string().trim().min(1).max(128);
const claimTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
// Separate from purchase membership: an invited guest needs a canonical verified
// account, not the buyer's membership. This bounded local limiter is not ingress
// or distributed-rate-limit acceptance.
const operationSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("assign-name"), admissionID: id, guestName: z.string().trim().min(1).max(100) }),
  z.strictObject({ action: z.literal("issue-claim"), admissionID: id }),
  // Preserve the strict envelope; classify malformed/missing bearer data only
  // inside the owned transaction, where rollback acknowledgement is available.
  z.strictObject({ action: z.literal("claim"), token: z.unknown().optional() }),
  z.strictObject({ action: z.literal("check-in"), admissionID: id }),
  z.strictObject({ action: z.literal("redeem"), admissionID: id, kind: z.enum(["part-i-drink", "shared-transfer"]), actionID: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/) }),
  z.strictObject({ action: z.literal("fulfillment"), orderID: id, status: z.enum(["pending", "packed", "shipped", "delivered", "return-requested", "returned"]), carrier: z.string().max(100).optional(), trackingNumber: z.string().max(120).optional(), actionID: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/) }),
  z.strictObject({ action: z.literal("accept-unit-return"), orderID: id, units: z.array(z.int().min(1).max(3)).min(1).max(3), evidenceID: z.string().trim().min(1).max(200), usedBenefitsReviewed: z.boolean().optional() }),
  z.strictObject({ action: z.literal("return-disposition"), orderID: id, units: z.array(z.int().min(1).max(3)).min(1).max(3), disposition: z.enum(["restock", "do-not-restock"]) }),
]);

type GuestOperationsDependencies = {
  getMemberRuntime?: () => { config: { origin: string }; toMemberPrincipal: (request: Request) => Promise<{ userId: string; emailVerified: boolean } | null> } | null;
  claimAdmission?: (input: { req: PayloadRequest; token: string }) => Promise<{ admissionID: string }>;
};

/** Server-owned dependencies make the real transaction/error boundary testable without providers. */
export function createGuestOperationsEndpoint(dependencies: GuestOperationsDependencies = {}): Endpoint {
  const getMemberRuntime = dependencies.getMemberRuntime ?? getPayloadMemberRuntime;
  const claimAdmission = dependencies.claimAdmission ?? claimGuestAdmission;
  const operationRates = new Map<string, { count: number; until: number }>();
  return {
  path: "/commerce/guest-operations", method: "post",
  handler: async (req) => {
    if (!req.user) return Response.json({ error: "Authentication required" }, { status: 401 });
    if (Number(req.headers.get("content-length") ?? 0) > 4096) return Response.json({ error: "Request too large" }, { status: 413 });
    let isClaimOperation = false;
    let knownClaimRejection: APIError | undefined;
    try {
      const runtime = getMemberRuntime();
      const request = req.url ? new Request(req.url, { headers: req.headers }) : null;
      if (!runtime || !request || !hasConfiguredRequestAuthority(request, runtime.config.origin) || req.headers.get("origin") !== runtime.config.origin || req.headers.get("sec-fetch-site") === "cross-site" || !req.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Request rejected" }, { status: 403 });
      if (!isCmsSuperAdmin(req.user)) {
        const principal = await runtime.toMemberPrincipal(request);
        if (!principal?.emailVerified || req.user.collection !== "users" || principal.userId !== String(req.user.id)) return Response.json({ error: "Canonical customer authentication required" }, { status: 403 });
      }
      const now = Date.now();
      for (const [key, rate] of operationRates) if (rate.until <= now) operationRates.delete(key);
      const key = `${req.user.collection}:${req.user.id}`;
      const previous = operationRates.get(key);
      if ((!previous && operationRates.size >= 1024) || (previous && previous.count >= 60)) return Response.json({ error: "Please wait" }, { status: 429 });
      operationRates.set(key, { count: (previous?.count ?? 0) + 1, until: previous?.until ?? now + 60_000 });
      const operation = operationSchema.parse(await readCommerceJSON(req));
      isClaimOperation = operation.action === "claim";
      const transact = isClaimOperation ? inClaimTransaction : inCommerceTransaction;
      const result = await transact(req, async () => {
        switch (operation.action) {
          case "assign-name": await assignGuestName({ req, ...operation }); return { success: true };
          case "issue-claim": return issueGuestClaim({ req, ...operation });
          case "claim":
            try {
              const token = claimTokenSchema.safeParse(operation.token);
              if (!token.success) throw new APIError("Invalid guest claim", 400, { code: "CLAIM_INVALID" }, true);
              return await claimAdmission({ req, token: token.data });
            }
            catch (error) {
              if (error instanceof APIError) knownClaimRejection = error;
              throw error;
            }
          case "check-in": await checkInGuest({ req, ...operation }); return { success: true };
          case "redeem": return redeemGuestBenefit({ req, ...operation });
          case "fulfillment": await updateOrderFulfillment({ req, ...operation }); return { success: true };
          case "accept-unit-return": return acceptUnitReturns({ req, ...operation });
          case "return-disposition": return disposeReturnedUnits({ req, ...operation });
        }
      });
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      req.payload.logger.error({ err: error, msg: "Commerce operation failed" });
      if (isClaimOperation) {
        const rejection = error instanceof APIError && error.isPublic
          ? guestClaimRejectionSchema.safeParse({ code: error.data?.code, status: error.status }) : null;
        // A domain rejection is public only after its owned transaction rolled back.
        // Commit/rollback errors, nested transactions and lookalike APIErrors stay unknown.
        if (error === knownClaimRejection && rejection?.success) {
          return Response.json({ error: "Commerce operation could not be completed", code: rejection.data.code }, { status: rejection.data.status, headers: { "Cache-Control": "no-store" } });
        }
        return Response.json({ error: "Commerce operation could not be completed", code: "CLAIM_RESULT_UNKNOWN" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      return Response.json({ error: "Commerce operation could not be completed" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
  },
  };
}

const operationEndpoint = createGuestOperationsEndpoint();

const manifestEndpoint: Endpoint = {
  path: "/commerce/events/:eventID/manifest", method: "get",
  handler: async (req) => {
    if (!isCmsSuperAdmin(req.user)) return Response.json({ error: "Forbidden" }, { status: 403 });
    try {
      const eventID = id.parse(req.routeParams?.eventID);
      const page = z.coerce.number().int().min(1).parse(req.query?.page ?? 1);
      return Response.json(await guestManifest({ req, eventID, page }), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      req.payload.logger.error({ err: error, msg: "Commerce manifest failed" });
      return Response.json({ error: "Manifest unavailable" }, { status: 400 });
    }
  },
};

const buyerAdmissionsEndpoint: Endpoint = {
  path: "/commerce/orders/:orderID/admissions", method: "get",
  handler: async (req) => {
    try {
      const runtime = getPayloadMemberRuntime();
      const request = req.url ? new Request(req.url, { headers: req.headers }) : null;
      const principal = runtime && request && await runtime.toMemberPrincipal(request);
      if (!principal?.emailVerified || req.user?.collection !== "users" || principal.userId !== String(req.user.id)) return Response.json({ error: "Authentication required" }, { status: 401 });
      return Response.json(await buyerAdmissions({ req, orderID: id.parse(req.routeParams?.orderID) }), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      req.payload.logger.error({ err: error, msg: "Buyer admissions unavailable" });
      return Response.json({ error: "Order admissions unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
  },
};

export const commerceDomainPlugin: Plugin = (config) => ({
  ...config,
  collections: [...(config.collections ?? []), CommerceEvents, CommerceReservations, CommerceAllowances, CommerceAdmissions, CommerceClaims, CommerceRedemptions, CommerceReconciliations],
  endpoints: [...(config.endpoints ?? []), operationEndpoint, manifestEndpoint, buyerAdmissionsEndpoint],
});
