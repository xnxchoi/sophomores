import { sql } from "@payloadcms/db-postgres";
import { check } from "@payloadcms/db-postgres/drizzle/pg-core";
import type { PostgresSchemaHook } from "@payloadcms/drizzle/postgres";

// Match the FK names and delete behavior already installed by the NFC migration.
// Payload's raw schema has no CHECK or partial-index predicate representation.
const relationships = {
  nfc_cards: { member: "member_id" },
  nfc_card_epochs: { card: "card_id", previousEpoch: "previous_epoch_id" },
  nfc_member_welcome: { member: "member_id" },
  nfc_card_events: {
    actor: "actor_id", card: "card_id", replacement: "replacement_id",
    epoch: "epoch_id", member: "member_id",
  },
} as const;

export const nfcDeleteContract: PostgresSchemaHook = ({ adapter, schema }) => {
  for (const [tableName, columns] of Object.entries(relationships)) {
    const table = adapter.rawTables[tableName];
    if (!table) throw new Error(`NFC raw schema is missing ${tableName}`);
    for (const [field, physicalName] of Object.entries(columns)) {
      const column = table.columns[field];
      const reference = column?.reference;
      if (!reference || column.name !== physicalName) {
        throw new Error(`NFC relationship is missing: ${tableName}.${physicalName}`);
      }
      // Move the inline reference into a named FK to match PostgreSQL's
      // default name for the original unnamed inline REFERENCES clause.
      const name = `${tableName}_${physicalName}_fkey`;
      const otherKeys = Object.values(table.foreignKeys ?? {});
      if (otherKeys.some((key) => key.columns.includes(field))) {
        throw new Error(`NFC relationship already has a foreign key: ${name}`);
      }
      const { reference: _inline, ...columnWithoutReference } = column;
      table.columns[field] = columnWithoutReference;
      table.foreignKeys = {
        ...table.foreignKeys,
        [name]: { name, columns: [field], foreignColumns: [{ table: reference.table, name: reference.name }], onDelete: "restrict" },
      };
    }
  }
  return schema;
};

// Register protocol state with the adapter without exposing a CMS collection.
export const nfcHandoffSchema: PostgresSchemaHook = ({ adapter, schema }) => {
  const name = "nfc_tap_handoffs";
  if (adapter.rawTables[name]) throw new Error("Duplicate NFC handoff schema");
  adapter.rawTables[name] = {
    name,
    columns: {
      id: { name: "id", type: "text", primaryKey: true },
      memberId: { name: "member_id", type: "uuid", notNull: true },
      cardId: { name: "card_id", type: "uuid", notNull: true },
      cardRef: { name: "card_ref", type: "text", notNull: true },
      epochId: { name: "epoch_id", type: "uuid", notNull: true },
      counter: { name: "counter", type: "integer", notNull: true },
      browserHash: { name: "browser_hash", type: "text", notNull: true },
      expiresAt: { name: "expires_at", type: "timestamp", mode: "date", precision: 6, withTimezone: true, notNull: true },
    },
    foreignKeys: Object.fromEntries([
      ["memberId", "member_id", "users"], ["cardId", "card_id", "nfc_cards"], ["epochId", "epoch_id", "nfc_card_epochs"],
    ].map(([column, physical, table]) => {
      const key = name + "_" + physical + "_fkey";
      return [key, { name: key, columns: [column], foreignColumns: [{ table, name: "id" }], onDelete: "cascade" as const }];
    })),
    indexes: {
      nfc_tap_handoffs_member_id_key: { name: "nfc_tap_handoffs_member_id_key", on: "memberId", unique: true },
      nfc_tap_handoffs_card_idx: { name: "nfc_tap_handoffs_card_idx", on: "cardId" },
      nfc_tap_handoffs_expiry_idx: { name: "nfc_tap_handoffs_expiry_idx", on: ["expiresAt", "id"] },
      nfc_tap_handoffs_epoch_idx: { name: "nfc_tap_handoffs_epoch_idx", on: "epochId" },
    },
  };
  return schema;
};

// Raw tables cannot express CHECK constraints. Keep the live dev-push schema
// identical to the explicit SQL migration by extending the built Drizzle table.
export const nfcHandoffChecks: PostgresSchemaHook = ({ extendTable, schema }) => {
  const table = schema.tables.nfc_tap_handoffs;
  if (!table) throw new Error("NFC handoff table is unavailable");
  extendTable({ table, extraConfig: () => ({
    idCheck: check("nfc_tap_handoffs_id_check", sql`${table.id} ~ '^[A-Za-z0-9_-]{21}[AQgw]$'`),
    refCheck: check("nfc_tap_handoffs_card_ref_check", sql`${table.cardRef} ~ '^[A-Za-z0-9_-]{21}[AQgw]$'`),
    counterCheck: check("nfc_tap_handoffs_counter_check", sql`${table.counter} BETWEEN 1 AND 16777215`),
    hashCheck: check("nfc_tap_handoffs_browser_hash_check", sql`${table.browserHash} ~ '^[0-9a-f]{64}$'`),
  }) });
  return schema;
};
