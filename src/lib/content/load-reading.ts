import { cache } from "react";
import { currentUser } from "@/lib/auth/server";
import { getPayload } from "@/payload";
import { loadReadingListingWith, loadReadingPostWith, loadReadingSurfaceWith, type ReadingSurface } from "./reading-surface";

/** Published posts, the newest track and the signed-in member's slots, once per request. */
export const loadReadingSurface = cache(async (): Promise<ReadingSurface> =>
  loadReadingSurfaceWith(await getPayload(), await currentUser())
);

/** One essay and its neighbours, shared by the essay page and its metadata. */
export const loadReadingPost = cache(async (slug: string) => loadReadingPostWith(await getPayload(), slug));

/** One page of the essay listing. */
export const loadReadingListing = cache(async (page: number) => loadReadingListingWith(await getPayload(), page));
