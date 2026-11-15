import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_product_kind" AS ENUM('membership', 'guest_invite');
  CREATE TYPE "public"."enum__products_v_version_product_kind" AS ENUM('membership', 'guest_invite');
  CREATE TYPE "public"."enum_commerce_guest_invites_payer" AS ENUM('member', 'guest');
  CREATE TYPE "public"."enum_commerce_guest_invites_state" AS ENUM('pending_payment', 'paid', 'lapsed', 'used', 'refunded');
  CREATE TYPE "public"."enum_commerce_guest_invites_member_notice" AS ENUM('lapsed');
  CREATE TABLE "commerce_guest_invites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "inviter_id" uuid NOT NULL,
    "event_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "payer" "enum_commerce_guest_invites_payer" DEFAULT 'member' NOT NULL,
    "guest_name" varchar NOT NULL,
    "guest_email" varchar NOT NULL,
    "state" "enum_commerce_guest_invites_state" DEFAULT 'pending_payment' NOT NULL,
    "active_key" varchar,
    "hold_expires_at" timestamp(3) with time zone NOT NULL,
    "hold_released_at" timestamp(3) with time zone,
    "order_id" uuid,
    "transaction_id" uuid,
    "admission_id" uuid,
    "paid_at" timestamp(3) with time zone,
    "lapsed_at" timestamp(3) with time zone,
    "used_at" timestamp(3) with time zone,
    "refunded_at" timestamp(3) with time zone,
    "member_notice" "enum_commerce_guest_invites_member_notice",
    "member_notified_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "products" ADD COLUMN "product_kind" "enum_products_product_kind" DEFAULT 'membership';
  ALTER TABLE "_products_v" ADD COLUMN "version_product_kind" "enum__products_v_version_product_kind" DEFAULT 'membership';
  ALTER TABLE "commerce_reservations" ADD COLUMN "guest_invite_id" uuid;
  ALTER TABLE "commerce_admissions" ADD COLUMN "guest_invite_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_guest_invites_id" uuid;
  ALTER TABLE "commerce_guest_invites" ADD CONSTRAINT "commerce_guest_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_guest_invites" ADD CONSTRAINT "commerce_guest_invites_event_id_commerce_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."commerce_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_guest_invites" ADD CONSTRAINT "commerce_guest_invites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_guest_invites" ADD CONSTRAINT "commerce_guest_invites_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_guest_invites" ADD CONSTRAINT "commerce_guest_invites_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_guest_invites" ADD CONSTRAINT "commerce_guest_invites_admission_id_commerce_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."commerce_admissions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "commerce_guest_invites_inviter_idx" ON "commerce_guest_invites" USING btree ("inviter_id");
  CREATE INDEX "commerce_guest_invites_event_idx" ON "commerce_guest_invites" USING btree ("event_id");
  CREATE INDEX "commerce_guest_invites_product_idx" ON "commerce_guest_invites" USING btree ("product_id");
  CREATE INDEX "commerce_guest_invites_state_idx" ON "commerce_guest_invites" USING btree ("state");
  CREATE UNIQUE INDEX "commerce_guest_invites_active_key_idx" ON "commerce_guest_invites" USING btree ("active_key");
  CREATE INDEX "commerce_guest_invites_hold_expires_at_idx" ON "commerce_guest_invites" USING btree ("hold_expires_at");
  CREATE INDEX "commerce_guest_invites_order_idx" ON "commerce_guest_invites" USING btree ("order_id");
  CREATE INDEX "commerce_guest_invites_transaction_idx" ON "commerce_guest_invites" USING btree ("transaction_id");
  CREATE UNIQUE INDEX "commerce_guest_invites_admission_idx" ON "commerce_guest_invites" USING btree ("admission_id");
  CREATE INDEX "commerce_guest_invites_member_notice_idx" ON "commerce_guest_invites" USING btree ("member_notice");
  CREATE INDEX "commerce_guest_invites_updated_at_idx" ON "commerce_guest_invites" USING btree ("updated_at");
  CREATE INDEX "commerce_guest_invites_created_at_idx" ON "commerce_guest_invites" USING btree ("created_at");
  ALTER TABLE "commerce_reservations" ADD CONSTRAINT "commerce_reservations_guest_invite_id_commerce_guest_invites_id_fk" FOREIGN KEY ("guest_invite_id") REFERENCES "public"."commerce_guest_invites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_admissions" ADD CONSTRAINT "commerce_admissions_guest_invite_id_commerce_guest_invites_id_fk" FOREIGN KEY ("guest_invite_id") REFERENCES "public"."commerce_guest_invites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_guest_invites_fk" FOREIGN KEY ("commerce_guest_invites_id") REFERENCES "public"."commerce_guest_invites"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "commerce_reservations_guest_invite_idx" ON "commerce_reservations" USING btree ("guest_invite_id");
  CREATE INDEX "commerce_admissions_guest_invite_idx" ON "commerce_admissions" USING btree ("guest_invite_id");
  CREATE INDEX "payload_locked_documents_rels_commerce_guest_invites_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_guest_invites_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Dependent constraints and indexes first: DROP TABLE ... CASCADE would remove
  // the foreign keys and make a later DROP CONSTRAINT fail.
  await db.execute(sql`
   ALTER TABLE "commerce_reservations" DROP CONSTRAINT IF EXISTS "commerce_reservations_guest_invite_id_commerce_guest_invites_id_fk";
  ALTER TABLE "commerce_admissions" DROP CONSTRAINT IF EXISTS "commerce_admissions_guest_invite_id_commerce_guest_invites_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_commerce_guest_invites_fk";
  DROP INDEX IF EXISTS "commerce_reservations_guest_invite_idx";
  DROP INDEX IF EXISTS "commerce_admissions_guest_invite_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_commerce_guest_invites_id_idx";
  ALTER TABLE "commerce_reservations" DROP COLUMN IF EXISTS "guest_invite_id";
  ALTER TABLE "commerce_admissions" DROP COLUMN IF EXISTS "guest_invite_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "commerce_guest_invites_id";
  ALTER TABLE "commerce_guest_invites" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "commerce_guest_invites" CASCADE;
  ALTER TABLE "products" DROP COLUMN "product_kind";
  ALTER TABLE "_products_v" DROP COLUMN "version_product_kind";
  DROP TYPE "public"."enum_products_product_kind";
  DROP TYPE "public"."enum__products_v_version_product_kind";
  DROP TYPE "public"."enum_commerce_guest_invites_payer";
  DROP TYPE "public"."enum_commerce_guest_invites_state";
  DROP TYPE "public"."enum_commerce_guest_invites_member_notice";`)
}
