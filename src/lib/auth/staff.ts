import type { Payload } from "payload";
import { isVerifiedStaff } from "./staff-email";

export { isStaffEmail, isVerifiedStaff } from "./staff-email";

/** Only authoritative, verified canonical identities may bootstrap least-privilege CMS staff. */
export async function ensureStaffAdminProvisioned(
  params: {
    email: string;
    emailVerified?: boolean | null;
    name?: string | null;
    id?: string | null;
  },
  payloadInstance?: Payload
): Promise<void> {
  if (!isVerifiedStaff(params)) return;
  const email = params.email.trim().toLowerCase();
  const payload =
    payloadInstance ?? (await (await import("@/payload")).getPayload());
  // This narrow internal bypass follows verified canonical identity, not caller input.
  const existing = await payload.find({
    collection: "admins",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true
  });
  if (existing.docs[0]) return; // Never overwrite legitimate staff/editor/admin roles.
  try {
    await payload.create({
      collection: "admins",
      overrideAccess: true,
      data: {
        name: params.name || email.split("@")[0] || "Staff Member",
        email,
        role: "staff"
      }
    });
  } catch (error) {
    // Concurrent verified requests may provision the same unique email. Only that
    // successful race is recoverable; persistence failures must remain visible.
    const raced = await payload.find({
      collection: "admins",
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true
    });
    if (!raced.docs[0]) throw error;
  }
}
