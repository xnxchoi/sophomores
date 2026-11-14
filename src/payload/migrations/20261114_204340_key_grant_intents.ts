import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_commerce_key_grant_intents_recipient_mode" AS ENUM('member_safe', 'guest_email');
  CREATE TYPE "public"."enum_commerce_key_grant_intents_state" AS ENUM('awaiting_wallet', 'pending', 'submitted', 'granted', 'failed_retryable', 'ambiguous', 'cancelled');
  CREATE TABLE "commerce_key_grant_intents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"operation_key" varchar NOT NULL,
  	"order_id" uuid NOT NULL,
  	"payment_id" uuid NOT NULL,
  	"entitlement_id" uuid NOT NULL,
  	"beneficiary_user_id" uuid,
  	"recipient_mode" "enum_commerce_key_grant_intents_recipient_mode" NOT NULL,
  	"state" "enum_commerce_key_grant_intents_state" DEFAULT 'awaiting_wallet' NOT NULL,
  	"target" jsonb,
  	"tx_hash" varchar,
  	"token_i_d" varchar,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"attempt_i_d" varchar,
  	"dispatch_started_at" timestamp(3) with time zone,
  	"submitted_at" timestamp(3) with time zone,
  	"granted_at" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"cancel_requested" boolean DEFAULT false,
  	"last_error_code" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_key_grant_intents_id" uuid;
  ALTER TABLE "commerce_key_grant_intents" ADD CONSTRAINT "commerce_key_grant_intents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_key_grant_intents" ADD CONSTRAINT "commerce_key_grant_intents_payment_id_transactions_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_key_grant_intents" ADD CONSTRAINT "commerce_key_grant_intents_entitlement_id_commerce_admissions_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."commerce_admissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_key_grant_intents" ADD CONSTRAINT "commerce_key_grant_intents_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "commerce_key_grant_intents_operation_key_idx" ON "commerce_key_grant_intents" USING btree ("operation_key");
  CREATE INDEX "commerce_key_grant_intents_order_idx" ON "commerce_key_grant_intents" USING btree ("order_id");
  CREATE INDEX "commerce_key_grant_intents_payment_idx" ON "commerce_key_grant_intents" USING btree ("payment_id");
  CREATE UNIQUE INDEX "commerce_key_grant_intents_entitlement_idx" ON "commerce_key_grant_intents" USING btree ("entitlement_id");
  CREATE INDEX "commerce_key_grant_intents_beneficiary_user_idx" ON "commerce_key_grant_intents" USING btree ("beneficiary_user_id");
  CREATE INDEX "commerce_key_grant_intents_state_idx" ON "commerce_key_grant_intents" USING btree ("state");
  CREATE INDEX "commerce_key_grant_intents_updated_at_idx" ON "commerce_key_grant_intents" USING btree ("updated_at");
  CREATE INDEX "commerce_key_grant_intents_created_at_idx" ON "commerce_key_grant_intents" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_key_grant_intents_fk" FOREIGN KEY ("commerce_key_grant_intents_id") REFERENCES "public"."commerce_key_grant_intents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_commerce_key_grant_intents_idx" ON "payload_locked_documents_rels" USING btree ("commerce_key_grant_intents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "commerce_key_grant_intents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "commerce_key_grant_intents" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commerce_key_grant_intents_fk";
  
  DROP INDEX "payload_locked_documents_rels_commerce_key_grant_intents_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commerce_key_grant_intents_id";
  DROP TYPE "public"."enum_commerce_key_grant_intents_recipient_mode";
  DROP TYPE "public"."enum_commerce_key_grant_intents_state";`)
}
