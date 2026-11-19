"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { Notification } from "@/lib/content/slots";
import { markNotificationRead } from "@/payload/collections/notifications/actions";
import { commitNotificationRead, createNotificationStore, type NotificationStore } from "@/stores/notifications/store";

const NotificationStoreContext = createContext<NotificationStore | null>(null);
const detached = createNotificationStore({ userId: "", notifications: [] });

/**
 * The site's inbox, mounted once above the shared chrome (the header, the Controlbar and the page), as The
 * Hideaway mounts its notification provider in the root providers (providers/index.tsx:50). The page that
 * has a member's rows hands them in with `NotificationFeed`; without one the inbox is empty.
 */
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

/** Hands a page's rows to the shared inbox while the page is open, and empties it when the page leaves. */
export function NotificationFeed({ userId, notifications }: { userId: string; notifications: Notification[] }) {
  const store = useContext(NotificationStoreContext);
  useLayoutEffect(() => {
    if (!store) return;
    store.setState({ userId, notifications });
    return () => store.setState({ userId: "", notifications: [] });
  }, [store, userId, notifications]);
  return null;
}

export function useNotificationInbox(fallback: Notification[]) {
  const store = useContext(NotificationStoreContext);
  const live = useStore(store ?? detached, (state) => state.notifications);
  // Until a page feeds the inbox (the server render, before the feed's effect), its own rows show.
  const fed = useStore(store ?? detached, (state) => state.userId !== "" || state.notifications.length > 0);
  const notifications = store && fed ? live : fallback;
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
