import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE commerce_events ADD COLUMN check_in_authority varchar, ADD COLUMN unlock_ticket_configuration jsonb;
    ALTER TABLE commerce_reservations ADD COLUMN ticket_target jsonb;
    ALTER TABLE commerce_admissions ADD COLUMN ticket_tier varchar, ADD COLUMN ticket_target jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM commerce_admissions WHERE ticket_tier IS NOT NULL OR ticket_target IS NOT NULL)
        OR EXISTS (SELECT 1 FROM commerce_reservations WHERE ticket_target IS NOT NULL)
        OR EXISTS (SELECT 1 FROM commerce_events WHERE check_in_authority IS NOT NULL OR unlock_ticket_configuration IS NOT NULL)
      THEN RAISE EXCEPTION 'Cannot remove configured or recorded event ticket targets'; END IF;
    END $$;
    ALTER TABLE commerce_admissions DROP COLUMN ticket_target, DROP COLUMN ticket_tier;
    ALTER TABLE commerce_reservations DROP COLUMN ticket_target;
    ALTER TABLE commerce_events DROP COLUMN unlock_ticket_configuration, DROP COLUMN check_in_authority;
  `);
}
