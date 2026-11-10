# ITEASY VPS preflight and recovery checkpoint

## 2026-11-10: read-only inventory — existing plan retained

**Checkpoint: inventory complete; not ready for cutover.** The owner approved
read-only local/source and SSH inventory. Existing site/commerce work remains
the governing plan, with same-host deployment and Hideaway retirement as its
final milestone. No application functionality was dropped to accelerate release.
The October sections below remain historical observations, not current evidence.

### Current Hideaway reference — observed 2026-11-10, 15:12–15:18 KST

| Identity | Observation |
|---|---|
| Running app | Container `payload`; Compose project `theestate`, service `payload`; Docker reports running/healthy. No fresh application/HTTP acceptance was performed. |
| Image reference / label | `ghcr.io/xnxchoi/hideaway:v33.0.31`; image version label `v33.0.31`. |
| Exact image ID | `sha256:436c217eaea2022d0fe3f54579826efd76344563634f2b5ed1d48631b45c2a55` |
| Registry digest reported by Docker | `ghcr.io/xnxchoi/hideaway@sha256:187038cb0c799f59bd4ff3b79c0c829fe155ccfa83107cbfec36f5ca5207810e` |
| Image revision label | `e319e9e44cd87d2918e5a160c61ff1d93421a3b8` — a build label, not an independently verified source attestation. |
| App container start | `2026-08-08T15:02:31Z`; image creation `2026-07-07T11:06:16Z`. |
| Deployment descriptor location | `/home/deploy/thehideaway/compose.prod.yaml`, observed mode 0600; private contents were not printed. |

This pins what is running, not a new recoverable backup. The image remains in the
VPS daemon; no image export, pull, replay, restoration or off-host image archive
was performed. Do not rebuild a rollback from newer brittle Hideaway source or
assume a mutable tag alone reproduces the installation.

### Shared resources and capacity

- Host architecture is x86_64. Observed RAM: 3.78 GiB total, 1.55 GiB available;
  swap 4 GiB with about 0.56 GiB used. Root filesystem: about 28.4 GiB available,
  70% used. This is an instantaneous inventory, not a load/capacity guarantee.
- Eleven containers are running: Hideaway `payload`, `postgres`, `nginx` and
  **eight older Sophomores preview containers**. Nothing was started, stopped,
  restarted, pruned or reconfigured by this inventory.
- Preview names: `sophomores-preview-warp-20261025`,
  `sophomores-preview-field-20261022`, `sophomores-preview-refresh-20261019-r2`,
  `sophomores-preview-ui-20261018`, `sophomores-preview-next-20261017`,
  `sophomores-preview-ar`, `sophomores-preview-auth`, `sophomores-preview-app`.
  Their image IDs, limits, mounts and network memberships are in the private
  inventory. A single Docker working-memory sample totaled about 685 MiB for
  these previews; this is not exclusive physical footprint or safe headroom.
- Hideaway and PostgreSQL share `hideaway`; previews use `sophomores-preview`;
  Nginx joins both. Only Nginx publishes 80/443; app/database ports are not bound
  publicly. Host listeners also include SSH and loopback DNS.
- Mounted production routing sends **Hideaway and LOSTINSEOUL to the same
  `hideaway_upstream`, whose server is `payload:3000`**. Stopping `payload` would
  therefore affect both unless their disposition is explicitly resolved. No
  blanket Compose shutdown is permissible.
- Existing `preview.sophomores.co` routing and a protected auth-file mount were
  observed. The password file was not read. Existing preview deployment does
  not prove acceptance of the current `30c947d` source.
- Hideaway owns named media/user/track/assets volumes and read-only asset binds;
  PostgreSQL owns `theestate_pgdata`. Preserve them. Sophomores must use separate
  database/role and writable media storage, not repurpose these mounts.

### TLS and backup metadata

