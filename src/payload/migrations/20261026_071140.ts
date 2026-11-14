import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'ko');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'user');
  CREATE TYPE "public"."enum_users_membership_status" AS ENUM('applicant', 'invited', 'approved', 'waitlist', 'suspended');
  CREATE TYPE "public"."enum_users_locale_preference" AS ENUM('ko', 'en');
  CREATE TYPE "public"."enum_admin_invitations_role" AS ENUM('admin', 'editor', 'user');
  CREATE TYPE "public"."enum_admins_role" AS ENUM('admin', 'editor', 'staff');
  CREATE TYPE "public"."enum_orders_currency" AS ENUM('KRW', 'USD');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_orders_payment_provider" AS ENUM('portone', 'stripe', 'complimentary');
  CREATE TYPE "public"."enum_home_page_stories_tone" AS ENUM('blue', 'dark', 'green', 'portrait');
  CREATE TYPE "public"."enum_home_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_version_stories_tone" AS ENUM('blue', 'dark', 'green', 'portrait');
  CREATE TYPE "public"."enum__home_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_published_locale" AS ENUM('en', 'ko');
  CREATE TABLE "users_role" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_users_role",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"membership_status" "enum_users_membership_status" DEFAULT 'applicant' NOT NULL,
  	"locale_preference" "enum_users_locale_preference" DEFAULT 'ko' NOT NULL,
  	"notes" varchar,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"email_verified" boolean DEFAULT false NOT NULL,
  	"image" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"phone_number" varchar,
  	"phone_number_verified" boolean DEFAULT false,
  	"phone" varchar,
  	"ticket_tier" varchar,
  	"verified" boolean
  );
  
  CREATE TABLE "sessions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"token" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"ip_address" varchar,
  	"user_agent" varchar,
  	"user_id" uuid NOT NULL
  );
  
  CREATE TABLE "accounts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"account_id" varchar NOT NULL,
  	"provider_id" varchar NOT NULL,
  	"user_id" uuid NOT NULL,
  	"access_token" varchar,
  	"refresh_token" varchar,
  	"id_token" varchar,
  	"access_token_expires_at" timestamp(3) with time zone,
  	"refresh_token_expires_at" timestamp(3) with time zone,
  	"scope" varchar,
  	"password" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "verifications" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"identifier" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "passkeys" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"public_key" varchar NOT NULL,
  	"user_id" uuid NOT NULL,
  	"credential_id" varchar NOT NULL,
  	"counter" numeric NOT NULL,
  	"device_type" varchar NOT NULL,
  	"backed_up" boolean DEFAULT false NOT NULL,
  	"transports" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"aaguid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "admin_invitations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"role" "enum_admin_invitations_role" DEFAULT 'admin' NOT NULL,
  	"token" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "admins" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_admins_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"user_id" uuid NOT NULL,
  	"ticket_quantity" numeric DEFAULT 1 NOT NULL,
  	"total_amount" numeric NOT NULL,
  	"currency" "enum_orders_currency" DEFAULT 'KRW' NOT NULL,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"payment_provider" "enum_orders_payment_provider" DEFAULT 'portone' NOT NULL,
  	"payment_reference" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"sessions_id" uuid,
  	"accounts_id" uuid,
  	"verifications_id" uuid,
  	"passkeys_id" uuid,
  	"admin_invitations_id" uuid,
  	"admins_id" uuid,
  	"orders_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"admins_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_page_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tone" "enum_home_page_stories_tone"
  );
  
  CREATE TABLE "home_page_stories_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home_page_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"color" varchar
  );
  
  CREATE TABLE "home_page_principles_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home_page_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "home_page_messages_locales" (
  	"from" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home_page_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "home_page_values_locales" (
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home_page" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_status" "enum_home_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_locales" (
  	"brand_wordmark" varchar DEFAULT 'sophomores',
  	"prelude_title_left" varchar DEFAULT 'Experienced.',
  	"prelude_title_right" varchar DEFAULT 'Not Finished.',
  	"warp_passage_line1" varchar DEFAULT 'Lorem ipsum dolor sit amet,',
  	"warp_passage_line2" varchar DEFAULT 'consectetur adipiscing elit sed do.',
  	"notice1_sender" varchar DEFAULT 'From: sophomores',
  	"notice1_body" varchar DEFAULT 'A private social club for people who have lived a little. And aren’t finished yet.',
  	"notice2_sender" varchar DEFAULT 'Ticket sales open',
  	"notice2_time" varchar DEFAULT 'In ~10 days',
  	"notice2_body" varchar DEFAULT 'Something is taking shape. Ticket sales open in around ten days. The first night is still under wraps.',
  	"center_headline" varchar DEFAULT 'It Didn’t Begin With A Club.
  It Began With A Question.',
  	"people_headline" varchar DEFAULT 'Experienced Enough To Know Better. Curious Enough To Go Anyway.',
  	"invitation_headline" varchar DEFAULT 'Go Ahead, Light Me Up',
  	"rsvp_button_label" varchar DEFAULT 'RSVP',
  	"rsvp_button_subtext" varchar DEFAULT 'In ~10 days',
  	"footer_copyright" varchar DEFAULT '© sophomores 2026',
  	"footer_domain" varchar DEFAULT 'sophomores.co',
  	"modal_heading" varchar DEFAULT 'This Is Only
  The Beginning.',
  	"modal_lead" varchar DEFAULT 'Ticket sales open in ~10 days.',
  	"modal_disclaimer1" varchar DEFAULT 'Date to be announced. Ticket sales are not open yet.',
  	"modal_disclaimer2" varchar DEFAULT 'Preview only. No email is collected and no reservation is made.',
  	"modal_return_button" varchar DEFAULT 'Back to Top →',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "_home_page_v_version_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tone" "enum__home_page_v_version_stories_tone",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_version_stories_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "_home_page_v_version_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"color" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_version_principles_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "_home_page_v_version_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_version_messages_locales" (
  	"from" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "_home_page_v_version_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_version_values_locales" (
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "_home_page_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version__status" "enum__home_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__home_page_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_home_page_v_locales" (
  	"version_brand_wordmark" varchar DEFAULT 'sophomores',
  	"version_prelude_title_left" varchar DEFAULT 'Experienced.',
  	"version_prelude_title_right" varchar DEFAULT 'Not Finished.',
  	"version_warp_passage_line1" varchar DEFAULT 'Lorem ipsum dolor sit amet,',
  	"version_warp_passage_line2" varchar DEFAULT 'consectetur adipiscing elit sed do.',
  	"version_notice1_sender" varchar DEFAULT 'From: sophomores',
  	"version_notice1_body" varchar DEFAULT 'A private social club for people who have lived a little. And aren’t finished yet.',
  	"version_notice2_sender" varchar DEFAULT 'Ticket sales open',
  	"version_notice2_time" varchar DEFAULT 'In ~10 days',
  	"version_notice2_body" varchar DEFAULT 'Something is taking shape. Ticket sales open in around ten days. The first night is still under wraps.',
  	"version_center_headline" varchar DEFAULT 'It Didn’t Begin With A Club.
  It Began With A Question.',
  	"version_people_headline" varchar DEFAULT 'Experienced Enough To Know Better. Curious Enough To Go Anyway.',
  	"version_invitation_headline" varchar DEFAULT 'Go Ahead, Light Me Up',
  	"version_rsvp_button_label" varchar DEFAULT 'RSVP',
  	"version_rsvp_button_subtext" varchar DEFAULT 'In ~10 days',
  	"version_footer_copyright" varchar DEFAULT '© sophomores 2026',
  	"version_footer_domain" varchar DEFAULT 'sophomores.co',
  	"version_modal_heading" varchar DEFAULT 'This Is Only
  The Beginning.',
  	"version_modal_lead" varchar DEFAULT 'Ticket sales open in ~10 days.',
  	"version_modal_disclaimer1" varchar DEFAULT 'Date to be announced. Ticket sales are not open yet.',
  	"version_modal_disclaimer2" varchar DEFAULT 'Preview only. No email is collected and no reservation is made.',
  	"version_modal_return_button" varchar DEFAULT 'Back to Top →',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  ALTER TABLE "users_role" ADD CONSTRAINT "users_role_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sessions_fk" FOREIGN KEY ("sessions_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_accounts_fk" FOREIGN KEY ("accounts_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verifications_fk" FOREIGN KEY ("verifications_id") REFERENCES "public"."verifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_passkeys_fk" FOREIGN KEY ("passkeys_id") REFERENCES "public"."passkeys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admin_invitations_fk" FOREIGN KEY ("admin_invitations_id") REFERENCES "public"."admin_invitations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_stories" ADD CONSTRAINT "home_page_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_stories_locales" ADD CONSTRAINT "home_page_stories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_principles" ADD CONSTRAINT "home_page_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_principles_locales" ADD CONSTRAINT "home_page_principles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_messages" ADD CONSTRAINT "home_page_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_messages_locales" ADD CONSTRAINT "home_page_messages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_values" ADD CONSTRAINT "home_page_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_values_locales" ADD CONSTRAINT "home_page_values_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_locales" ADD CONSTRAINT "home_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_stories" ADD CONSTRAINT "_home_page_v_version_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_stories_locales" ADD CONSTRAINT "_home_page_v_version_stories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_version_stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_principles" ADD CONSTRAINT "_home_page_v_version_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_principles_locales" ADD CONSTRAINT "_home_page_v_version_principles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_version_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_messages" ADD CONSTRAINT "_home_page_v_version_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_messages_locales" ADD CONSTRAINT "_home_page_v_version_messages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_version_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_values" ADD CONSTRAINT "_home_page_v_version_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_version_values_locales" ADD CONSTRAINT "_home_page_v_version_values_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_version_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_locales" ADD CONSTRAINT "_home_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_role_order_idx" ON "users_role" USING btree ("order");
  CREATE INDEX "users_role_parent_idx" ON "users_role" USING btree ("parent_id");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE UNIQUE INDEX "users_phone_number_idx" ON "users" USING btree ("phone_number");
  CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");
  CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");
  CREATE INDEX "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");
  CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");
  CREATE INDEX "accounts_account_id_idx" ON "accounts" USING btree ("account_id");
  CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");
  CREATE INDEX "accounts_created_at_idx" ON "accounts" USING btree ("created_at");
  CREATE INDEX "accounts_updated_at_idx" ON "accounts" USING btree ("updated_at");
  CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");
  CREATE INDEX "verifications_created_at_idx" ON "verifications" USING btree ("created_at");
  CREATE INDEX "verifications_updated_at_idx" ON "verifications" USING btree ("updated_at");
  CREATE INDEX "passkeys_public_key_idx" ON "passkeys" USING btree ("public_key");
  CREATE INDEX "passkeys_user_idx" ON "passkeys" USING btree ("user_id");
  CREATE INDEX "passkeys_updated_at_idx" ON "passkeys" USING btree ("updated_at");
  CREATE INDEX "admin_invitations_token_idx" ON "admin_invitations" USING btree ("token");
  CREATE INDEX "admin_invitations_updated_at_idx" ON "admin_invitations" USING btree ("updated_at");
  CREATE INDEX "admin_invitations_created_at_idx" ON "admin_invitations" USING btree ("created_at");
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("sessions_id");
  CREATE INDEX "payload_locked_documents_rels_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("accounts_id");
  CREATE INDEX "payload_locked_documents_rels_verifications_id_idx" ON "payload_locked_documents_rels" USING btree ("verifications_id");
  CREATE INDEX "payload_locked_documents_rels_passkeys_id_idx" ON "payload_locked_documents_rels" USING btree ("passkeys_id");
  CREATE INDEX "payload_locked_documents_rels_admin_invitations_id_idx" ON "payload_locked_documents_rels" USING btree ("admin_invitations_id");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_page_stories_order_idx" ON "home_page_stories" USING btree ("_order");
  CREATE INDEX "home_page_stories_parent_id_idx" ON "home_page_stories" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "home_page_stories_locales_locale_parent_id_unique" ON "home_page_stories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_stories_locales_parent_id_idx" ON "home_page_stories_locales" USING btree ("_parent_id");
  CREATE INDEX "home_page_principles_order_idx" ON "home_page_principles" USING btree ("_order");
  CREATE INDEX "home_page_principles_parent_id_idx" ON "home_page_principles" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "home_page_principles_locales_locale_parent_id_unique" ON "home_page_principles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_principles_locales_parent_id_idx" ON "home_page_principles_locales" USING btree ("_parent_id");
  CREATE INDEX "home_page_messages_order_idx" ON "home_page_messages" USING btree ("_order");
  CREATE INDEX "home_page_messages_parent_id_idx" ON "home_page_messages" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "home_page_messages_locales_locale_parent_id_unique" ON "home_page_messages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_messages_locales_parent_id_idx" ON "home_page_messages_locales" USING btree ("_parent_id");
  CREATE INDEX "home_page_values_order_idx" ON "home_page_values" USING btree ("_order");
  CREATE INDEX "home_page_values_parent_id_idx" ON "home_page_values" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "home_page_values_locales_locale_parent_id_unique" ON "home_page_values_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_values_locales_parent_id_idx" ON "home_page_values_locales" USING btree ("_parent_id");
  CREATE INDEX "home_page__status_idx" ON "home_page" USING btree ("_status");
  CREATE UNIQUE INDEX "home_page_locales_locale_parent_id_unique" ON "home_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_locales_parent_id_idx" ON "home_page_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_version_stories_order_idx" ON "_home_page_v_version_stories" USING btree ("_order");
  CREATE INDEX "_home_page_v_version_stories_parent_id_idx" ON "_home_page_v_version_stories" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_home_page_v_version_stories_locales_locale_parent_id_unique" ON "_home_page_v_version_stories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_version_stories_locales_parent_id_idx" ON "_home_page_v_version_stories_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_version_principles_order_idx" ON "_home_page_v_version_principles" USING btree ("_order");
  CREATE INDEX "_home_page_v_version_principles_parent_id_idx" ON "_home_page_v_version_principles" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_home_page_v_version_principles_locales_locale_parent_id_uni" ON "_home_page_v_version_principles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_version_principles_locales_parent_id_idx" ON "_home_page_v_version_principles_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_version_messages_order_idx" ON "_home_page_v_version_messages" USING btree ("_order");
  CREATE INDEX "_home_page_v_version_messages_parent_id_idx" ON "_home_page_v_version_messages" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_home_page_v_version_messages_locales_locale_parent_id_uniqu" ON "_home_page_v_version_messages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_version_messages_locales_parent_id_idx" ON "_home_page_v_version_messages_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_version_values_order_idx" ON "_home_page_v_version_values" USING btree ("_order");
  CREATE INDEX "_home_page_v_version_values_parent_id_idx" ON "_home_page_v_version_values" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_home_page_v_version_values_locales_locale_parent_id_unique" ON "_home_page_v_version_values_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_version_values_locales_parent_id_idx" ON "_home_page_v_version_values_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_version_version__status_idx" ON "_home_page_v" USING btree ("version__status");
  CREATE INDEX "_home_page_v_created_at_idx" ON "_home_page_v" USING btree ("created_at");
  CREATE INDEX "_home_page_v_updated_at_idx" ON "_home_page_v" USING btree ("updated_at");
  CREATE INDEX "_home_page_v_snapshot_idx" ON "_home_page_v" USING btree ("snapshot");
  CREATE INDEX "_home_page_v_published_locale_idx" ON "_home_page_v" USING btree ("published_locale");
  CREATE INDEX "_home_page_v_latest_idx" ON "_home_page_v" USING btree ("latest");
  CREATE INDEX "_home_page_v_autosave_idx" ON "_home_page_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_home_page_v_locales_locale_parent_id_unique" ON "_home_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_locales_parent_id_idx" ON "_home_page_v_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_role" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "sessions" CASCADE;
  DROP TABLE "accounts" CASCADE;
  DROP TABLE "verifications" CASCADE;
  DROP TABLE "passkeys" CASCADE;
  DROP TABLE "admin_invitations" CASCADE;
  DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "home_page_stories" CASCADE;
  DROP TABLE "home_page_stories_locales" CASCADE;
  DROP TABLE "home_page_principles" CASCADE;
  DROP TABLE "home_page_principles_locales" CASCADE;
  DROP TABLE "home_page_messages" CASCADE;
  DROP TABLE "home_page_messages_locales" CASCADE;
  DROP TABLE "home_page_values" CASCADE;
  DROP TABLE "home_page_values_locales" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_locales" CASCADE;
  DROP TABLE "_home_page_v_version_stories" CASCADE;
  DROP TABLE "_home_page_v_version_stories_locales" CASCADE;
  DROP TABLE "_home_page_v_version_principles" CASCADE;
  DROP TABLE "_home_page_v_version_principles_locales" CASCADE;
  DROP TABLE "_home_page_v_version_messages" CASCADE;
  DROP TABLE "_home_page_v_version_messages_locales" CASCADE;
  DROP TABLE "_home_page_v_version_values" CASCADE;
  DROP TABLE "_home_page_v_version_values_locales" CASCADE;
  DROP TABLE "_home_page_v" CASCADE;
  DROP TABLE "_home_page_v_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_membership_status";
  DROP TYPE "public"."enum_users_locale_preference";
  DROP TYPE "public"."enum_admin_invitations_role";
  DROP TYPE "public"."enum_admins_role";
  DROP TYPE "public"."enum_orders_currency";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_payment_provider";
  DROP TYPE "public"."enum_home_page_stories_tone";
  DROP TYPE "public"."enum_home_page_status";
  DROP TYPE "public"."enum__home_page_v_version_stories_tone";
  DROP TYPE "public"."enum__home_page_v_version_status";
  DROP TYPE "public"."enum__home_page_v_published_locale";`)
}
