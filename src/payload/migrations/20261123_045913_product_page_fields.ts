import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_page_formats_effect" AS ENUM('none', 'hologram', 'radio');
  CREATE TYPE "public"."enum__products_v_version_page_formats_effect" AS ENUM('none', 'hologram', 'radio');
  CREATE TABLE "products_page_about_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "products_page_formats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"note" varchar,
  	"effect" "enum_products_page_formats_effect" DEFAULT 'none'
  );
  
  CREATE TABLE "products_page_praise" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"name" varchar,
  	"role" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "products_page_typefaces" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"foundry" varchar
  );
  
  CREATE TABLE "products_page_materials" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "products_page_techniques" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "products_page_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"caption" varchar
  );
  
  CREATE TABLE "products_page_book_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"front_id" uuid,
  	"back_id" uuid
  );
  
  CREATE TABLE "_products_v_version_page_about_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_page_formats" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"note" varchar,
  	"effect" "enum__products_v_version_page_formats_effect" DEFAULT 'none',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_page_praise" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"quote" varchar,
  	"name" varchar,
  	"role" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_page_typefaces" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"foundry" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_page_materials" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_page_techniques" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_page_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_page_book_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"front_id" uuid,
  	"back_id" uuid,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products" ADD COLUMN "page_shelf_title" varchar;
  ALTER TABLE "products" ADD COLUMN "page_shelf_order" numeric;
  ALTER TABLE "products" ADD COLUMN "page_kicker" varchar;
  ALTER TABLE "products" ADD COLUMN "page_byline" varchar;
  ALTER TABLE "products" ADD COLUMN "page_stage_art_id" uuid;
  ALTER TABLE "products" ADD COLUMN "page_long_description" jsonb;
  ALTER TABLE "products" ADD COLUMN "page_about_heading" varchar;
  ALTER TABLE "products" ADD COLUMN "page_about_body" jsonb;
  ALTER TABLE "products" ADD COLUMN "page_details_trim_width_m_m" numeric;
  ALTER TABLE "products" ADD COLUMN "page_details_trim_height_m_m" numeric;
  ALTER TABLE "products" ADD COLUMN "page_details_spine_m_m" numeric;
  ALTER TABLE "products" ADD COLUMN "page_details_weight_g" numeric;
  ALTER TABLE "products" ADD COLUMN "page_details_pages" numeric;
  ALTER TABLE "products" ADD COLUMN "page_details_words" numeric;
  ALTER TABLE "products" ADD COLUMN "page_book_cover_diffuse_id" uuid;
  ALTER TABLE "products" ADD COLUMN "page_book_cover_bump_base_id" uuid;
  ALTER TABLE "products" ADD COLUMN "page_book_cover_bump_custom_id" uuid;
  ALTER TABLE "products" ADD COLUMN "page_book_cover_foil_id" uuid;
  ALTER TABLE "products" ADD COLUMN "page_book_cover_gloss_id" uuid;
  ALTER TABLE "products" ADD COLUMN "page_book_cover_glitter_id" uuid;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_shelf_title" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_shelf_order" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_kicker" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_byline" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_stage_art_id" uuid;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_long_description" jsonb;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_about_heading" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_about_body" jsonb;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_details_trim_width_m_m" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_details_trim_height_m_m" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_details_spine_m_m" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_details_weight_g" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_details_pages" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_details_words" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_book_cover_diffuse_id" uuid;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_book_cover_bump_base_id" uuid;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_book_cover_bump_custom_id" uuid;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_book_cover_foil_id" uuid;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_book_cover_gloss_id" uuid;
  ALTER TABLE "_products_v" ADD COLUMN "version_page_book_cover_glitter_id" uuid;
  ALTER TABLE "products_page_about_links" ADD CONSTRAINT "products_page_about_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_page_formats" ADD CONSTRAINT "products_page_formats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_page_praise" ADD CONSTRAINT "products_page_praise_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_page_typefaces" ADD CONSTRAINT "products_page_typefaces_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_page_materials" ADD CONSTRAINT "products_page_materials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_page_techniques" ADD CONSTRAINT "products_page_techniques_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_page_gallery" ADD CONSTRAINT "products_page_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_page_gallery" ADD CONSTRAINT "products_page_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_page_book_pages" ADD CONSTRAINT "products_page_book_pages_front_id_media_id_fk" FOREIGN KEY ("front_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_page_book_pages" ADD CONSTRAINT "products_page_book_pages_back_id_media_id_fk" FOREIGN KEY ("back_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_page_book_pages" ADD CONSTRAINT "products_page_book_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_about_links" ADD CONSTRAINT "_products_v_version_page_about_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_formats" ADD CONSTRAINT "_products_v_version_page_formats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_praise" ADD CONSTRAINT "_products_v_version_page_praise_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_typefaces" ADD CONSTRAINT "_products_v_version_page_typefaces_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_materials" ADD CONSTRAINT "_products_v_version_page_materials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_techniques" ADD CONSTRAINT "_products_v_version_page_techniques_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_gallery" ADD CONSTRAINT "_products_v_version_page_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_gallery" ADD CONSTRAINT "_products_v_version_page_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_book_pages" ADD CONSTRAINT "_products_v_version_page_book_pages_front_id_media_id_fk" FOREIGN KEY ("front_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_book_pages" ADD CONSTRAINT "_products_v_version_page_book_pages_back_id_media_id_fk" FOREIGN KEY ("back_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_page_book_pages" ADD CONSTRAINT "_products_v_version_page_book_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_page_about_links_order_idx" ON "products_page_about_links" USING btree ("_order");
  CREATE INDEX "products_page_about_links_parent_id_idx" ON "products_page_about_links" USING btree ("_parent_id");
  CREATE INDEX "products_page_formats_order_idx" ON "products_page_formats" USING btree ("_order");
  CREATE INDEX "products_page_formats_parent_id_idx" ON "products_page_formats" USING btree ("_parent_id");
  CREATE INDEX "products_page_praise_order_idx" ON "products_page_praise" USING btree ("_order");
  CREATE INDEX "products_page_praise_parent_id_idx" ON "products_page_praise" USING btree ("_parent_id");
  CREATE INDEX "products_page_typefaces_order_idx" ON "products_page_typefaces" USING btree ("_order");
  CREATE INDEX "products_page_typefaces_parent_id_idx" ON "products_page_typefaces" USING btree ("_parent_id");
  CREATE INDEX "products_page_materials_order_idx" ON "products_page_materials" USING btree ("_order");
  CREATE INDEX "products_page_materials_parent_id_idx" ON "products_page_materials" USING btree ("_parent_id");
  CREATE INDEX "products_page_techniques_order_idx" ON "products_page_techniques" USING btree ("_order");
  CREATE INDEX "products_page_techniques_parent_id_idx" ON "products_page_techniques" USING btree ("_parent_id");
  CREATE INDEX "products_page_gallery_order_idx" ON "products_page_gallery" USING btree ("_order");
  CREATE INDEX "products_page_gallery_parent_id_idx" ON "products_page_gallery" USING btree ("_parent_id");
  CREATE INDEX "products_page_gallery_image_idx" ON "products_page_gallery" USING btree ("image_id");
  CREATE INDEX "products_page_book_pages_order_idx" ON "products_page_book_pages" USING btree ("_order");
  CREATE INDEX "products_page_book_pages_parent_id_idx" ON "products_page_book_pages" USING btree ("_parent_id");
  CREATE INDEX "products_page_book_pages_front_idx" ON "products_page_book_pages" USING btree ("front_id");
  CREATE INDEX "products_page_book_pages_back_idx" ON "products_page_book_pages" USING btree ("back_id");
  CREATE INDEX "_products_v_version_page_about_links_order_idx" ON "_products_v_version_page_about_links" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_about_links_parent_id_idx" ON "_products_v_version_page_about_links" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_formats_order_idx" ON "_products_v_version_page_formats" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_formats_parent_id_idx" ON "_products_v_version_page_formats" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_praise_order_idx" ON "_products_v_version_page_praise" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_praise_parent_id_idx" ON "_products_v_version_page_praise" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_typefaces_order_idx" ON "_products_v_version_page_typefaces" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_typefaces_parent_id_idx" ON "_products_v_version_page_typefaces" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_materials_order_idx" ON "_products_v_version_page_materials" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_materials_parent_id_idx" ON "_products_v_version_page_materials" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_techniques_order_idx" ON "_products_v_version_page_techniques" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_techniques_parent_id_idx" ON "_products_v_version_page_techniques" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_gallery_order_idx" ON "_products_v_version_page_gallery" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_gallery_parent_id_idx" ON "_products_v_version_page_gallery" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_gallery_image_idx" ON "_products_v_version_page_gallery" USING btree ("image_id");
  CREATE INDEX "_products_v_version_page_book_pages_order_idx" ON "_products_v_version_page_book_pages" USING btree ("_order");
  CREATE INDEX "_products_v_version_page_book_pages_parent_id_idx" ON "_products_v_version_page_book_pages" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_page_book_pages_front_idx" ON "_products_v_version_page_book_pages" USING btree ("front_id");
  CREATE INDEX "_products_v_version_page_book_pages_back_idx" ON "_products_v_version_page_book_pages" USING btree ("back_id");
  ALTER TABLE "products" ADD CONSTRAINT "products_page_stage_art_id_media_id_fk" FOREIGN KEY ("page_stage_art_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_page_book_cover_diffuse_id_media_id_fk" FOREIGN KEY ("page_book_cover_diffuse_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_page_book_cover_bump_base_id_media_id_fk" FOREIGN KEY ("page_book_cover_bump_base_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_page_book_cover_bump_custom_id_media_id_fk" FOREIGN KEY ("page_book_cover_bump_custom_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_page_book_cover_foil_id_media_id_fk" FOREIGN KEY ("page_book_cover_foil_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_page_book_cover_gloss_id_media_id_fk" FOREIGN KEY ("page_book_cover_gloss_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_page_book_cover_glitter_id_media_id_fk" FOREIGN KEY ("page_book_cover_glitter_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_page_stage_art_id_media_id_fk" FOREIGN KEY ("version_page_stage_art_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_page_book_cover_diffuse_id_media_id_fk" FOREIGN KEY ("version_page_book_cover_diffuse_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_page_book_cover_bump_base_id_media_id_fk" FOREIGN KEY ("version_page_book_cover_bump_base_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_page_book_cover_bump_custom_id_media_id_fk" FOREIGN KEY ("version_page_book_cover_bump_custom_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_page_book_cover_foil_id_media_id_fk" FOREIGN KEY ("version_page_book_cover_foil_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_page_book_cover_gloss_id_media_id_fk" FOREIGN KEY ("version_page_book_cover_gloss_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_page_book_cover_glitter_id_media_id_fk" FOREIGN KEY ("version_page_book_cover_glitter_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "products_page_page_stage_art_idx" ON "products" USING btree ("page_stage_art_id");
  CREATE INDEX "products_page_book_page_book_cover_diffuse_idx" ON "products" USING btree ("page_book_cover_diffuse_id");
  CREATE INDEX "products_page_book_page_book_cover_bump_base_idx" ON "products" USING btree ("page_book_cover_bump_base_id");
  CREATE INDEX "products_page_book_page_book_cover_bump_custom_idx" ON "products" USING btree ("page_book_cover_bump_custom_id");
  CREATE INDEX "products_page_book_page_book_cover_foil_idx" ON "products" USING btree ("page_book_cover_foil_id");
  CREATE INDEX "products_page_book_page_book_cover_gloss_idx" ON "products" USING btree ("page_book_cover_gloss_id");
  CREATE INDEX "products_page_book_page_book_cover_glitter_idx" ON "products" USING btree ("page_book_cover_glitter_id");
  CREATE INDEX "_products_v_version_page_version_page_stage_art_idx" ON "_products_v" USING btree ("version_page_stage_art_id");
  CREATE INDEX "_products_v_version_page_book_version_page_book_cover_di_idx" ON "_products_v" USING btree ("version_page_book_cover_diffuse_id");
  CREATE INDEX "_products_v_version_page_book_version_page_book_cover_bu_idx" ON "_products_v" USING btree ("version_page_book_cover_bump_base_id");
  CREATE INDEX "_products_v_version_page_book_version_page_book_cover__1_idx" ON "_products_v" USING btree ("version_page_book_cover_bump_custom_id");
  CREATE INDEX "_products_v_version_page_book_version_page_book_cover_fo_idx" ON "_products_v" USING btree ("version_page_book_cover_foil_id");
  CREATE INDEX "_products_v_version_page_book_version_page_book_cover_gl_idx" ON "_products_v" USING btree ("version_page_book_cover_gloss_id");
  CREATE INDEX "_products_v_version_page_book_version_page_book_cover__2_idx" ON "_products_v" USING btree ("version_page_book_cover_glitter_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_page_about_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_page_formats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_page_praise" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_page_typefaces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_page_materials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_page_techniques" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_page_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_page_book_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_about_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_formats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_praise" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_typefaces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_materials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_techniques" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_page_book_pages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_page_about_links" CASCADE;
  DROP TABLE "products_page_formats" CASCADE;
  DROP TABLE "products_page_praise" CASCADE;
  DROP TABLE "products_page_typefaces" CASCADE;
  DROP TABLE "products_page_materials" CASCADE;
  DROP TABLE "products_page_techniques" CASCADE;
  DROP TABLE "products_page_gallery" CASCADE;
  DROP TABLE "products_page_book_pages" CASCADE;
  DROP TABLE "_products_v_version_page_about_links" CASCADE;
  DROP TABLE "_products_v_version_page_formats" CASCADE;
  DROP TABLE "_products_v_version_page_praise" CASCADE;
  DROP TABLE "_products_v_version_page_typefaces" CASCADE;
  DROP TABLE "_products_v_version_page_materials" CASCADE;
  DROP TABLE "_products_v_version_page_techniques" CASCADE;
  DROP TABLE "_products_v_version_page_gallery" CASCADE;
  DROP TABLE "_products_v_version_page_book_pages" CASCADE;
  ALTER TABLE "products" DROP CONSTRAINT "products_page_stage_art_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_page_book_cover_diffuse_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_page_book_cover_bump_base_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_page_book_cover_bump_custom_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_page_book_cover_foil_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_page_book_cover_gloss_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_page_book_cover_glitter_id_media_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_page_stage_art_id_media_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_page_book_cover_diffuse_id_media_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_page_book_cover_bump_base_id_media_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_page_book_cover_bump_custom_id_media_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_page_book_cover_foil_id_media_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_page_book_cover_gloss_id_media_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_page_book_cover_glitter_id_media_id_fk";
  
  DROP INDEX "products_page_page_stage_art_idx";
  DROP INDEX "products_page_book_page_book_cover_diffuse_idx";
  DROP INDEX "products_page_book_page_book_cover_bump_base_idx";
  DROP INDEX "products_page_book_page_book_cover_bump_custom_idx";
  DROP INDEX "products_page_book_page_book_cover_foil_idx";
  DROP INDEX "products_page_book_page_book_cover_gloss_idx";
  DROP INDEX "products_page_book_page_book_cover_glitter_idx";
  DROP INDEX "_products_v_version_page_version_page_stage_art_idx";
  DROP INDEX "_products_v_version_page_book_version_page_book_cover_di_idx";
  DROP INDEX "_products_v_version_page_book_version_page_book_cover_bu_idx";
  DROP INDEX "_products_v_version_page_book_version_page_book_cover__1_idx";
  DROP INDEX "_products_v_version_page_book_version_page_book_cover_fo_idx";
  DROP INDEX "_products_v_version_page_book_version_page_book_cover_gl_idx";
  DROP INDEX "_products_v_version_page_book_version_page_book_cover__2_idx";
  ALTER TABLE "products" DROP COLUMN "page_shelf_title";
  ALTER TABLE "products" DROP COLUMN "page_shelf_order";
  ALTER TABLE "products" DROP COLUMN "page_kicker";
  ALTER TABLE "products" DROP COLUMN "page_byline";
  ALTER TABLE "products" DROP COLUMN "page_stage_art_id";
  ALTER TABLE "products" DROP COLUMN "page_long_description";
  ALTER TABLE "products" DROP COLUMN "page_about_heading";
  ALTER TABLE "products" DROP COLUMN "page_about_body";
  ALTER TABLE "products" DROP COLUMN "page_details_trim_width_m_m";
  ALTER TABLE "products" DROP COLUMN "page_details_trim_height_m_m";
  ALTER TABLE "products" DROP COLUMN "page_details_spine_m_m";
  ALTER TABLE "products" DROP COLUMN "page_details_weight_g";
  ALTER TABLE "products" DROP COLUMN "page_details_pages";
  ALTER TABLE "products" DROP COLUMN "page_details_words";
  ALTER TABLE "products" DROP COLUMN "page_book_cover_diffuse_id";
  ALTER TABLE "products" DROP COLUMN "page_book_cover_bump_base_id";
  ALTER TABLE "products" DROP COLUMN "page_book_cover_bump_custom_id";
  ALTER TABLE "products" DROP COLUMN "page_book_cover_foil_id";
  ALTER TABLE "products" DROP COLUMN "page_book_cover_gloss_id";
  ALTER TABLE "products" DROP COLUMN "page_book_cover_glitter_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_shelf_title";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_shelf_order";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_kicker";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_byline";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_stage_art_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_long_description";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_about_heading";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_about_body";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_details_trim_width_m_m";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_details_trim_height_m_m";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_details_spine_m_m";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_details_weight_g";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_details_pages";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_details_words";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_book_cover_diffuse_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_book_cover_bump_base_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_book_cover_bump_custom_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_book_cover_foil_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_book_cover_gloss_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_page_book_cover_glitter_id";
  DROP TYPE "public"."enum_products_page_formats_effect";
  DROP TYPE "public"."enum__products_v_version_page_formats_effect";`)
}
