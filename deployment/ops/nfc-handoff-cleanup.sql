-- One scheduled batch, using a dedicated role with SELECT/DELETE on this table only.
BEGIN;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
WITH expired AS (
  SELECT id
  FROM public.nfc_tap_handoffs
  WHERE expires_at <= statement_timestamp()
  ORDER BY expires_at, id
  LIMIT 500
  FOR UPDATE SKIP LOCKED
), removed AS (
  DELETE FROM public.nfc_tap_handoffs AS handoff
  USING expired
  WHERE handoff.id = expired.id
  RETURNING 1
)
SELECT count(*) AS expired_handoffs_removed FROM removed;
COMMIT;
