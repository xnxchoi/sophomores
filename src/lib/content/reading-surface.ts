import type { Payload, Where } from "payload";
import { fromStoredPost, fromTrack } from "./map";
import type { HighlightRange, Notification, PostBody, PostCard, Track } from "./slots";

type ReadingUser = Parameters<Payload["find"]>[0]["user"];

/** Newest first; id breaks ties between equal publish times so the order is the same on every read. */
const archiveOrder = ["-publishedAt", "-id"];

/** What the reading pages show. Every slot comes from the collections; nothing is filled with fixtures. */
export type ReadingSurface = {
  posts: PostBody[];
  /** The newest playable track, or none: the player hides without one. */
  track: Track | null;
  notifications: Notification[];
  highlights: HighlightRange[];
  savedIds: string[];
  memberId: string;
};

export type ReadingDocs = {
  posts: Record<string, unknown>[];
  tracks: Record<string, unknown>[];
  /** Missing (signed out, or the member reads failed) means none. */
  notifications?: Record<string, unknown>[];
  memberId?: string;
  citations?: Record<string, unknown>[];
  bookmarks?: Record<string, unknown>[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function relationId(value: unknown): string {
  if (typeof value === "string") return value;
  return text(asRecord(value)?.id);
}

function trackFromDoc(doc: Record<string, unknown>): Track | null {
  const title = text(doc.title);
  if (!title) return null;
  return fromTrack({
    id: text(doc.id),
    title,
    artist: text(doc.artist),
    slug: text(doc.slug),
    coverUrl: text(doc.coverUrl),
    audioUrl: text(doc.audioUrl),
    duration: typeof doc.duration === "number" ? doc.duration : 0
  });
}

function notificationFromDoc(doc: Record<string, unknown>): Notification | null {
  const title = text(doc.title);
  if (!title) return null;
  return {
    id: text(doc.id),
    title,
    body: text(doc.body),
    href: text(doc.href) || "/essays",
    imageUrl: text(doc.imageUrl),
    read: doc.read === true,
    createdAt: text(doc.createdAt)
  };
}

function citationFromDoc(doc: Record<string, unknown>): HighlightRange | null {
  const postId = relationId(doc.post);
  const quote = text(doc.quote);
  if (!postId || !quote) return null;
  return {
    id: text(doc.id),
    postId,
    quote,
    start: typeof doc.start === "number" ? doc.start : 0,
    end: typeof doc.end === "number" ? doc.end : 0,
    note: text(doc.note),
    authorLabel: text(doc.authorLabel)
  };
}

/** Fills the reading slots from collection documents. No published posts gives an empty surface. */
export function readingSurfaceFromDocs(docs: ReadingDocs): ReadingSurface {
  return {
    posts: docs.posts
      .filter((doc) => doc.status === undefined || doc.status === "published")
      .map((doc) => fromStoredPost(doc))
      .filter((post) => post.title.length > 0),
    track: docs.tracks.map(trackFromDoc).find((item) => item !== null) ?? null,
    notifications: (docs.notifications ?? []).map(notificationFromDoc).filter((item) => item !== null),
    highlights: (docs.citations ?? []).map(citationFromDoc).filter((item) => item !== null),
    savedIds: (docs.bookmarks ?? []).map((doc) => text(doc.targetId)).filter((id) => id.length > 0),
    memberId: docs.memberId ?? ""
  };
}

function records(docs: unknown[]): Record<string, unknown>[] {
  return docs.flatMap((doc) => {
    const record = asRecord(doc);
    return record ? [record] : [];
  });
}

/**
 * The reading surface for one request. A failed posts or tracks read throws to `(site)/error.tsx`
 * (Next 16, getting-started/error-handling.md). A failed member read leaves that member's slots empty.
 */
export async function loadReadingSurfaceWith(payload: Payload, user: ReadingUser): Promise<ReadingSurface> {
  const [posts, tracks] = await Promise.all([
    payload.find({
      collection: "posts",
      where: { status: { equals: "published" } },
      depth: 1,
      limit: 24,
      sort: archiveOrder,
      overrideAccess: false
    }),
    payload.find({
      collection: "tracks",
      depth: 0,
      limit: 12,
      sort: "-createdAt",
      overrideAccess: false
    })
  ]);
  const userId = user && typeof user === "object" && "id" in user && user.id ? String(user.id) : "";
  let member: Pick<ReadingDocs, "notifications" | "citations" | "bookmarks"> = {};
  if (userId) {
    try {
      const [notificationResult, citationResult, bookmarkResult] = await Promise.all([
        payload.find({
          collection: "notifications",
          where: { recipient: { equals: userId } },
          depth: 0,
          limit: 24,
          sort: "-createdAt",
          overrideAccess: false,
          user
        }),
        payload.find({
          collection: "citations",
          depth: 0,
          limit: 48,
          overrideAccess: true
        }),
        payload.find({
          collection: "bookmarks",
          where: { user: { equals: userId } },
          depth: 0,
          limit: 48,
          overrideAccess: true
        })
      ]);
      member = {
        notifications: records(notificationResult.docs),
        citations: records(citationResult.docs),
        bookmarks: records(bookmarkResult.docs)
      };
    } catch (error) {
      payload.logger.error({ err: error, msg: "Reading member slots failed; they render empty." });
    }
  }
  return readingSurfaceFromDocs({
    posts: records(posts.docs),
    tracks: records(tracks.docs),
    ...member,
    memberId: userId
  });
}

export type ReadingPost = { post: PostBody; previous: PostCard | null; next: PostCard | null };

const published: Where = { status: { equals: "published" } };

/**
 * The next essay along the archive order (publishedAt, then id), so essays sharing a publish time still
 * link to each other and paging stays stable at a page boundary.
 */
async function neighbour(payload: Payload, post: Pick<PostBody, "id" | "publishedAt">, direction: "newer" | "older") {
  const beyond = direction === "newer" ? "greater_than" : "less_than";
  const { docs } = await payload.find({
    collection: "posts",
    where: {
      and: [
        published,
        {
          or: [
            { publishedAt: { [beyond]: post.publishedAt } },
            { and: [{ publishedAt: { equals: post.publishedAt } }, { id: { [beyond]: post.id } }] }
          ]
        }
      ]
    },
    depth: 0,
    limit: 1,
    sort: direction === "newer" ? ["publishedAt", "id"] : archiveOrder,
    overrideAccess: false
  });
  const doc = asRecord(docs[0]);
  if (!doc) return null;
  // A link needs the card, not the body.
  const { body: _body, ...card } = fromStoredPost(doc);
  return card;
}

/**
 * One published essay by slug, wherever it sits in the archive (The Hideaway: queryPostForUserBySlug),
 * with its archive neighbours: previous is the newer post, next the older, as the archive reads.
 * A post without a publish date has no place in that order, so it has no neighbours.
 */
export async function loadReadingPostWith(payload: Payload, slug: string): Promise<ReadingPost | null> {
  const { docs } = await payload.find({
    collection: "posts",
    where: { and: [published, { slug: { equals: slug } }] },
    depth: 1,
    limit: 1,
    overrideAccess: false
  });
  const doc = asRecord(docs[0]);
  if (!doc) return null;
  const post = fromStoredPost(doc);
  if (!post.publishedAt) return { post, previous: null, next: null };
  const [previous, next] = await Promise.all([
    neighbour(payload, post, "newer"),
    neighbour(payload, post, "older")
  ]);
  return { post, previous, next };
}

export type ReadingListing = { posts: PostCard[]; page: number; limit: number; totalDocs: number; totalPages: number };

/**
 * Twelve published essays per page, newest first (The Hideaway: essays/in/[pageNumber], paginatedPosts).
 * The page is bounded before it becomes the query's OFFSET: a whole number from 1 to the last page (counted
 * first). Callers compare the requested page with `totalPages` to answer past-the-end as missing.
 */
export async function loadReadingListingWith(payload: Payload, requested: number): Promise<ReadingListing> {
  const { totalDocs } = await payload.count({ collection: "posts", where: published, overrideAccess: false });
  const lastPage = Math.max(1, Math.ceil(totalDocs / 12));
  const page = Number.isSafeInteger(requested) ? Math.min(Math.max(requested, 1), lastPage) : 1;
  const result = await payload.find({
    collection: "posts",
    where: published,
    depth: 1,
    limit: 12,
    page,
    sort: archiveOrder,
    overrideAccess: false
  });
  return {
    posts: records(result.docs).map((doc) => {
      const { body: _body, ...card } = fromStoredPost(doc);
      return card;
    }).filter((post) => post.title.length > 0),
    page: result.page ?? page,
    limit: 12,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages
  };
}
