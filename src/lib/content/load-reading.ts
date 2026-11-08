import { cache } from "react";
import { currentUser } from "@/lib/auth/server";
import { getPayload } from "@/lib/payload";
import { fixtureSurface, readingSurfaceFromDocs, type ReadingSurface } from "./reading-surface";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function records(docs: unknown[]): Record<string, unknown>[] {
  return docs.flatMap((doc) => {
    const record = asRecord(doc);
    return record ? [record] : [];
  });
}

/** Published posts and the first track. Member slots load only for a signed-in user. */
export const loadReadingSurface = cache(async (): Promise<ReadingSurface> => {
  try {
    const payload = await getPayload();
    const [posts, tracks] = await Promise.all([
      payload.find({
        collection: "posts",
        where: { status: { equals: "published" } },
        depth: 1,
        limit: 24,
        sort: "-publishedAt",
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
    const user = await currentUser();
    const userId = user?.id ? String(user.id) : "";
    let notifications: Record<string, unknown>[] | undefined;
    let citations: Record<string, unknown>[] | undefined;
    let bookmarks: Record<string, unknown>[] | undefined;
    if (!userId) {
      notifications = [];
    } else {
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
        const rows = records(notificationResult.docs);
        notifications = rows.length > 0 ? rows : undefined;
        citations = records(citationResult.docs);
        bookmarks = records(bookmarkResult.docs);
      } catch {
        notifications = undefined;
        citations = undefined;
        bookmarks = undefined;
      }
    }
    return readingSurfaceFromDocs({
      posts: records(posts.docs),
      tracks: records(tracks.docs),
      notifications,
      citations,
      bookmarks,
      memberId: userId
    });
  } catch {
    return fixtureSurface();
  }
});
