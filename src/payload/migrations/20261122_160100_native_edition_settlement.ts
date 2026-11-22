import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "commerce_reservations" ALTER COLUMN "event_id" DROP NOT NULL;
  ALTER TABLE "carts_items" ADD COLUMN "variant_id" uuid;
  ALTER TABLE "orders_items" ADD COLUMN "variant_id" uuid;
  ALTER TABLE "transactions_items" ADD COLUMN "variant_id" uuid;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions_items" ADD CONSTRAINT "transactions_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "carts_items_variant_idx" ON "carts_items" USING btree ("variant_id");
  CREATE INDEX "orders_items_variant_idx" ON "orders_items" USING btree ("variant_id");
  CREATE INDEX "transactions_items_variant_idx" ON "transactions_items" USING btree ("variant_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  LOCK TABLE "carts_items", "orders_items", "transactions_items", "commerce_reservations" IN ACCESS EXCLUSIVE MODE;
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM "carts_items" WHERE "variant_id" IS NOT NULL)
      OR EXISTS (SELECT 1 FROM "orders_items" WHERE "variant_id" IS NOT NULL)
      OR EXISTS (SELECT 1 FROM "transactions_items" WHERE "variant_id" IS NOT NULL)
      OR EXISTS (SELECT 1 FROM "commerce_reservations" WHERE "event_id" IS NULL) THEN
      RAISE EXCEPTION 'Edition settlement rollback refused: native purchase data exists';
    END IF;
  END $$;
  ALTER TABLE "carts_items" DROP CONSTRAINT "carts_items_variant_id_variants_id_fk";

  ALTER TABLE "orders_items" DROP CONSTRAINT "orders_items_variant_id_variants_id_fk";

  ALTER TABLE "transactions_items" DROP CONSTRAINT "transactions_items_variant_id_variants_id_fk";

  DROP INDEX "carts_items_variant_idx";
  DROP INDEX "orders_items_variant_idx";
  DROP INDEX "transactions_items_variant_idx";
  ALTER TABLE "commerce_reservations" ALTER COLUMN "event_id" SET NOT NULL;
  ALTER TABLE "carts_items" DROP COLUMN "variant_id";
  ALTER TABLE "orders_items" DROP COLUMN "variant_id";
  ALTER TABLE "transactions_items" DROP COLUMN "variant_id";`)
}
