import type { ImageProps } from "next/image";

/** View models for ported screens. Components read these, not Payload documents. */

export type TagChip = {
  label: string;
  slug: string;
};

export type PostCard = {
  id: string;
  title: string;
  slug: string;
  href: string;
  dek: string;
  heroUrl: string;
  authorName: string;
  authorImageUrl: string;
  tags: string[];
  publishedAt: string;
};

export type PostBody = PostCard & {
  body: string;
};

export type BookmarkKind = "post" | "track" | "album" | "playlist";

export type BookmarkTarget = {
  kind: BookmarkKind;
  id: string;
  saved: boolean;
};

export type HighlightRange = {
  id: string;
  postId: string;
  quote: string;
  start: number;
  end: number;
  note: string;
  authorLabel: string;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  slug: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  slug: string;
  coverUrl: string;
  trackIds: string[];
};

export type Playlist = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string;
  trackIds: string[];
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  href: string;
  imageUrl: string;
  read: boolean;
  createdAt: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
};

/**
 * One person in the credits stack.
 * `profilePic` takes the same `src` and `alt` as `next/image`.
 */
export type CreditSlot = {
  id: string;
  name: string;
  role: string;
  bio?: string;
  href?: string;
  patronage?: boolean;
  profilePic?: Pick<ImageProps, "src" | "alt" | "width" | "height">;
};

export type CreditPerson = CreditSlot;

export type ParallaxFrame = {
  title: string;
  imageUrl: string;
  alt: string;
  width: number;
  height: number;
};

/** Plain records a future collection, or a human, can fill in. */
export type PostSource = {
  id: string;
  title: string;
  slug: string;
  dek: string;
  body: string;
  publishedAt: string;
  heroUrl: string;
  authorName: string;
  authorImageUrl: string;
  tags: TagChip[];
};

export type TrackSource = {
  id: string;
  title: string;
  artist: string;
  slug: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
};

export type AlbumSource = {
  id: string;
  title: string;
  artist: string;
  slug: string;
  coverUrl: string;
  trackIds: string[];
};

export type PlaylistSource = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string;
  trackIds: string[];
};

export type HighlightSource = {
  id: string;
  postId: string;
  quote: string;
  start: number;
  end: number;
  note: string;
  authorLabel: string;
};

export type NoticeSource = {
  id: string;
  title: string;
  body: string;
  href: string;
  imageUrl: string;
  read: boolean;
  createdAt: string;
};

export type CreditSource = CreditSlot;

export type ParallaxSource = {
  title: string;
  images: Array<{
    url: string;
    alt: string;
    width: number;
    height: number;
  }>;
};
