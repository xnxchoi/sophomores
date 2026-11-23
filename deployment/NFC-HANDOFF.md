# NFC handoff: deployment boundary and retention

Do not enable NFC until these checks pass against the actual edge, origin and
backup systems. The checked-in preview Nginx configuration is not the public
ingress and must not be used as evidence for these checks.

## Payload runtime profiles

`buildSiteConfig` keeps one definition of the canonical Auth plugin, the NFC
schema contracts and the sanitized PostgreSQL error hook. Reusing the full
site instance for NFC reads would also run CMS startup seeding. Copying the
Auth and schema registrations into a second config would allow them to drift.

- `site` is the default export: the full `/vault` CMS, with content and
  commerce collections and globals, wallet catch-up jobs and the existing
  editorial, super-admin and home-page startup seed plugins.
- `nfc-read` registers admins, users and the NFC collections, with canonical
  Better Auth and server-chosen IDs. Its separate pool (maximum three
  connections) defaults every database transaction to read-only.
- `nfc-write` registers the same reduced collections and plugins on a separate
  pool (maximum four connections). The tap handler uses it for the short-lived
  handoff; only the confirmation POST uses it to advance the card counter or
  record Welcome.

Neither NFC profile loads the site jobs, commerce plugins or startup seeds.
Both disable database creation, schema push and type generation. All three
profiles install the same pool and client error handlers without logging
driver evidence or swallowing query rejections.

## Public ingress contract

- Classify NFC requests using the original request target **before** URI
  decoding, path cleanup, redirects or routing. Treat variants that normalize
  to the NFC namespace as sensitive too (including repeated slashes,
  backslashes, case variants, encoded separators and dot segments).
- Admit the exact canonical HTTPS tap path and query without decoding,
  rebuilding or reordering it. Preserve the configured host/TLS authority
  from the trusted edge, not client-supplied forwarding headers. Keep the app
  origin private. Do not accept a plaintext tap and redirect it with its
  query. Reject noncanonical NFC requests with an empty, non-cacheable error
  before forwarding, without reflecting the target in the response or
  Location. For clean confirmation documents and form POSTs, never add a query.
- Next's global trailing-slash redirect is disabled so it cannot reflect a
  malformed NFC tap. The replacement is a public redirect for normal site
  URLs, not a copy of Next's internal priority rule: it skips requests with
  `x-nextjs-data`, and Next's public-route handling of reserved `/_next`
  paths can differ. Do not depend on slash redirects for framework data or
  asset URLs; internal callers should use their canonical URLs.
- Disable or redact the original target, query, referrer, cookies, form body
  and redirect diagnostics at every hop, including errors and security events,
  access logs, trace spans, RUM and replay. Use an NFC route label, status and
  timing only. Do not try to redact just after a normalized location match.
- Before enabling, run a synthetic uppercase-hex sentinel through canonical
  success and rejection cases, malformed path variants, HTTP, wrong host,
  speculative/HEAD, and a forwarded-error case. Inspect response bytes,
  headers, redirects and every applicable log sink; require no sentinel and
  no forwarded noncanonical target. Separately prove raw order/case is
  preserved on the authenticated canonical path. Do not use a real card to
  test redaction.

## Expiry and backups

- Handoffs expire after two minutes by the database clock. A valid new tap
  replaces the member's prior row. Deploy `ops/nfc-handoff-cleanup.sql` as a
  single non-overlapping job each minute with psql stop-on-error enabled and
  a narrowly scoped role (SELECT/DELETE on the handoff table; no other write
  grants). Each invocation removes at most 500 expired rows, skips locked
  rows, and has bounded lock and statement timeouts. Do not run it on a GET.
- Monitor job success and oldest expired-row age, not IDs, cookie hashes or
  card data. Alert if oldest expired age exceeds five minutes or batches
  routinely hit the limit. Fix scheduling/capacity before enabling or
  increasing traffic.
- Exclude table **data** (not schema) from logical backups and exports using
  `--exclude-table-data=public.nfc_tap_handoffs`. Physical/PITR storage cannot
  selectively exclude table data: document its actual retention and access
  controls and keep restores private until this table has been emptied.
  Validate a restore has the schema but no handoff rows before opening it.
  Existing backup artifacts are not changed by this packet.
