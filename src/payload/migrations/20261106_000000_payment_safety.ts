import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

// Additive storage only: legacy rows retain NULL retry identity.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
ALTER TYPE public.enum_orders_status ADD VALUE 'held';
ALTER TABLE public.orders ADD COLUMN prepare_key varchar;
ALTER TABLE public.orders ADD COLUMN prepare_fingerprint varchar;
CREATE UNIQUE INDEX orders_prepare_key_idx ON public.orders (prepare_key);
`);
}

// Payload runs each migration in a transaction. Lock first so a concurrent
// preparation or hold cannot appear between the evidence check and removal.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE status = 'held' OR prepare_key IS NOT NULL OR prepare_fingerprint IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Payment safety rollback refused: durable retry or held-order evidence exists';
  END IF;
END $$;
ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.orders ALTER COLUMN status TYPE text USING status::text;
DROP TYPE public.enum_orders_status;
CREATE TYPE public.enum_orders_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
ALTER TABLE public.orders ALTER COLUMN status TYPE public.enum_orders_status USING status::public.enum_orders_status;
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending';
DROP INDEX public.orders_prepare_key_idx;
ALTER TABLE public.orders DROP COLUMN prepare_fingerprint;
ALTER TABLE public.orders DROP COLUMN prepare_key;
`);
}
