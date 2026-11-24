import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_entry_warpstart_tz" AS ENUM('Asia/Seoul');
  CREATE TYPE "public"."enum_home_entry_warpend_tz" AS ENUM('Asia/Seoul');
  CREATE TABLE "home_entry_entry_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "home_entry" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"warp_start" timestamp(3) with time zone,
  	"warpstart_tz" "enum_home_entry_warpstart_tz" DEFAULT 'Asia/Seoul',
  	"warp_end" timestamp(3) with time zone,
  	"warpend_tz" "enum_home_entry_warpend_tz" DEFAULT 'Asia/Seoul',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "home_entry_entry_links" ADD CONSTRAINT "home_entry_entry_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_entry"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_entry_entry_links_order_idx" ON "home_entry_entry_links" USING btree ("_order");
  CREATE INDEX "home_entry_entry_links_parent_id_idx" ON "home_entry_entry_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_entry_entry_links" CASCADE;
  DROP TABLE "home_entry" CASCADE;
  DROP TYPE "public"."enum_home_entry_warpstart_tz";
  DROP TYPE "public"."enum_home_entry_warpend_tz";`)
}
