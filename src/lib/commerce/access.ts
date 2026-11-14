import { APIError, type Access, type FieldAccess, type PayloadRequest } from "payload";
import { z } from "zod";
import { isCmsSuperAdmin } from "../auth/access";
import { getPayloadMemberRuntime } from "../member-auth/payload-runtime";
import { hasConfiguredRequestAuthority } from "../phone-verification/server/local-request";

// This capability lives outside serializable req.context/body. Only server code
// holding this module can enter it; generic REST and CMS writes cannot forge it.
const writeScopes = new WeakMap<PayloadRequest, number>();
export const commerceServerWrite = (req: PayloadRequest): boolean => (writeScopes.get(req) ?? 0) > 0;
export async function withCommerceWrite<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  writeScopes.set(req, (writeScopes.get(req) ?? 0) + 1);
  try { return await work(); }
  finally {
    const remaining = (writeScopes.get(req) ?? 1) - 1;
    if (remaining) writeScopes.set(req, remaining); else writeScopes.delete(req);
  }
}

export const commerceAdmin = (({ req }) => isCmsSuperAdmin(req.user)) satisfies Access;
export const commerceAdminField: FieldAccess = ({ req }) => isCmsSuperAdmin(req.user);
export const commerceServerField: FieldAccess = ({ req }) => commerceServerWrite(req);
export const commerceOwnerRead: Access = ({ req }) => {
  if (isCmsSuperAdmin(req.user)) return true;
  return req.user?.collection === "users" ? { customer: { equals: req.user.id } } : false;
};

/** Fresh canonical Better Auth proof AND authoritative membership, never role/body claims. */
export async function eligibleCommerceCustomer(request: Request | PayloadRequest): Promise<string | null> {
  const runtime = getPayloadMemberRuntime();
  if (!runtime || !request.url) return null;
  // The canonical session adapter consumes only URL/headers. PayloadRequest is
  // a partial Request type; project those capabilities onto a real Request
  // instead of claiming its optional fetch properties satisfy the native API.
  const principal = await runtime.toMemberPrincipal(new Request(request.url, { headers: request.headers }));
  if (!principal?.emailVerified || !z.email().safeParse(principal.email).success || !await runtime.repository.isActiveMember(principal.userId)) return null;
  return principal.userId;
}

// No installed general-purpose shared ingress limiter exists. This bounded
// process-local guard is not distributed protection; public activation still
// requires the approved shared/ingress rate-limit gate.
const rates = new Map<string, { count: number; expires: number }>();
function rateCommerceCustomer(customerID: string): void {
  const now = Date.now();
  for (const [key, value] of rates) if (value.expires <= now) rates.delete(key);
  const previous = rates.get(customerID);
  if (!previous && rates.size >= 1024) throw new APIError("Commerce unavailable", 503);
  if (previous && previous.count >= 30) throw new APIError("Please wait before trying again", 429);
  rates.set(customerID, { count: (previous?.count ?? 0) + 1, expires: previous?.expires ?? now + 60_000 });
}

/** Same-origin commerce policy; read-only GET discovery does not require Origin. */
export function assertCommerceBrowserAuthority(req: Request | PayloadRequest, origin: string, mode: "read" | "mutation"): void {
  if (!req.url) throw new APIError("Commerce request rejected", 403);
  const url = new URL(req.url);
  const suppliedOrigin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (!hasConfiguredRequestAuthority(new Request(url, { headers: req.headers }), origin)
    || (suppliedOrigin !== null && suppliedOrigin !== origin)
    || (mode === "mutation" && (suppliedOrigin !== origin || url.search))
    || (mode === "read" && (req.method !== "GET" || (fetchSite !== null && !["same-origin", "none"].includes(fetchSite))))
    || fetchSite === "cross-site" || req.headers.has("rsc")) {
    throw new APIError("Commerce request rejected", 403);
  }
}

export async function assertCommerceBrowserMutation(req: PayloadRequest): Promise<string> {
  const runtime = getPayloadMemberRuntime();
  if (!runtime) throw new APIError("Commerce unavailable", 503);
  assertCommerceBrowserAuthority(req, runtime.config.origin, "mutation");
  const customerID = await eligibleCommerceCustomer(req);
  if (!customerID || req.user?.collection !== "users" || String(req.user.id) !== customerID) throw new APIError("Verified membership required", 403);
  rateCommerceCustomer(customerID);
  return customerID;
}

/** Discovery reads only the account's ledger; it never depends on PG configuration. */
export async function assertCommerceBrowserRead(req: PayloadRequest): Promise<string> {
  const runtime = getPayloadMemberRuntime();
  if (!runtime) throw new APIError("Commerce unavailable", 503);
  assertCommerceBrowserAuthority(req, runtime.config.origin, "read");
  const customerID = await eligibleCommerceCustomer(req);
  if (!customerID || req.user?.collection !== "users" || String(req.user.id) !== customerID) throw new APIError("Verified membership required", 403);
  rateCommerceCustomer(customerID);
  return customerID;
}
