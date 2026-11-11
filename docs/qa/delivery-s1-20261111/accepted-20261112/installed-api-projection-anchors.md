# Installed API projection ownership

Read-only installed source anchors, Payload3.92.1:

- Ordinary REST many-read: `node_modules/payload/dist/collections/endpoints/find.js:6-23` invokes the collection operation without trusted Local API override.
- Ordinary GraphQL many-read: `node_modules/.pnpm/@payloadcms+graphql@3.92.1_*/node_modules/@payloadcms/graphql/dist/resolvers/collections/find.js:3-33` invokes the same collection operation with depth0 and no trusted override.
- Shared collection read: `node_modules/payload/dist/collections/operations/find.js:233-249` passes the effective override and selection into installed field afterRead.
- Field read enforcement: `node_modules/payload/dist/fields/hooks/afterRead/promise.js:225-236`.
- Trusted Local API defaults: local find/findByID line5 and update line7.
- Relationship population: afterRead/relationshipPopulationPromise.js:23-40 and collections/dataloader.js:58-78.

The test matrix exercises this installed field/relationship pipeline and explicitly labels request API variants. It does not run actual HTTP/GraphQL engines or a database. No live endpoint/provider proof is claimed.
