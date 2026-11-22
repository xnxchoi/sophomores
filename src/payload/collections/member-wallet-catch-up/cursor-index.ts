import type { PostgresSchemaHook } from "@payloadcms/drizzle/postgres";

// Payload compound indexes cannot name the adapter's implicit UUID column.
export const walletCatchUpCursorIndex: PostgresSchemaHook = ({ adapter, schema }) => {
  const table = adapter.rawTables.commerce_key_grant_intents;
  if (!table?.columns.id || !table.indexes) throw new Error("Wallet catch-up cursor schema unavailable");
  const name = "wallet_catch_up_cursor_idx";
  table.indexes[name] = { name, on: ["state", "recipientMode", "createdAt", "id"] };
  return schema;
};
