import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { useCanvasFrameloopStore } from "@/components/gl/canvas-frameloop";
import { siteLayer } from "@/components/gl/layers";
import { SharedCanvas } from "@/components/gl/shared-canvas";
import { ClientLayout } from "@/app/(site)/client-layout";
import { Providers } from "@/providers";
import { HAStoreProvider } from "@/providers/RP_Pro";
import { assignBookmarkOwner } from "@/lib/payload/collections/bookmarks";
import { contentCollections } from "@/lib/payload/collections";
import { lockNotificationRecipient } from "@/lib/payload/collections/notifications";
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
  assert.equal(card.href, "/read/stored");
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
  assert.equal(card.href, "/read/stored");
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
  const html = renderToStaticMarkup(createElement(Providers, null, createElement(ClientLayout, null, createElement("p", null, "Page"))));
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
