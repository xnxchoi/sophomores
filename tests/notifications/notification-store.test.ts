import assert from "node:assert/strict";
import test from "node:test";
import {
  commitNotificationRead,
  createNotificationStore,
  notificationsForMember,
  type NotificationDoc
} from "@/stores/notifications/store";

const docs: NotificationDoc[] = [
  {
    id: "note-a",
    recipientId: "member-1",
    title: "Door",
    body: "Open",
    href: "/read/door",
    imageUrl: "",
    read: false,
    createdAt: "2026-11-08T00:00:00.000Z"
  },
  {
    id: "note-b",
    recipientId: "member-2",
    title: "Other",
    body: "Hidden",
    href: "/read/other",
    imageUrl: "",
    read: false,
    createdAt: "2026-11-08T00:00:00.000Z"
  }
];

test("a member read returns only that member's notifications", () => {
  assert.deepEqual(
    notificationsForMember(docs, "member-1").map((doc) => doc.id),
    ["note-a"]
  );
  assert.deepEqual(notificationsForMember(docs, ""), []);
});

test("marking a notification read writes that document id and keeps read on the store", async () => {
  const store = createNotificationStore({
    userId: "member-1",
    notifications: [{ id: "note-a", title: "Door", body: "Open", href: "/read/door", imageUrl: "", read: false, createdAt: "" }]
  });
  let written: { id: string; userId: string } | null = null;
  const saved = await commitNotificationRead(
    store,
    {
      updateRead: async (input) => {
        written = input;
        return { id: input.id, read: true };
      }
    },
    "note-a"
  );
  assert.deepEqual(written, { id: "note-a", userId: "member-1" });
  assert.deepEqual(saved, { id: "note-a", read: true });
  assert.equal(store.getState().notifications.find((notification) => notification.id === "note-a")?.read, true);
});

test("a rejected write puts the notification back to unread", async () => {
  const store = createNotificationStore({
    userId: "member-1",
    notifications: [{ id: "note-a", title: "Door", body: "Open", href: "/read/door", imageUrl: "", read: false, createdAt: "" }]
  });
  const saved = await commitNotificationRead(store, { updateRead: async () => null }, "note-a");
  assert.equal(saved, null);
  assert.equal(store.getState().notifications[0]?.read, false);
});
