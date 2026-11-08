# Checkpointed deployment

<!-- AUTO-GENERATED: current-operations-reference BEGIN -->
## Current operations reference — 2026-11-02

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
- **Configuration gap requiring release work:** Payload now requires
  `PAYLOAD_SECRET` and `DATABASE_URI` while loading its configuration. The current
  Dockerfile/build action does not declare a reviewed injection mechanism for
  those values; source snapshots exclude private environment/secret files, and
  deployment child environments strip app/provider secrets. Do not copy private
  env files into the build, add embedded secrets, or treat an old package smoke
  result as current authentication-enabled build acceptance. Review build-time
  versus runtime configuration before executing this pipeline for a release.
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

Only the explicit packaging allowlist enters Docker's context. Root `proxy.ts`
is mandatory so the authentication gate cannot silently disappear from a release.
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
