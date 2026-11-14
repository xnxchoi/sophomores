"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { Notification } from "@/lib/content/slots";
import { markNotificationRead } from "@/payload/collections/notifications/actions";
import { commitNotificationRead, createNotificationStore, type NotificationStore } from "@/stores/notifications/store";

const NotificationStoreContext = createContext<NotificationStore | null>(null);
const detached = createNotificationStore({ userId: "", notifications: [] });

export function NotificationProvider({
  userId,
  notifications,
  children
}: {
  userId: string;
  notifications: Notification[];
  children: ReactNode;
}) {
  const [store] = useState(() => createNotificationStore({ userId, notifications }));
  return <NotificationStoreContext.Provider value={store}>{children}</NotificationStoreContext.Provider>;
}

export function useNotificationInbox(fallback: Notification[]) {
  const store = useContext(NotificationStoreContext);
  const live = useStore(store ?? detached, (state) => state.notifications);
  const notifications = store ? live : fallback;
  return {
    connected: store !== null,
    notifications,
    unread: notifications.filter((notification) => !notification.read),
    markRead: (id: string) => {
      if (!store) return;
      void commitNotificationRead(
        store,
        { updateRead: ({ id: notificationId }) => markNotificationRead(notificationId) },
        id
      );
    }
  };
}
