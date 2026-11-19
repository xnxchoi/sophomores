import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payload } from "payload";

import {
  loadReadingListingWith,
  loadReadingPostWith,
  loadReadingSurfaceWith,
  readingSurfaceFromDocs
} from "@/lib/content/reading-surface";
import { creditFixtures, notificationFixtures, postFixtures, trackFixtures } from "../fixtures/reading/content";

type Doc = Record<string, unknown>;
type Find = { collection: string; where?: unknown; limit?: number; page?: number; sort?: string | string[] };
type Where = Record<string, unknown>;

/** The Where operators the reading loaders use, over plain values (string order, as text compares). */
function matches(doc: Doc, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    if (key === "and") return (condition as Where[]).every((part) => matches(doc, part));
    if (key === "or") return (condition as Where[]).some((part) => matches(doc, part));
    const value = String(doc[key] ?? "");
    return Object.entries(condition as Record<string, unknown>).every(([op, operand]) =>
      op === "equals" ? doc[key] === operand
      : op === "greater_than" ? value > String(operand)
      : op === "less_than" ? value < String(operand)
      : false);
  });
}

function ordered(docs: Doc[], sort: string | string[] | undefined): Doc[] {
  const keys = (Array.isArray(sort) ? sort : sort ? [sort] : []).map((key) =>
    key.startsWith("-") ? { field: key.slice(1), sign: -1 } : { field: key, sign: 1 });
  return [...docs].sort((a, b) => {
    for (const { field, sign } of keys) {
      const order = String(a[field] ?? "").localeCompare(String(b[field] ?? ""));
      if (order !== 0) return order * sign;
    }
    return 0;
  });
}

/** A Local API stand-in over in-memory collections; `fail` names collections whose reads throw. */
function fakePayload(collections: Record<string, Doc[]>, fail: string[] = []) {
  const errors: unknown[] = [];
  const calls: Find[] = [];
  const payload = {
    logger: { error: (entry: unknown) => { errors.push(entry); } },
    find: async (args: Find) => {
      calls.push(args);
      if (fail.includes(args.collection)) throw new Error(`synthetic ${args.collection} failure`);
      const docs = ordered((collections[args.collection] ?? []).filter((doc) => matches(doc, args.where as Where)), args.sort);
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      return {
        docs: docs.slice((page - 1) * limit, page * limit),
        page,
        totalDocs: docs.length,
        totalPages: Math.ceil(docs.length / limit)
      };
    }
  };
  return { payload: payload as unknown as Payload, errors, calls };
}

