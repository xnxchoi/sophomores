import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "help_content" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "help_content_locales" (
  	"introduction" varchar,
  	"topics_shipping" varchar,
  	"topics_account" varchar,
  	"topics_shop" varchar,
  	"shipping_introduction" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "site_editorial" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"featured_setlist_id" uuid,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_editorial_locales" (
  	"site_title" varchar,
  	"site_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  ALTER TABLE "help_content_locales" ADD CONSTRAINT "help_content_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."help_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_editorial" ADD CONSTRAINT "site_editorial_featured_setlist_id_setlists_id_fk" FOREIGN KEY ("featured_setlist_id") REFERENCES "public"."setlists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_editorial_locales" ADD CONSTRAINT "site_editorial_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_editorial"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "help_content_locales_locale_parent_id_unique" ON "help_content_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "help_content_locales_parent_id_idx" ON "help_content_locales" USING btree ("_parent_id");
  CREATE INDEX "site_editorial_featured_setlist_idx" ON "site_editorial" USING btree ("featured_setlist_id");
  CREATE UNIQUE INDEX "site_editorial_locales_locale_parent_id_unique" ON "site_editorial_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_editorial_locales_parent_id_idx" ON "site_editorial_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "help_content" CASCADE;
  DROP TABLE "help_content_locales" CASCADE;
  DROP TABLE "site_editorial" CASCADE;
  DROP TABLE "site_editorial_locales" CASCADE;`)
}
