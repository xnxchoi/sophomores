import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

// Short-lived protocol state, owned by the NFC transaction, not a Payload document.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE nfc_tap_handoffs (
      id text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{21}[AQgw]$'),
      member_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_id uuid NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
      card_ref text NOT NULL CHECK (card_ref ~ '^[A-Za-z0-9_-]{21}[AQgw]$'),
      epoch_id uuid NOT NULL REFERENCES nfc_card_epochs(id) ON DELETE CASCADE,
      counter integer NOT NULL CHECK (counter BETWEEN 1 AND 16777215),
      browser_hash text NOT NULL CHECK (browser_hash ~ '^[0-9a-f]{64}$'),
      expires_at timestamptz(6) NOT NULL
    );
    CREATE UNIQUE INDEX nfc_tap_handoffs_member_id_key ON nfc_tap_handoffs (member_id);
    CREATE INDEX nfc_tap_handoffs_card_idx ON nfc_tap_handoffs (card_id);
    CREATE INDEX nfc_tap_handoffs_expiry_idx ON nfc_tap_handoffs (expires_at, id);
    CREATE INDEX nfc_tap_handoffs_epoch_idx ON nfc_tap_handoffs (epoch_id);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE nfc_tap_handoffs`);
}
