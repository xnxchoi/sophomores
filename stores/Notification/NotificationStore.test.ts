/**
 * Tests for the notification Zustand store — focuses on the count
 * semantics regression that motivated the recent refactor: `count` must
 * track unread items (not total cache size), so the header bell badge
 * stays accurate after dismiss/read flows.
 */

import { describe, expect, it } from "vitest";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import { createNotificationStore } from "./NotificationStore";

const makeNotif = (
  id: string,
  flags: Partial<Pick<SyncedNotification, "read" | "dismissed" | "status">> = {}
): SyncedNotification =>
  ({
    id,
    title: `n-${id}`,
    content: `content-${id}`,
    type: "system",
    importance: 0,
    sticky: false,
    read: flags.read ?? false,
    dismissed: flags.dismissed ?? false,
    status: flags.status ?? "unread",
    readAt: null,
    recipient: "u1",
    trigger: null,
    thumbnail: null,
    actionLink: { type: "custom", url: "/" } as never,
    createdAt: new Date(2024, 0, parseInt(id, 10)).toISOString(),
    updatedAt: new Date(2024, 0, parseInt(id, 10)).toISOString(),
    fallbackImage: null
  }) as SyncedNotification;

describe("NotificationStore — count semantics", () => {
  it("count is 0 when all notifications are read", () => {
    const store = createNotificationStore({ user: "u1" });
    store
      .getState()
      .setNotifications([
        makeNotif("1", { read: true, status: "read" }),
        makeNotif("2", { read: true, status: "read" })
      ]);
    expect(store.getState().count).toBe(0);
    expect(store.getState().notifications.size).toBe(2);
  });

  it("count includes unread items only", () => {
    const store = createNotificationStore({ user: "u1" });
    store
      .getState()
      .setNotifications([
        makeNotif("1"),
        makeNotif("2"),
        makeNotif("3", { read: true, status: "read" })
      ]);
    expect(store.getState().count).toBe(2);
  });

  it("count excludes dismissed items even if unread", () => {
    const store = createNotificationStore({ user: "u1" });
    store
      .getState()
      .setNotifications([
        makeNotif("1"),
        makeNotif("2", { dismissed: true, status: "dismissed" })
      ]);
    expect(store.getState().count).toBe(1);
  });

  it("count drops when an existing unread becomes read on next setNotifications", () => {
    const store = createNotificationStore({ user: "u1" });
    store.getState().setNotifications([makeNotif("1"), makeNotif("2")]);
    expect(store.getState().count).toBe(2);

    // Simulate a poll returning the same set with item 1 now read.
    store
      .getState()
      .setNotifications([
        makeNotif("1", { read: true, status: "read" }),
        makeNotif("2")
      ]);
    expect(store.getState().count).toBe(1);
  });

  it("count drops when an existing unread becomes dismissed on next setNotifications", () => {
    const store = createNotificationStore({ user: "u1" });
    store.getState().setNotifications([makeNotif("1"), makeNotif("2")]);
    expect(store.getState().count).toBe(2);

    store
      .getState()
      .setNotifications([
        makeNotif("1", { dismissed: true, status: "dismissed" }),
        makeNotif("2")
      ]);
    expect(store.getState().count).toBe(1);
  });

  it("count is recomputed on updateNotifications partial merge", () => {
    const store = createNotificationStore({ user: "u1" });
    store.getState().setNotifications([makeNotif("1"), makeNotif("2")]);
    expect(store.getState().count).toBe(2);

    store
      .getState()
      .updateNotifications([
        { id: "1", read: true, status: "read", dismissed: false } as never
      ]);
    expect(store.getState().count).toBe(1);
  });

  it("count rebounds when a new unread arrives", () => {
    const store = createNotificationStore({ user: "u1" });
    store
      .getState()
      .setNotifications([makeNotif("1", { read: true, status: "read" })]);
    expect(store.getState().count).toBe(0);

    store.getState().addNotification(makeNotif("2"));
    expect(store.getState().count).toBe(1);
  });

  it("updateUser resets count and clears the map", () => {
    const store = createNotificationStore({ user: "u1" });
    store.getState().setNotifications([makeNotif("1"), makeNotif("2")]);
    expect(store.getState().count).toBe(2);

    store.getState().updateUser("u2");
    expect(store.getState().count).toBe(0);
    expect(store.getState().notifications.size).toBe(0);
    expect(store.getState().user).toBe("u2");
  });
});
