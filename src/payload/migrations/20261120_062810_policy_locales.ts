import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "business_info_locales" (
  	"terms" jsonb,
  	"privacy" jsonb,
  	"refund" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  ALTER TABLE "business_info_locales" ADD CONSTRAINT "business_info_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."business_info"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "business_info_locales_locale_parent_id_unique" ON "business_info_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "business_info_locales_parent_id_idx" ON "business_info_locales" USING btree ("_parent_id");
  -- Hand-added data step: Payload's generated SQL drops the columns without moving their data.
  -- Saved policy text moves into the default locale (en) before the drops.
  INSERT INTO "business_info_locales" ("terms", "privacy", "refund", "_locale", "_parent_id")
  SELECT "terms", "privacy", "refund", 'en', "id" FROM "business_info"
  WHERE "terms" IS NOT NULL OR "privacy" IS NOT NULL OR "refund" IS NOT NULL;
  ALTER TABLE "business_info" DROP COLUMN "terms";
  ALTER TABLE "business_info" DROP COLUMN "privacy";
  ALTER TABLE "business_info" DROP COLUMN "refund";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "business_info" ADD COLUMN "terms" jsonb;
  ALTER TABLE "business_info" ADD COLUMN "privacy" jsonb;
  ALTER TABLE "business_info" ADD COLUMN "refund" jsonb;
  -- Hand-added data step: the English text goes back into the columns. The single columns have no
  -- place for Korean, so Korean policy text is dropped on down.
  UPDATE "business_info" SET "terms" = l."terms", "privacy" = l."privacy", "refund" = l."refund"
  FROM "business_info_locales" l WHERE l."_parent_id" = "business_info"."id" AND l."_locale" = 'en';
  DROP TABLE "business_info_locales" CASCADE;`)
}
