import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "products" ADD COLUMN "maximum_per_person" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_maximum_per_person" numeric;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "_products_v" DROP COLUMN "version_maximum_per_person";
  ALTER TABLE "products" DROP COLUMN "maximum_per_person";`)
}
