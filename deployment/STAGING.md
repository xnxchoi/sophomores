# Private VPS staging — implementation checkpoint

This is a **local preparation slice, not an executable remote deployment**.
No upload, server-side claim, container start, SSH tunnel, DNS, TLS or Nginx
change is authorized or performed by the contract module. The existing
`deployment/local.json` continues to package locally only.

## Scope and accepted source checkpoint

The accepted teaser and disconnected verification study are committed at
`7d0567d6d88ebb480a86a7a168533fb56141051f` on `main` in the private
`xnxchoi/sophomores` repository. The phone flow still does not send, persist
phone data, launch a composer or grant authentication.

The previously verified Linux AMD64 export is recorded in
`TESTING-20261011.md` under `staging-green-20261012`. It was built from a frozen
working-tree snapshot **before** this commit, not from a clean Git checkout;
do not relabel it as a commit-built artifact. Preserve its manifest, archive
and source fingerprint. New automation source requires a fresh deployment
run rather than overwriting or editing that frozen run.

## First slice: local contract

`scripts/deployment/staging-contract.ts` defines artifact/target validation,
archive verification, a private candidate command plan and inspection checks.
It does not execute those commands. Tests live in
`tests/deployment-staging-contract.test.ts` and run with the existing
deployment test glob.

The contract must establish all of the following before a future adapter
is allowed to act:

- The archive matches the export manifest's SHA-256 and a separately supplied
  expected byte count; the image ID is immutable and platform is Linux AMD64.
- Remote endpoint/root/port are explicit validated inputs, not guessed server
  defaults or shell fragments. The root is dedicated staging state, never the
  Hideaway checkout or production volumes.
- A unique release/nonce identifies dedicated network/container ownership.
- Container ports are **not published to the host**, with non-root execution,
  dropped capabilities, no-new-privileges and bounded resources. No production
  mounts, host networking, provider credentials or Docker socket.
- Inspection proves resource identity and configuration separately from health.
  An exited but exactly owned container must remain eligible for scoped teardown.
- The future adapter must compare inspection IDs against the original durably
  recorded container/network IDs under its lock. Matching names and nonce labels
  alone do not authorize adopting replacement objects. Interrupted-create
  discovery needs a distinct reviewed reconciliation path before IDs are recorded.

These are input/inspection checks, not proof that a real VPS enforces isolation.
Remote symlinks, exclusive resource creation, host capacity and port availability
must still be observed under a server-side lock by the future adapter.

## Subsequent modules, in order

1. **Claim:** strict host-key SSH, batch mode, no TTY/agent forwarding; persistent
   release/nonce/artifact claim with server-side `flock`. Loss of the client must
   not free or steal the claim.
2. **Transfer:** exclusive partial upload, remote checksum/size verification,
   atomic publication and import of the exact immutable image. Conflicts fail
   closed. Preserve incomplete evidence; do not blindly retry after SSH loss.
3. **Candidate:** inspect name collisions, create dedicated internal network,
   create/start only the recorded image and record immutable resource IDs.
4. **Verify:** forward a viewer-side `127.0.0.1` listener over SSH directly to the
   inspected container private IPv4, fixed port 3000. Recheck original IDs,
   network membership and subnet before each tunnel; do not accept a caller's
   destination IP. Probe page/Next asset/favicon through that tunnel. An SSH
   connection alone does not prove HTTP reachability. No public `rp` route.
5. **Teardown:** reverse candidate then transfer receipt then claim, only after
   rechecking identities and foreign network attachments. Retain image/archive;
   no pruning or production service commands.

The generic engine requires a passing forward check before rollback. Therefore
candidate checks prove **ownership/configuration**, not running/healthy state.
Do not make health a final succeeded manual stage: manual stages have no rollback
and would block reversal of their dependencies. Keep acceptance a separate
read-only verification action with explicit evidence.

Interrupted mutations remain unknown until reconciled by observation. Safe reset
requires a proven baseline; a dead SSH client is not proof that work stopped.
Keep all adapter helpers under the existing automation fingerprint boundary
(`scripts/deployment/*.ts`), or extend and test that boundary before adding
external helper files. SSH remote commands are shell text even when the local
SSH process receives an argv array: validate/encode the remote protocol, never
interpolate arbitrary strings.

The tunnel must be an explicitly owned process, closed before container/network
replacement or teardown. Otherwise an old forwarding destination can reach a
different container after IP reuse. Local-port conflicts fail closed; do not
kill another process or silently choose a public listener.

SSH alias configuration can add unrelated `LocalForward`, `RemoteForward` or
`DynamicForward` listeners. Explicit `-L 127.0.0.1:...` alone does not prevent
that. First inspect the effective configuration with the generated `ssh -G`
probe; tunnel planning must reject extra forwards and require disabled agent,
X11, tunnel-device and local-command features. Do not use
`ClearAllForwardings=yes` as a shortcut: it also removes the intended forward.
The future executor must freeze the reviewed configuration or revalidate it
immediately before launching; this local module does not manage config drift.

## Rehearsal-driven design correction

An actual Docker Desktop 29.8.2 rehearsal rejected the initial combination of
`--internal` and host-loopback port publishing: configured bindings existed but
Docker reported an empty observed binding. Docker also supplies IPv4/IPv6 network
default options that an empty-options-only validator rejected. The owned test
resources were removed; no VPS or existing containers were changed.

The corrected design keeps the internal bridge, removes host publishing entirely
and plans an SSH tunnel to its inspected private address. Only the known Docker
default options are accepted; routing/exposure overrides still fail closed.
An ordinary Linux Docker host can access an internal bridge, unlike the macOS
host outside Docker Desktop's VM. Local contract/container tests therefore do
**not** prove the future Linux-host SSH route. That remains an explicit remote
acceptance gate; do not relax isolation to bypass it.

The corrected no-publish plan passed nine actual local Docker checks: running
and stopped identity/configuration validation, non-root `/app` execution and
internal page/static-asset/favicon HTTP 200 responses. Exact owned resources
were removed and absence verified, with existing containers preserved. Evidence
is local/ignored at `.deployment/staging-contract-20261012/DOCKER-PROOF.md`;
the first failed design is retained alongside it. Tunnel arguments were planned,
not connected. Subsequent SSH effective-config hardening is tested offline,
not represented as a live forwarding result.

## Isolation limits and release gates

Docker's `--internal` bridge blocks normal external routing but **does not fully
isolate the host**: containers may reach services on the bridge address and
services listening on all host addresses. Removing published ports likewise
does not make shared-kernel execution a sandbox. Check actual host-service
reachability and resolve any unacceptable exposure before staging.

Recheck the daemon version and absence of published bindings, rather than
trusting a CLI flag or an old inventory. Do not change shared daemon/firewall
settings as an incidental workaround. References:

- [Docker port publishing and gateway modes](https://docs.docker.com/engine/network/port-publishing/)
- [Docker bridge networks](https://docs.docker.com/engine/network/drivers/bridge/)

The existing dependency advisories (3 high, 3 moderate; zero critical), asset
clearance, draft copy/date, preview-only invitation and backup/full-application
recovery gaps remain separate gates. This contract does not waive any of them.

The Mac-hosted public preview is independent: leave port 3220 and its current
cloudflared process running. No server changes are required to retain it.
