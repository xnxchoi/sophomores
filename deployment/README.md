# Checkpointed deployment

## Approved direction — same-host replacement (2026-11-10)

The owner selected the existing VPS and wants Hideaway taken down as Sophomores
is deployed, rather than kept as a permanent parallel application. This records
the deployment direction; it does not execute a stage or establish readiness.
The existing [commerce/site launch plan](../docs/reference/commerce-launch-plan.md)
remains governing: deployment is its final milestone, not a replacement plan,
permission to omit unfinished functionality, or a marketing-only shortcut.
The fallback is **the currently running Hideaway installation**, not its newer,
unconfirmed source. Record its image ID/digest, tag and observed time; a tag or
Git version alone is not a recovery point.

| Phase | Completion gate / boundary |
|---|---|
| 1. Record the running installation | Separately approved read-only local/source and VPS inventory: exact image/container identities, shared service/route/mount ownership, capacity and backup evidence. Do not print secrets. Historical host/service observations below are not current inventory. |
| 2. Preserve a recoverable Hideaway | Fresh encrypted off-host database/roles, uploads/assets and protected configuration/secrets; retain the exact runnable image, proxy/TLS dependencies and deployment descriptor. Verify independent key custody and isolated recovery, with outbound mail/payments disabled. Agree a write-freeze/consistency procedure for the final database/media recovery point. Backup creation/transfer/restore needs its scoped approval. |
| 3. Prepare Sophomores | Freeze a reviewed source revision, resolve build/runtime configuration and test gates, then build/smoke/export the exact Linux image. Use a separate Sophomores database/role and media storage; never apply its migrations to Hideaway data. Check capacity before temporary overlap. Builds, remote adapter execution, credentials and database changes are separately bounded phases. |
| 4. Switch and retain rollback | After recovery and candidate acceptance, switch only approved routes and stop only the identified Hideaway application service when its shared consumers are accounted for. Preserve its image, database, media and configuration through the rollback window. Revert routing and restart that exact installation if acceptance fails; never point Hideaway at Sophomores data. No volume/image deletion, pruning or blanket Compose shutdown is included. |

**Shared-host caution:** older inventory recorded Hideaway and LOSTINSEOUL sharing
an application, Nginx and PostgreSQL. Refresh that map before deciding what can
stop. Do not assume sunsetting Hideaway authorizes interrupting LOSTINSEOUL or
removing infrastructure Sophomores still needs.

### Current planning checkpoint

