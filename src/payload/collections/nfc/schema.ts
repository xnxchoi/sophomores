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
