import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_member_wallets_status" AS ENUM('pending', 'active');
  CREATE TYPE "public"."enum_member_wallets_credential_source" AS ENUM('sign_in_passkey', 'wallet_passkey');
  CREATE TYPE "public"."enum_member_wallet_challenges_purpose" AS ENUM('wallet-register', 'wallet-bind');
  CREATE TABLE "member_wallets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "member_id" uuid NOT NULL,
    "chain_i_d" numeric NOT NULL,
    "status" "enum_member_wallets_status" NOT NULL,
    "active_slot" varchar,
    "wallet_key" varchar NOT NULL,
    "credential_source" "enum_member_wallets_credential_source" NOT NULL,
    "sign_in_passkey" varchar,
    "credential_i_d" varchar NOT NULL,
    "public_key" varchar NOT NULL,
    "public_key_x" varchar NOT NULL,
    "public_key_y" varchar NOT NULL,
    "transports" jsonb,
    "rp_i_d" varchar NOT NULL,
    "origin" varchar NOT NULL,
    "counter" numeric DEFAULT 0 NOT NULL,
    "verifier_address" varchar NOT NULL,
    "owner_address" varchar NOT NULL,
    "safe_address" varchar NOT NULL,
    "proxy_factory_address" varchar NOT NULL,
    "singleton_address" varchar NOT NULL,
    "safe_version" varchar NOT NULL,
    "salt_nonce" varchar NOT NULL,
    "config_hash" varchar NOT NULL,
    "bound_at" timestamp(3) with time zone,
    "bind_challenge" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "member_wallet_challenges" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "member_id" uuid NOT NULL,
    "session_i_d" varchar NOT NULL,
    "purpose" "enum_member_wallet_challenges_purpose" NOT NULL,
    "challenge" varchar NOT NULL,
    "credential_i_d" varchar,
    "candidate" jsonb,
    "candidate_digest" varchar,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "consumed_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "member_wallets_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "member_wallet_challenges_id" uuid;
  ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "member_wallet_challenges" ADD CONSTRAINT "member_wallet_challenges_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "member_wallets_member_idx" ON "member_wallets" USING btree ("member_id");
  CREATE INDEX "member_wallets_status_idx" ON "member_wallets" USING btree ("status");
  CREATE UNIQUE INDEX "member_wallets_active_slot_idx" ON "member_wallets" USING btree ("active_slot");
  CREATE UNIQUE INDEX "member_wallets_wallet_key_idx" ON "member_wallets" USING btree ("wallet_key");
  CREATE INDEX "member_wallets_credential_i_d_idx" ON "member_wallets" USING btree ("credential_i_d");
  CREATE INDEX "member_wallets_updated_at_idx" ON "member_wallets" USING btree ("updated_at");
  CREATE INDEX "member_wallets_created_at_idx" ON "member_wallets" USING btree ("created_at");
  CREATE INDEX "member_wallet_challenges_member_idx" ON "member_wallet_challenges" USING btree ("member_id");
  CREATE UNIQUE INDEX "member_wallet_challenges_challenge_idx" ON "member_wallet_challenges" USING btree ("challenge");
  CREATE INDEX "member_wallet_challenges_expires_at_idx" ON "member_wallet_challenges" USING btree ("expires_at");
  CREATE INDEX "member_wallet_challenges_updated_at_idx" ON "member_wallet_challenges" USING btree ("updated_at");
  CREATE INDEX "member_wallet_challenges_created_at_idx" ON "member_wallet_challenges" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_member_wallets_fk" FOREIGN KEY ("member_wallets_id") REFERENCES "public"."member_wallets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_member_wallet_challenges_fk" FOREIGN KEY ("member_wallet_challenges_id") REFERENCES "public"."member_wallet_challenges"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_member_wallets_id_idx" ON "payload_locked_documents_rels" USING btree ("member_wallets_id");
  CREATE INDEX "payload_locked_documents_rels_member_wallet_challenges_i_idx" ON "payload_locked_documents_rels" USING btree ("member_wallet_challenges_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_member_wallets_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_member_wallet_challenges_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_member_wallets_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_member_wallet_challenges_i_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "member_wallets_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "member_wallet_challenges_id";
  ALTER TABLE "member_wallets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "member_wallet_challenges" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "member_wallets" CASCADE;
  DROP TABLE "member_wallet_challenges" CASCADE;
  DROP TYPE "public"."enum_member_wallets_status";
  DROP TYPE "public"."enum_member_wallets_credential_source";
  DROP TYPE "public"."enum_member_wallet_challenges_purpose";`)
}
