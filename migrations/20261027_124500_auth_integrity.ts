import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Fix foreign key constraints on sessions, passkeys, and accounts to ON DELETE CASCADE
    ALTER TABLE "public"."sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk";
    ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

    ALTER TABLE "public"."passkeys" DROP CONSTRAINT IF EXISTS "passkeys_user_id_users_id_fk";
    ALTER TABLE "public"."passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

    ALTER TABLE "public"."accounts" DROP CONSTRAINT IF EXISTS "accounts_user_id_users_id_fk";
    ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

    -- 2. Add unique index on passkeys credential_id for high-efficiency WebAuthn lookup
    CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_credential_id_idx" ON "public"."passkeys" ("credential_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."passkeys_credential_id_idx";

    ALTER TABLE "public"."sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk";
    ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "public"."passkeys" DROP CONSTRAINT IF EXISTS "passkeys_user_id_users_id_fk";
    ALTER TABLE "public"."passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "public"."accounts" DROP CONSTRAINT IF EXISTS "accounts_user_id_users_id_fk";
    ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  `);
}