- TLS handshakes pinned to the VPS loopback listener with the mounted domains'
  SNI names verified successfully. The Hideaway/LOST certificate expires
  **2027-01-27 12:04:25 UTC**; preview certificate expires
  **2027-01-13 17:34:06 UTC**. No HTTP request, certificate issuance/renewal,
  configuration edit or reload was performed. Apex/www Sophomores was not tested
  by these certificate observations.
- Only the `20261011T010105Z` backup run was observed in the existing server
  backup directory. Ciphertext/manifest filenames and sizes were inspected using
  existing noninteractive read-only metadata access, not their private contents.
- The matching Mac backup directory and saved proof files still exist; encrypted
  artifacts and the local age identity have mode 0600 and containing directories
  mode 0700. The identity's contents were not read. Current decryption, hashes,
  restoration, independent key custody and off-device copies were not reverified.
- This approximately month-old observed capture is **not** a fresh pre-cutover
  recovery point. Fresh encrypted off-host capture, consistent data/media state,
  image/config preservation and an isolated recovery rehearsal remain required.

### Existing-plan release gates confirmed from local source

1. **Public registration/verification:** canonical membership and phone-verifier
   configuration accept only local mode, HTTP localhost and loopback databases
   (`src/lib/member-auth/payload-config.ts:27–40`,
   `src/lib/phone-verification/server/config.ts:17–31`). General Better Auth
   SMTP/Google support does not remove these separate membership restrictions.
   Production enablement needs deliberate implementation/review; do not simply
   weaken hostname, ownership or verification-evidence checks.
2. **Release build/runtime contract:** Payload requires a database URI and secret
   at config load. The current builder passes only release ID, strips app/provider
   secrets and has no reviewed config injection path; network-isolated smoke sets
   only public-preview mode. Fix this without embedding production credentials or
   using Hideaway's database. Define dedicated writable media and migration inputs.
3. **Test gate disposition:** latest recorded suite is 2,127 tests, 2,084 pass,
   four retained CSS/ownership failures and 39 existing opt-in skips. The image's
   unconditional full test command still fails on those known failures. Preserve
   functional/security checks and make any release-policy disposition explicit;
   no build, test, typecheck or migration was run during this inventory.
4. **Commerce/provider acceptance:** PortOne configuration remains disabled or
   sandbox only; CMS publication and actual product/fulfillment/policy approval
   gates remain. No CMS database state or provider was queried. A previous local
   TEST success is not acceptance of public registration, current plugin checkout,
   callbacks/webhooks, physical-device redirects or live payments.
5. **Deployment execution/recovery:** the repository implements local
   snapshot/build/smoke/export; remote staging is currently a validation/planning
   contract, not a proven automated transfer/cutover executor. Preserve the
   currently working installation before implementing or executing that last step.

### Evidence and exact resume point

Sanitized raw metadata is retained privately under ignored
`.deployment/cutover-local/`: `vps-service-map-20261110.json`,
`vps-routes-backups-20261110.json`, `vps-routing-supplement-20261110.json`, and
`local-backup-metadata-20261110.json`. Successful payload/PostgreSQL health,
Compose and image-label projections are also retained in supporting
`vps-inventory-20261110-complete.json`. Its incomplete optional-field projections
for other containers are superseded by the service map; do not interpret those
projection errors as service failures. The first tool-compressed
`vps-inventory-20261110.json` is not an authoritative raw capture. Backup `find`
timestamp strings use the server's formatting and are not relied on as UTC.
Immutable identities and conclusions above survive loss of the ignored files.

**Resume the existing functional/public-readiness plan, not traffic cutover.**
Prioritize the public membership/verification boundary and release-contract
repairs, retaining current local behavior and security invariants. Build,
provider, backup/database, service retirement and deployment execution phases
still need their bounded approvals. Owner English-copy edits remain untouched;
the new README/preflight/plan changes are documentation only. No code,
dependency, database, service, DNS/TLS or payment/email provider mutation occurred.

