import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, symlink, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  parseArtifactManifest,
  parseStagingTarget,
  verifyArchive,
  privateCandidatePlan,
  validateOwnedCandidate,
  tunnelPlan as checkedTunnelPlan,
  tunnelConfigProbe
} from "../../scripts/deployment/staging-contract";

// Required-field fixture matches local OpenSSH -G output, verified without connecting.
const safeSshConfig = [
  "localforward [127.0.0.1]:33220 [172.18.0.2]:3000",
  "forwardagent no",
  "forwardx11 no",
  "tunnel false",
  "gatewayports no",
  "permitlocalcommand no",
  "clearallforwardings no",
  "controlmaster false",
  "stricthostkeychecking true",
  "batchmode yes",
  "exitonforwardfailure yes",
  "hostname hideawayseoul.com",
  "user deploy"
].join("\n");
function tunnelPlan(
  manifest: unknown,
  config: unknown,
  container: unknown,
  network: unknown,
  ids: unknown
) {
  return checkedTunnelPlan(
    manifest,
    config,
    container,
    network,
    ids,
    safeSshConfig
  );
}

const id = `sha256:${"a".repeat(64)}`;
const artifact = {
  id,
  release: "release-one",
  platform: "linux/amd64",
  sha256: createHash("sha256").update("archive").digest("hex")
};
const target = {
  sshAlias: "hideawayseoul.com",
  remoteRoot: "/srv/sophomores-staging",
  localPort: 33220,
  platform: "linux/amd64",
  release: artifact.release,
  nonce: "b".repeat(32)
};
function inspection() {
  const plan = privateCandidatePlan(artifact, target);
  const container = {
    Id: "c".repeat(64),
    Name: `/${plan.containerName}`,
    Image: id,
    Config: {
      Image: id,
      Labels: plan.labels,
      User: "1000:1000",
      WorkingDir: "/app",
      Entrypoint: ["node"],
      Cmd: ["server.js"],
      Env: [
        "NODE_ENV=production",
        "NEXT_TELEMETRY_DISABLED=1",
        "HOSTNAME=0.0.0.0",
        "PORT=3000"
      ]
    },
    HostConfig: {
      NetworkMode: plan.networkName,
      PortBindings: {},
      Privileged: false,
      CapDrop: ["ALL"],
      CapAdd: null,
      SecurityOpt: ["no-new-privileges"],
      PidsLimit: 128,
      Memory: 1073741824,
      MemorySwap: 1073741824,
      NanoCpus: 1000000000,
      ReadonlyRootfs: true,
      RestartPolicy: { Name: "no", MaximumRetryCount: 0 },
      Binds: null,
      Devices: [],
      DeviceRequests: null,
      PidMode: "",
      IpcMode: "private",
      UTSMode: "",
      PublishAllPorts: false
    },
    Mounts: [],
    NetworkSettings: {
      Ports: { "3000/tcp": [] },
      Networks: {
        [plan.networkName]: {
          NetworkID: "d".repeat(64),
          IPAddress: "172.18.0.2",
          IPPrefixLen: 16
        }
      }
    },
    State: { Running: false, ExitCode: 1, Health: { Status: "unhealthy" } }
  };
  const network = {
    Id: "d".repeat(64),
    Name: plan.networkName,
    Driver: "bridge",
    Internal: true,
    EnableIPv4: true,
    EnableIPv6: false,
    IPAM: {
      Driver: "default",
      Options: {},
      Config: [{ Subnet: "172.18.0.0/16", Gateway: "172.18.0.1" }]
    },
    Labels: plan.labels,
    Options: {},
    Containers: { [container.Id]: { IPv4Address: "172.18.0.2/16" } }
  };
  return { plan, container, network };
}

test("manifest accepts exactly the exporter format and rejects malformed/untrusted fields", () => {
  assert.deepEqual(parseArtifactManifest(artifact), artifact);
  assert.ok(Object.isFrozen(parseArtifactManifest(artifact)));
  for (const value of [
    null,
    undefined,
    [],
    "",
    {},
    { ...artifact, extra: "x" },
    { ...artifact, id: "latest" },
    { ...artifact, sha256: "g".repeat(64) },
    { ...artifact, release: "../x" },
    { ...artifact, platform: "linux/arm64" }
  ]) {
    assert.throws(() => parseArtifactManifest(value));
  }
});

