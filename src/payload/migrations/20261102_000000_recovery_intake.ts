import {
  type MigrateUpArgs,
  type MigrateDownArgs,
  sql
} from "@payloadcms/db-postgres";

// Additive intake-only storage. No identity tables or identity ACLs are changed.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
CREATE TABLE public.account_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar NOT NULL,
  contact_email varchar NOT NULL,
  claim_verification varchar NOT NULL DEFAULT 'unverified' CHECK (claim_verification='unverified'),
  reason varchar NOT NULL DEFAULT 'lost_email' CHECK (reason='lost_email'),
  status varchar NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','needs_proof','rejected','closed')),
  revision numeric NOT NULL DEFAULT 0 CHECK (revision>=0 AND revision<=100 AND revision=trunc(revision)),
  internal_note varchar,
  reviewer_id varchar,
  reviewed_at timestamp(3) with time zone,
  review_log jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(review_log)='array' AND jsonb_array_length(review_log)<=100),
  expires_at timestamp(3) with time zone NOT NULL,
  updated_at timestamp(3) with time zone NOT NULL DEFAULT now(),
  created_at timestamp(3) with time zone NOT NULL DEFAULT now(),
  CHECK (expires_at=created_at + interval '720 hours'),
  CHECK (length(phone)<=32 AND length(contact_email)<=254 AND length(internal_note)<=2000)
);
CREATE INDEX account_recovery_requests_expires_at_idx ON public.account_recovery_requests(expires_at);
CREATE INDEX account_recovery_requests_updated_at_idx ON public.account_recovery_requests(updated_at);
CREATE INDEX account_recovery_requests_created_at_idx ON public.account_recovery_requests(created_at);
CREATE TABLE canonical_member.recovery_intake_limits (
  key_hash text PRIMARY KEY CHECK(length(key_hash)=64),
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK(attempts>0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX recovery_intake_limits_expiry_idx ON canonical_member.recovery_intake_limits(expires_at);
CREATE FUNCTION canonical_member.guard_recovery_claims() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.contact_email IS DISTINCT FROM OLD.contact_email
    OR NEW.claim_verification IS DISTINCT FROM OLD.claim_verification OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Recovery claims are immutable';
  END IF;
  IF NEW.revision <> OLD.revision+1 OR jsonb_array_length(NEW.review_log) <> jsonb_array_length(OLD.review_log)+1
    OR NEW.review_log - (jsonb_array_length(NEW.review_log)-1) IS DISTINCT FROM OLD.review_log
    OR NEW.reviewer_id IS NULL OR NEW.reviewed_at IS NULL THEN
    RAISE EXCEPTION 'Recovery review requires an append-only revision';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER recovery_claims_immutable BEFORE UPDATE ON public.account_recovery_requests FOR EACH ROW EXECUTE FUNCTION canonical_member.guard_recovery_claims();
ALTER TABLE public.payload_locked_documents_rels ADD COLUMN "account_recovery_requests_id" uuid;
ALTER TABLE public.payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_account_recovery_requests_fk FOREIGN KEY (account_recovery_requests_id) REFERENCES public.account_recovery_requests(id) ON DELETE CASCADE;
CREATE INDEX payload_locked_documents_rels_account_recovery_requests__idx ON public.payload_locked_documents_rels(account_recovery_requests_id);
`);
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
ALTER TABLE public.payload_locked_documents_rels DROP COLUMN account_recovery_requests_id;
DROP TABLE canonical_member.recovery_intake_limits;
DROP TABLE public.account_recovery_requests;
DROP FUNCTION canonical_member.guard_recovery_claims();
`);
}
