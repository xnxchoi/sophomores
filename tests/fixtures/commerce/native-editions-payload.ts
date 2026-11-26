import type { Payload } from "payload";

/** A fake Payload holding the owner's three native products (one SKU each), for the real E1 loaders. Test-only. */
type Row = Record<string, unknown>;
export const nativeProducts = [
  { id: "premium", title: "Premium edition", value: "premium", price: 329_000 },
  { id: "book", title: "Book only", value: "book-only", price: 35_000 },
  { id: "personal", title: "Édition personnelle", value: "personal", price: 82_000 },
];
// missingTypeFor: that product points at a variant type that doesn't exist. dbFault: findByID fails as a database error would.
// readsOf(payload) counts every Local API read by kind and collection ("find:products", "findByID:variantTypes", ...).
export function nativeEditionsPayload({ extra = [] as typeof nativeProducts, hasNextPage = false, schema = true, priceOffset = 0,
  missingTypeFor = "", dbFault = false } = {}) {
  const all = [...nativeProducts, ...extra].map((p) => ({ ...p, price: p.price + priceOffset }));
  const rows: Record<string, Row[]> = {
    products: all.map((p) => ({ id: p.id, commerceModel: "native-edition-v2", _status: "published", publicationApproved: true,
      title: p.title, description: "Description", images: [{ image: "img" }], variantTypes: [p.id === missingTypeFor ? "gone" : "type"], updatedAt: "r1" })),
    variants: all.map((p) => ({ id: "v-" + p.id, product: p.id, options: ["o-" + p.id], _status: "published", publicationApproved: true,
      priceInKRWEnabled: true, priceInKRW: p.price, updatedAt: "r1" })),
    variantOptions: all.map((p) => ({ id: "o-" + p.id, variantType: "type", label: p.title, value: p.value, updatedAt: "r1" })),
  };
  const conditions = (where: unknown): Row[] => (where as { and?: Row[] })?.and ?? [];
  const reads: Record<string, number> = {};
  const count = (key: string) => { reads[key] = (reads[key] ?? 0) + 1; };
  return {
    reads,
    collections: schema ? { products: {}, variants: {}, variantTypes: {}, variantOptions: {} } : {},
    async find({ collection, where }: { collection: string; where: unknown }) {
      count("find:" + collection);
      let docs = rows[collection] ?? [];
      for (const condition of conditions(where)) {
        const [field, test] = Object.entries(condition)[0] as [string, { equals?: unknown; in?: unknown[] }];
        if (!["id", "product"].includes(field)) continue;
        docs = docs.filter((row) => test.equals !== undefined ? row[field] === test.equals : test.in ? test.in.includes(row[field]) : true);
      }
      return { docs, hasNextPage: collection === "products" && hasNextPage };
    },
    // Like Payload's findByID: an absent document throws NotFound unless disableErrors, which returns null instead.
    async findByID({ collection, id, disableErrors }: { collection: string; id: string; disableErrors?: boolean }) {
      count("findByID:" + collection);
      if (dbFault) throw new Error("database connection lost");
      if (collection === "variantTypes" && id === "type") return { id: "type", name: "edition" };
      if (disableErrors) return null;
      throw Object.assign(new Error("Not Found"), { status: 404 });
    },
    // No legacy publication in this fake: the legacy offer loader reads it and finds nothing (null, no throw).
    async findGlobal({ slug }: { slug: string }) { count("findGlobal:" + slug); return {}; },
  } as unknown as Payload;
}

/** Reads made so far on a nativeEditionsPayload, by "kind:collection"; total() sums the native-collection reads. */
export function readsOf(payload: Payload) {
  const reads = (payload as unknown as { reads: Record<string, number> }).reads;
  const native = ["products", "variants", "variantTypes", "variantOptions"];
  return { ...reads, total: () => Object.entries(reads).filter(([key]) => native.includes(key.split(":")[1]!)).reduce((sum, [, n]) => sum + n, 0) };
}
