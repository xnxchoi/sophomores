import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "business_info" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "trade_name" varchar,
    "representative" varchar,
    "business_address" varchar,
    "business_registration_number" varchar,
    "mail_order_registration" varchar,
    "customer_service_phone" varchar,
    "customer_service_email" varchar,
    "terms" jsonb,
    "privacy" jsonb,
    "refund" jsonb,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "business_info" CASCADE;`)
}
