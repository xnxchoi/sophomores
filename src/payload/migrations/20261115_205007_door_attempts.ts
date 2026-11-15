import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_commerce_door_attempts_method" AS ENUM('qr', 'name');
  CREATE TYPE "public"."enum_commerce_door_attempts_result" AS ENUM('admitted', 'already-checked-in', 'refused');
  CREATE TABLE "commerce_door_attempts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "operator_id" uuid NOT NULL,
    "event_id" uuid NOT NULL,
    "admission_id" uuid,
    "method" "enum_commerce_door_attempts_method" NOT NULL,
    "result" "enum_commerce_door_attempts_result" NOT NULL,
    "reason" varchar,
    "token_i_d" varchar,
    "attempted_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_door_attempts_id" uuid;
  ALTER TABLE "commerce_door_attempts" ADD CONSTRAINT "commerce_door_attempts_operator_id_admins_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_door_attempts" ADD CONSTRAINT "commerce_door_attempts_event_id_commerce_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."commerce_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commerce_door_attempts" ADD CONSTRAINT "commerce_door_attempts_admission_id_commerce_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."commerce_admissions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "commerce_door_attempts_operator_idx" ON "commerce_door_attempts" USING btree ("operator_id");
  CREATE INDEX "commerce_door_attempts_event_idx" ON "commerce_door_attempts" USING btree ("event_id");
  CREATE INDEX "commerce_door_attempts_admission_idx" ON "commerce_door_attempts" USING btree ("admission_id");
  CREATE INDEX "commerce_door_attempts_result_idx" ON "commerce_door_attempts" USING btree ("result");
  CREATE INDEX "commerce_door_attempts_updated_at_idx" ON "commerce_door_attempts" USING btree ("updated_at");
  CREATE INDEX "commerce_door_attempts_created_at_idx" ON "commerce_door_attempts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_door_attempts_fk" FOREIGN KEY ("commerce_door_attempts_id") REFERENCES "public"."commerce_door_attempts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_commerce_door_attempts_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_door_attempts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_commerce_door_attempts_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_commerce_door_attempts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "commerce_door_attempts_id";
  DROP TABLE IF EXISTS "commerce_door_attempts";
  DROP TYPE IF EXISTS "public"."enum_commerce_door_attempts_method";
  DROP TYPE IF EXISTS "public"."enum_commerce_door_attempts_result";`)
}
