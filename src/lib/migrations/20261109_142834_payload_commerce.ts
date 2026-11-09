import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_addresses_country" AS ENUM('US', 'GB', 'CA', 'AU', 'AT', 'BE', 'BR', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HK', 'HU', 'IN', 'IE', 'IT', 'JP', 'LV', 'LT', 'LU', 'MY', 'MT', 'MX', 'NL', 'NZ', 'NO', 'PL', 'PT', 'RO', 'SG', 'SK', 'SI', 'ES', 'SE', 'CH');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_published_locale" AS ENUM('en', 'ko');
  CREATE TYPE "public"."enum_carts_currency" AS ENUM('KRW');
  CREATE TYPE "public"."enum_orders_commerce_version" AS ENUM('legacy', 'commerce-v1');
  CREATE TYPE "public"."enum_orders_fulfillment_status" AS ENUM('pending', 'packed', 'shipped', 'delivered', 'return-requested', 'returned');
  CREATE TYPE "public"."enum_orders_fulfillment_return_disposition" AS ENUM('pending-inspection', 'restock', 'do-not-restock');
  CREATE TYPE "public"."enum_transactions_payment_method" AS ENUM('portone');
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'expired', 'refunded');
  CREATE TYPE "public"."enum_transactions_currency" AS ENUM('KRW');
  CREATE TYPE "public"."enum_commerce_reservations_state" AS ENUM('reserved', 'settled', 'released');
  CREATE TYPE "public"."enum_commerce_reservations_release_reason" AS ENUM('confirmed-cancel', 'accepted-return', 'verified-failure');
  CREATE TYPE "public"."enum_commerce_admissions_status" AS ENUM('available', 'claimed', 'checked-in', 'revoked');
  CREATE TYPE "public"."enum_commerce_admissions_stock_disposition" AS ENUM('pending-inspection', 'restock', 'do-not-restock');
  CREATE TYPE "public"."enum_commerce_redemptions_kind" AS ENUM('part-i-drink', 'shared-transfer');
  CREATE TYPE "public"."enum_commerce_publication_shipping_countries" AS ENUM('KR');
  CREATE TYPE "public"."enum_commerce_publication_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__commerce_publication_v_version_shipping_countries" AS ENUM('KR');
  CREATE TYPE "public"."enum__commerce_publication_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__commerce_publication_v_published_locale" AS ENUM('en', 'ko');
  CREATE TABLE "addresses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "customer_id" uuid,
    "title" varchar,
    "first_name" varchar,
    "last_name" varchar,
    "company" varchar,
    "address_line1" varchar,
    "address_line2" varchar,
    "city" varchar,
    "state" varchar,
    "postal_code" varchar,
    "country" "enum_addresses_country" NOT NULL,
    "phone" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "products_images" (
    "_order" integer NOT NULL,
    "_parent_id" uuid NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "image_id" uuid
  );

  CREATE TABLE "products" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "inventory" numeric DEFAULT 0,
    "price_in_k_r_w_enabled" boolean,
    "price_in_k_r_w" numeric,
    "title" varchar,
    "description" varchar,
    "event_id" uuid,
    "sale_starts_at" timestamp(3) with time zone,
    "sale_ends_at" timestamp(3) with time zone,
    "dispatch_schedule" varchar,
    "shipping_fee_k_r_w" numeric,
    "publication_approved" boolean DEFAULT false,
    "reserved_quantity" numeric DEFAULT 0,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "deleted_at" timestamp(3) with time zone,
    "_status" "enum_products_status" DEFAULT 'draft'
  );

  CREATE TABLE "_products_v_version_images" (
    "_order" integer NOT NULL,
    "_parent_id" uuid NOT NULL,
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "image_id" uuid,
    "_uuid" varchar
  );

  CREATE TABLE "_products_v" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "parent_id" uuid,
    "version_inventory" numeric DEFAULT 0,
    "version_price_in_k_r_w_enabled" boolean,
    "version_price_in_k_r_w" numeric,
    "version_title" varchar,
    "version_description" varchar,
    "version_event_id" uuid,
    "version_sale_starts_at" timestamp(3) with time zone,
    "version_sale_ends_at" timestamp(3) with time zone,
    "version_dispatch_schedule" varchar,
    "version_shipping_fee_k_r_w" numeric,
    "version_publication_approved" boolean DEFAULT false,
    "version_reserved_quantity" numeric DEFAULT 0,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version_deleted_at" timestamp(3) with time zone,
    "version__status" "enum__products_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "snapshot" boolean,
    "published_locale" "enum__products_v_published_locale",
    "latest" boolean,
    "autosave" boolean
  );

  CREATE TABLE "carts_items" (
    "_order" integer NOT NULL,
    "_parent_id" uuid NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "product_id" uuid,
    "quantity" numeric DEFAULT 1 NOT NULL
  );

  CREATE TABLE "carts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "secret" varchar,
    "customer_id" uuid,
    "purchased_at" timestamp(3) with time zone,
    "subtotal" numeric,
    "currency" "enum_carts_currency" DEFAULT 'KRW',
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "orders_items" (
    "_order" integer NOT NULL,
    "_parent_id" uuid NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "product_id" uuid,
    "quantity" numeric DEFAULT 1 NOT NULL
  );

  CREATE TABLE "orders_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" uuid NOT NULL,
    "path" varchar NOT NULL,
    "transactions_id" uuid
  );

  CREATE TABLE "transactions_items" (
    "_order" integer NOT NULL,
    "_parent_id" uuid NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "product_id" uuid,
    "quantity" numeric DEFAULT 1 NOT NULL
  );

  CREATE TABLE "transactions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "payment_method" "enum_transactions_payment_method",
    "portone_payment_i_d" varchar NOT NULL,
    "portone_prepare_key" varchar NOT NULL,
    "portone_snapshot" jsonb NOT NULL,
    "portone_snapshot_hash" varchar NOT NULL,
    "portone_store_i_d" varchar NOT NULL,
    "portone_channel_key" varchar NOT NULL,
    "billing_address_title" varchar,
    "billing_address_first_name" varchar,
    "billing_address_last_name" varchar,
    "billing_address_company" varchar,
    "billing_address_address_line1" varchar,
    "billing_address_address_line2" varchar,
    "billing_address_city" varchar,
    "billing_address_state" varchar,
    "billing_address_postal_code" varchar,
    "billing_address_country" varchar,
    "billing_address_phone" varchar,
    "status" "enum_transactions_status" DEFAULT 'pending' NOT NULL,
    "customer_id" uuid,
    "customer_email" varchar,
    "order_id" uuid,
    "cart_id" uuid,
    "amount" numeric,
    "currency" "enum_transactions_currency" DEFAULT 'KRW',
    "commerce_review_hold" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "commerce_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar NOT NULL,
    "publication_approved" boolean DEFAULT false,
    "capacity" numeric NOT NULL,
    "transport_capacity" numeric NOT NULL,
    "part_i_starts_at" timestamp(3) with time zone NOT NULL,
    "part_i_ends_at" timestamp(3) with time zone NOT NULL,
    "claim_cutoff_at" timestamp(3) with time zone NOT NULL,
    "reserved_quantity" numeric DEFAULT 0 NOT NULL,
    "committed_quantity" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "commerce_reservations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "attempt_i_d" varchar NOT NULL,
    "customer_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "event_id" uuid NOT NULL,
    "release_i_d" varchar NOT NULL,
    "quantity" numeric NOT NULL,
    "snapshot_hash" varchar NOT NULL,
    "state" "enum_commerce_reservations_state" NOT NULL,
    "order_id" uuid,
    "release_reason" "enum_commerce_reservations_release_reason",
    "provider_event_i_d" varchar,
    "returned_units" jsonb DEFAULT '[]'::jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "commerce_allowances" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "account_release_key" varchar NOT NULL,
    "customer_id" uuid NOT NULL,
    "release_i_d" varchar NOT NULL,
    "reserved_quantity" numeric DEFAULT 0 NOT NULL,
    "paid_quantity" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "commerce_admissions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "order_unit_key" varchar NOT NULL,
    "order_id" uuid NOT NULL,
    "transaction_id" uuid NOT NULL,
    "event_id" uuid NOT NULL,
    "buyer_id" uuid NOT NULL,
    "unit" numeric NOT NULL,
    "guest_name" varchar,
    "claimed_account_id" uuid,
    "event_account_key" varchar,
    "status" "enum_commerce_admissions_status" NOT NULL,
    "checked_in_at" timestamp(3) with time zone,
    "benefit_review" boolean DEFAULT false,
    "benefit_hold_evidence" varchar,
    "benefit_hold_reason" varchar,
    "return_accepted_at" timestamp(3) with time zone,
    "return_evidence" varchar,
    "return_accepted_by_id" uuid,
    "return_review_approved" boolean DEFAULT false,
    "stock_disposition" "enum_commerce_admissions_stock_disposition",
    "stock_disposition_by_id" uuid,
    "stock_disposed_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "commerce_claims" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "admission_id" uuid NOT NULL,
    "token_digest" varchar NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "consumed_at" timestamp(3) with time zone,
    "revoked_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "commerce_redemptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "redemption_key" varchar NOT NULL,
    "admission_id" uuid NOT NULL,
    "operator_id" uuid NOT NULL,
    "kind" "enum_commerce_redemptions_kind" NOT NULL,
    "ordinal" numeric NOT NULL,
    "redeemed_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "commerce_publication_shipping_countries" (
    "order" integer NOT NULL,
    "parent_id" uuid NOT NULL,
    "value" "enum_commerce_publication_shipping_countries",
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );

  CREATE TABLE "commerce_publication" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "publication_approved" boolean DEFAULT false,
    "physical_product_approved" boolean DEFAULT false,
    "fulfillment_ready" boolean DEFAULT false,
    "address_retention_approved" boolean DEFAULT false,
    "disclosure" jsonb,
    "_status" "enum_commerce_publication_status" DEFAULT 'draft',
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  CREATE TABLE "_commerce_publication_v_version_shipping_countries" (
    "order" integer NOT NULL,
    "parent_id" uuid NOT NULL,
    "value" "enum__commerce_publication_v_version_shipping_countries",
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );

  CREATE TABLE "_commerce_publication_v" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "version_publication_approved" boolean DEFAULT false,
    "version_physical_product_approved" boolean DEFAULT false,
    "version_fulfillment_ready" boolean DEFAULT false,
    "version_address_retention_approved" boolean DEFAULT false,
    "version_disclosure" jsonb,
    "version__status" "enum__commerce_publication_v_version_status" DEFAULT 'draft',
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "snapshot" boolean,
    "published_locale" "enum__commerce_publication_v_published_locale",
    "latest" boolean
  );

  ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;
  DROP TYPE "public"."enum_orders_status";
  CREATE TYPE "public"."enum_orders_status" AS ENUM('processing', 'completed', 'cancelled', 'refunded', 'pending', 'paid', 'held');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "ticket_quantity" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "total_amount" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "currency" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "status" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "payment_provider" DROP NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_title" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_first_name" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_last_name" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_company" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_address_line1" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_address_line2" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_city" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_state" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_postal_code" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_country" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_address_phone" varchar;
  ALTER TABLE "orders" ADD COLUMN "customer_id" uuid;
  ALTER TABLE "orders" ADD COLUMN "customer_email" varchar;
  ALTER TABLE "orders" ADD COLUMN "amount" numeric;
  ALTER TABLE "orders" ADD COLUMN "commerce_version" "enum_orders_commerce_version" DEFAULT 'legacy' NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "commerce_attempt_i_d" varchar;
  ALTER TABLE "orders" ADD COLUMN "commerce_snapshot" jsonb;
  ALTER TABLE "orders" ADD COLUMN "fulfillment_status" "enum_orders_fulfillment_status" DEFAULT 'pending';
  ALTER TABLE "orders" ADD COLUMN "fulfillment_carrier" varchar;
  ALTER TABLE "orders" ADD COLUMN "fulfillment_tracking_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "fulfillment_shipped_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "fulfillment_delivered_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "fulfillment_return_disposition" "enum_orders_fulfillment_return_disposition";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "addresses_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "products_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "carts_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "transactions_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_events_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_reservations_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_allowances_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_admissions_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_claims_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_redemptions_id" uuid;
  ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_event_id_commerce_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."commerce_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_images" ADD CONSTRAINT "_products_v_version_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_images" ADD CONSTRAINT "_products_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_event_id_commerce_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."commerce_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transactions_items" ADD CONSTRAINT "transactions_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions_items" ADD CONSTRAINT "transactions_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_reservations" ADD CONSTRAINT "commerce_reservations_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_reservations" ADD CONSTRAINT "commerce_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_reservations" ADD CONSTRAINT "commerce_reservations_event_id_commerce_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."commerce_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_reservations" ADD CONSTRAINT "commerce_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_allowances" ADD CONSTRAINT "commerce_allowances_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_event_id_commerce_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."commerce_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_claimed_account_id_users_id_fk" FOREIGN KEY ("claimed_account_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_return_accepted_by_id_admins_id_fk" FOREIGN KEY ("return_accepted_by_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_stock_disposition_by_id_admins_id_fk" FOREIGN KEY ("stock_disposition_by_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_claims" ADD CONSTRAINT "commerce_claims_admission_id_commerce_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."commerce_admissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_redemptions" ADD CONSTRAINT "commerce_redemptions_admission_id_commerce_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."commerce_admissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_redemptions" ADD CONSTRAINT "commerce_redemptions_operator_id_admins_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_publication_shipping_countries" ADD CONSTRAINT "commerce_publication_shipping_countries_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."commerce_publication"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_commerce_publication_v_version_shipping_countries" ADD CONSTRAINT "_commerce_publication_v_version_shipping_countries_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_commerce_publication_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "addresses_customer_idx" ON "addresses" USING btree ("customer_id");
  CREATE INDEX "addresses_updated_at_idx" ON "addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "addresses" USING btree ("created_at");
  CREATE INDEX "products_images_order_idx" ON "products_images" USING btree ("_order");
  CREATE INDEX "products_images_parent_id_idx" ON "products_images" USING btree ("_parent_id");
  CREATE INDEX "products_images_image_idx" ON "products_images" USING btree ("image_id");
  CREATE INDEX "products_event_idx" ON "products" USING btree ("event_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "_products_v_version_images_order_idx" ON "_products_v_version_images" USING btree ("_order");
  CREATE INDEX "_products_v_version_images_parent_id_idx" ON "_products_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_images_image_idx" ON "_products_v_version_images" USING btree ("image_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_event_idx" ON "_products_v" USING btree ("version_event_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version_deleted_at_idx" ON "_products_v" USING btree ("version_deleted_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_snapshot_idx" ON "_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "_products_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "_products_v" USING btree ("autosave");
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_secret_idx" ON "carts" USING btree ("secret");
  CREATE INDEX "carts_customer_idx" ON "carts" USING btree ("customer_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_rels_order_idx" ON "orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_transactions_id_idx" ON "orders_rels" USING btree ("transactions_id");
  CREATE INDEX "transactions_items_order_idx" ON "transactions_items" USING btree ("_order");
  CREATE INDEX "transactions_items_parent_id_idx" ON "transactions_items" USING btree ("_parent_id");
  CREATE INDEX "transactions_items_product_idx" ON "transactions_items" USING btree ("product_id");
  CREATE UNIQUE INDEX "transactions_portone_portone_payment_i_d_idx" ON "transactions" USING btree ("portone_payment_i_d");
  CREATE UNIQUE INDEX "transactions_portone_portone_prepare_key_idx" ON "transactions" USING btree ("portone_prepare_key");
  CREATE INDEX "transactions_customer_idx" ON "transactions" USING btree ("customer_id");
  CREATE INDEX "transactions_order_idx" ON "transactions" USING btree ("order_id");
  CREATE INDEX "transactions_cart_idx" ON "transactions" USING btree ("cart_id");
  CREATE INDEX "transactions_updated_at_idx" ON "transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");
  CREATE INDEX "commerce_events_updated_at_idx" ON "commerce_events" USING btree ("updated_at");
  CREATE INDEX "commerce_events_created_at_idx" ON "commerce_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "commerce_reservations_attempt_i_d_idx" ON "commerce_reservations" USING btree ("attempt_i_d");
  CREATE INDEX "commerce_reservations_customer_idx" ON "commerce_reservations" USING btree ("customer_id");
  CREATE INDEX "commerce_reservations_product_idx" ON "commerce_reservations" USING btree ("product_id");
  CREATE INDEX "commerce_reservations_event_idx" ON "commerce_reservations" USING btree ("event_id");
  CREATE INDEX "commerce_reservations_order_idx" ON "commerce_reservations" USING btree ("order_id");
  CREATE INDEX "commerce_reservations_updated_at_idx" ON "commerce_reservations" USING btree ("updated_at");
  CREATE INDEX "commerce_reservations_created_at_idx" ON "commerce_reservations" USING btree ("created_at");
  CREATE UNIQUE INDEX "commerce_allowances_account_release_key_idx" ON "commerce_allowances" USING btree ("account_release_key");
  CREATE INDEX "commerce_allowances_customer_idx" ON "commerce_allowances" USING btree ("customer_id");
  CREATE INDEX "commerce_allowances_updated_at_idx" ON "commerce_allowances" USING btree ("updated_at");
  CREATE INDEX "commerce_allowances_created_at_idx" ON "commerce_allowances" USING btree ("created_at");
  CREATE UNIQUE INDEX "commerce_admissions_order_unit_key_idx" ON "commerce_admissions" USING btree ("order_unit_key");
  CREATE INDEX "commerce_admissions_order_idx" ON "commerce_admissions" USING btree ("order_id");
  CREATE INDEX "commerce_admissions_transaction_idx" ON "commerce_admissions" USING btree ("transaction_id");
  CREATE INDEX "commerce_admissions_event_idx" ON "commerce_admissions" USING btree ("event_id");
  CREATE INDEX "commerce_admissions_buyer_idx" ON "commerce_admissions" USING btree ("buyer_id");
  CREATE INDEX "commerce_admissions_claimed_account_idx" ON "commerce_admissions" USING btree ("claimed_account_id");
  CREATE UNIQUE INDEX "commerce_admissions_event_account_key_idx" ON "commerce_admissions" USING btree ("event_account_key");
  CREATE INDEX "commerce_admissions_return_accepted_by_idx" ON "commerce_admissions" USING btree ("return_accepted_by_id");
  CREATE INDEX "commerce_admissions_stock_disposition_by_idx" ON "commerce_admissions" USING btree ("stock_disposition_by_id");
  CREATE INDEX "commerce_admissions_updated_at_idx" ON "commerce_admissions" USING btree ("updated_at");
  CREATE INDEX "commerce_admissions_created_at_idx" ON "commerce_admissions" USING btree ("created_at");
  CREATE INDEX "commerce_claims_admission_idx" ON "commerce_claims" USING btree ("admission_id");
  CREATE UNIQUE INDEX "commerce_claims_token_digest_idx" ON "commerce_claims" USING btree ("token_digest");
  CREATE INDEX "commerce_claims_updated_at_idx" ON "commerce_claims" USING btree ("updated_at");
  CREATE INDEX "commerce_claims_created_at_idx" ON "commerce_claims" USING btree ("created_at");
  CREATE UNIQUE INDEX "commerce_redemptions_redemption_key_idx" ON "commerce_redemptions" USING btree ("redemption_key");
  CREATE INDEX "commerce_redemptions_admission_idx" ON "commerce_redemptions" USING btree ("admission_id");
  CREATE INDEX "commerce_redemptions_operator_idx" ON "commerce_redemptions" USING btree ("operator_id");
  CREATE INDEX "commerce_redemptions_updated_at_idx" ON "commerce_redemptions" USING btree ("updated_at");
  CREATE INDEX "commerce_redemptions_created_at_idx" ON "commerce_redemptions" USING btree ("created_at");
  CREATE INDEX "commerce_publication_shipping_countries_order_idx" ON "commerce_publication_shipping_countries" USING btree ("order");
  CREATE INDEX "commerce_publication_shipping_countries_parent_idx" ON "commerce_publication_shipping_countries" USING btree ("parent_id");
  CREATE INDEX "commerce_publication__status_idx" ON "commerce_publication" USING btree ("_status");
  CREATE INDEX "_commerce_publication_v_version_shipping_countries_order_idx" ON "_commerce_publication_v_version_shipping_countries" USING btree ("order");
  CREATE INDEX "_commerce_publication_v_version_shipping_countries_parent_idx" ON "_commerce_publication_v_version_shipping_countries" USING btree ("parent_id");
  CREATE INDEX "_commerce_publication_v_version_version__status_idx" ON "_commerce_publication_v" USING btree ("version__status");
  CREATE INDEX "_commerce_publication_v_created_at_idx" ON "_commerce_publication_v" USING btree ("created_at");
  CREATE INDEX "_commerce_publication_v_updated_at_idx" ON "_commerce_publication_v" USING btree ("updated_at");
  CREATE INDEX "_commerce_publication_v_snapshot_idx" ON "_commerce_publication_v" USING btree ("snapshot");
  CREATE INDEX "_commerce_publication_v_published_locale_idx" ON "_commerce_publication_v" USING btree ("published_locale");
  CREATE INDEX "_commerce_publication_v_latest_idx" ON "_commerce_publication_v" USING btree ("latest");
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_events_fk" FOREIGN KEY ("commerce_events_id") REFERENCES "public"."commerce_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_reservations_fk" FOREIGN KEY ("commerce_reservations_id") REFERENCES "public"."commerce_reservations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_allowances_fk" FOREIGN KEY ("commerce_allowances_id") REFERENCES "public"."commerce_allowances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_admissions_fk" FOREIGN KEY ("commerce_admissions_id") REFERENCES "public"."commerce_admissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_claims_fk" FOREIGN KEY ("commerce_claims_id") REFERENCES "public"."commerce_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_redemptions_fk" FOREIGN KEY ("commerce_redemptions_id") REFERENCES "public"."commerce_redemptions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_commerce_attempt_i_d_idx" ON "orders" USING btree ("commerce_attempt_i_d");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_locked_documents_rels_commerce_events_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_events_id");
  CREATE INDEX "payload_locked_documents_rels_commerce_reservations_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_reservations_id");
  CREATE INDEX "payload_locked_documents_rels_commerce_allowances_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_allowances_id");
  CREATE INDEX "payload_locked_documents_rels_commerce_admissions_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_admissions_id");
  CREATE INDEX "payload_locked_documents_rels_commerce_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_claims_id");
  CREATE INDEX "payload_locked_documents_rels_commerce_redemptions_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_redemptions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "addresses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "transactions_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "transactions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_reservations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_allowances" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_admissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_redemptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_publication_shipping_countries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_publication" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_commerce_publication_v_version_shipping_countries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_commerce_publication_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "addresses" CASCADE;
  DROP TABLE "products_images" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "_products_v_version_images" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "carts_items" CASCADE;
  DROP TABLE "carts" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders_rels" CASCADE;
  DROP TABLE "transactions_items" CASCADE;
  DROP TABLE "transactions" CASCADE;
  DROP TABLE "commerce_events" CASCADE;
  DROP TABLE "commerce_reservations" CASCADE;
  DROP TABLE "commerce_allowances" CASCADE;
  DROP TABLE "commerce_admissions" CASCADE;
  DROP TABLE "commerce_claims" CASCADE;
  DROP TABLE "commerce_redemptions" CASCADE;
  DROP TABLE "commerce_publication_shipping_countries" CASCADE;
  DROP TABLE "commerce_publication" CASCADE;
  DROP TABLE "_commerce_publication_v_version_shipping_countries" CASCADE;
  DROP TABLE "_commerce_publication_v" CASCADE;
  ALTER TABLE "orders" DROP CONSTRAINT "orders_customer_id_users_id_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_addresses_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_products_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_carts_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_transactions_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commerce_events_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commerce_reservations_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commerce_allowances_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commerce_admissions_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commerce_claims_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commerce_redemptions_fk";

  ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;
  DROP TYPE "public"."enum_orders_status";
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'cancelled', 'refunded', 'held');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_orders_status";
  DROP INDEX "orders_customer_idx";
  DROP INDEX "orders_commerce_attempt_i_d_idx";
  DROP INDEX "payload_locked_documents_rels_addresses_id_idx";
  DROP INDEX "payload_locked_documents_rels_products_id_idx";
  DROP INDEX "payload_locked_documents_rels_carts_id_idx";
  DROP INDEX "payload_locked_documents_rels_transactions_id_idx";
  DROP INDEX "payload_locked_documents_rels_commerce_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_commerce_reservations_id_idx";
  DROP INDEX "payload_locked_documents_rels_commerce_allowances_id_idx";
  DROP INDEX "payload_locked_documents_rels_commerce_admissions_id_idx";
  DROP INDEX "payload_locked_documents_rels_commerce_claims_id_idx";
  DROP INDEX "payload_locked_documents_rels_commerce_redemptions_id_idx";
  ALTER TABLE "orders" ALTER COLUMN "status" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "currency" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "user_id" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "ticket_quantity" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "total_amount" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "payment_provider" SET NOT NULL;
  ALTER TABLE "orders" DROP COLUMN "shipping_address_title";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_first_name";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_last_name";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_company";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_address_line1";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_address_line2";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_city";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_state";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_postal_code";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_country";
  ALTER TABLE "orders" DROP COLUMN "shipping_address_phone";
  ALTER TABLE "orders" DROP COLUMN "customer_id";
  ALTER TABLE "orders" DROP COLUMN "customer_email";
  ALTER TABLE "orders" DROP COLUMN "amount";
  ALTER TABLE "orders" DROP COLUMN "commerce_version";
  ALTER TABLE "orders" DROP COLUMN "commerce_attempt_i_d";
  ALTER TABLE "orders" DROP COLUMN "commerce_snapshot";
  ALTER TABLE "orders" DROP COLUMN "fulfillment_status";
  ALTER TABLE "orders" DROP COLUMN "fulfillment_carrier";
  ALTER TABLE "orders" DROP COLUMN "fulfillment_tracking_number";
  ALTER TABLE "orders" DROP COLUMN "fulfillment_shipped_at";
  ALTER TABLE "orders" DROP COLUMN "fulfillment_delivered_at";
  ALTER TABLE "orders" DROP COLUMN "fulfillment_return_disposition";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "addresses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "products_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "carts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "transactions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commerce_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commerce_reservations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commerce_allowances_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commerce_admissions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commerce_claims_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commerce_redemptions_id";
  DROP TYPE "public"."enum_addresses_country";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum__products_v_published_locale";
  DROP TYPE "public"."enum_carts_currency";
  DROP TYPE "public"."enum_orders_commerce_version";
  DROP TYPE "public"."enum_orders_fulfillment_status";
  DROP TYPE "public"."enum_orders_fulfillment_return_disposition";
  DROP TYPE "public"."enum_transactions_payment_method";
  DROP TYPE "public"."enum_transactions_status";
  DROP TYPE "public"."enum_transactions_currency";
  DROP TYPE "public"."enum_commerce_reservations_state";
  DROP TYPE "public"."enum_commerce_reservations_release_reason";
  DROP TYPE "public"."enum_commerce_admissions_status";
  DROP TYPE "public"."enum_commerce_admissions_stock_disposition";
  DROP TYPE "public"."enum_commerce_redemptions_kind";
  DROP TYPE "public"."enum_commerce_publication_shipping_countries";
  DROP TYPE "public"."enum_commerce_publication_status";
  DROP TYPE "public"."enum__commerce_publication_v_version_shipping_countries";
  DROP TYPE "public"."enum__commerce_publication_v_version_status";
  DROP TYPE "public"."enum__commerce_publication_v_published_locale";`)
}
