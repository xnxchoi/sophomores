"use client";

import { useLayoutEffect } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { NotificationFeed } from "@/components/notifications/notification-inbox";
import type { Notification, PostBody } from "@/lib/content/slots";

/**
 * The one header is mounted by the site frame on every page (The Hideaway: app/(frontend)/layout.tsx:96).
 * The essays reading view has what its header actions need, its posts for Search and the member's
 * notifications, so it hands them up with `<ReadingChrome>` instead of mounting a header of its own. The
 * header shows its reading actions while posts are shared, and its ordinary ones otherwise.
 *
 * The Hideaway's header gets these from root providers (SearchBarProvider, GlobalNotificationProvider);
 * ours are per route, so the route hands them in (declared deviation, v9 HANDOFF).
 */
const shared = createStore<{ posts: PostBody[] | null }>(() => ({
  posts: null
}));

export function ReadingChrome({
  posts,
  notifications,
  userId
}: {
  posts: PostBody[];
  notifications: Notification[];
  userId: string;
}) {
  useLayoutEffect(() => {
    shared.setState({ posts });
    return () => shared.setState({ posts: null });
  }, [posts]);
  return <NotificationFeed userId={userId} notifications={notifications} />;
}

/** The reading view's posts while it is open; null on every other page. */
export function useReadingPosts() {
  return useStore(shared, (state) => state.posts);
}
