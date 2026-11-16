import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_member_wallets_status" AS ENUM('active');
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

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "member_wallets_id" uuid;
  ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "member_wallets_member_idx" ON "member_wallets" USING btree ("member_id");
  CREATE INDEX "member_wallets_status_idx" ON "member_wallets" USING btree ("status");
  CREATE UNIQUE INDEX "member_wallets_active_slot_idx" ON "member_wallets" USING btree ("active_slot");
  CREATE UNIQUE INDEX "member_wallets_wallet_key_idx" ON "member_wallets" USING btree ("wallet_key");
  CREATE INDEX "member_wallets_updated_at_idx" ON "member_wallets" USING btree ("updated_at");
  CREATE INDEX "member_wallets_created_at_idx" ON "member_wallets" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_member_wallets_fk" FOREIGN KEY ("member_wallets_id") REFERENCES "public"."member_wallets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_member_wallets_id_idx" ON "payload_locked_documents_rels" USING btree ("member_wallets_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_member_wallets_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_member_wallets_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "member_wallets_id";
  ALTER TABLE "member_wallets" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "member_wallets" CASCADE;
  DROP TYPE "public"."enum_member_wallets_status";`)
}
