import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE carts_items ADD COLUMN ticket_kind varchar;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    LOCK TABLE carts_items IN ACCESS EXCLUSIVE MODE;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM carts_items WHERE ticket_kind IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot drop persisted shared Guest cart markers';
      END IF;
    END $$;
    ALTER TABLE carts_items DROP COLUMN ticket_kind;
  `);
}