## 2026-10-12: private staging selected; no server mutation

The user selected **private staging first**, not a public Sophomores cutover.
The initial staging design is a dedicated, resource-limited container with
host-loopback-only binding, accessed over SSH. It must not join the shared
Hideaway application network or mount production volumes, credentials or the
Docker socket. No Nginx, DNS, certificates or public `rp` routing is needed.
The reviewed remote transfer/start/probe/teardown adapter is still unimplemented;
verify checksum, server-side lock, exact container ownership and actual port
exposure before treating this design as an available deployment capability.

A fresh read-only SSH inventory confirmed x86_64, approximately 30 GiB disk
free and 2 GiB available RAM. The same shared Nginx, Payload v33.0.31 and
PostgreSQL services remain; only Nginx publishes 80/443. This is not a capacity
or shared-host vulnerability assessment. No VPS service was changed.

The local Linux toolchain download blocker has cleared. The first whole-app
rehearsal stopped at unfinished OTP localization tests; that failed source is
preserved. After the OTP chat's green freeze checkpoint, the fresh
`staging-green-20261012` run completed snapshot, Linux AMD64 build, isolated
runtime smoke and checksum-verified export. It passed 217 tests and Next
type generation/typecheck/build. No tests were skipped and no dependencies
changed. See the staging-readiness entries in `TESTING-20261011.md` for exact
run/evidence paths. The artifact is ready for the next private staging adapter
step, not an already-deployed VPS service or approved public release.

The fresh JavaScript production audit remains 3 high and 3 moderate findings,
zero critical. No dependency versions were changed. Public asset/copy/flow
gates and independent backup-key custody/full-recovery gaps remain separate.
The user-requested temporary public **Mac-hosted** preview is distinct from
this private VPS staging decision; it does not publish or authorize VPS routes.

**Last updated:** 2026-10-10 UTC (2026-10-11 KST). The original inventory below
was read-only. The subsequently approved, Nginx-only TLS repair is complete;
see the operational handoff below. Sophomores has not been deployed.

## Target and isolation

- App checkout: `/Users/seanschoi/Projects/sphmrs`.
- Source repository: private `xnxchoi/sophomores`, main at
  `604c7f981ab2da3c4f1a8856d8bc21d16f406d34` when inventory began.
- SSH uses the existing `hideawayseoul.com` alias as `deploy`, with strict host
  key checking. Do not copy credentials into deployment profiles or logs.
- VPS: Ubuntu 24.04.4 LTS, x86_64; release platform is `linux/amd64`.
- Public IPv4: `58.229.253.225`. Spaceship remains authoritative for Sophomores.
- Apex, `www` and `rp` A records point to this IPv4. No AAAA was returned during
  the preceding DNS check. Recheck immediately before TLS issuance/cutover.
- `rp` is not an admin service merely because its DNS record exists. Leave
  infrastructure management private and do not add public admin routing.

## Existing shared services — initial inventory

Docker 29.5.2 runs `payload`, `postgres` and `nginx` on the `hideaway` bridge.
Compose owns these services from `/home/deploy/thehideaway/compose.prod.yaml`.
The current app image is `ghcr.io/xnxchoi/hideaway:v33.0.31`; the recorded previous
tag is `v33.0.30`. Neither tag proves a usable database rollback.

Nginx publishes ports 80/443 and routes Hideaway and LOSTINSEOUL to
`payload:3000`. No Sophomores virtual host exists. The app and PostgreSQL have
no public host-port binding. Preserve both existing domains and the shared
proxy; never stop the entire Compose stack to replace one application.

Nginx mounts one production configuration file, its logs, the ACME webroot
`/var/www/certbot`, and individual certificate/key files. Existing media and
PostgreSQL named volumes belong to Hideaway, not Sophomores. Future Payload
CMS needs separate data, media, secrets and backup policy.

