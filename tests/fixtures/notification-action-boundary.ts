import type { NotificationReadResult } from "@/stores/notifications/store";

let attempts = 0;

// Native Node imports server-action implementations; Next's client graph uses
// action references. Static link SSR must never execute either representation.
export async function markNotificationRead(_id: string): Promise<NotificationReadResult | null> {
  attempts += 1;
  throw new Error("Auth entry SSR forbids notification actions and provider access");
}

export const readNotificationActionAttempts = () => attempts;
