/** Local planning/validation only: no SSH, Docker execution or deployment authorization. */
import { isIP } from "node:net";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";

export type ArtifactManifest = Readonly<{
  id: string;
  release: string;
  platform: "linux/amd64";
  sha256: string;
}>;
export type StagingTarget = Readonly<{
  sshAlias: string;
  remoteRoot: string;
  localPort: number;
  platform: "linux/amd64";
  release: string;
  nonce: string;
}>;
const releasePattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const hexPattern = /^[a-f0-9]{64}$/;
const imagePattern = /^sha256:[a-f0-9]{64}$/;
function demand(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown): Record<string, unknown> {
  demand(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "Expected an object"
  );
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: readonly string[]) {
  demand(
    Object.keys(value).sort().join("|") === [...expected].sort().join("|"),
    "Unexpected or missing fields"
  );
}
function matches(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

/** artifact.json intentionally has no byte count; match the existing export format exactly. */
export function parseArtifactManifest(value: unknown): ArtifactManifest {
  const v = object(value);
  keys(v, ["id", "release", "platform", "sha256"]);
  demand(matches(v.id, imagePattern), "Invalid image digest");
  demand(matches(v.release, releasePattern), "Invalid release");
  demand(v.platform === "linux/amd64", "Staging requires linux/amd64");
  demand(matches(v.sha256, hexPattern), "Invalid archive checksum");
  return Object.freeze({
    id: v.id,
    release: v.release,
    platform: v.platform,
    sha256: v.sha256
  });
}

export function parseStagingTarget(value: unknown): StagingTarget {
  const v = object(value);
  keys(v, [
    "sshAlias",
    "remoteRoot",
    "localPort",
    "platform",
    "release",
    "nonce"
  ]);
  demand(
    matches(v.sshAlias, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/),
    "Invalid SSH alias"
  );
  // Deliberately narrow roots, never a production checkout or arbitrary system directory.
  demand(
    matches(
      v.remoteRoot,
      /^\/(?:srv|var\/lib|home\/[a-z_][a-z0-9_-]*)\/sophomores-staging$/
    ),
    "Unsafe remote root"
  );
  demand(
    typeof v.localPort === "number" &&
      Number.isInteger(v.localPort) &&
      v.localPort >= 1024 &&
      v.localPort <= 65535,
    "Invalid local viewer port"
  );
  demand(v.platform === "linux/amd64", "Staging requires linux/amd64");
  demand(matches(v.release, releasePattern), "Invalid release");
  demand(matches(v.nonce, /^[a-f0-9]{32}$/), "Invalid ownership nonce");
  return Object.freeze({
    sshAlias: v.sshAlias,
    remoteRoot: v.remoteRoot,
    localPort: v.localPort,
    platform: v.platform,
    release: v.release,
    nonce: v.nonce
  });
}

/** Verify the opened descriptor, not a second pathname read. No archive extraction occurs.
 * This receipt is point-in-time evidence; transfer must hash the actual sent bytes again.
 * Parent directory trust/remote symlink containment belongs to the future transfer adapter.
 */
export async function verifyArchive(
  path: string,
  manifest: unknown,
  expectedBytes: number
) {
  const artifact = parseArtifactManifest(manifest);
  demand(
    Number.isSafeInteger(expectedBytes) && expectedBytes > 0,
    "Invalid expected archive size"
  );
  const file = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
  );
  try {
    const before = await file.stat({ bigint: true });
    demand(before.isFile(), "Archive must be a regular file");
    demand(before.size === BigInt(expectedBytes), "Archive size mismatch");
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of file.createReadStream({ autoClose: false })) {
      bytes += chunk.length;
      demand(bytes <= expectedBytes, "Archive size changed while reading");
      hash.update(chunk);
    }
    const after = await file.stat({ bigint: true });
    demand(
      bytes === expectedBytes &&
        after.size === before.size &&
        after.mtimeNs === before.mtimeNs &&
        after.ctimeNs === before.ctimeNs,
      "Archive changed while reading"
    );
    const sha256 = hash.digest("hex");
    demand(sha256 === artifact.sha256, "Archive checksum mismatch");
    return Object.freeze({ ...artifact, bytes });
  } finally {
    await file.close();
  }
}

