import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { Payload, PayloadRequest, TypedUser } from "payload";
import { getUserSetlistSlots } from "@/lib/music/eligibility";
import type { MusicTrackItem } from "@/lib/music/types";
import type { Setlist, Track } from "@/payload-types";

// Shared by the entry routes (create here, edit and delete under [entryId]).

/** The public setlist by slug, read through Setlists access (private rows stay hidden). */
export async function setlistForEntry(payload: Payload, req: PayloadRequest, slug: string): Promise<Setlist | null> {
  const query = await payload.find({
    collection: "setlists", depth: 0, where: { slug: { equals: slug } }, limit: 1, overrideAccess: false, req
  });
  const setlist = query.docs[0];
  return setlist && setlist.isPublic === true ? setlist : null;
}

type EntryBody = { track?: MusicTrackItem; note?: string | null };

/** Reads { track, note }. Create needs a track; an edit may change the track, the note or both. */
export async function parseEntryBody(request: Request, requireTrack: boolean): Promise<EntryBody | { error: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body." };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid JSON body." };
  const { track, note } = body as Record<string, unknown>;
  if (note !== undefined && note !== null && typeof note !== "string") return { error: "Note must be text." };
  if (track === undefined && !requireTrack) {
    if (note === undefined) return { error: "Nothing to change." };
    return { note: note as string | null };
  }
  const item = track as MusicTrackItem | undefined;
  if (
    !item || typeof item !== "object" || typeof item.title !== "string" || !item.title
    || typeof item.artist !== "string" || !item.artist || !item.id
  ) {
    return { error: "Track metadata incomplete (title, artist, and ID required)." };
  }
  return { track: item, note: note as string | null | undefined };
}

/** Track content a member may write: never the owner, setlist, seat or order. */
export function trackContent(track: MusicTrackItem) {
  const base = track.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "track";
  return {
    title: track.title,
    artist: track.artist,
    slug: `${base}-${nanoid(6)}`,
    albumTitle: track.album || undefined,
    duration: track.duration,
    coverUrl: track.coverUrl,
    previewUrl: track.previewUrl,
    isrc: track.isrc,
    appleMusic: { id: track.id, url: track.url || `https://music.apple.com/song/${track.id}`, storefront: "us" },
    syncStatus: "pending" as const
  };
}

/** The note, when the request sets one (empty clears it). */
export function noteContent(note: string | null | undefined) {
  return note === undefined ? {} : { note: note ? note.slice(0, 120) : null };
}

/** The saved entry and the member's entries in running order. */
export async function entryResponse(payload: Payload, user: TypedUser, setlist: Setlist, saved: Track): Promise<Response> {
  const { entries } = await getUserSetlistSlots(payload, String(user.id), String(setlist.id), user as never);
  return NextResponse.json({
    success: true,
    savedTrack: { id: saved.id, title: saved.title, artist: saved.artist, syncStatus: saved.syncStatus },
    entries: entries.map((entry) => ({ id: entry.id, title: entry.title, artist: entry.artist, note: entry.note ?? undefined }))
  });
}
