import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE enum_commerce_key_grant_intents_purpose AS ENUM ('primary', 'member-event');
    ALTER TABLE commerce_key_grant_intents
      ADD COLUMN purpose enum_commerce_key_grant_intents_purpose DEFAULT 'primary' NOT NULL,
      ADD COLUMN ticket_token_key varchar;
    DROP INDEX commerce_key_grant_intents_entitlement_idx;
    CREATE INDEX commerce_key_grant_intents_entitlement_idx ON commerce_key_grant_intents (entitlement_id);
    CREATE UNIQUE INDEX entitlement_purpose_idx ON commerce_key_grant_intents (entitlement_id, purpose);
    CREATE UNIQUE INDEX commerce_key_grant_intents_ticket_token_key_idx ON commerce_key_grant_intents (ticket_token_key);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    LOCK TABLE commerce_events, commerce_reservations, commerce_admissions, commerce_key_grant_intents IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM commerce_key_grant_intents WHERE purpose <> 'primary' OR ticket_token_key IS NOT NULL OR target->>'ticketMode' = 'shared')
        OR EXISTS (SELECT 1 FROM commerce_events WHERE unlock_ticket_configuration->>'mode' = 'shared')
        OR EXISTS (SELECT 1 FROM commerce_reservations WHERE ticket_target->>'mode' = 'shared')
        OR EXISTS (SELECT 1 FROM commerce_admissions WHERE ticket_target->>'mode' = 'shared')
      THEN RAISE EXCEPTION 'Cannot drop shared event ticket evidence'; END IF;
    END $$;
    DROP INDEX commerce_key_grant_intents_ticket_token_key_idx, entitlement_purpose_idx, commerce_key_grant_intents_entitlement_idx;
    CREATE UNIQUE INDEX commerce_key_grant_intents_entitlement_idx ON commerce_key_grant_intents (entitlement_id);
    ALTER TABLE commerce_key_grant_intents DROP COLUMN ticket_token_key, DROP COLUMN purpose;
    DROP TYPE enum_commerce_key_grant_intents_purpose;
  `);
}