const runtimeEnv = Object.freeze([
  "NODE_ENV=production",
  "NEXT_TELEMETRY_DISABLED=1",
  "HOSTNAME=0.0.0.0",
  "PORT=3000"
]);
export function privateCandidatePlan(manifest: unknown, config: unknown) {
  const artifact = parseArtifactManifest(manifest);
  const target = parseStagingTarget(config);
  demand(
    artifact.release === target.release,
    "Artifact/target release mismatch"
  );
  const stem = `sophomores-staging-${target.release}-${target.nonce}`;
  const networkName = `${stem}-net`;
  const labels = Object.freeze({
    "co.sophomores.role": "private-staging",
    "co.sophomores.release": target.release,
    "co.sophomores.nonce": target.nonce,
    "co.sophomores.artifact": artifact.sha256
  });
  const labelArgs = Object.entries(labels).flatMap(([key, value]) => [
    "--label",
    `${key}=${value}`
  ]);
  // Internal bridge blocks routed internet access, NOT host-service reachability.
  // No host ports are published. Later live preflight must prove host-service isolation.
  return Object.freeze({
    artifact,
    target,
    containerName: stem,
    networkName,
    labels,
    networkArgv: Object.freeze([
      "network",
      "create",
      "--driver",
      "bridge",
      "--internal",
      ...labelArgs,
      networkName
    ]),
    runArgv: Object.freeze([
      "run",
      "-d",
      "--pull",
      "never",
      "--name",
      stem,
      ...labelArgs,
      "--platform",
      target.platform,
      "--network",
      networkName,
      "--workdir",
      "/app",
      "--no-healthcheck",
      "--user",
      "1000:1000",
      "--entrypoint",
      "node",
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      "128",
      "--memory",
      "1g",
      "--memory-swap",
      "1g",
      "--cpus",
      "1",
      "--restart",
      "no",
      "--ipc",
      "private",
      ...runtimeEnv.flatMap((entry) => ["--env", entry]),
      artifact.id,
      "server.js"
    ])
  });
}

function equals(actual: unknown, expected: unknown, message: string) {
  demand(JSON.stringify(actual) === JSON.stringify(expected), message);
}
function empty(value: unknown) {
  return value == null || (Array.isArray(value) && value.length === 0);
}
function checkLabels(
  actual: unknown,
  expected: Readonly<Record<string, string>>
) {
  const labels = object(actual);
  for (const [key, value] of Object.entries(expected))
    demand(labels[key] === value, "Foreign ownership labels");
  demand(
    !Object.keys(labels).some((key) => key.startsWith("com.docker.compose.")),
    "Compose ownership collision"
  );
}
function checkEnvironment(value: unknown) {
  demand(
    Array.isArray(value) && value.every((item) => typeof item === "string"),
    "Invalid runtime environment"
  );
  demand(
    new Set(value.map((entry: string) => entry.split("=", 1)[0])).size ===
      value.length,
    "Duplicate environment key"
  );
  for (const entry of runtimeEnv)
    demand(value.includes(entry), "Missing runtime environment");
  // Standard node base-image metadata only; application/provider credentials are not allowed.
  const base =
    /^(?:PATH=[a-zA-Z0-9_/:.-]+|NODE_VERSION=[0-9.]+|YARN_VERSION=[0-9.]+)$/;
  demand(
    value.every((entry) => runtimeEnv.includes(entry) || base.test(entry)),
    "Unexpected runtime environment"
  );
}
function checkHost(value: unknown, networkName: string) {
  const h = object(value);
  demand(
    h.NetworkMode === networkName &&
      h.Privileged === false &&
      h.ReadonlyRootfs === true &&
      h.PublishAllPorts === false,
    "Unsafe runtime isolation"
  );
  if (h.PortBindings != null) keys(object(h.PortBindings), []);
  equals(h.CapDrop, ["ALL"], "Unsafe capability drops");
  demand(
    empty(h.CapAdd) &&
      empty(h.Binds) &&
      empty(h.Devices) &&
      empty(h.DeviceRequests) &&
      empty(h.Mounts),
    "Unsafe runtime attachments"
  );
  demand(
    Array.isArray(h.SecurityOpt) &&
      h.SecurityOpt.length === 1 &&
      ["no-new-privileges", "no-new-privileges=true"].includes(
        h.SecurityOpt[0]
      ),
    "Unsafe security options"
  );
  demand(
    h.PidsLimit === 128 &&
      h.Memory === 1073741824 &&
      h.MemorySwap === 1073741824 &&
      h.NanoCpus === 1000000000,
    "Unsafe resource limits"
  );
  equals(
    h.RestartPolicy,
    { Name: "no", MaximumRetryCount: 0 },
    "Unsafe restart policy"
  );
  demand(
    h.PidMode === "" && h.IpcMode === "private" && h.UTSMode === "",
    "Unsafe host namespaces"
  );
  if (h.Tmpfs != null) keys(object(h.Tmpfs), []);
  for (const key of [
    "VolumesFrom",
    "Links",
    "ExtraHosts",
    "GroupAdd",
    "CapAdd"
  ])
    demand(empty(h[key]), "Unsafe inherited attachment");
}