Snapshot capacity: approximately 3.8 GiB RAM, 2.1 GiB available, 4 GiB swap,
30 GiB free disk. This is not a build/load capacity guarantee. Prefer building
the Linux artifact away from the shared production host.

## Historical TLS defect — repaired

At inventory, the certificate on the host is renewed and expires 2026-11-28, covering
Hideaway and LOSTINSEOUL apex/www names. The certificate visible inside Nginx
and actually served on port 443 instead expires 2026-09-29; their SHA-256
fingerprints match each other but differ from the host certificate.

Public TLS probes pinned to the VPS IP with each existing domain's SNI fail
certificate verification. This is an existing shared-site defect, independent
of adding Sophomores. The old certificate does not cover Sophomores either.

Individual file bind mounts are consistent with Nginx retaining the old
certificate files after Certbot replaces its symlink targets. A graceful
reload alone cannot fix the stale certificate visible inside the container.
`nginx -t` succeeds, which does not establish certificate freshness.

The production configuration is also a single-file bind mount: atomically
replacing its host path can leave the container reading the old inode. Future
proxy activation must verify the container-visible configuration, not merely
the host file or a successful syntax check.

`certbot.timer` is active and its latest service invocation reports success.
No effective renewal hook was found in the inspected renewal configuration,
CLI configuration, renewal-hook directories, cron entry or service override.
The installed `/usr/local/bin/certbot-reload-nginx` only tests and reloads;
even if invoked, it does not correct stale file mounts. Timer success alone
is therefore insufficient acceptance evidence.

### Completed repair and operational handoff

- Only Nginx was recreated, using its exact existing image. Certificate/key file
  binds were replaced with read-only directory mounts scoped to the lineage's
  `live` and `archive` directories. Certificate paths changed; routing did not.
  Payload and PostgreSQL container IDs and start times remained unchanged.
- The root-only recovery bundle is `/var/lib/sophomores-ops/tls-20261010`
  (directory mode `0700`); its state is `complete`. Its frozen recovery private
  key is mode `0600`: **never copy it into Git, logs or this checkout**.
- Activation ran under systemd service `sophomores-tls-repair-20261010`, independent
  of the SSH connection. Inspect the completed state rather than rerunning it.
  Candidate and valid-certificate fallback were tested in isolated containers
  without published ports, then removed by exact IDs. This was **not a production
  rollback rehearsal**. The frozen fallback is emergency-only and expires with
  the certificate on 2026-11-28.
- The first preparation stopped safely because `.env.production` was absent;
  the existing release process decrypts it temporarily. No secrets were
  decrypted. Resume verified immutable input hashes, certificate identity and
  app/database IDs. The Nginx-only Compose model was extracted with environment
  resolution and interpolation disabled, rejects Nginx environment inputs and
  pins the image. Activation retained the Compose project and explicitly
  disabled orphan removal. Nginx's Compose label now points to the protected
  Nginx-only model; do not use that model to manage the entire stack.
- Root-owned, mode `0755` `/usr/local/bin/certbot-reload-nginx` was updated and
  registered through the executable deploy-hook symlink
  `/etc/letsencrypt/renewal-hooks/deploy/20-hideaway-nginx`. The manually tested
  hook validates trusted hostnames before reload and checks that host, mounted
  and served SHA-256 fingerprints agree afterward. All matched. A future
  renewal has **not** been observed; no dry-run or new issuance was performed.
- Trusted public TLS passed for Hideaway and LOSTINSEOUL apex/www names, with
  certificate expiry 2026-11-28. Hideaway apex/www finished at HTTP 200.
  LOSTINSEOUL apex/www followed `/lostinseoul` to `/gate?returnTo=%2F`, ending at
  HTTP 404. The same chain was verified against an isolated copy of the
  **original routing configuration**: this is a pre-existing application issue,
  not fixed by the TLS repair.