const posts = Array.from({ length: 30 }, (_, index) => ({
  id: `post-${index + 1}`,
  title: `Essay ${index + 1}`,
  slug: `essay-${index + 1}`,
  body: `Body ${index + 1}`,
  status: "published",
  publishedAt: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`
}));
const member = { id: "member-1" } as Parameters<typeof loadReadingSurfaceWith>[1];

/** Every fixture string a production surface must never carry. */
const fixtureStrings = [
  ...postFixtures.map((post) => post.title),
  ...trackFixtures.map((track) => track.title),
  ...notificationFixtures.map((note) => note.title),
  ...creditFixtures.map((credit) => credit.name)
];
const carriesFixtures = (value: unknown) => fixtureStrings.some((text) => JSON.stringify(value).includes(text));

test("a failed posts read throws to the error page instead of serving fixtures", async () => {
  const { payload } = fakePayload({ posts }, ["posts"]);
  await assert.rejects(loadReadingSurfaceWith(payload, null), /synthetic posts failure/);
});

test("no published posts, no tracks and no member is an empty surface", async () => {
  const { payload } = fakePayload({ posts: [{ ...posts[0], status: "draft" }], tracks: [] });
  const surface = await loadReadingSurfaceWith(payload, null);
  assert.deepEqual(surface, { posts: [], track: null, notifications: [], highlights: [], savedIds: [], memberId: "" });
});

test("a member whose reads fail, or who has none, gets empty slots, never fixtures", async () => {
  const failed = fakePayload({ posts, tracks: [] }, ["notifications"]);
  const surface = await loadReadingSurfaceWith(failed.payload, member);
  assert.equal(failed.errors.length, 1);
  assert.deepEqual([surface.notifications, surface.highlights, surface.savedIds], [[], [], []]);
  assert.equal(surface.memberId, "member-1");
  const none = await loadReadingSurfaceWith(fakePayload({ posts, tracks: [], notifications: [], citations: [], bookmarks: [] }).payload, member);
  assert.deepEqual(none.notifications, []);
  assert.equal(carriesFixtures(surface) || carriesFixtures(none), false);
});

test("published posts and the first playable track fill the surface", async () => {
  const { payload } = fakePayload({
    posts,
    tracks: [{ id: "untitled" }, { id: "track-1", title: "Alley", artist: "Night", slug: "alley", audioUrl: "/audio/alley.mp3" }]
  });
  const surface = await loadReadingSurfaceWith(payload, null);
  assert.equal(surface.posts.length, 24);
  assert.equal(surface.posts[0]?.title, "Essay 30");
  assert.equal(surface.track?.audioUrl, "/audio/alley.mp3");
  assert.equal(carriesFixtures(surface), false);
});

test("an essay outside the archive window opens by slug, with the newer and older essays beside it", async () => {
  const { payload } = fakePayload({ posts });
  const essay = await loadReadingPostWith(payload, "essay-2");
  assert.equal(essay?.post.title, "Essay 2");
  assert.equal(essay?.post.body, "Body 2");
  assert.deepEqual([essay?.previous?.slug, essay?.next?.slug], ["essay-3", "essay-1"]);
  assert.equal(essay && "body" in (essay.previous ?? {}), false);
  assert.equal((await loadReadingPostWith(payload, "essay-1"))?.next, null);
});

test("essays sharing a publish time still link to each other, and the listing order is stable", async () => {
  const at = "2026-11-10T00:00:00.000Z";
  const tied = ["tie-a", "tie-b", "tie-c"].map((id) => ({ id, title: id, slug: id, body: "", status: "published", publishedAt: at }));
  const { payload } = fakePayload({ posts: [posts[0], ...tied, posts[29]] });
  const middle = await loadReadingPostWith(payload, "tie-b");
  // Archive order is publishedAt then id, newest first: tie-c, tie-b, tie-a (10 Nov), then essay-30, essay-1 (Oct).
  assert.deepEqual([middle?.previous?.slug, middle?.next?.slug], ["tie-c", "tie-a"]);
  const newest = await loadReadingPostWith(payload, "tie-c");
  assert.deepEqual([newest?.previous ?? null, newest?.next?.slug], [null, "tie-b"]);
  const oldestTie = await loadReadingPostWith(payload, "tie-a");
  assert.deepEqual([oldestTie?.previous?.slug, oldestTie?.next?.slug], ["tie-b", "essay-30"]);
  const listing = await loadReadingListingWith(payload, 1);
  assert.deepEqual(listing.posts.map((post) => post.slug), ["tie-c", "tie-b", "tie-a", "essay-30", "essay-1"]);
});

test("a missing or unpublished slug has no essay", async () => {
  const { payload } = fakePayload({ posts: [...posts, { id: "draft", title: "Draft", slug: "draft", status: "draft" }] });
  assert.equal(await loadReadingPostWith(payload, "missing"), null);
  assert.equal(await loadReadingPostWith(payload, "draft"), null);
});

test("the listing pages through every published essay, twelve at a time", async () => {
  const { payload } = fakePayload({ posts });
  const first = await loadReadingListingWith(payload, 1);
  const last = await loadReadingListingWith(payload, 3);
  assert.deepEqual([first.posts.length, first.totalPages, first.posts[0]?.slug], [12, 3, "essay-30"]);
  assert.deepEqual([last.posts.length, last.page, last.posts.at(-1)?.slug], [6, 3, "essay-1"]);
});

test("member notifications, marks and saves come from their rows", () => {
  const surface = readingSurfaceFromDocs({
    posts: [{ id: "post-1", title: "Stored", slug: "stored", status: "published" }],
    tracks: [],
    notifications: [{ id: "note-1", title: "Door", body: "Open", href: "/read/stored", read: false }, { id: "untitled" }],
    citations: [
      { id: "mark-1", post: { id: "post-1" }, quote: "Body", start: 0, end: 4, note: "", authorLabel: "Desk" },
      { id: "mark-2", post: "post-1", quote: "", start: 0, end: 0 }
    ],
    bookmarks: [{ targetId: "post-1" }, { targetId: "" }]
  });
  assert.deepEqual(surface.notifications.map((note) => note.title), ["Door"]);
  assert.deepEqual(surface.highlights.map((mark) => mark.id), ["mark-1"]);
  assert.deepEqual(surface.savedIds, ["post-1"]);
  assert.equal(surface.track, null);
});

test("notification defaults use essays while CMS-provided hrefs stay unchanged", () => {
  const storedHrefs = ["/read/stored?from=inbox", "/reading/stored", "/essays/stored", "https://sophomores.co"];
  const surface = readingSurfaceFromDocs({
    posts: [], tracks: [],
    notifications: [
      { id: "missing", title: "No href" },
      { id: "empty", title: "Empty href", href: "" },
      { id: "invalid", title: "Invalid href", href: null },
      ...storedHrefs.map((href, index) => ({ id: `stored-${index}`, title: "Stored href", href }))
    ]
  });
  assert.deepEqual(surface.notifications.map((item) => item.href), ["/essays", "/essays", "/essays", ...storedHrefs]);
});
