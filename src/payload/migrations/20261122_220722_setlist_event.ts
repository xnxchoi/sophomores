import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "setlists" ADD COLUMN "event_id" uuid;
  ALTER TABLE "setlists" ADD CONSTRAINT "setlists_event_id_commerce_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."commerce_events"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "setlists_event_idx" ON "setlists" USING btree ("event_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "setlists" DROP CONSTRAINT "setlists_event_id_commerce_events_id_fk";
  
  DROP INDEX "setlists_event_idx";
  ALTER TABLE "setlists" DROP COLUMN "event_id";`)
}
