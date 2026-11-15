import type { CollectionBeforeOperationHook, Config, Plugin } from "payload";

/**
 * The Postgres adapter runs with `allowIDOnCreate`, because the payment adapter
 * creates a transaction under the id it derived its payment ID from and reads it
 * back by that id. Only server Local API code may choose an id: a REST or
 * GraphQL create gets a server-chosen one, whatever the caller sent.
 */
export const stripClientSuppliedID: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== "create" || req.payloadAPI === "local") return args;
  const data: unknown = args.data;
  if (!data || typeof data !== "object" || Array.isArray(data) || !("id" in data)) return args;
  const withoutID: Record<string, unknown> = { ...data };
  delete withoutID.id;
  return { ...args, data: withoutID };
};

/** Installed last, so it also covers collections added by earlier plugins. */
export const serverChosenIDsPlugin: Plugin = (config: Config): Config => ({
  ...config,
  collections: (config.collections ?? []).map((collection) => ({
    ...collection,
    hooks: { ...collection.hooks, beforeOperation: [stripClientSuppliedID, ...(collection.hooks?.beforeOperation ?? [])] },
  })),
});
