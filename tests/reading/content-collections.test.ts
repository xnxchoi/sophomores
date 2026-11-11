import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { useCanvasFrameloopStore } from "@/components/gl/canvas-frameloop";
import { siteLayer } from "@/constants/site-layers";
import { SharedCanvas } from "@/components/gl/shared-canvas";
import { ClientLayout } from "@/app/(site)/client-layout";
import { Providers } from "@/providers";
import { HAStoreProvider } from "@/providers/RP_Pro";
import { assignBookmarkOwner, Bookmarks } from "@/lib/payload/collections/bookmarks";
import { contentCollections } from "@/lib/payload/collections";
import { lockNotificationRecipient, Notifications } from "@/lib/payload/collections/notifications";
import type { MemberPrincipal } from "@/lib/payload/collections/access";
import { fromStoredPost } from "@/lib/content/map";
import { useSiteMenu } from "@/lib/content/menu";

test("content collections stay on plain fields instead of polymorphic uploads", () => {
  const slugs = contentCollections.map((collection) => collection.slug);
  assert.deepEqual(slugs, [
    "tags",
    "categories",
    "media",
    "posts",
    "bookmarks",
    "citations",
    "albums",
    "tracks",
    "playlists",
    "setlists",
    "notifications"
  ]);
  const posts = contentCollections.find((collection) => collection.slug === "posts");
  const names = posts?.fields.map((field) => ("name" in field ? field.name : ""));
  assert.deepEqual(names, [
    "title",
    "slug",
    "dek",
    "body",
    "status",
    "publishedAt",
    "heroUrl",
    "authorName",
    "authorImageUrl",
    "category",
    "tags"
  ]);
  assert.equal(JSON.stringify(posts).includes("userMedia"), false);
  assert.equal(JSON.stringify(posts).includes("surf"), false);
});

test("a stored post with a populated tag fills the card", () => {
  const card = fromStoredPost({
    id: "post-1",
    title: "Stored",
    slug: "stored",
    dek: "From the collection",
    body: "Body",
    tags: [{ id: "tag-1", label: "Notes", slug: "notes" }],
    publishedAt: "2026-11-04T00:00:00.000Z"
  });
  assert.equal(card.href, "/essays/stored");
  assert.deepEqual(card.tags, ["Notes"]);
});

test("a stored post record fills the same card as a fixture", () => {
  const card = fromStoredPost({
    id: "stored-1",
    title: "Stored title",
    slug: "stored",
    dek: "Dek",
    tags: [{ label: "Notes" }]
  });
  assert.equal(card.href, "/essays/stored");
  assert.deepEqual(card.tags, ["Notes"]);
});

test("a member cannot assign a bookmark or notification to someone else", () => {
  const member = { id: "member-a", collection: "users" };
  const bookmark = assignBookmarkOwner({ user: "member-b", targetId: "post-1" }, member);
  assert.equal(bookmark?.user, "member-a");
  const notification = lockNotificationRecipient({ recipient: "member-b", title: "Hi" }, member);
  assert.equal(notification?.recipient, "member-a");
  const staffPrincipal = { id: "staff-1", collection: "admins", role: "admin", _strategy: "staff-better-auth" };
  const staff = assignBookmarkOwner({ user: "member-b" }, staffPrincipal);
  assert.equal(staff?.user, "member-b");
});

test("member ownership preserves native string and numeric IDs without mutating input", () => {
  for (const id of ["member-a", 42]) {
    const member = { id, collection: "users" };
    const bookmark = { user: "member-b", targetId: "post-1" };
    const notification = { recipient: "member-b", title: "Hi" };
    assert.deepEqual(assignBookmarkOwner(bookmark, member), { ...bookmark, user: id });
    assert.deepEqual(lockNotificationRecipient(notification, member), { ...notification, recipient: id });
    assert.deepEqual(bookmark, { user: "member-b", targetId: "post-1" });
    assert.deepEqual(notification, { recipient: "member-b", title: "Hi" });
    assert.equal(assignBookmarkOwner(undefined, member), undefined);
    assert.equal(lockNotificationRecipient(undefined, member), undefined);
  }
});
test("absent, foreign-collection and falsy-ID principals keep existing helper no-op behavior", () => {
  const principals: MemberPrincipal[] = [undefined, null, {}, { id: "member-a" },
    { collection: "users" }, { collection: "users", id: "" }, { collection: "users", id: 0 },
    { collection: "admins", id: 42 }, { collection: "other", id: "member-a" }];
  const bookmark = { user: "member-b", targetId: "post-1" };
  const notification = { recipient: "member-b", title: "Hi" };
  for (const principal of principals) {
    assert.equal(assignBookmarkOwner(bookmark, principal) === bookmark, true);
    assert.equal(lockNotificationRecipient(notification, principal) === notification, true);
  }
});
test("verified staff retain supplied ownership for both native ID forms", () => {
  for (const id of ["staff-1", 42]) {
    const staff = { id, collection: "admins", role: "admin", _strategy: "staff-better-auth" };
    const bookmark = { user: "member-b" };
    const notification = { recipient: "member-b" };
    assert.equal(assignBookmarkOwner(bookmark, staff) === bookmark, true);
    assert.equal(lockNotificationRecipient(notification, staff) === notification, true);
  }
});

