import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/** Additive quarantine marker; historical financial state remains unchanged. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "transactions" ADD COLUMN "commerce_resolution_conflict" boolean DEFAULT false;`);
}

/** Destructive rollback is not part of local acceptance. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "transactions" DROP COLUMN "commerce_resolution_conflict";`);
}
