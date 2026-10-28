import type { Payload } from "payload";
import { getPayload } from "@/lib/payload";

/**
 * Checks whether an email address belongs to the internal staff domain (sophomores.co).
 */
export function isStaffEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith("@sophomores.co") || normalized.endsWith(".sophomores.co");
}

/**
 * Ensures that an admin account with staff role is provisioned in the Payload Admins collection
 * for users registering with an official sophomores.co email.
 */
export async function ensureStaffAdminProvisioned(
  params: { email: string; name?: string | null; id?: string | null },
  payloadInstance?: Payload
): Promise<void> {
  const email = params.email.trim().toLowerCase();
  if (!isStaffEmail(email)) return;

  try {
    const payload = payloadInstance || (await getPayload());
    const existing = await payload.find({
      collection: "admins",
      where: { email: { equals: email } },
      limit: 1,
    });

    if (existing.totalDocs === 0) {
      await payload.create({
        collection: "admins",
        data: {
          name: params.name || email.split("@")[0] || "Staff Member",
          email: email,
          role: "staff",
          password: `Staff_Temp_${params.id || Date.now()}!${Math.random().toString(36).slice(2, 8)}`,
        },
      });
      payload.logger?.info?.(`[Staff Provisioning] Auto-provisioned admin account for staff member: ${email}`);
    } else {
      // If admin exists, ensure their role is at least staff
      const admin = existing.docs[0];
      if (admin && admin.role !== "admin" && admin.role !== "editor" && admin.role !== "staff") {
        await payload.update({
          collection: "admins",
          id: admin.id,
          data: { role: "staff" },
        });
      }
    }
  } catch (error) {
    console.error(`[Staff Provisioning] Failed to provision admin account for ${email}:`, error);
  }
}
