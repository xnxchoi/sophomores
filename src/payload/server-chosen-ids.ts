import type { CollectionBeforeOperationHook, Config, Plugin } from "payload";

const contextKey = "serverChosenID";

/**
 * The Postgres adapter runs with `allowIDOnCreate`, because the payment adapter
 * creates a transaction under the id its payment ID is derived from, and reads
 * it back by that id. A supplied id is kept only when the server opted in for
 * that exact id on that create, via `context: serverChosenIDContext(id)`.
 * Every other supplied id is dropped, whatever the API: production initiation is
 * itself a REST request, so the API flag cannot tell server code from a client.
 */
export const serverChosenIDContext = (id: string): Record<string, string> => ({ [contextKey]: id });

export const stripClientSuppliedID: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== "create") return args;
  const context = req.context as Record<string, unknown> | undefined;
  const optedIn = context?.[contextKey];
  // One-shot: Payload merges create context onto the shared request.
  if (context && contextKey in context) delete context[contextKey];
  const data: unknown = args.data;
  if (!data || typeof data !== "object" || Array.isArray(data) || !("id" in data)) return args;
  const supplied = (data as { id?: unknown }).id;
  if (typeof optedIn === "string" && supplied === optedIn) return args;
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
