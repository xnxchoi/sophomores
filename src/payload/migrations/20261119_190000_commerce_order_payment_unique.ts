import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/** Attempt UUID is in one-to-one correspondence with the immutable PortOne ID. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // PostgreSQL validates both existing rows and concurrent writers while creating
  // the index. A duplicate aborts the migration without repairing history.
  await db.execute(sql`
    CREATE UNIQUE INDEX "orders_commerce_v1_payment_uidx"
      ON "public"."orders" ("commerce_attempt_i_d")
      WHERE "commerce_version" = 'commerce-v1';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX "public"."orders_commerce_v1_payment_uidx";`);
}
