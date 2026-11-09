import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_role" ADD VALUE 'staff' BEFORE 'user';
  ALTER TYPE "public"."enum_users_membership_status" ADD VALUE 'staff' BEFORE 'waitlist';
  ALTER TYPE "public"."enum_admin_invitations_role" ADD VALUE 'staff' BEFORE 'user';
  CREATE TABLE "rate_limit" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric NOT NULL,
  	"last_request" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "admins_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "admins_sessions" CASCADE;
  ALTER TABLE "home_page" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "home_page" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "home_page" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "home_page" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rate_limit_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "home_page_id" uuid;
  ALTER TABLE "home_page" ADD COLUMN "name" varchar DEFAULT 'Homepage Narrative Copy';
  ALTER TABLE "home_page" ADD COLUMN "is_fallback" boolean DEFAULT false;
  ALTER TABLE "_home_page_v" ADD COLUMN "parent_id" uuid;
  ALTER TABLE "_home_page_v" ADD COLUMN "version_name" varchar DEFAULT 'Homepage Narrative Copy';
  ALTER TABLE "_home_page_v" ADD COLUMN "version_is_fallback" boolean DEFAULT false;
  CREATE UNIQUE INDEX "rate_limit_key_idx" ON "rate_limit" USING btree ("key");
  CREATE INDEX "rate_limit_updated_at_idx" ON "rate_limit" USING btree ("updated_at");
  CREATE INDEX "rate_limit_created_at_idx" ON "rate_limit" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_limit_fk" FOREIGN KEY ("rate_limit_id") REFERENCES "public"."rate_limit"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_home_page_fk" FOREIGN KEY ("home_page_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_parent_id_home_page_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_rate_limit_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_limit_id");
  CREATE INDEX "payload_locked_documents_rels_home_page_id_idx" ON "payload_locked_documents_rels" USING btree ("home_page_id");
  CREATE INDEX "home_page_updated_at_idx" ON "home_page" USING btree ("updated_at");
  CREATE INDEX "home_page_created_at_idx" ON "home_page" USING btree ("created_at");
  CREATE INDEX "_home_page_v_parent_idx" ON "_home_page_v" USING btree ("parent_id");
  CREATE INDEX "_home_page_v_version_version_updated_at_idx" ON "_home_page_v" USING btree ("version_updated_at");
  CREATE INDEX "_home_page_v_version_version_created_at_idx" ON "_home_page_v" USING btree ("version_created_at");
  ALTER TABLE "admins" DROP COLUMN "reset_password_token";
  ALTER TABLE "admins" DROP COLUMN "reset_password_expiration";
  ALTER TABLE "admins" DROP COLUMN "salt";
  ALTER TABLE "admins" DROP COLUMN "hash";
  ALTER TABLE "admins" DROP COLUMN "reset_password_requested_at";
  ALTER TABLE "admins" DROP COLUMN "login_attempts";
  ALTER TABLE "admins" DROP COLUMN "lock_until";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Rolling back staff enum values restores their least-privileged pre-migration states.
  await db.execute(sql`
    UPDATE "public"."users_role" SET "value" = 'user' WHERE "value"::text = 'staff';
    UPDATE "public"."users" SET "membership_status" = 'applicant' WHERE "membership_status"::text = 'staff';
    UPDATE "public"."admin_invitations" SET "role" = 'user' WHERE "role"::text = 'staff';
   CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "rate_limit" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "rate_limit" CASCADE;
  ALTER TABLE "_home_page_v" DROP CONSTRAINT "_home_page_v_parent_id_home_page_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_rate_limit_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_home_page_fk";
  
  ALTER TABLE "users_role" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'user');
  ALTER TABLE "users_role" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_role" USING "value"::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "membership_status" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "membership_status" SET DEFAULT 'applicant'::text;
  DROP TYPE "public"."enum_users_membership_status";
  CREATE TYPE "public"."enum_users_membership_status" AS ENUM('applicant', 'invited', 'approved', 'waitlist', 'suspended');
  ALTER TABLE "users" ALTER COLUMN "membership_status" SET DEFAULT 'applicant'::"public"."enum_users_membership_status";
  ALTER TABLE "users" ALTER COLUMN "membership_status" SET DATA TYPE "public"."enum_users_membership_status" USING "membership_status"::"public"."enum_users_membership_status";
  ALTER TABLE "admin_invitations" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "admin_invitations" ALTER COLUMN "role" SET DEFAULT 'admin'::text;
  DROP TYPE "public"."enum_admin_invitations_role";
  CREATE TYPE "public"."enum_admin_invitations_role" AS ENUM('admin', 'editor', 'user');
  ALTER TABLE "admin_invitations" ALTER COLUMN "role" SET DEFAULT 'admin'::"public"."enum_admin_invitations_role";
  ALTER TABLE "admin_invitations" ALTER COLUMN "role" SET DATA TYPE "public"."enum_admin_invitations_role" USING "role"::"public"."enum_admin_invitations_role";
  DROP INDEX "home_page_updated_at_idx";
  DROP INDEX "home_page_created_at_idx";
  DROP INDEX "_home_page_v_parent_idx";
  DROP INDEX "_home_page_v_version_version_updated_at_idx";
  DROP INDEX "_home_page_v_version_version_created_at_idx";
  DROP INDEX "payload_locked_documents_rels_rate_limit_id_idx";
  DROP INDEX "payload_locked_documents_rels_home_page_id_idx";
  ALTER TABLE "home_page" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "home_page" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "home_page" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "home_page" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "admins" ADD COLUMN "reset_password_token" varchar;
  ALTER TABLE "admins" ADD COLUMN "reset_password_expiration" timestamp(3) with time zone;
  ALTER TABLE "admins" ADD COLUMN "salt" varchar;
  ALTER TABLE "admins" ADD COLUMN "hash" varchar;
  ALTER TABLE "admins" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "admins" ADD COLUMN "login_attempts" numeric DEFAULT 0;
  ALTER TABLE "admins" ADD COLUMN "lock_until" timestamp(3) with time zone;
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  ALTER TABLE "home_page" DROP COLUMN "name";
  ALTER TABLE "home_page" DROP COLUMN "is_fallback";
  ALTER TABLE "_home_page_v" DROP COLUMN "parent_id";
  ALTER TABLE "_home_page_v" DROP COLUMN "version_name";
  ALTER TABLE "_home_page_v" DROP COLUMN "version_is_fallback";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rate_limit_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "home_page_id";`)
}
