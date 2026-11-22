import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'member-wallet-catch-up');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'member-wallet-catch-up');
  CREATE TABLE "member_wallet_catch_up" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "work_key" varchar NOT NULL,
    "configuration" varchar NOT NULL,
    "horizon" timestamp(3) with time zone NOT NULL,
    "cursor_created_at" timestamp(3) with time zone,
    "cursor_i_d" varchar,
    "cycle_complete" boolean DEFAULT false NOT NULL,
    "last_inspected" numeric NOT NULL,
    "last_moved" numeric NOT NULL,
    "last_conflicts" numeric NOT NULL,
    "last_completed_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_jobs_log" (
    "_order" integer NOT NULL,
    "_parent_id" uuid NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "executed_at" timestamp(3) with time zone NOT NULL,
    "completed_at" timestamp(3) with time zone NOT NULL,
    "task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
    "task_i_d" varchar NOT NULL,
    "input" jsonb,
    "output" jsonb,
    "state" "enum_payload_jobs_log_state" NOT NULL,
    "error" jsonb
  );

  CREATE TABLE "payload_jobs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "input" jsonb,
    "completed_at" timestamp(3) with time zone,
    "total_tried" numeric DEFAULT 0,
    "has_error" boolean DEFAULT false,
    "error" jsonb,
    "task_slug" "enum_payload_jobs_task_slug",
    "queue" varchar DEFAULT 'default',
    "wait_until" timestamp(3) with time zone,
    "processing" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "member_wallet_catch_up_work_key_idx" ON "member_wallet_catch_up" USING btree ("work_key");
  CREATE INDEX "member_wallet_catch_up_updated_at_idx" ON "member_wallet_catch_up" USING btree ("updated_at");
  CREATE INDEX "member_wallet_catch_up_created_at_idx" ON "member_wallet_catch_up" USING btree ("created_at");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "wallet_catch_up_cursor_idx" ON "commerce_key_grant_intents" USING btree ("state","recipient_mode","created_at","id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  LOCK TABLE "member_wallet_catch_up", "payload_jobs_log", "payload_jobs" IN ACCESS EXCLUSIVE MODE;
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM "member_wallet_catch_up")
      OR EXISTS (SELECT 1 FROM "payload_jobs_log")
      OR EXISTS (SELECT 1 FROM "payload_jobs") THEN
      RAISE EXCEPTION 'Wallet catch-up rollback refused: checkpoint or job history exists';
    END IF;
  END $$;
  DROP TABLE "payload_jobs_log";
  DROP TABLE "payload_jobs";
  DROP TABLE "member_wallet_catch_up";
  DROP INDEX "wallet_catch_up_cursor_idx";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
