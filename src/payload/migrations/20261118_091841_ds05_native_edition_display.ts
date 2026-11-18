import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_member_wallets_status" AS ENUM('active');
  CREATE TYPE "public"."enum_products_commerce_model" AS ENUM('legacy-v1', 'native-edition-v2');
  CREATE TYPE "public"."enum__products_v_version_commerce_model" AS ENUM('legacy-v1', 'native-edition-v2');
  CREATE TYPE "public"."enum_variants_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__variants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__variants_v_published_locale" AS ENUM('en', 'ko');
  CREATE TABLE "member_wallets" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"member_id" uuid,
  	"chain_i_d" numeric NOT NULL,
  	"status" "enum_member_wallets_status" NOT NULL,
  	"active_slot" varchar NOT NULL,
  	"wallet_key" varchar NOT NULL,
  	"safe_address" varchar NOT NULL,
  	"owner_address" varchar NOT NULL,
  	"threshold" numeric NOT NULL,
  	"salt_nonce" varchar NOT NULL,
  	"safe_version" varchar NOT NULL,
  	"proxy_factory_address" varchar NOT NULL,
  	"singleton_address" varchar NOT NULL,
  	"fallback_handler_address" varchar NOT NULL,
  	"config_hash" varchar NOT NULL,
  	"bound_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_types_id" uuid
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_types_id" uuid
  );
  
  CREATE TABLE "variants" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"product_id" uuid,
  	"inventory" numeric DEFAULT 0,
  	"price_in_k_r_w_enabled" boolean,
  	"price_in_k_r_w" numeric,
  	"publication_approved" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_variants_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "variants_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" uuid
  );
  
  CREATE TABLE "_variants_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_product_id" uuid,
  	"version_inventory" numeric DEFAULT 0,
  	"version_price_in_k_r_w_enabled" boolean,
  	"version_price_in_k_r_w" numeric,
  	"version_publication_approved" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__variants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__variants_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_variants_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" uuid
  );
  
  CREATE TABLE "variant_types" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "variant_options" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_variantoptions_options_order" varchar,
  	"variant_type_id" uuid NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "products" ADD COLUMN "commerce_model" "enum_products_commerce_model" DEFAULT 'legacy-v1';
  ALTER TABLE "products" ADD COLUMN "enable_variants" boolean DEFAULT false;
  ALTER TABLE "_products_v" ADD COLUMN "version_commerce_model" "enum__products_v_version_commerce_model" DEFAULT 'legacy-v1';
  ALTER TABLE "_products_v" ADD COLUMN "version_enable_variants" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "variants_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "variant_types_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "variant_options_id" uuid;
  ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants_rels" ADD CONSTRAINT "variants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants_rels" ADD CONSTRAINT "variants_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_parent_id_variants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v" ADD CONSTRAINT "_variants_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variant_options" ADD CONSTRAINT "variant_options_variant_type_id_variant_types_id_fk" FOREIGN KEY ("variant_type_id") REFERENCES "public"."variant_types"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "member_wallets_member_idx" ON "member_wallets" USING btree ("member_id");
  CREATE INDEX "member_wallets_status_idx" ON "member_wallets" USING btree ("status");
  CREATE UNIQUE INDEX "member_wallets_active_slot_idx" ON "member_wallets" USING btree ("active_slot");
  CREATE UNIQUE INDEX "member_wallets_wallet_key_idx" ON "member_wallets" USING btree ("wallet_key");
  CREATE INDEX "member_wallets_updated_at_idx" ON "member_wallets" USING btree ("updated_at");
  CREATE INDEX "member_wallets_created_at_idx" ON "member_wallets" USING btree ("created_at");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_variant_types_id_idx" ON "products_rels" USING btree ("variant_types_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_variant_types_id_idx" ON "_products_v_rels" USING btree ("variant_types_id");
  CREATE INDEX "variants_product_idx" ON "variants" USING btree ("product_id");
  CREATE INDEX "variants_updated_at_idx" ON "variants" USING btree ("updated_at");
  CREATE INDEX "variants_created_at_idx" ON "variants" USING btree ("created_at");
  CREATE INDEX "variants_deleted_at_idx" ON "variants" USING btree ("deleted_at");
  CREATE INDEX "variants__status_idx" ON "variants" USING btree ("_status");
  CREATE INDEX "variants_rels_order_idx" ON "variants_rels" USING btree ("order");
  CREATE INDEX "variants_rels_parent_idx" ON "variants_rels" USING btree ("parent_id");
  CREATE INDEX "variants_rels_path_idx" ON "variants_rels" USING btree ("path");
  CREATE INDEX "variants_rels_variant_options_id_idx" ON "variants_rels" USING btree ("variant_options_id");
  CREATE INDEX "_variants_v_parent_idx" ON "_variants_v" USING btree ("parent_id");
  CREATE INDEX "_variants_v_version_version_product_idx" ON "_variants_v" USING btree ("version_product_id");
  CREATE INDEX "_variants_v_version_version_updated_at_idx" ON "_variants_v" USING btree ("version_updated_at");
  CREATE INDEX "_variants_v_version_version_created_at_idx" ON "_variants_v" USING btree ("version_created_at");
  CREATE INDEX "_variants_v_version_version_deleted_at_idx" ON "_variants_v" USING btree ("version_deleted_at");
  CREATE INDEX "_variants_v_version_version__status_idx" ON "_variants_v" USING btree ("version__status");
  CREATE INDEX "_variants_v_created_at_idx" ON "_variants_v" USING btree ("created_at");
  CREATE INDEX "_variants_v_updated_at_idx" ON "_variants_v" USING btree ("updated_at");
  CREATE INDEX "_variants_v_snapshot_idx" ON "_variants_v" USING btree ("snapshot");
  CREATE INDEX "_variants_v_published_locale_idx" ON "_variants_v" USING btree ("published_locale");
  CREATE INDEX "_variants_v_latest_idx" ON "_variants_v" USING btree ("latest");
  CREATE INDEX "_variants_v_autosave_idx" ON "_variants_v" USING btree ("autosave");
  CREATE INDEX "_variants_v_rels_order_idx" ON "_variants_v_rels" USING btree ("order");
  CREATE INDEX "_variants_v_rels_parent_idx" ON "_variants_v_rels" USING btree ("parent_id");
  CREATE INDEX "_variants_v_rels_path_idx" ON "_variants_v_rels" USING btree ("path");
  CREATE INDEX "_variants_v_rels_variant_options_id_idx" ON "_variants_v_rels" USING btree ("variant_options_id");
  CREATE INDEX "variant_types_updated_at_idx" ON "variant_types" USING btree ("updated_at");
  CREATE INDEX "variant_types_created_at_idx" ON "variant_types" USING btree ("created_at");
  CREATE INDEX "variant_types_deleted_at_idx" ON "variant_types" USING btree ("deleted_at");
  CREATE INDEX "variant_options__variantoptions_options_order_idx" ON "variant_options" USING btree ("_variantoptions_options_order");
  CREATE INDEX "variant_options_variant_type_idx" ON "variant_options" USING btree ("variant_type_id");
  CREATE INDEX "variant_options_updated_at_idx" ON "variant_options" USING btree ("updated_at");
  CREATE INDEX "variant_options_created_at_idx" ON "variant_options" USING btree ("created_at");
  CREATE INDEX "variant_options_deleted_at_idx" ON "variant_options" USING btree ("deleted_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "public"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("variants_id");
  CREATE INDEX "payload_locked_documents_rels_variant_types_id_idx" ON "payload_locked_documents_rels" USING btree ("variant_types_id");
  CREATE INDEX "payload_locked_documents_rels_variant_options_id_idx" ON "payload_locked_documents_rels" USING btree ("variant_options_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  LOCK TABLE "public"."products",
    "public"."_products_v",
    "public"."payload_locked_documents_rels",
    "public"."member_wallets",
    "public"."products_rels",
    "public"."_products_v_rels",
    "public"."variants",
    "public"."variants_rels",
    "public"."_variants_v",
    "public"."_variants_v_rels",
    "public"."variant_types",
    "public"."variant_options"
    IN ACCESS EXCLUSIVE MODE;
  DO $data_rollback$
  BEGIN
    IF EXISTS (SELECT 1 FROM "public"."member_wallets") THEN
      RAISE EXCEPTION 'Refusing to drop recorded member wallets';
    END IF;
    IF EXISTS (SELECT 1 FROM "public"."products_rels")
      OR EXISTS (SELECT 1 FROM "public"."_products_v_rels")
      OR EXISTS (SELECT 1 FROM "public"."variants")
      OR EXISTS (SELECT 1 FROM "public"."variants_rels")
      OR EXISTS (SELECT 1 FROM "public"."_variants_v")
      OR EXISTS (SELECT 1 FROM "public"."_variants_v_rels")
      OR EXISTS (SELECT 1 FROM "public"."variant_types")
      OR EXISTS (SELECT 1 FROM "public"."variant_options")
      OR EXISTS (SELECT 1 FROM "public"."products"
        WHERE "commerce_model" = 'native-edition-v2' OR "enable_variants" IS TRUE)
      OR EXISTS (SELECT 1 FROM "public"."_products_v"
        WHERE "version_commerce_model" = 'native-edition-v2' OR "version_enable_variants" IS TRUE) THEN
      RAISE EXCEPTION 'Refusing to drop recorded native edition data';
    END IF;
  END;
  $data_rollback$;

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_variants_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_variant_types_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_variant_options_fk";
  DROP INDEX "payload_locked_documents_rels_variants_id_idx";
  DROP INDEX "payload_locked_documents_rels_variant_types_id_idx";
  DROP INDEX "payload_locked_documents_rels_variant_options_id_idx";

  DROP TABLE "member_wallets";
  DROP TABLE "products_rels";
  DROP TABLE "_products_v_rels";
  DROP TABLE "variants_rels";
  DROP TABLE "_variants_v_rels";
  DROP TABLE "_variants_v";
  DROP TABLE "variants";
  DROP TABLE "variant_options";
  DROP TABLE "variant_types";
  ALTER TABLE "products" DROP COLUMN "commerce_model";
  ALTER TABLE "products" DROP COLUMN "enable_variants";
  ALTER TABLE "_products_v" DROP COLUMN "version_commerce_model";
  ALTER TABLE "_products_v" DROP COLUMN "version_enable_variants";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "variants_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "variant_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "variant_options_id";
  DROP TYPE "public"."enum_member_wallets_status";
  DROP TYPE "public"."enum_products_commerce_model";
  DROP TYPE "public"."enum__products_v_version_commerce_model";
  DROP TYPE "public"."enum_variants_status";
  DROP TYPE "public"."enum__variants_v_version_status";
  DROP TYPE "public"."enum__variants_v_published_locale";`)
}
