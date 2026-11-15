import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "signer" varchar;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "nonce" numeric;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "sends" jsonb;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "last_sent_at" timestamp(3) with time zone;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "settled_tx_hash" varchar;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_attempt_i_d" varchar;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_started_at" timestamp(3) with time zone;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_signer" varchar;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_nonce" numeric;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_tx_hash" varchar;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_submitted_at" timestamp(3) with time zone;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_sends" jsonb;
  ALTER TABLE "commerce_key_grant_intents" ADD COLUMN "cancel_last_sent_at" timestamp(3) with time zone;
  CREATE INDEX "commerce_key_grant_intents_signer_idx" ON "commerce_key_grant_intents" USING btree ("signer");
  CREATE INDEX "commerce_key_grant_intents_last_sent_at_idx" ON "commerce_key_grant_intents" USING btree ("last_sent_at");
  CREATE INDEX "commerce_key_grant_intents_cancel_signer_idx" ON "commerce_key_grant_intents" USING btree ("cancel_signer");
  CREATE INDEX "commerce_key_grant_intents_cancel_last_sent_at_idx" ON "commerce_key_grant_intents" USING btree ("cancel_last_sent_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "commerce_key_grant_intents_signer_idx";
  DROP INDEX "commerce_key_grant_intents_last_sent_at_idx";
  DROP INDEX "commerce_key_grant_intents_cancel_signer_idx";
  DROP INDEX "commerce_key_grant_intents_cancel_last_sent_at_idx";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "signer";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "nonce";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "sends";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "last_sent_at";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "settled_tx_hash";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_attempt_i_d";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_started_at";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_signer";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_nonce";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_tx_hash";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_submitted_at";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_sends";
  ALTER TABLE "commerce_key_grant_intents" DROP COLUMN "cancel_last_sent_at";`)
}
