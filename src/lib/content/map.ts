import type {
  Album,
  AlbumSource,
  CreditPerson,
  CreditSource,
  HighlightRange,
  HighlightSource,
  Notification,
  NotificationSource,
  ParallaxFrame,
  ParallaxSource,
  Playlist,
  PlaylistSource,
  PostBody,
  PostSource,
  Track,
  TrackSource
} from "./slots";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Reads a stored post, or any object with the same plain fields. */
export function fromStoredPost(doc: Record<string, unknown>): PostBody {
  const tags = Array.isArray(doc.tags)
    ? doc.tags.map((tag) =>
        typeof tag === "string" ? tag : text((tag as { label?: unknown }).label)
      )
    : [];
  const slug = text(doc.slug);
  return {
    id: text(doc.id),
    title: text(doc.title),
    slug,
    href: `/read/${slug}`,
    dek: text(doc.dek),
    body: text(doc.body),
    heroUrl: text(doc.heroUrl),
    authorName: text(doc.authorName),
    authorImageUrl: text(doc.authorImageUrl),
    tags,
    publishedAt: text(doc.publishedAt)
  };
}

export function fromPost(doc: PostSource): PostBody {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    href: `/read/${doc.slug}`,
    dek: doc.dek,
    body: doc.body,
    heroUrl: doc.heroUrl,
    authorName: doc.authorName,
    authorImageUrl: doc.authorImageUrl,
    tags: doc.tags.map((tag) => tag.label),
    publishedAt: doc.publishedAt
  };
}

export function fromTrack(doc: TrackSource): Track {
  return {
    id: doc.id,
    title: doc.title,
    artist: doc.artist,
    slug: doc.slug,
    coverUrl: doc.coverUrl,
    audioUrl: doc.audioUrl,
    duration: doc.duration
  };
}

export function fromAlbum(doc: AlbumSource): Album {
  return { ...doc };
}

export function fromPlaylist(doc: PlaylistSource): Playlist {
  return { ...doc };
}

export function fromHighlight(doc: HighlightSource): HighlightRange {
  return { ...doc };
}

export function fromNotification(doc: NotificationSource): Notification {
  return { ...doc };
}

export function fromCredit(doc: CreditSource): CreditPerson {
  return { ...doc };
}

export function fromParallax(doc: ParallaxSource): {
  title: string;
  images: ParallaxFrame[];
} {
  return {
    title: doc.title,
    images: doc.images.map((image) => ({
      title: doc.title,
      imageUrl: image.url,
      alt: image.alt,
      width: image.width,
      height: image.height
    }))
  };
}