/** Ownership proof is deliberately separate from liveness: crashed owned objects can be removed.
 * The caller must re-inspect under a remote lock and compare BOTH returned IDs with
 * the durable original IDs recorded at creation before reconciliation or teardown.
 * Matching names/labels/configuration do not authorize adopting replacement objects.
 * Remove only by the proven original IDs, never by name; this is not an adoption API.
 * This validates supplied Docker evidence only, not firewall/host reachability or health.
 */
export function validateOwnedCandidate(
  manifest: unknown,
  config: unknown,
  container: unknown,
  network: unknown
) {
  const plan = privateCandidatePlan(manifest, config);
  const c = object(container),
    n = object(network);
  demand(
    matches(c.Id, hexPattern) && matches(n.Id, hexPattern),
    "Invalid Docker object identity"
  );
  demand(
    c.Name === `/${plan.containerName}` && c.Image === plan.artifact.id,
    "Foreign candidate identity"
  );
  const runtime = object(c.Config);
  checkLabels(runtime.Labels, plan.labels);
  demand(
    runtime.Image === plan.artifact.id && runtime.User === "1000:1000",
    "Unsafe image or runtime user"
  );
  demand(runtime.WorkingDir === "/app", "Unexpected runtime working directory");
  if (runtime.Healthcheck != null)
    equals(
      object(runtime.Healthcheck).Test,
      ["NONE"],
      "Executable or invalid healthcheck"
    );
  equals(runtime.Entrypoint, ["node"], "Unexpected entrypoint");
  equals(runtime.Cmd, ["server.js"], "Unexpected runtime command");
  checkEnvironment(runtime.Env);
  equals(c.Mounts, [], "Unexpected mounted data");
  checkHost(c.HostConfig, plan.networkName);
  const settings = object(c.NetworkSettings);
  // Exposed image port is metadata only: internal bridges publish no host bindings.
  if (settings.Ports != null) {
    const ports = object(settings.Ports);
    demand(
      Object.keys(ports).every((key) => key === "3000/tcp"),
      "Unexpected exposed ports"
    );
    demand(empty(ports["3000/tcp"]), "Unsafe observed port bindings");
  }
  const networks = object(settings.Networks);
  keys(networks, [plan.networkName]);
  demand(
    object(networks[plan.networkName]).NetworkID === n.Id,
    "Network identity mismatch"
  );
  demand(
    n.Name === plan.networkName &&
      n.Driver === "bridge" &&
      n.Internal === true &&
      n.EnableIPv4 === true &&
      n.EnableIPv6 === false,
    "Unsafe staging network"
  );
  checkLabels(n.Labels, plan.labels);
  const defaults: Readonly<Record<string, string>> = {
    "com.docker.network.enable_ipv4": "true",
    "com.docker.network.enable_ipv6": "false"
  };
  demand(
    Object.entries(object(n.Options)).every(
      ([key, value]) => Object.hasOwn(defaults, key) && defaults[key] === value
    ),
    "Unsafe network options"
  );
  const members = object(n.Containers);
  demand(
    Object.keys(members).every((id) => id === c.Id),
    "Foreign network member"
  );
  return Object.freeze({ containerId: c.Id, networkId: n.Id });
}

function ipv4Number(value: unknown): number {
  demand(
    typeof value === "string" && isIP(value) === 4,
    "Invalid private IPv4 address"
  );
  return value
    .split(".")
    .reduce((result, octet) => result * 256 + Number(octet), 0);
}
function privateRange(ip: number) {
  return (
    (ip >= 0x0a000000 && ip <= 0x0affffff) ||
    (ip >= 0xac100000 && ip <= 0xac1fffff) ||
    (ip >= 0xc0a80000 && ip <= 0xc0a8ffff)
  );
}
function subnet(value: unknown) {
  demand(
    typeof value === "string" &&
      /^[0-9.]+\/(?:[1-9]|[12][0-9]|30)$/.test(value),
    "Invalid IPv4 subnet"
  );
  const [address, bits] = value.split("/");
  const first = ipv4Number(address),
    prefix = Number(bits);
  const size = 2 ** (32 - prefix),
    last = first + size - 1;
  demand(
    first % size === 0 && privateRange(first) && privateRange(last),
    "Subnet must be canonical RFC1918 range"
  );
  return { first, last, prefix };
}
function inspectedDestination(
  c: Record<string, unknown>,
  n: Record<string, unknown>,
  networkName: string,
  id: string
) {
  const attachment = object(
    object(object(c.NetworkSettings).Networks)[networkName]
  );
  const ip = ipv4Number(attachment.IPAddress);
  const configs = object(n.IPAM).Config;
  demand(
    Array.isArray(configs) && configs.length === 1,
    "Require one inspected IPv4 subnet"
  );
  const range = subnet(object(configs[0]).Subnet);
  demand(
    ip > range.first &&
      ip < range.last &&
      attachment.IPPrefixLen === range.prefix,
    "Candidate address outside usable subnet"
  );
  const member = object(object(n.Containers)[id]);
  demand(
    member.IPv4Address === `${attachment.IPAddress}/${range.prefix}`,
    "Network member address mismatch"
  );
  return attachment.IPAddress as string;
}

