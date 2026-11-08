import { createStore, type StoreApi } from "zustand/vanilla";
import type { Notification } from "@/lib/content/slots";

export type NotificationDoc = {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  href: string;
  imageUrl: string;
  read: boolean;
  createdAt: string;
};

/** Unsigned callers get nothing. A signed-in member sees only their rows. */
export function notificationsForMember(docs: NotificationDoc[], userId: string): NotificationDoc[] {
  if (!userId) return [];
  return docs.filter((doc) => doc.recipientId === userId);
}

export function withNotificationRead(notifications: Notification[], id: string): Notification[] {
  return notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification));
}

export type NotificationState = {
  userId: string;
  notifications: Notification[];
  markRead: (id: string) => void;
  replace: (notifications: Notification[]) => void;
};

export type NotificationStore = StoreApi<NotificationState>;

export function createNotificationStore(input: { userId: string; notifications: Notification[] }): NotificationStore {
  return createStore<NotificationState>((set) => ({
    userId: input.userId,
    notifications: input.notifications,
    replace: (notifications) => set({ notifications }),
    markRead: (id) => set((state) => ({ notifications: withNotificationRead(state.notifications, id) }))
  }));
}

export type NotificationReadResult = { id: string; read: true };

export type NotificationReadWriter = {
  updateRead: (input: { id: string; userId: string }) => Promise<NotificationReadResult | null>;
};

/** Optimistic `read` on this id, kept only when the writer confirms that same id. */
export async function commitNotificationRead(store: NotificationStore, writer: NotificationReadWriter, id: string) {
  const { userId, notifications } = store.getState();
  if (!userId) return null;
  store.getState().markRead(id);
  const saved = await writer.updateRead({ id, userId });
  const current = store.getState().notifications.find((notification) => notification.id === id);
  if (!saved || saved.id !== id || saved.read !== true || current?.read !== true) {
    store.getState().replace(notifications);
    return null;
  }
  return saved;
}