- Three tracked files in `/home/deploy/thehideaway` remain modified:
  `compose.prod.yaml`, `nginx/sites-enabled/production.conf` and
  `scripts/certbot-reload-nginx`. They have **not** been committed or pushed to
  Hideaway's repository. Preserve and reconcile these changes before its next
  pull or deployment; otherwise the repair may be overwritten.

The maintained hook is [`ops/certbot-reload-nginx.sh`](ops/certbot-reload-nginx.sh).
Run `rtk pnpm run test:tls-hook` for its 13 mocked-subprocess tests; these are not
quantitative Bash coverage or proof of a future renewal. On the target,
`openssl x509 -checkhost` returned exit 0 even for a mismatch; the hook instead
uses `openssl verify -verify_hostname` for fail-closed hostname verification.

Local verification for this pass: 140 existing tests plus 13 hook tests passed;
lint and typecheck passed. The dependency audit still reports the previously
documented three high and three moderate findings (no critical findings).
Those remain a Sophomores release gate. No new application build was needed or
claimed for this proxy-only repair. Renewal-hook failures are visible in Certbot
output; separate alert delivery and ongoing monitoring are not configured.

No Sophomores deployment, DNS/mail/database changes or new certificate issuance
occurred. The unresolved backup evidence gap is the next gate.

## Backup evidence gap at initial inspection

Visible `/home/deploy/backups` files are old pre-migration dumps, newest July 3;
at least one historical file is empty. A backup script exists, but no application
backup timer or deploy/root cron backup indicator was found in the inspected
locations. `dpkg-db-backup.timer` backs up the OS package database, not PostgreSQL.
Other provider/offsite backups may exist; none has been verified here.

Before retirement or data changes, verify a current database plus media backup,
encrypted off-server copy, retention policy and successful isolated restore.
Do not treat old dumps, healthy containers or image tags as recovery proof.

## Backup/restore update — 2026-10-11 UTC

The one-off encrypted backup and isolated database restore are now demonstrated.
See [BACKUP-RECOVERY.md](BACKUP-RECOVERY.md) for exact locations, independent
module results, recovery instructions and remaining limitations. Six encrypted
artifacts are authenticated on the Mac; the 158-table database restored locally,
media inventories matched, and the isolated container/database scratch were
cleaned up. Production containers were not restarted.

This closes the immediate one-off capture/DB-restore gap, **not** recurring
backup, independent key custody, coordinated database/media consistency or full
application recovery. The only confirmed age identity remains on the same Mac
as the off-server backup; a protected off-device copy is still required.

The TLS source repair is preserved in an isolated local worktree and patch, not
committed/pushed because the Hideaway local dependency audit has critical
findings. Its original dirty checkout and production app were left untouched.
Sophomores remains undeployed; mail and DNS were not changed.

## Resumable next stages

1. Preserve/reconcile the completed TLS repair and its dirty Hideaway files;
   do not rerun activation. Track the pre-existing LOSTINSEOUL application 404.
2. Finish independent key custody, backup retention/off-device policy, full
   application recovery rehearsal and provider console/recovery access.
3. Clear documented dependency advisories and production asset/content gates.
4. Start a fresh local packaging run targeting Linux AMD64. The earlier
   snapshot-only rehearsal is stale. A working local Docker daemon remains a
   prerequisite; real image build/smoke/export have not been demonstrated.
5. Extend the deployment engine with a reviewed separate VPS profile: server-side
   lock, checksum-verified transfer, identity-owned candidate, isolated probe,
   independent DNS/TLS gates, and conflict-checked proxy switch/rollback.
6. Issue a separate Sophomores certificate for approved public names and add
   only its virtual host after the candidate passes. No shared-app retirement,
   public `rp` dashboard, mail setup or Payload database migration is included.

The existing `deployment/README.md` describes the implemented local engine and
its recovery commands. This checkpoint adds observed target facts; it does not
claim that a production adapter, rollback rehearsal or deployment is complete.
