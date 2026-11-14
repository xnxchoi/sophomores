import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tracks_sync_status" AS ENUM('pending', 'synced', 'failed');
  CREATE TYPE "public"."enum_setlists_status" AS ENUM('draft', 'active', 'locked', 'finalized');
  CREATE TYPE "public"."enum_setlists_provider" AS ENUM('apple_music', 'spotify', 'both');
  CREATE TABLE "setlists" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"status" "enum_setlists_status" DEFAULT 'draft' NOT NULL,
  	"deadline" timestamp(3) with time zone NOT NULL,
  	"max_slots_per_user" numeric DEFAULT 2 NOT NULL,
  	"provider" "enum_setlists_provider" DEFAULT 'apple_music' NOT NULL,
  	"apple_music_playlist_id" varchar,
  	"apple_music_playlist_url" varchar,
  	"apple_music_owner_user_token" varchar,
  	"spotify_playlist_id" varchar,
  	"spotify_playlist_url" varchar,
  	"is_public" boolean DEFAULT true,
  	"needs_sync" boolean DEFAULT false,
  	"last_synced_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "setlists_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"tracks_id" uuid
  );
  
  ALTER TABLE "home_page_locales" ALTER COLUMN "prelude_title_left" SET DEFAULT 'The best conversations';
  ALTER TABLE "home_page_locales" ALTER COLUMN "prelude_title_right" SET DEFAULT 'happen outside your circle.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "warp_passage_line1" SET DEFAULT 'Whether it’s a company, a craft, or a new direction, perspective narrows when you stay in your lane.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "warp_passage_line2" SET DEFAULT 'We create the room where different worlds cross paths.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "notice1_body" SET DEFAULT 'A private social club for people building in different worlds.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "invitation_headline" SET DEFAULT 'Go ahead, take a light...';
  ALTER TABLE "home_page_locales" ALTER COLUMN "rsvp_button_label" SET DEFAULT 'The first invitation';
  ALTER TABLE "home_page_locales" ALTER COLUMN "modal_heading" SET DEFAULT 'The first invitation';
  ALTER TABLE "home_page_locales" ALTER COLUMN "modal_return_button" SET DEFAULT 'Back to the story →';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_prelude_title_left" SET DEFAULT 'The best conversations';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_prelude_title_right" SET DEFAULT 'happen outside your circle.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_warp_passage_line1" SET DEFAULT 'Whether it’s a company, a craft, or a new direction, perspective narrows when you stay in your lane.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_warp_passage_line2" SET DEFAULT 'We create the room where different worlds cross paths.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_notice1_body" SET DEFAULT 'A private social club for people building in different worlds.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_invitation_headline" SET DEFAULT 'Go ahead, take a light...';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_rsvp_button_label" SET DEFAULT 'The first invitation';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_modal_heading" SET DEFAULT 'The first invitation';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_modal_return_button" SET DEFAULT 'Back to the story →';
  ALTER TABLE "tracks" ALTER COLUMN "artist" SET NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "audio_url" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "is_playlist_eligible" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "eligibility_phone_binding" varchar;
  ALTER TABLE "tracks" ADD COLUMN "album_title" varchar;
  ALTER TABLE "tracks" ADD COLUMN "isrc" varchar;
  ALTER TABLE "tracks" ADD COLUMN "preview_url" varchar;
  ALTER TABLE "tracks" ADD COLUMN "apple_music_url" varchar;
  ALTER TABLE "tracks" ADD COLUMN "apple_music_storefront" varchar DEFAULT 'us';
  ALTER TABLE "tracks" ADD COLUMN "spotify_uri" varchar;
  ALTER TABLE "tracks" ADD COLUMN "spotify_url" varchar;
  ALTER TABLE "tracks" ADD COLUMN "youtube_music_video_id" varchar;
  ALTER TABLE "tracks" ADD COLUMN "youtube_music_url" varchar;
  ALTER TABLE "tracks" ADD COLUMN "setlist_id" uuid;
  ALTER TABLE "tracks" ADD COLUMN "submitted_by_id" uuid;
  ALTER TABLE "tracks" ADD COLUMN "slot_index" numeric;
  ALTER TABLE "tracks" ADD COLUMN "note" varchar;
  ALTER TABLE "tracks" ADD COLUMN "sync_status" "enum_tracks_sync_status" DEFAULT 'pending';
  ALTER TABLE "tracks" ADD COLUMN "synced_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "setlists_id" uuid;
  ALTER TABLE "setlists_rels" ADD CONSTRAINT "setlists_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."setlists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "setlists_rels" ADD CONSTRAINT "setlists_rels_tracks_fk" FOREIGN KEY ("tracks_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "setlists_slug_idx" ON "setlists" USING btree ("slug");
  CREATE INDEX "setlists_status_idx" ON "setlists" USING btree ("status");
  CREATE INDEX "setlists_updated_at_idx" ON "setlists" USING btree ("updated_at");
  CREATE INDEX "setlists_created_at_idx" ON "setlists" USING btree ("created_at");
  CREATE INDEX "setlists_rels_order_idx" ON "setlists_rels" USING btree ("order");
  CREATE INDEX "setlists_rels_parent_idx" ON "setlists_rels" USING btree ("parent_id");
  CREATE INDEX "setlists_rels_path_idx" ON "setlists_rels" USING btree ("path");
  CREATE INDEX "setlists_rels_tracks_id_idx" ON "setlists_rels" USING btree ("tracks_id");
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_setlist_id_setlists_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "public"."setlists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_setlists_fk" FOREIGN KEY ("setlists_id") REFERENCES "public"."setlists"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tracks_isrc_idx" ON "tracks" USING btree ("isrc");
  CREATE INDEX "tracks_setlist_idx" ON "tracks" USING btree ("setlist_id");
  CREATE INDEX "tracks_submitted_by_idx" ON "tracks" USING btree ("submitted_by_id");
  CREATE INDEX "payload_locked_documents_rels_setlists_id_idx" ON "payload_locked_documents_rels" USING btree ("setlists_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "setlists" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "setlists_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "setlists" CASCADE;
  DROP TABLE "setlists_rels" CASCADE;
  ALTER TABLE "tracks" DROP CONSTRAINT "tracks_setlist_id_setlists_id_fk";
  
  ALTER TABLE "tracks" DROP CONSTRAINT "tracks_submitted_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_setlists_fk";
  
  DROP INDEX "tracks_isrc_idx";
  DROP INDEX "tracks_setlist_idx";
  DROP INDEX "tracks_submitted_by_idx";
  DROP INDEX "payload_locked_documents_rels_setlists_id_idx";
  ALTER TABLE "home_page_locales" ALTER COLUMN "prelude_title_left" SET DEFAULT 'Experienced.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "prelude_title_right" SET DEFAULT 'Not Finished.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "warp_passage_line1" SET DEFAULT 'Lorem ipsum dolor sit amet,';
  ALTER TABLE "home_page_locales" ALTER COLUMN "warp_passage_line2" SET DEFAULT 'consectetur adipiscing elit sed do.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "notice1_body" SET DEFAULT 'A private social club for people who have lived a little. And aren’t finished yet.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "invitation_headline" SET DEFAULT 'Go Ahead, Light Me Up';
  ALTER TABLE "home_page_locales" ALTER COLUMN "rsvp_button_label" SET DEFAULT 'RSVP';
  ALTER TABLE "home_page_locales" ALTER COLUMN "modal_heading" SET DEFAULT 'This Is Only
  The Beginning.';
  ALTER TABLE "home_page_locales" ALTER COLUMN "modal_return_button" SET DEFAULT 'Back to Top →';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_prelude_title_left" SET DEFAULT 'Experienced.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_prelude_title_right" SET DEFAULT 'Not Finished.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_warp_passage_line1" SET DEFAULT 'Lorem ipsum dolor sit amet,';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_warp_passage_line2" SET DEFAULT 'consectetur adipiscing elit sed do.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_notice1_body" SET DEFAULT 'A private social club for people who have lived a little. And aren’t finished yet.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_invitation_headline" SET DEFAULT 'Go Ahead, Light Me Up';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_rsvp_button_label" SET DEFAULT 'RSVP';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_modal_heading" SET DEFAULT 'This Is Only
  The Beginning.';
  ALTER TABLE "_home_page_v_locales" ALTER COLUMN "version_modal_return_button" SET DEFAULT 'Back to Top →';
  ALTER TABLE "tracks" ALTER COLUMN "artist" DROP NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "audio_url" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "is_playlist_eligible";
  ALTER TABLE "users" DROP COLUMN "eligibility_phone_binding";
  ALTER TABLE "tracks" DROP COLUMN "album_title";
  ALTER TABLE "tracks" DROP COLUMN "isrc";
  ALTER TABLE "tracks" DROP COLUMN "preview_url";
  ALTER TABLE "tracks" DROP COLUMN "apple_music_url";
  ALTER TABLE "tracks" DROP COLUMN "apple_music_storefront";
  ALTER TABLE "tracks" DROP COLUMN "spotify_uri";
  ALTER TABLE "tracks" DROP COLUMN "spotify_url";
  ALTER TABLE "tracks" DROP COLUMN "youtube_music_video_id";
  ALTER TABLE "tracks" DROP COLUMN "youtube_music_url";
  ALTER TABLE "tracks" DROP COLUMN "setlist_id";
  ALTER TABLE "tracks" DROP COLUMN "submitted_by_id";
  ALTER TABLE "tracks" DROP COLUMN "slot_index";
  ALTER TABLE "tracks" DROP COLUMN "note";
  ALTER TABLE "tracks" DROP COLUMN "sync_status";
  ALTER TABLE "tracks" DROP COLUMN "synced_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "setlists_id";
  DROP TYPE "public"."enum_tracks_sync_status";
  DROP TYPE "public"."enum_setlists_status";
  DROP TYPE "public"."enum_setlists_provider";`)
}
