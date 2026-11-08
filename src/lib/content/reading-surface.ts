import {
  creditFixtures,
  highlightFixtures,
  noticeFixtures,
  parallaxFixtures,
  postFixtures,
  trackFixtures
} from "./fixtures";
import {
  fromCredit,
  fromHighlight,
  fromNotice,
  fromParallax,
  fromPost,
  fromStoredPost,
  fromTrack
} from "./map";
import type { HighlightRange, Notice, PostBody, Track } from "./slots";

export type ReadingSurface = {
  posts: PostBody[];
  track: Track;
  notices: Notice[];
  credits: ReturnType<typeof fromCredit>[];
  parallax: { title: string; frames: ReturnType<typeof fromParallax>["images"] };
  highlights: HighlightRange[];
  savedIds: string[];
  source: "collection" | "fixture";
};

export type ReadingDocs = {
  posts: Record<string, unknown>[];
  tracks: Record<string, unknown>[];
  /** Omitted when nobody is signed in. An empty list is a real empty inbox. */
  notices?: Record<string, unknown>[];
  citations?: Record<string, unknown>[];
  bookmarks?: Record<string, unknown>[];
};

export function fixtureSurface(): ReadingSurface {
  const parallax = fromParallax(parallaxFixtures[0]);
  return {
    posts: postFixtures.map(fromPost),
    track: fromTrack(trackFixtures[0]),
    notices: noticeFixtures.map(fromNotice),
    credits: creditFixtures.map(fromCredit),
    parallax: { title: parallax.title, frames: parallax.images },
    highlights: highlightFixtures.map(fromHighlight),
    savedIds: [],
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

function noticeFromDoc(doc: Record<string, unknown>): Notice | null {
  const title = text(doc.title);
  if (!title) return null;
  return {
    id: text(doc.id),
    title,
    body: text(doc.body),
    href: text(doc.href) || "/read",
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
  if (posts.length === 0) return fixtureSurface();
  const surface = fixtureSurface();
  const track = docs.tracks.map(trackFromDoc).find((item) => item !== null) ?? surface.track;
  const notices = docs.notices?.map(noticeFromDoc).filter((item) => item !== null);
  const highlights = docs.citations?.map(citationFromDoc).filter((item) => item !== null);
  const savedIds = docs.bookmarks
    ?.map((doc) => text(doc.targetId))
    .filter((id) => id.length > 0);
  return {
    ...surface,
    posts,
    track,
    notices: notices ?? surface.notices,
    highlights: highlights ?? surface.highlights,
    savedIds: savedIds ?? [],
    source: "collection"
  };
}
