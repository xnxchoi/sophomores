import type { Payload, PayloadRequest } from "payload";
import { isConfiguredStaffEmail, isReviewEditorProfile, staffAuthOrigin } from "./review-editor-policy";
import { isStaffEmail } from "./staff-email";
import { logAuthFailure } from "./failure-log";
import { bootstrapSuperAdminEmail, ensureFirstSuperAdmin } from "@/payload/seed/super-admin";

export { isStaffEmail };

/**
 * The one staff-address rule, used by sign-in and the CMS magic link alike: the configured staff
 * address(es) for this profile, plus the configured first super admin's own address (owner, 22 Nov).
 * That address is admitted exactly, never as a domain, and never on the restricted review copy;
 * no other public-domain address is ever staff.
 */
export function isStaffAddress(email: string | null | undefined, origin = staffAuthOrigin(),
  env: Record<string, string | undefined> = process.env): boolean {
  if (isConfiguredStaffEmail(origin, email, env)) return true;
  const bootstrap = bootstrapSuperAdminEmail(env);
  return bootstrap !== null && !isReviewEditorProfile(origin, env) && typeof email === "string" && email.trim().toLowerCase() === bootstrap;
}

export function isVerifiedStaff(user: { email?: string | null; emailVerified?: boolean | null }, origin = staffAuthOrigin(),
  env: Record<string, string | undefined> = process.env): boolean {
  return user.emailVerified === true && isStaffAddress(user.email, origin, env);
}

/**
 * Every sign-in of the configured first super admin, including one whose admins row already exists:
 * provision the row if missing and retry the bootstrap (startup may have run before the row existed,
 * or a first promotion may have failed). Other staff are provisioned by the per-request strategy.
 * A failure here never blocks the sign-in; it is logged by a fixed label only, never with the address.
 */
export async function onStaffSignIn(user: { email?: string | null; emailVerified?: boolean | null; name?: string | null; id?: string | null },
  payloadInstance?: Payload): Promise<void> {
  const bootstrap = bootstrapSuperAdminEmail();
  if (!bootstrap || !user.email || user.email.trim().toLowerCase() !== bootstrap || !isVerifiedStaff(user)) return;
  try { await ensureStaffAdminProvisioned({ ...user, email: user.email }, payloadInstance); }
  catch (error) {
    logAuthFailure("Staff sign-in provisioning failed.", error);
  }
}

/** Only authoritative, verified canonical identities may bootstrap least-privilege CMS staff. */
export async function ensureStaffAdminProvisioned(
  params: {
    email: string;
    emailVerified?: boolean | null;
    name?: string | null;
    id?: string | null;
  },
  payloadInstance?: Payload,
  req?: PayloadRequest,
): Promise<void> {
  if (!isVerifiedStaff(params)) return;
  const email = params.email.trim().toLowerCase();
  const payload =
    req?.payload ?? payloadInstance ?? (await (await import("@/payload")).getPayload());
  // This narrow internal bypass follows verified canonical identity, not caller input.
  const existing = await payload.find({
    collection: "admins",
    req,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true
  });
  if (existing.docs[0]) {
    // Never overwrite legitimate staff/editor/admin roles. A sign-in of the configured first
    // super admin still retries the bootstrap, in case startup ran before this row existed.
    if (!req && email === bootstrapSuperAdminEmail()) await ensureFirstSuperAdmin(payload);
    return;
  }
  try {
    await payload.create({
      collection: "admins",
      req,
      overrideAccess: true,
      data: {
        name: params.name || email.split("@")[0] || "Staff Member",
        email,
        role: "staff"
      }
    });
    // Bootstrap owns its own transaction. Sign-in/startup can promote once this row is committed.
    if (!req && email === bootstrapSuperAdminEmail()) await ensureFirstSuperAdmin(payload);
  } catch (error) {
    // A failed nested Payload create can roll back its owning request. Do not query or recover on that request.
    if (req) throw error;
    // Concurrent verified requests may provision the same unique email. Only that
    // successful race is recoverable; persistence failures must remain visible.
    const raced = await payload.find({
      collection: "admins",
      req,
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true
    });
    if (!raced.docs[0]) throw error;
  }
}
