import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE enum_nfc_cards_status AS ENUM ('stock','active','retired');
    CREATE TYPE enum_nfc_card_epochs_status AS ENUM ('active','retired');
    CREATE TYPE enum_nfc_card_epochs_profile AS ENUM ('aes-sun-v1');
    CREATE TYPE enum_nfc_card_events_action AS ENUM ('stock','issue','revoke','replace','retire-epoch','activate-epoch');
    CREATE TYPE enum_nfc_card_events_reason AS ENUM ('provisioning','fulfillment','lost','damaged','rotation');

    CREATE TABLE nfc_cards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ref varchar NOT NULL,
      uid_fingerprint varchar NOT NULL,
      member_id uuid REFERENCES users(id) ON DELETE RESTRICT,
      status enum_nfc_cards_status NOT NULL,
      updated_at timestamptz(3) NOT NULL DEFAULT now(),
      created_at timestamptz(3) NOT NULL DEFAULT now(),
      CONSTRAINT nfc_cards_binding_check CHECK ((status = 'stock' AND member_id IS NULL) OR (status <> 'stock' AND member_id IS NOT NULL))
    );
    CREATE UNIQUE INDEX nfc_cards_ref_idx ON nfc_cards (ref);
    CREATE UNIQUE INDEX nfc_cards_uid_fingerprint_idx ON nfc_cards (uid_fingerprint);
    CREATE INDEX nfc_cards_member_idx ON nfc_cards (member_id);
    CREATE INDEX nfc_cards_updated_at_idx ON nfc_cards (updated_at);
    CREATE INDEX nfc_cards_created_at_idx ON nfc_cards (created_at);
    CREATE UNIQUE INDEX nfc_cards_active_member_uidx ON nfc_cards (member_id) WHERE status = 'active';

    CREATE TABLE nfc_card_epochs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id uuid NOT NULL REFERENCES nfc_cards(id) ON DELETE RESTRICT,
      status enum_nfc_card_epochs_status NOT NULL,
      previous_epoch_id uuid REFERENCES nfc_card_epochs(id) ON DELETE RESTRICT,
      profile enum_nfc_card_epochs_profile NOT NULL,
      meta_key_ref varchar NOT NULL,
      mac_key_ref varchar NOT NULL,
      mac_fingerprint varchar NOT NULL,
      meta_fingerprint varchar NOT NULL,
      last_read_counter numeric,
      updated_at timestamptz(3) NOT NULL DEFAULT now(),
      created_at timestamptz(3) NOT NULL DEFAULT now(),
      CONSTRAINT nfc_card_epochs_counter_check CHECK (
        last_read_counter BETWEEN 1 AND 16777215 AND last_read_counter = trunc(last_read_counter)
      ),
      CONSTRAINT nfc_card_epochs_distinct_keys CHECK (meta_key_ref <> mac_key_ref AND meta_fingerprint <> mac_fingerprint)
    );
    CREATE UNIQUE INDEX nfc_card_epochs_previous_epoch_idx ON nfc_card_epochs (previous_epoch_id);
    CREATE INDEX nfc_card_epochs_card_idx ON nfc_card_epochs (card_id);
    CREATE UNIQUE INDEX nfc_card_epochs_mac_fingerprint_idx ON nfc_card_epochs (mac_fingerprint);
    CREATE INDEX nfc_card_epochs_updated_at_idx ON nfc_card_epochs (updated_at);
    CREATE INDEX nfc_card_epochs_created_at_idx ON nfc_card_epochs (created_at);
    CREATE UNIQUE INDEX nfc_card_epochs_active_card_uidx ON nfc_card_epochs (card_id) WHERE status = 'active';

    CREATE TABLE nfc_member_welcome (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      updated_at timestamptz(3) NOT NULL DEFAULT now(),
      created_at timestamptz(3) NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX nfc_member_welcome_member_idx ON nfc_member_welcome (member_id);
    CREATE INDEX nfc_member_welcome_updated_at_idx ON nfc_member_welcome (updated_at);
    CREATE INDEX nfc_member_welcome_created_at_idx ON nfc_member_welcome (created_at);

    CREATE TABLE nfc_card_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      action enum_nfc_card_events_action NOT NULL,
      actor_id uuid NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
      card_id uuid NOT NULL REFERENCES nfc_cards(id) ON DELETE RESTRICT,
      replacement_id uuid REFERENCES nfc_cards(id) ON DELETE RESTRICT,
      epoch_id uuid REFERENCES nfc_card_epochs(id) ON DELETE RESTRICT,
      member_id uuid REFERENCES users(id) ON DELETE RESTRICT,
      reason enum_nfc_card_events_reason NOT NULL,
      updated_at timestamptz(3) NOT NULL DEFAULT now(),
      created_at timestamptz(3) NOT NULL DEFAULT now()
    );
    CREATE INDEX nfc_card_events_actor_idx ON nfc_card_events (actor_id);
    CREATE INDEX nfc_card_events_card_idx ON nfc_card_events (card_id);
    CREATE INDEX nfc_card_events_replacement_idx ON nfc_card_events (replacement_id);
    CREATE INDEX nfc_card_events_epoch_idx ON nfc_card_events (epoch_id);
    CREATE INDEX nfc_card_events_member_idx ON nfc_card_events (member_id);
    CREATE INDEX nfc_card_events_updated_at_idx ON nfc_card_events (updated_at);
    CREATE INDEX nfc_card_events_created_at_idx ON nfc_card_events (created_at);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE nfc_card_events, nfc_member_welcome, nfc_card_epochs, nfc_cards;
    DROP TYPE enum_nfc_card_events_reason, enum_nfc_card_events_action,
      enum_nfc_card_epochs_profile, enum_nfc_card_epochs_status, enum_nfc_cards_status;
  `);
}