test("collection access retains native member filters and separate verified staff privileges", async () => {
  const cases = [
    { principal: undefined, member: false, staff: false },
    { principal: null, member: false, staff: false },
    { principal: { id: "member-a", collection: "users" }, member: true, staff: false },
    { principal: { id: 42, collection: "users" }, member: true, staff: false },
    { principal: { id: 42, collection: "other" }, member: false, staff: false },
    { principal: { id: 42, collection: "admins", role: "admin" }, member: false, staff: false },
    { principal: { id: 42, collection: "admins", role: "admin", _strategy: "staff-better-auth" }, member: false, staff: true },
  ];
  for (const { principal, member, staff } of cases) {
    for (const [collection, owner] of [[Bookmarks, "user"], [Notifications, "recipient"]] as const) {
      for (const action of ["read", "update", "delete"] as const) {
        const access = collection.access?.[action];
        assert.equal(typeof access, "function");
        if (typeof access !== "function") throw new Error("Missing collection access callback");
        const actual = await Reflect.apply(access, undefined, [{ req: { user: principal } }]);
        assert.deepEqual(actual, staff ? true : member ? { [owner]: { equals: principal?.id } } : false);
      }
    }
    const bookmarkCreate = Bookmarks.access?.create;
    const notificationCreate = Notifications.access?.create;
    if (typeof bookmarkCreate !== "function" || typeof notificationCreate !== "function") throw new Error("Missing create access callback");
    assert.equal(await Reflect.apply(bookmarkCreate, undefined, [{ req: { user: principal } }]), member || staff);
    assert.equal(await Reflect.apply(notificationCreate, undefined, [{ req: { user: principal } }]), staff);
  }
});

test("the shared canvas covers the viewport", () => {
  useSiteMenu.getState().close();
  const html = renderToStaticMarkup(createElement(HAStoreProvider, null, createElement(SharedCanvas, { eventSource: { current: null } })));
  assert.equal(siteLayer.canvas, 1);
  assert.equal(siteLayer.header, 2);
  assert.equal(siteLayer.focus, 3);
  assert.equal(siteLayer.menuCanvas, 5);
  assert.equal(siteLayer.menu, 6);
  assert.equal(siteLayer.cursor, 40);
  assert.match(html, /position:fixed/);
  assert.match(html, /z-index:1/);
  assert.match(html, /width:100vw/);
  assert.match(html, /height:100vh/);
  assert.match(html, /data-frameloop="demand"/);
});

test("the site frame mounts one shared canvas around the page", () => {
  const html = renderToStaticMarkup(createElement(EnglishMessages, null, createElement(Providers, null, createElement(ClientLayout, null, createElement("p", null, "Page")))));
  assert.match(html, /Page/);
  assert.equal((html.match(/<canvas/g) ?? []).length, 1);
});

test("the shared canvas is demand until a view claims it", () => {
  useCanvasFrameloopStore.setState({ activeClaims: 0 });
  assert.equal(
    useCanvasFrameloopStore.getState().activeClaims > 0 ? "always" : "demand",
    "demand"
  );
  useCanvasFrameloopStore.getState().acquire();
  useCanvasFrameloopStore.getState().acquire();
  assert.equal(useCanvasFrameloopStore.getState().activeClaims, 2);
  useCanvasFrameloopStore.getState().release();
  useCanvasFrameloopStore.getState().release();
  useCanvasFrameloopStore.getState().release();
  assert.equal(useCanvasFrameloopStore.getState().activeClaims, 0);
});
