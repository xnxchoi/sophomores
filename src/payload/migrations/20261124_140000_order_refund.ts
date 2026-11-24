import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_commerce_refund_source" AS ENUM('provider', 'admin');
  ALTER TABLE "orders" ADD COLUMN "commerce_refund_refunded_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "commerce_refund_source" "enum_orders_commerce_refund_source";
  ALTER TABLE "orders" ADD COLUMN "commerce_refund_provider_event_i_d" varchar;
  ALTER TABLE "orders" ADD COLUMN "commerce_refund_transaction_i_d" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "commerce_refund_refunded_at";
  ALTER TABLE "orders" DROP COLUMN "commerce_refund_source";
  ALTER TABLE "orders" DROP COLUMN "commerce_refund_provider_event_i_d";
  ALTER TABLE "orders" DROP COLUMN "commerce_refund_transaction_i_d";
  DROP TYPE "public"."enum_orders_commerce_refund_source";`)
}
