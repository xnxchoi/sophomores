import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { before, test } from "node:test";
import { pathToFileURL } from "node:url";
import type { CollectionConfig, Where } from "payload";
import { Setlists } from "@/payload/collections/setlists";
import { Tracks } from "@/payload/collections/tracks";

let findOperation: (args: Record<string, unknown>) => Promise<unknown>;
let flattenAllFields: (args: { fields: CollectionConfig["fields"] }) => unknown[];

before(async () => {
  const entry = pathToFileURL(createRequire(import.meta.url).resolve("payload"));
  ({ findOperation } = await import(new URL("./collections/operations/find.js", entry).href));
  ({ flattenAllFields } = await import(new URL("./utilities/flattenAllFields.js", entry).href));
});

function runtimeCollection(config: CollectionConfig) {
  return { config: { ...config, flattenedFields: flattenAllFields({ fields: config.fields }),
    joins: {}, polymorphicJoins: [], hooks: {} } };
}

const actors = [
  { name: "guest", user: null, staff: false },
  { name: "member", user: { id: "member", collection: "users", role: "user" }, staff: false },
  { name: "staff", user: { id: "staff", collection: "admins", role: "staff", _strategy: "staff-better-auth" }, staff: true },
  { name: "member with untrusted staff role", user: { id: "member", collection: "users", role: "staff" }, staff: false },
];

for (const payloadAPI of ["REST", "GraphQL", "local"] as const) {
  for (const actor of actors) {
    test(`${payloadAPI} Tracks query constrains ${actor.name} before projection`, async () => {
      const findCalls: Where[] = [];
      const tracks = runtimeCollection(Tracks);
      const payload = {
        config: { defaultDepth: 0, maxDepth: 10, localization: false },
        collections: { tracks, setlists: runtimeCollection(Setlists) },
        db: {
          defaultIDType: "text",
          async find({ where }: { where: Where }) {
            findCalls.push(where);
            // Inspect the native adapter input; this double does not implement authorization or SQL.
            return { docs: [], totalDocs: 0, totalPages: 1, page: 1, limit: 1, hasNextPage: false, hasPrevPage: false };
          }
        }
      };
      const caller: Where = { or: [{ id: { equals: "fixture-track" } }, { setlist: { equals: "fixture-private-setlist" } }] };
      await findOperation({
        collection: tracks, where: structuredClone(caller), overrideAccess: false, depth: 0, limit: 1, joins: false,
        req: { user: actor.user, payloadAPI, payload, context: {}, locale: "en", fallbackLocale: null }
      });
      assert.deepEqual(findCalls, [{ and: actor.staff ? [caller] : [caller, {
        or: [{ setlist: { exists: false } }, { "setlist.isPublic": { equals: true } }]
      }] }]);
    });
  }
}

test("essay radio remains an access-checked anonymous Tracks read", () => {
  const file = new URL("../../src/lib/content/reading-surface.ts", import.meta.url);
  const source = readFileSync(file, "utf8");
  assert.match(source, /collection: "tracks",\s*depth: 0,\s*limit: 12,\s*sort: "-createdAt",\s*overrideAccess: false\s*\}/);
});
