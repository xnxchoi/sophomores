import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Additive ledger, separate from settlement so pre-dispatch debits cannot roll back with it. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "commerce_reconciliations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "scope" varchar NOT NULL,
      "state" jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX "commerce_reconciliations_scope_idx" ON "commerce_reconciliations" USING btree ("scope");
    CREATE INDEX "commerce_reconciliations_updated_at_idx" ON "commerce_reconciliations" USING btree ("updated_at");
    CREATE INDEX "commerce_reconciliations_created_at_idx" ON "commerce_reconciliations" USING btree ("created_at");
  `)
}

/** Financial accounting is never silently destroyed by rolling back application code. */
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Reconciliation ledger rollback requires a separate retention/recovery plan')
}