test("target requires explicit safe alias/root/high local viewer port and collision-resistant nonce", () => {
  assert.deepEqual(parseStagingTarget(target), target);
  for (const value of [
    null,
    [],
    {},
    { ...target, sshAlias: "-oProxyCommand=evil" },
    { ...target, sshAlias: "a;id" },
    { ...target, remoteRoot: "/" },
    { ...target, remoteRoot: "/srv/../sophomores-staging" },
    { ...target, remoteRoot: "/srv/🔥" },
    { ...target, remoteRoot: "/home/deploy/thehideaway" },
    { ...target, localPort: 1023 },
    { ...target, localPort: 65536 },
    { ...target, localPort: "33220" },
    { ...target, localPort: 1024.5 },
    { ...target, nonce: "x" },
    { ...target, platform: "linux/arm64" },
    { ...target, release: "a b" },
    { ...target, unknown: true }
  ])
    assert.throws(() => parseStagingTarget(value));
  for (const port of [1024, 65535])
    assert.equal(
      parseStagingTarget({ ...target, localPort: port }).localPort,
      port
    );
});

test("archive receipt checks bytes/checksum, rejects tampering, symlinks, directories and missing files", async () => {
  const root = await mkdtemp(join(tmpdir(), "staging-contract-"));
  try {
    const path = join(root, "image.tar");
    await writeFile(path, "archive");
    const receipt = await verifyArchive(path, artifact, 7);
    assert.equal(receipt.bytes, 7);
    assert.equal(receipt.sha256, artifact.sha256);
    assert.ok(Object.isFrozen(receipt));
    await assert.rejects(verifyArchive(path, artifact, 6), /size/i);
    for (const bytes of [0, -1, NaN, 1.2, Number.MAX_SAFE_INTEGER + 1])
      await assert.rejects(verifyArchive(path, artifact, bytes));
    await writeFile(path, "changed");
    await assert.rejects(verifyArchive(path, artifact, 7), /checksum/i);
    await symlink(path, join(root, "link"));
    await assert.rejects(verifyArchive(join(root, "link"), artifact, 7));
    await mkdir(join(root, "dir"));
    await assert.rejects(verifyArchive(join(root, "dir"), artifact, 7));
    await assert.rejects(verifyArchive(join(root, "missing"), artifact, 7));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("candidate plan is immutable, digest-pinned, private, isolated and never executes", () => {
  const plan = privateCandidatePlan(artifact, target);
  assert.ok(
    Object.isFrozen(plan) &&
      Object.isFrozen(plan.runArgv) &&
      Object.isFrozen(plan.labels)
  );
  assert.ok(
    !plan.runArgv.includes("--publish") && !plan.runArgv.includes("-p")
  );
  assert.deepEqual(plan.runArgv.slice(-2), [id, "server.js"]);
  assert.ok(plan.networkArgv.includes("--internal"));
  assert.equal(plan.runArgv[plan.runArgv.indexOf("--pull") + 1], "never");
  assert.ok(
    !plan.runArgv.includes("--volume") && !plan.runArgv.includes("--env-file")
  );
  assert.notEqual(
    plan.containerName,
    privateCandidatePlan(artifact, { ...target, nonce: "e".repeat(32) })
      .containerName
  );
  assert.throws(
    () => privateCandidatePlan(artifact, { ...target, release: "different" }),
    /release/i
  );
});

test("reconciliation validates identity independently of running/healthy state, permitting owned crash rollback", () => {
  const { container, network } = inspection();
  assert.equal(
    validateOwnedCandidate(artifact, target, container, network).containerId,
    container.Id
  );
  assert.equal(
    validateOwnedCandidate(
      artifact,
      target,
      { ...container, State: undefined },
      network
    ).networkId,
    network.Id
  );
  for (const Ports of [null, {}])
    assert.equal(
      validateOwnedCandidate(
        artifact,
        target,
        {
          ...container,
          NetworkSettings: { ...container.NetworkSettings, Ports }
        },
        network
      ).containerId,
      container.Id
    );
  assert.equal(
    validateOwnedCandidate(artifact, target, container, {
      ...network,
      Containers: {}
    }).containerId,
    container.Id
  );
});

test("reconciliation rejects foreign collisions, unexpected config, privilege, exposure and production mounts", () => {
  const { container: c, network: n } = inspection();
  const changes = [
    null,
    {},
    { ...c, Id: "x" },
    { ...c, Name: "/foreign" },
    { ...c, Image: `sha256:${"f".repeat(64)}` },
    { ...c, Config: { ...c.Config, Labels: {} } },
    { ...c, Config: { ...c.Config, User: "0" } },
    { ...c, Config: { ...c.Config, Image: "latest" } },
    { ...c, Config: { ...c.Config, Cmd: ["evil.js"] } },
    {
      ...c,
      Config: { ...c.Config, Env: [...c.Config.Env, "DATABASE_URL=production"] }
    },
    {
      ...c,
      NetworkSettings: {
        ...c.NetworkSettings,
        Ports: { "3000/tcp": [{ HostIp: "0.0.0.0", HostPort: "33220" }] }
      }
    },
    { ...c, Mounts: [{ Source: "/var/run/docker.sock" }] },
    { ...c, NetworkSettings: { Networks: { hideaway: {} } } },
    ...[
      { Privileged: true },
      { CapAdd: ["SYS_ADMIN"] },
      { SecurityOpt: [] },
      { Memory: 0 },
      { MemorySwap: -1 },
      { NanoCpus: 0 },
      { PidsLimit: 0 },
      { ReadonlyRootfs: false },
      { Binds: ["/data:/app"] },
      { Mounts: [{}] },
      { Tmpfs: { "/app": "rw" } },
      { Devices: [{}] },
      { DeviceRequests: [{}] },
      { NetworkMode: "host" },
      { PidMode: "host" },
      { IpcMode: "host" },
      { UTSMode: "host" },
      { PublishAllPorts: true },
      { RestartPolicy: { Name: "always" } },
      {
        PortBindings: { "3000/tcp": [{ HostIp: "0.0.0.0", HostPort: "33220" }] }
      },
      {
        PortBindings: {
          "3000/tcp": [{ HostIp: "127.0.0.1", HostPort: "33221" }]
        }
      }
    ].map((patch) => ({ ...c, HostConfig: { ...c.HostConfig, ...patch } }))
  ];
  for (const changed of changes)
    assert.throws(() => validateOwnedCandidate(artifact, target, changed, n));
  for (const network of [
    null,
    {},
    { ...n, Internal: false },
    { ...n, Driver: "overlay" },
    { ...n, Labels: {} },
    { ...n, Name: "hideaway" },
    { ...n, Id: "e".repeat(64) },
    { ...n, Options: { evil: "true" } },
    { ...n, Containers: { foreign: {} } }
  ])
    assert.throws(() => validateOwnedCandidate(artifact, target, c, network));
});

test("runtime workdir is pinned and inherited healthcheck commands cannot execute", () => {
  const { plan, container, network } = inspection();
  assert.equal(plan.runArgv[plan.runArgv.indexOf("--workdir") + 1], "/app");
  assert.ok(plan.runArgv.includes("--no-healthcheck"));
  for (const WorkingDir of [undefined, "", "/tmp", "/app/elsewhere"])
    assert.throws(
      () =>
        validateOwnedCandidate(
          artifact,
          target,
          { ...container, Config: { ...container.Config, WorkingDir } },
          network
        ),
      /working directory/i
    );
  for (const Healthcheck of [
    {},
    { Test: [] },
    { Test: ["CMD", "evil"] },
    { Test: ["CMD-SHELL", "curl host"] },
    { Test: ["NONE", "extra"] }
  ])
    assert.throws(
      () =>
        validateOwnedCandidate(
          artifact,
          target,
          { ...container, Config: { ...container.Config, Healthcheck } },
          network
        ),
      /healthcheck/i
    );
  for (const Healthcheck of [undefined, null, { Test: ["NONE"] }])
    assert.equal(
      validateOwnedCandidate(
        artifact,
        target,
        { ...container, Config: { ...container.Config, Healthcheck } },
        network
      ).containerId,
      container.Id
    );
});

test("real Docker internal-bridge defaults accept exposed-but-unpublished ports without publishing", () => {
  // Observed in local Docker29 rehearsal2026-10-12; identity fields are synthetic.
  const { container, network } = inspection();
  const observedNetwork = {
    ...network,
    Options: {
      "com.docker.network.enable_ipv4": "true",
      "com.docker.network.enable_ipv6": "false"
    }
  };
  for (const Ports of [{ "3000/tcp": [] }, { "3000/tcp": null }, {}, null])
    for (const PortBindings of [{}, null, undefined])
      assert.equal(
        validateOwnedCandidate(
          artifact,
          target,
          {
            ...container,
            HostConfig: { ...container.HostConfig, PortBindings },
            NetworkSettings: { ...container.NetworkSettings, Ports }
          },
          observedNetwork
        ).networkId,
        network.Id
      );
  for (const Options of [
    { unknown: undefined },
    { "com.docker.network.enable_ipv4": "false" },
    { "com.docker.network.enable_ipv6": "true" },
    { "com.docker.network.bridge.gateway_mode_ipv4": "nat" }
  ])
    assert.throws(() =>
      validateOwnedCandidate(artifact, target, container, {
        ...network,
        Options
      })
    );
  for (const patch of [{ EnableIPv4: false }, { EnableIPv6: true }])
    assert.throws(() =>
      validateOwnedCandidate(artifact, target, container, {
        ...network,
        ...patch
      })
    );
  for (const Ports of [
    { "3000/tcp": [{ HostIp: "127.0.0.1", HostPort: "33220" }] },
    { "22/tcp": [{ HostIp: "0.0.0.0", HostPort: "22" }] }
  ])
    assert.throws(() =>
      validateOwnedCandidate(
        artifact,
        target,
        {
          ...container,
          NetworkSettings: { ...container.NetworkSettings, Ports }
        },
        network
      )
    );
});

test("tunnel uses original recorded identities and inspected RFC1918 subnet address, never a supplied destination", () => {
  const { container, network } = inspection();
  const running = { ...container, State: { Running: true } };
  const ids = { containerId: container.Id, networkId: network.Id };
  const plan = tunnelPlan(artifact, target, running, network, ids);
  assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.sshArgv));
  assert.ok(plan.sshArgv.includes("127.0.0.1:33220:172.18.0.2:3000"));
  for (const flag of [
    "StrictHostKeyChecking=yes",
    "BatchMode=yes",
    "ExitOnForwardFailure=yes",
    "ForwardAgent=no"
  ])
    assert.ok(plan.sshArgv.includes(flag));
  assert.equal(plan.sshArgv.at(-1), target.sshAlias);
  for (const records of [
    null,
    {},
    { ...ids, containerId: "a".repeat(64) },
    { ...ids, networkId: "b".repeat(64) }
  ])
    assert.throws(() =>
      tunnelPlan(artifact, target, running, network, records)
    );
  assert.throws(
    () => tunnelPlan(artifact, target, container, network, ids),
    /running/i
  );
  const missing = {
    ...container,
    NetworkSettings: {
      ...container.NetworkSettings,
      Networks: { [inspection().plan.networkName]: { NetworkID: network.Id } }
    }
  };
  assert.equal(
    validateOwnedCandidate(artifact, target, missing, network).containerId,
    container.Id
  );
  assert.throws(() =>
    tunnelPlan(
      artifact,
      target,
      { ...missing, State: { Running: true } },
      network,
      ids
    )
  );
  for (const ip of [
    "",
    "127.0.0.1",
    "8.8.8.8",
    "169.254.169.254",
    "172.18.0.0",
    "172.18.255.255",
    "172.19.0.2",
    "172.18.0.02",
    "::1",
    "172.18.0.2;evil"
  ])
    assert.throws(() =>
      tunnelPlan(
        artifact,
        target,
        {
          ...running,
          NetworkSettings: {
            ...running.NetworkSettings,
            Networks: {
              [inspection().plan.networkName]: {
                NetworkID: network.Id,
                IPAddress: ip,
                IPPrefixLen: 16
              }
            }
          }
        },
        network,
        ids
      )
    );
  for (const Subnet of [
    "172.18.0.0/0",
    "172.18.0.0/33",
    "172.18.0.0/-1",
    "172.18.0.0/16x",
    "172.18.0.1/16",
    "8.0.0.0/8",
    "172.18.0.0/31",
    "172.18.0.0/16/evil"
  ])
    assert.throws(() =>
      tunnelPlan(
        artifact,
        target,
        running,
        { ...network, IPAM: { Config: [{ Subnet }] } },
        ids
      )
    );
  assert.throws(() =>
    tunnelPlan(
      artifact,
      target,
      running,
      {
        ...network,
        Containers: { [container.Id]: { IPv4Address: "172.18.0.3/16" } }
      },
      ids
    )
  );
  assert.throws(() =>
    tunnelPlan(
      artifact,
      target,
      running,
      { ...network, IPAM: { Config: [] } },
      ids
    )
  );
  assert.throws(() =>
    tunnelPlan(
      artifact,
      target,
      running,
      {
        ...network,
        IPAM: {
          Config: [{ Subnet: "172.18.0.0/16" }, { Subnet: "172.18.0.0/16" }]
        }
      },
      ids
    )
  );
});

test("SSH probe exposes no executable tunnel before effective inherited config passes", () => {
  const { container, network } = inspection();
  const running = { ...container, State: { Running: true } };
  const ids = { containerId: container.Id, networkId: network.Id };
  const probe = tunnelConfigProbe(artifact, target, running, network, ids);
  assert.ok(Object.isFrozen(probe) && Object.isFrozen(probe.configCheckArgv));
  assert.ok(!("sshArgv" in probe));
  assert.equal(probe.configCheckArgv[0], "-G");
  for (const option of ["ForwardX11=no", "Tunnel=no", "GatewayPorts=no"])
    assert.ok(probe.configCheckArgv.includes(option));
  const plan = checkedTunnelPlan(
    artifact,
    target,
    running,
    network,
    ids,
    safeSshConfig
  );
  assert.deepEqual(probe.configCheckArgv.slice(1), plan.sshArgv);
  for (const config of [
    undefined,
    null,
    "",
    {},
    "x".repeat(131073),
    safeSshConfig + "\nlocalforward [0.0.0.0]:4444 [127.0.0.1]:80",
    safeSshConfig + "\nremoteforward 4444 127.0.0.1:80",
    safeSshConfig + "\ndynamicforward [0.0.0.0]:5555",
    safeSshConfig + "\nforwardagent no",
    safeSshConfig.replace("[172.18.0.2]:3000", "[127.0.0.1]:22"),
    safeSshConfig.replace("[127.0.0.1]:33220", "[0.0.0.0]:33220")
  ])
    assert.throws(
      () => checkedTunnelPlan(artifact, target, running, network, ids, config),
      /SSH/i
    );
  for (const key of [
    "forwardagent",
    "forwardx11",
    "tunnel",
    "gatewayports",
    "permitlocalcommand",
    "clearallforwardings",
    "controlmaster"
  ])
    assert.throws(
      () =>
        checkedTunnelPlan(
          artifact,
          target,
          running,
          network,
          ids,
          safeSshConfig.replace(new RegExp(`^${key} .+$`, "m"), `${key} yes`)
        ),
      /SSH/i
    );
  for (const key of [
    "stricthostkeychecking",
    "batchmode",
    "exitonforwardfailure"
  ])
    assert.throws(
      () =>
        checkedTunnelPlan(
          artifact,
          target,
          running,
          network,
          ids,
          safeSshConfig.replace(new RegExp(`^${key} .+$`, "m"), `${key} no`)
        ),
      /SSH/i
    );
  assert.throws(
    () =>
      checkedTunnelPlan(
        artifact,
        target,
        running,
        network,
        ids,
        safeSshConfig.replace("gatewayports no", "")
      ),
    /SSH/i
  );
  assert.ok(
    checkedTunnelPlan(
      artifact,
      target,
      running,
      network,
      ids,
      safeSshConfig +
        "\nidentityfile /home/deploy/.ssh/id_ed25519\nserveraliveinterval 15\n"
    ).sshArgv
  );
});
