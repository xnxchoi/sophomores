import {
  creditFixtures,
  highlightFixtures,
  notificationFixtures,
  parallaxFixtures,
  postFixtures,
  trackFixtures
} from "./fixtures";
import {
  fromCredit,
  fromHighlight,
  fromNotification,
  fromParallax,
  fromPost,
  fromStoredPost,
  fromTrack
} from "./map";
import type { HighlightRange, Notification, PostBody, Track } from "./slots";

export type ReadingSurface = {
  posts: PostBody[];
  track: Track;
  notifications: Notification[];
  credits: ReturnType<typeof fromCredit>[];
  parallax: { title: string; frames: ReturnType<typeof fromParallax>["images"] };
  highlights: HighlightRange[];
  savedIds: string[];
  memberId: string;
  source: "collection" | "fixture";
};

export type ReadingDocs = {
  posts: Record<string, unknown>[];
  tracks: Record<string, unknown>[];
  /**
   * Empty list: signed out, no query. Omitted: signed in with no rows, so fixtures stay.
   * A non-empty list replaces the fixtures.
   */
  notifications?: Record<string, unknown>[];
  memberId?: string;
  citations?: Record<string, unknown>[];
  bookmarks?: Record<string, unknown>[];
};

export function fixtureSurface(): ReadingSurface {
  const parallax = fromParallax(parallaxFixtures[0]);
  return {
    posts: postFixtures.map(fromPost),
    track: fromTrack(trackFixtures[0]),
    notifications: notificationFixtures.map(fromNotification),
    credits: creditFixtures.map(fromCredit),
    parallax: { title: parallax.title, frames: parallax.images },
    highlights: highlightFixtures.map(fromHighlight),
    savedIds: [],
    memberId: "",
    source: "fixture"
  };
}

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

/** Fills the reading slots from collection documents. Empty posts stay on fixtures. */
export function readingSurfaceFromDocs(docs: ReadingDocs): ReadingSurface {
  const posts = docs.posts
    .filter((doc) => doc.status === undefined || doc.status === "published")
    .map((doc) => fromStoredPost(doc))
    .filter((post) => post.title.length > 0);
  const surface = fixtureSurface();
  const notifications = docs.notifications?.map(notificationFromDoc).filter((item) => item !== null);
  const highlights = docs.citations?.map(citationFromDoc).filter((item) => item !== null);
  const savedIds = docs.bookmarks
    ?.map((doc) => text(doc.targetId))
    .filter((id) => id.length > 0);
  if (posts.length === 0) {
    return {
      ...surface,
      notifications: notifications ?? surface.notifications,
      highlights: highlights ?? surface.highlights,
      savedIds: savedIds ?? [],
      memberId: docs.memberId ?? ""
    };
  }
  const track = docs.tracks.map(trackFromDoc).find((item) => item !== null) ?? surface.track;
  return {
    ...surface,
    posts,
    track,
    notifications: notifications ?? surface.notifications,
    highlights: highlights ?? surface.highlights,
    savedIds: savedIds ?? [],
    memberId: docs.memberId ?? "",
    source: "collection"
  };
}