/** Plan only: destination comes from fresh inspected evidence, never caller-supplied IP.
 * Caller must hold the remote lock, inspect by persisted IDs and keep this tunnel scoped
 * to that exact container lifetime. Tear it down on stop/replacement; an IP can be reused.
 * No process management or firewall/reachability guarantee is provided here.
 */
function unverifiedTunnel(
  manifest: unknown,
  config: unknown,
  container: unknown,
  network: unknown,
  recordedIDs: unknown
) {
  const ids = validateOwnedCandidate(manifest, config, container, network);
  const recorded = object(recordedIDs);
  keys(recorded, ["containerId", "networkId"]);
  demand(
    recorded.containerId === ids.containerId &&
      recorded.networkId === ids.networkId,
    "Original recorded Docker IDs mismatch"
  );
  const c = object(container),
    n = object(network);
  demand(
    object(c.State).Running === true,
    "Tunnel requires a running candidate"
  );
  const plan = privateCandidatePlan(manifest, config);
  const destination = inspectedDestination(
    c,
    n,
    plan.networkName,
    ids.containerId
  );
  return Object.freeze({
    ...ids,
    destination,
    sshArgv: Object.freeze([
      "-N",
      "-T",
      "-o",
      "StrictHostKeyChecking=yes",
      "-o",
      "BatchMode=yes",
      "-o",
      "ExitOnForwardFailure=yes",
      "-o",
      "ForwardAgent=no",
      "-o",
      "ForwardX11=no",
      "-o",
      "Tunnel=no",
      "-o",
      "GatewayPorts=no",
      "-o",
      "PermitLocalCommand=no",
      "-o",
      "ControlMaster=no",
      "-o",
      "ControlPath=none",
      "-L",
      `127.0.0.1:${plan.target.localPort}:${destination}:3000`,
      plan.target.sshAlias
    ])
  });
}

/** Returns only a non-connecting ssh -G probe; it preserves alias authentication/known-hosts config. */
export function tunnelConfigProbe(
  manifest: unknown,
  config: unknown,
  container: unknown,
  network: unknown,
  recordedIDs: unknown
) {
  const plan = unverifiedTunnel(
    manifest,
    config,
    container,
    network,
    recordedIDs
  );
  return Object.freeze({
    configCheckArgv: Object.freeze(["-G", ...plan.sshArgv])
  });
}

function validateEffectiveSshConfig(value: unknown, expectedForward: string) {
  demand(
    typeof value === "string" && value.length > 0 && value.length <= 131072,
    "Missing or invalid effective SSH config"
  );
  const fields = value
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const [key, ...parts] = line.trim().split(/\s+/);
      return { key: key.toLowerCase(), value: parts.join(" ") };
    });
  const required: Readonly<Record<string, readonly string[]>> = {
    localforward: [expectedForward],
    forwardagent: ["no"],
    forwardx11: ["no"],
    tunnel: ["no", "false"],
    gatewayports: ["no"],
    permitlocalcommand: ["no"],
    clearallforwardings: ["no"],
    controlmaster: ["no", "false"],
    stricthostkeychecking: ["yes", "true"],
    batchmode: ["yes"],
    exitonforwardfailure: ["yes"]
  };
  demand(
    !fields.some(
      ({ key }) => key === "remoteforward" || key === "dynamicforward"
    ),
    "Unexpected inherited SSH forwarding"
  );
  for (const [key, allowed] of Object.entries(required)) {
    const matches = fields.filter((field) => field.key === key);
    demand(
      matches.length === 1 && allowed.includes(matches[0].value),
      `Unsafe or duplicate effective SSH ${key}`
    );
  }
}

/** Execution argv is gated on reviewed ssh -G output from tunnelConfigProbe with identical inputs.
 * The future adapter must freeze the reviewed effective config or revalidate immediately before
 * launch: SSH config/include files and Docker/IP identities can change after this check.
 * This function does not run SSH, maintain the tunnel, or guarantee absence of configuration drift.
 */
export function tunnelPlan(
  manifest: unknown,
  config: unknown,
  container: unknown,
  network: unknown,
  recordedIDs: unknown,
  effectiveConfig: unknown
) {
  const plan = unverifiedTunnel(
    manifest,
    config,
    container,
    network,
    recordedIDs
  );
  const target = parseStagingTarget(config);
  validateEffectiveSshConfig(
    effectiveConfig,
    `[127.0.0.1]:${target.localPort} [${plan.destination}]:3000`
  );
  return plan;
}
