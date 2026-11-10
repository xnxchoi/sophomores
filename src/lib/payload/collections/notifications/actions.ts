"use server";

import { currentUser } from "@/lib/auth/server";
import { getPayload } from "@/lib/payload";
import type { NotificationReadResult } from "@/stores/notifications/store";

/** Sets `read` on one notification the signed-in member is allowed to update. */
export async function markNotificationRead(id: string): Promise<NotificationReadResult | null> {
  if (!id) return null;
  const user = await currentUser();
  const userId = user?.id ? String(user.id) : "";
  if (!userId) return null;
  try {
    const payload = await getPayload();
    const doc = await payload.update({
      collection: "notifications",
      id,
      data: { read: true },
      overrideAccess: false,
      user: { ...user, id: userId, collection: "users" }
    });
    const savedId = doc && typeof doc === "object" && "id" in doc ? String(doc.id) : "";
    if (savedId !== id) return null;
    return { id: savedId, read: true };
  } catch {
    return null;
  }
}
