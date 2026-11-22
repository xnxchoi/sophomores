import { createLocalReq, type Payload, type PayloadRequest, type TypedUser } from "payload";

/**
 * A Local API request carrying the caller's Payload principal, for setlist reads
 * and writes that run through collection access (overrideAccess: false).
 *
 * payload.auth runs the configured strategies, so a member arrives as
 * collection "users" and staff as "admins". currentUser() returns the raw
 * better-auth user without that discriminator, which createLocalReq would
 * otherwise fill with the admin collection.
 */
export async function setlistLocalRequest(
  payload: Payload,
  request: Request,
  // A principal this request already resolved through payload.auth.
  known?: TypedUser
): Promise<PayloadRequest> {
  const user = known ?? (await payload.auth({ headers: request.headers })).user;
  return createLocalReq(
    { user: user ?? undefined, req: { headers: request.headers } },
    payload
  );
}

/** The signed-in member on this request, or null for guests and staff accounts. */
export function setlistMember(req: PayloadRequest) {
  return req.user?.collection === "users" ? req.user : null;
}
