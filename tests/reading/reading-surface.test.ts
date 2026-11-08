import assert from "node:assert/strict";
import { test } from "node:test";

import { readingSurfaceFromDocs } from "@/lib/content/reading-surface";

test("a signed-out visitor gets an empty notification list and does not keep the fixtures", () => {
  const surface = readingSurfaceFromDocs({ posts: [], tracks: [], notifications: [], memberId: "" });
  assert.equal(surface.notifications.length, 0);
  assert.equal(surface.memberId, "");
  assert.equal(surface.posts[0]?.title, "A room with the lights low");
});

test("an empty collection stays on the fixture surface", () => {
  const surface = readingSurfaceFromDocs({ posts: [], tracks: [] });
  assert.equal(surface.source, "fixture");
  assert.equal(surface.posts[0]?.title, "A room with the lights low");
  assert.equal(surface.track.title, "Night desk");
  assert.equal(surface.savedIds.length, 0);
});

test("drafts drop out and a published post fills the card", () => {
  const surface = readingSurfaceFromDocs({
    posts: [
      { id: "draft-1", title: "Hidden", slug: "hidden", status: "draft" },
      {
        id: "post-1",
        title: "Stored",
        slug: "stored",
        dek: "From the collection",
        body: "Body",
        status: "published",
        heroUrl: "/media/stored.jpg",
        authorName: "Desk",
        tags: [{ id: "tag-1", label: "Notes", slug: "notes" }],
        publishedAt: "2026-11-04T00:00:00.000Z"
      }
    ],
    tracks: [{ id: "track-1", title: "Alley", artist: "Night", slug: "alley", audioUrl: "/audio/alley.mp3" }]
  });
  assert.equal(surface.source, "collection");
  assert.equal(surface.posts.length, 1);
  assert.equal(surface.posts[0]?.href, "/read/stored");
  assert.equal(surface.posts[0]?.heroUrl, "/media/stored.jpg");
  assert.deepEqual(surface.posts[0]?.tags, ["Notes"]);
  assert.equal(surface.track.audioUrl, "/audio/alley.mp3");
  assert.equal(surface.track.duration, 0);
  assert.equal(surface.notifications[0]?.title.length > 0, true);
});

test("a signed-in member's notifications, marks, and saves replace the fixtures", () => {
  const surface = readingSurfaceFromDocs({
    posts: [{ id: "post-1", title: "Stored", slug: "stored", status: "published" }],
    tracks: [],
    notifications: [{ id: "note-1", title: "Door", body: "Open", href: "/read/stored", read: false }],
    citations: [
      { id: "mark-1", post: { id: "post-1" }, quote: "Body", start: 0, end: 4, note: "", authorLabel: "Desk" },
      { id: "mark-2", post: "post-1", quote: "", start: 0, end: 0 }
    ],
    bookmarks: [{ targetId: "post-1" }, { targetId: "" }]
  });
  assert.equal(surface.notifications.length, 1);
  assert.equal(surface.notifications[0]?.title, "Door");
  assert.equal(surface.highlights.length, 1);
  assert.equal(surface.highlights[0]?.postId, "post-1");
  assert.deepEqual(surface.savedIds, ["post-1"]);
  assert.equal(surface.track.title, "Night desk");
});
