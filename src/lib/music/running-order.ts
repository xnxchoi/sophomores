import type { Payload, PayloadRequest } from "payload";

/**
 * The order key Payload keeps on setlist-positions rows for the orderable
 * Setlists "runningOrder" join (`_${collection}_${join}_order`, installed
 * payload/dist/fields/config/sanitizeJoinField.js). Internal only: positions
 * shown to people are computed from the sorted list, never stored.
 */
export const RUNNING_ORDER_KEY = "_setlist-positions_runningOrder_order";

/**
 * Track ids of one setlist in staff running order. Ties (two appends that read
 * the same tail) fall back to creation order, then id. A trusted read: positions carry no
 * data beyond the track and setlist ids, and callers apply track visibility.
 */
export async function runningOrder(payload: Payload, setlistId: string, req?: PayloadRequest): Promise<string[]> {
  const { docs } = await payload.find({
    collection: "setlist-positions",
    where: { setlist: { equals: setlistId } },
    sort: [RUNNING_ORDER_KEY, "createdAt", "id"],
    depth: 0,
    pagination: false,
    overrideAccess: true,
    ...(req ? { req } : {})
  });
  return docs.map((doc) => String(typeof doc.track === "object" ? doc.track.id : doc.track));
}

/** Sorts items by the running order; anything without a position goes last, as given. */
export function inRunningOrder<T extends { id: string | number }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index, rank: rank.get(String(item.id)) ?? order.length + index }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}
