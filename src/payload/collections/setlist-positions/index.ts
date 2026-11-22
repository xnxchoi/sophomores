import english from "../../../../messages/en.json";
import { randomInt } from "node:crypto";
import { ValidationError, type CollectionBeforeChangeHook, type CollectionConfig, type Where } from "payload";
import { generateKeyBetween } from "payload/shared";
import { RUNNING_ORDER_KEY } from "@/lib/music/running-order";
import { staffWrite } from "../access";
import { relationId } from "../music-grants";

const BASE_36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * A new position's key: after the setlist's current last key, plus a random
 * fractional tail, so two appends that read the same tail at the same moment
 * still get distinct keys. With no equal keys, the staff drag surface (sorted by
 * key alone) and the public order (key, then createdAt, then id) always agree.
 * The unique (setlist, key) index (migration 20261122_160000) backs this up: a clash fails the write rather
 * than storing a tie. The tail never ends in "0", as fractional keys require.
 */
const appendKey: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create" || !data || data[RUNNING_ORDER_KEY]) return data;
  const setlist = relationId(data.setlist);
  if (setlist === undefined) return data;
  const { docs } = await req.payload.find({
    collection: "setlist-positions", where: { setlist: { equals: setlist } }, sort: `-${RUNNING_ORDER_KEY}`,
    limit: 1, depth: 0, overrideAccess: true, req, select: { [RUNNING_ORDER_KEY]: true }
  });
  const last = (docs[0] as Record<string, unknown> | undefined)?.[RUNNING_ORDER_KEY];
  const tail = Array.from({ length: 5 }, (_, index) => BASE_36[randomInt(index === 4 ? 1 : 0, 36)]).join("");
  return { ...data, [RUNNING_ORDER_KEY]: generateKeyBetween(typeof last === "string" ? last : null, null) + tail };
};

/**
 * A key Payload's own fractional indexing can build on: lowercase base-36 only
 * (what Payload writes, and what Postgres sorts the same way as JavaScript), and
 * accepted by Payload's generator as a lower bound, which runs its own check of
 * the head, the integer length, the smallest key and a trailing "0".
 */
function isOrderKey(key: unknown): key is string {
  if (typeof key !== "string" || !/^[0-9a-z]+$/.test(key)) return false;
  try {
    generateKeyBetween(key, null);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every position keeps a valid key. Payload's own orderable hook fills a key only
 * when neither the data nor the stored row has one, and otherwise stores what it
 * is sent; a missing or malformed key would make the next append or reorder on
 * that setlist fail. Any write that sends the key must send a valid one; on
 * create, appendKey has already filled a missing key. The order-key check in
 * migration 20261122_160000 holds the same rule for writes outside Payload.
 */
const requireKey: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!data || !(RUNNING_ORDER_KEY in data) || data[RUNNING_ORDER_KEY] === undefined) return data;
  if (isOrderKey(data[RUNNING_ORDER_KEY])) return data;
  throw new ValidationError({
    collection: "setlist-positions",
    errors: [{ path: RUNNING_ORDER_KEY, message: english.Staff.schema.runningOrderKeyRequired }],
    req
  });
};

// A track's place in its setlist, kept apart from the track itself (owner, 22 Nov:
// "differentiate the order of the slot from the slot itself"). Staff set the
// order by dragging the Setlists "Running order" join, which keeps a fractional
// key on these rows. Members never write here: a track's create adds its row at
// the end and its delete removes it, both as trusted system writes inside the
// track's own request. Deleting one row leaves every other key as it is, so the
// numbers shown are positions computed when the list is read.
// A member editing their track writes only the track row, so it can never put
// back an order key that staff changed in the meantime. (Payload writes a whole
// row on update, order key included, so nothing but staff reorders may update a
// position row.)
export const SetlistPositions: CollectionConfig = {
  slug: "setlist-positions",
  admin: {
    group: english.Staff.schema.radio,
    defaultColumns: ["track", "setlist"]
  },
  // No two positions of one setlist share a key (see appendKey). The unique
  // (setlist, key) index is created by migration 20261122_160000: Payload's
  // `indexes` can't name the orderable key, which it adds after validation.
  // Both run before Payload's own orderable hook, which then leaves the key as set.
  hooks: { beforeChange: [appendKey, requireKey] },
  access: {
    read: ({ req }): boolean | Where => staffWrite({ req }) || { "setlist.isPublic": { equals: true } },
    create: () => false,
    // Staff reorder (Payload's reorder endpoint checks this per row).
    update: staffWrite,
    delete: () => false
  },
  fields: [
    {
      name: "setlist",
      type: "relationship",
      relationTo: "setlists",
      required: true,
      index: true,
      access: { update: () => false }
    },
    {
      name: "track",
      type: "relationship",
      relationTo: "tracks",
      required: true,
      unique: true,
      access: { update: () => false }
    }
  ]
};
