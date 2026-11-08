CREATE SCHEMA IF NOT EXISTS phone_verification;
CREATE TABLE IF NOT EXISTS phone_verification.challenges (
  id uuid PRIMARY KEY,
  session_hash text NOT NULL,
  phone_hash text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  proof_hash text NOT NULL UNIQUE,
  state text NOT NULL CHECK (state IN ('pending','review','verified','cancelled','expired','consumed')),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  policy_version text,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS challenge_session_idx ON phone_verification.challenges(session_hash);
CREATE INDEX IF NOT EXISTS challenge_expiry_idx ON phone_verification.challenges(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_idx ON phone_verification.challenges(session_hash) WHERE state IN ('pending','review','verified');
CREATE TABLE IF NOT EXISTS phone_verification.rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_expiry_idx ON phone_verification.rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS phone_verification.deliveries (
  id uuid PRIMARY KEY,
  mailbox_id text NOT NULL,
  message_id text NOT NULL,
  received_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','leased','complete','dead')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL,
  lease_token uuid,
  lease_until timestamptz,
  matched_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE(mailbox_id,message_id)
);
CREATE INDEX IF NOT EXISTS delivery_claim_idx ON phone_verification.deliveries(state,available_at,lease_until);
