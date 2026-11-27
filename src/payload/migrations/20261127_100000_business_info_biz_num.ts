import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "business_info" RENAME COLUMN "business_registration_number" TO "biz_num";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "business_info" RENAME COLUMN "biz_num" TO "business_registration_number";
  `);
}