- **2026-11-12 navigation candidate:** source/delivery checkpoint `701b1b8`,
  administrative dispatch base `1c77931`; exact delivered G1/B/S1 identities and
  current ownership belong to the [single registry panel](../docs/To-Do%20List.md#current-maintenance-checkpoint).
  Historical `30c947d`/catalogue-WIP observations are not current source identity.
  Recheck owner WIP before any future freeze; this pass does not inspect credentials
  or create a release candidate.
- The local profile still implements snapshot/build/smoke/export only. Do not
  invent a remote cutover stage or assume the historical staging adapter exists.
- Batch 7a repairs the build/package-smoke validation contract at source level;
  see the operations reference below. Real image construction, static generation
  and runtime configuration acceptance remain separate release gates. Never
  embed production secrets or connect a build to the old production database.
- Batch 7b explicitly separates two owner-deferred CSS suites from the functional
  release gate. Default `pnpm test` still includes every prebuild assertion.
  Source-ownership failures stay blocking; the styling deferral is not an
  architectural waiver. See the release-check contract below.
- **Read-only inventory complete:** see the
  [2026-11-10 current observations](VPS-PREFLIGHT.md#2026-11-10-read-only-inventory--existing-plan-retained).
  Running Hideaway is pinned to `v33.0.31` plus immutable image/digest and revision
  label. The host also runs eight older Sophomores previews; the mounted proxy
  still routes Hideaway and LOSTINSEOUL to the same app. None was stopped.
- Feature dispatch remains held; only bounded handoff preparation is authorized.
  Any later owner-resumed work stays within the existing plan. Canonical
  membership/phone verification is still
  localhost-only; Batch 7c repaired local ownership checks, not actual image/runtime
  or provider acceptance. Do not deploy incomplete registration to reach cutover sooner.
- No backup, image build, database query/migration, container start/stop, proxy,
  DNS/TLS configuration change or payment/mail call occurred during inventory.

<!-- AUTO-GENERATED: current-operations-reference BEGIN -->
## Current operations reference — 2026-11-10

Sources: `package.json`, `deployment/{local.json,Dockerfile}`,
`scripts/deployment/{actions,command,package}.ts`, `../src/payload.config.ts`, and
`../src/lib`. Preserve the manual stage/rollback procedures
below; this current-source note is not evidence that a release was built or
deployed.

- Development/contribution commands are listed in the
  [README command reference](../README.md#available-package-scripts).
- Canonical auth, migrations, environment requirements, recovery retention and
  explicit database checks belong in the
  [local auth runbook](../docs/deployment/member-auth.local.md).
  The old [member-auth pilot](MEMBER-AUTH.md) is historical, not an active issuer.
- `rtk pnpm ci` applies migrations **before** building. It is database-mutating,
  not a read-only CI probe. Destructive fresh migration is a temporary policy for
  the owner's existing disposable local database only, never a release rollback.
- The default Docker profile still owns snapshot → build → smoke → export.
  `deployment/Dockerfile` runs unit tests, Next type generation, typecheck and
  build, then copies standalone/static/public output into a non-root runtime.
  No current source declares a new `/api/health` endpoint: packaging smoke checks
  `/`, a referenced static asset and `/favicon.ico`, not auth/provider readiness.
- **Batch 7a configuration contract (local/offline checks only):** Payload still
  requires `PAYLOAD_SECRET` and `DATABASE_URI` when its configuration loads.
  The Dockerfile supplies visibly synthetic values via a shell export scoped to
  its single tests → typegen → typecheck → build instruction, with network access
  disabled for that instruction. The URI targets loopback port 1, not a usable
  database. These are not Docker `ENV`/`ARG` defaults and the independent runtime
  stage does not inherit them. The isolated packaging-smoke container receives
  its own explicit synthetic values, with no network or published ports.
  Host application/provider secrets remain filtered; snapshots still exclude
  private environment files. No real credentials belong in build arguments,
  source files or image layers.
- **Not a DB-free image acceptance:** these values pass the configuration schema,
  not a database connection. Payload Local API calls during Next static generation
  can still require data. The functional release gate still retains non-style
  failures. A real Linux build, generated-artifact inspection and packaged
  startup/static-asset probes remain pending; no static-generation workaround or
  test waiver is introduced here. Packaging smoke is not private-preview,
  authentication, commerce or provider acceptance.
- **Real runtime remains explicit:** the Payload schema still rejects missing or
  invalid database/secret inputs. Provision the dedicated Sophomores database,
  protected runtime configuration and persistent media only under their separate
  approvals. No runtime fallback credentials or new public verifier permissions
  are supplied by this repair; production-built local TEST behavior is retained.
- Retention scheduling, real staff-session/browser acceptance, provider delivery,
  commercial checkout, production auth/privacy, backup/restore and deployment
  remain separate gates. No remote deployment or provider change is authorized
  by this documentation update.

For failures, use the evidence/lock/reconciliation procedures below. No automatic
production database rollback, monitoring/alert service, or on-call escalation
integration is configured by this local profile; stop at an uncertain gate and
involve the repository/service owner rather than inventing a recipient or bypass.
<!-- AUTO-GENERATED: current-operations-reference END -->

This is a **local release-preparation workflow**, not permission to deploy. It
packages this app for Linux without modifying the live Hideaway VPS, DNS, TLS,
mail accounts or production traffic. It does not provision or retire servers.

The separate, guarded existing-VPS backup and isolated restore modules are
documented in [BACKUP-RECOVERY.md](BACKUP-RECOVERY.md). They are not deployment
stages and never start the application or restore production.

## Release-check contract — Batch 7b

- `pnpm test` remains the complete **prebuild** suite. Its existing database,
  provider and built-runtime opt-in boundaries remain; this is not all acceptance.
- `pnpm test:functional` selects the Docker release gate. It excludes exactly
  `tests/styling/deferred-article-grid.test.tsx` and
  `tests/styling/deferred-clock-delegation.test.ts`. These contain the retained
  CSS assertions only; content, image behavior, accessible status, animation
  behavior, auth, payments and source-ownership checks remain blocking.
- `pnpm test:styling` runs those assertions visibly and returns their real status.
  Their owner-approved nonblocking disposition does not delete or fix them, and
  is not visual acceptance. Default discovery still includes both files.
- Local agents use `pnpm test:functional:guarded`,
  `pnpm test:styling:guarded` or `pnpm test:guarded`, serially. Mode conflicts fail
  before any environment loading or database access. The gate-partition tests
  assert exhaustive, disjoint discovery and retain the architecture check.
- Behavior tests use semantic scope and current translated labels where needed,
  not frozen UX sentences. Catalogue output checks belong to localization tests;
  rewriting prose must not by itself invalidate focus or purchase-flow checks.

See the [current 7b panel](../docs/reference/commerce-launch-plan.md#step-7b) for
actual evidence and blocking findings. No green release or image is implied.

## Runtime and persistence contract — not activation

This is the required contract for a future functional candidate, not a runnable
deployment descriptor. No database, volume, credential or server is created by
this document. The strict isolation in `scripts/deployment/staging-contract.ts`
must remain: its read-only filesystem, no app credentials and no mounts describe
an isolated specimen, not a customer/CMS/fulfillment runtime.

| Concern | Required input or invariant | Acceptance still required |
|---|---|---|
| Database | Private `DATABASE_URI` for a dedicated Sophomores database/role, never Hideaway's data or credentials. Payload and canonical account/commerce records retain one authority. | Reviewed target, least-privilege grants, connectivity/TLS policy, schema and compatible data; no reset or reused local-only proof policy. |
| Runtime secrets | `PAYLOAD_SECRET` is required and at least 32 characters. `BETTER_AUTH_SECRET` is optional in the schema and currently falls back to the Payload secret; independently provision it for the functional target. No synthetic build/smoke values as runtime defaults. | Private injection and secret custody/rotation under separate approval; missing/invalid Payload config must remain rejected. |
| Origin | Explicit intended canonical origin. Current auth precedence is `NEXT_PUBLIC_SERVER_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, then localhost. | Verify the frozen candidate's public build values, auth callbacks, browser/server origin agreement and proxy authority; runtime injection cannot be assumed to override inlined public values. |
| Preview ingress | Unset preview mode is protected. Protected mode requires a readable, absolute `PREVIEW_AUTH_CONFIG` path, mounted read-only outside build context. Public mode is an explicit ingress decision, not public membership/phone-proof approval. | Correct private mount/path permissions and protected HTML/data/assets; later public mode requires its own approval and full functionality. |
| Durable media | `ContentMedia` is the `media` collection with `upload: true`; installed Payload defaults `staticDir` to the collection slug. Under `/app`, uploads resolve to **`/app/media`**, not `public/media`. Use dedicated persistent storage with effective app-user write access. | Verify final UID/GID, create/mount the target directory with suitable ownership, upload/read/delete and retention across container replacement. `COPY --chown=node:node` alone does not create or grant `/app/media`. |
| Runtime writes | Explicitly review the frozen candidate's Next cache/revalidation and temporary writes as well as media. Do not assume the isolated specimen's fully read-only filesystem is a functional runtime configuration. | Confirm necessary writable paths and bounded storage without making source/secrets writable or mounting Hideaway media. No cache-service install is implied. |
| Migrations | `push: false`; run reviewed migrations explicitly using the matching frozen source/toolchain and migration ledger. Build and `server.js` do not migrate. Do not assume standalone output includes executable migration tools. | Separately approved backup/recovery point, migration job, concurrency exclusion, completion evidence and data-preserving recovery. `pnpm ci` mutates DB before build; `migrate:fresh` is not a deployment or rollback procedure. |
| Public providers/proofs | Existing local phone-verifier and TEST-payment boundaries remain unchanged. Public enrollment/production trust, mail delivery and PortOne operation need reviewed runtime settings and their existing explicit approvals. | Real customer, CMS, shipping/guest/perk journeys and bounded provider/device checks—not merely an HTTP 200 homepage. |

Source ownership: `src/payload.config.ts`,
`src/lib/payload/configuration.ts`, `src/lib/payload/collections/media/index.ts`,
`src/lib/auth/options.ts`, `src/lib/preview-auth/{runtime,session}.ts`,
`package.json`, and the installed Payload collection sanitizer/upload writer.
Next's installed self-hosting/environment-variable guides distinguish runtime
server values, public build inlining and on-disk caches. This contract does not
claim a DB-free build, media-capable image or successful migration.

## What works now

`deployment/local.json` defines four independent stages:

1. **snapshot** — copy an allowlisted, fingerprinted source tree into this run.
2. **build** — use local Docker's default builder to produce a Linux image;
   run the app tests, Next type generation, typecheck and build inside it.
3. **smoke** — start an isolated, resource-limited container without external
   network or published ports; check `/`, a referenced Next static asset and
   `/favicon.ico`; remove only the inspected container belonging to this run.
   This packaging-only smoke explicitly sets `PREVIEW_AUTH_MODE=public` inside
   that disposable `--network none` container. It is not private-auth acceptance.
4. **export** — save the exact image ID to a tar archive and record its SHA-256.

The `public` and `.next/static` assets are included in the standalone runtime.
The runtime is non-root. macOS-built native modules are never uploaded to Linux.
Building downloads dependencies/base images, but does not publish an image.

## Start, pause, resume

Run from the repository root, with the package manager declared in package.json.
The platform below is an **example**, not evidence of the VPS architecture.
Verify the actual server architecture before choosing it.

```sh
rtk pnpm run deploy plan
rtk pnpm run deploy init --run rehearsal-001 --platform linux/amd64
rtk pnpm run deploy run --run rehearsal-001 --stage snapshot
rtk pnpm run deploy status --run rehearsal-001
rtk pnpm run deploy run --run rehearsal-001 --stage build
rtk pnpm run deploy run --run rehearsal-001 --stage smoke
rtk pnpm run deploy run --run rehearsal-001 --stage export
```

Alternatively, `rtk pnpm run deploy resume --run rehearsal-001` walks dependency
order, rechecks prior successes, and stops at the first failed/uncertain gate.
Omitting the command is equivalent to `plan`: no stage commands are executed.
Pause between stages by simply stopping there. There is no background scheduler.

Each run lives in ignored `.deployment/runs/<id>/`. Preserve this directory:
it contains the journal, original configuration, context, snapshot and artifact
evidence. Successful export produces `image.tar` and `artifact.json` there.
Do not edit the journal to skip checks. Do not commit or upload the entire state
directory; only transfer the verified runtime artifact when authorized.

## When assumptions turn out wrong

| Situation                                   | Next action                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A manual prerequisite is unmet              | Fix it, rerun that stage. No acknowledgement-only bypass exists.                                                                  |
| Source/config changed                       | Start a new run ID. Docker can reuse build cache; old evidence is preserved rather than relabelled.                               |
| Action may have completed                   | Inspect actual state, then `reconcile --run <id> --stage <id>`; reconciliation observes, never replays.                           |
| Failed action left a known safe baseline    | `reset --run <id> --stage <id>` runs the declared `retryCheck`; only a passing check resets to pending. Then run the stage again. |
| Check cannot prove completion or safe retry | Stop and repair deliberately. There is no force-success/reset flag.                                                               |
| Run ID was partially initialized            | Preserve that incomplete directory and initialize a new ID. No external work occurs during init.                                  |

Built-in retry checks require: no partial snapshot; no release image tag; no
remaining smoke container; or no finalized export, respectively. Build/smoke/export
also verify their preceding evidence. A partial export `.tmp` is owned by its
run and can be overwritten on a proven-safe retry. Other partial artifacts are
left for inspection; neither reset nor reconciliation deletes them.

An **unknown** operation blocks further actions. Even a command reporting failure
may have changed something. There are no blind automatic retries.

### Interrupted processes and locks

The CLI serializes runs with the same target in this checkout and also locks each
run. Commands record an `activity.json` marker under `.deployment/targets/<hash>/`
before spawning, then record the child PID. SIGINT/SIGTERM terminates the child
process group; interruption/timeout retains the marker. SIGKILL cannot run cleanup.

If a marker remains:

1. Inspect the recorded parent/child and the Docker daemon or remote system.
   A dead client PID does **not** prove daemon/SSH work has stopped.
2. Stop or wait for that specific operation as appropriate. Inspect any candidate
   container/image using the run's identity, not a broad prune command.
3. Only after establishing no work remains, archive that marker for investigation.
4. Run `rtk pnpm run deploy recover-lock --run <id> --ack-no-owner`.
   Active local owners and unverified foreign-host owners are refused.
5. Reconcile the uncertain stage, or use its proven-safe reset path.

These are **checkout-local locks**, not a multi-host deployment lock. Never run
this workflow simultaneously from another checkout/machine against the same
target. A future VPS adapter must acquire a server-side lock as well.

## Rollback contract

The engine supports explicit `rollback` + `rollbackCheck` stage commands.
`rtk pnpm run deploy rollback --run <id> --stage <id>` verifies the forward state,
refuses completed dependents, records reversal intent and checks the result.
Reverse dependent stages first. An interrupted rollback reconciles against the
**rollback** check, not the forward check.

Recovery uses the archived configuration and original run identity, so editing
app source or breaking/deleting the current config does not prevent rollback.
Deployment adapter code must still match its saved fingerprint; restore the
original adapter version before recovery if those scripts changed. The source
snapshot includes those scripts after snapshot succeeds.

The bundled local profile declares **no destructive rollback**: a snapshot/image
isn't a live traffic switch, and retaining it is safer than deleting it.
Production proxy rollback is not wired up yet. Database migrations, DNS
propagation and deleted data must never be described as instantly reversible.

## Adding the VPS stages after live inventory

The [private staging implementation checkpoint](STAGING.md) describes the local
artifact/isolation contract and the remaining SSH-only adapter modules. It is
not an executable remote profile and does not authorize a VPS mutation.

See the [VPS checkpoint and TLS repair handoff](VPS-PREFLIGHT.md)
(updated 2026-10-10 UTC): the approved Nginx-only repair is complete, but the
backup evidence gap remains. Preserve the server-side Hideaway changes before
its next deployment. This is not Sophomores deployment acceptance.

Create a separate reviewed profile once target facts are verified. Stages use
fixed argv arrays, not interpolated shell strings; dependency order is explicit.
Each stage requires `check`; mutating stages additionally use `apply`, optionally
paired `rollback`/`rollbackCheck`, and optional `retryCheck` for safe resetting.
Manual stages have only a check. A check exits 0 for proven state, 1 for unmet
state; other exit codes, timeouts and spawn failures mean observation failed.

Remote mutations and remote safe-reset operations require `--allow-remote` on
that invocation. Remote checks may perform read-only network access. **Config is
trusted executable code**, not a sandbox: calling a stage `manual`/`local` does
not make an arbitrary executable safe. Review checks as carefully as mutations.
Do not put credentials in argv/config; the archived config is private but not
encrypted. Custom adapters receive `SOPH_DEPLOY_RUN_DIR`, `SOPH_DEPLOY_RELEASE`
and `SOPH_DEPLOY_PLATFORM`; they must not print secrets.

Expected VPS extension order:

1. Read-only inventory: OS/architecture, disk/RAM, Docker, current images, domains,
   certificate renewal and the existing Nginx container's network.
2. Verify off-server backups and a recovery route before any retirement.
3. Transfer checksum-verified image; prepare an isolated candidate and server lock.
4. Probe through the actual container network. Host loopback is not automatically
   reachable from the existing containerized Nginx.
5. DNS and TLS checks as independent gates. Keep Spaceship authoritative; don't
   alter MX/mail records or adopt guessed VPS addresses.
6. Capture the precise prior proxy config, validate the candidate config, switch
   only Sophomores routing, reload, verify HTTPS/application identity.
7. Rollback restores only the captured owned routing after checking no unexpected
   edits occurred; verify the old service before claiming success.
8. Retire old app resources later with separate approval. Never shut down the
   entire Hideaway Compose stack just to stop the old app: it owns the shared proxy.

No production adapter is supplied with assumed ports, IPs, Docker network names,
credentials or certificate paths. Mail and Korean-number verification remain
separate workstreams.

## Diagnostics, security and validation

Subprocess output is not journalled or printed by default; errors report the
failed stage/purpose without potentially exposing credentials. For detailed
diagnosis, inspect local Docker build history/container logs for that specific
run or execute the reviewed stage command manually. Never paste unredacted logs.

Only the explicit packaging allowlist enters Docker's context. Packaging accepts
one complete source-layout profile: legacy root `app/` with root `proxy.ts`, or
current `src/app/` with `src/proxy.ts`. Mixed or missing application roots and a
missing matching proxy fail closed so the authentication gate cannot silently
disappear from a release. Legacy root-layout fingerprint serialization is retained
for compatibility with existing evidence; old snapshots and journals are not
rewritten. Historical snapshots retain their own Dockerfile bytes; fingerprint
compatibility does not promise that every legacy snapshot builds with today's
Docker recipe.

The current profile includes `src/`, the required `messages/` directory, and the exact
`patches/payload.patch` declared by `pnpm-workspace.yaml`, alongside the existing
root fonts, configuration, public assets, tests, scripts and design inputs.
A missing locale directory or declared patch fails closed; individual locale files
are copied and fingerprinted, not checked for import completeness. `src/hideaway/` stays
in the source snapshot because retained tests reference it; inclusion is not
activation of that quarantined code. Secret, symlink, source-race and destination
checks still apply to both profiles.

The Docker dependency layer copies the declared patch before frozen installation.
With `WORKDIR /app`, standalone output remains at `/app/.next/standalone`, static
assets at `/app/.next/static`, and public assets at `/app/public`—not beneath
`/app/src/app`. Standalone packaging requires the explicit static/public copies.
The earlier source-layout repair and Batch 7a's synthetic configuration contract
do not establish that a real image builds or runs. No real credentials or private
environment files belong in the snapshot or image.

This compatibility pass covers source packaging and synthetic fixtures only, not
dependency installation, an image build, runtime/provider/database acceptance or
deployment. Batch 7b corrects the old four-failure classification: a stale brand
locator is not styling; the two deferred CSS assertions are now explicit suites,
and mixed source ownership remains a blocking check. No functional or security
test is disabled by the styling disposition.

The exact preview ingress config/renewal hook needed by build-time tests are
allowlisted individually; the rest of `deployment/` is not recursively included.
See [PREVIEW-AUTH.md](PREVIEW-AUTH.md) for the consolidated protected runtime
contract and its separate private-asset/auth acceptance gates.
Root `.env*`,
`.sops*`, private keys, Git metadata and local artifacts are excluded; secret-like
names and symlinks inside allowed trees fail closed. This is not a content-based
secret scanner: do not embed credentials in application source. Review any real
credentials previously shared in templates, independently of deployment.

```sh
rtk pnpm test:deployment
rtk pnpm test:deployment:coverage
```

Deployment coverage applies to `scripts/deployment/**`; CLI behavior also has
subprocess tests for safe planning, archived rollback and interrupted children.
The Docker command adapter is mocked in action tests. Passing these tests does
not establish a successful real Docker build, Linux runtime, VPS rollout,
certificate renewal or public rollback. Those need separate acceptance evidence.

The app's release-readiness constraints in the root README still apply. The
pipeline must not silently remove draft flags, invent launch dates, enable
registration/email or waive asset clearance to make deployment pass.

### Known dependency audit findings (2026-10-09)

The pre-push `pnpm audit --prod` reported three high and three moderate
advisories in the existing dependency graph. Nodemailer needs at least 10.0.9
to address its reported advisories; no application import was found during this
pass. The `braces` advisory affects tooling paths through `next-sitemap` and
`shadcn`, with no patched version listed by the audit. No dependency upgrades,
removals or guessed overrides were made as part of this source-control pass.
These findings require a separate dependency-remediation pass before production
release. A private source push is not a security or deployment acceptance gate.
