import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { payloadEnvironmentSchema } from "../../src/payload/configuration";
import {
  deploymentAction,
  type ActionContext
} from "../../scripts/deployment/actions";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "soph-actions-"));
  const runDir = join(root, ".deployment/runs/test-release");
  mkdirSync(runDir, { recursive: true });
  const calls: string[][] = [];
  const id = `sha256:${"a".repeat(64)}`;
  const context: ActionContext = {
    root,
    runDir,
    release: "test-release",
    platform: "linux/amd64"
  };
  const command = async (argv: readonly string[]) => {
    calls.push([...argv]);
    if (argv[0] === "image" && argv[1] === "inspect")
      return JSON.stringify([
        {
          Id: id,
          Os: "linux",
          Architecture: "amd64",
          Config: { Labels: { "co.sophomores.release": context.release } }
        }
      ]);
    if (argv[0] === "container" && argv[1] === "inspect")
      return JSON.stringify([
        {
          Id: "container-id",
          Config: { Labels: { "co.sophomores.release": context.release } }
        }
      ]);
    if (argv[0] === "image" && argv[1] === "save")
      writeFileSync(argv[3], "test-image");
    return "container-id";
  };
  writeFileSync(
    join(runDir, "image.json"),
    JSON.stringify({ id, release: context.release, platform: context.platform })
  );
  return {
    context,
    calls,
    command,
    id,
    clean: () => rmSync(root, { recursive: true, force: true })
  };
}

test("build check rejects retagged images", async () => {
  const f = fixture();
  try {
    await deploymentAction("check-build", f.context, f.command);
    await assert.rejects(
      deploymentAction("check-build", f.context, async () =>
        JSON.stringify([{ Id: "foreign" }])
      ),
      /identity/
    );
  } finally {
    f.clean();
  }
});

test("smoke runs without public ports and removes only inspected owned container", async () => {
  const f = fixture();
  try {
    await deploymentAction("smoke", f.context, f.command);
    assert.ok(f.calls.find((a) => a[0] === "run")?.includes("none"));
    assert.ok(!f.calls.flat().includes("-p"));
    const run = f.calls.find((a) => a[0] === "run")!;
    const environment = Object.fromEntries(
      run.flatMap((value, index) => {
        if (value !== "--env") return [];
        const assignment = run[index + 1];
        const separator = assignment.indexOf("=");
        return [[assignment.slice(0, separator), assignment.slice(separator + 1)]];
      }),
    );
    assert.equal(payloadEnvironmentSchema.safeParse(environment).success, true,
      "packaging smoke supplies explicit schema-valid synthetic Payload configuration");
    const database = new URL(environment.DATABASE_URI);
    assert.equal(database.hostname, "127.0.0.1");
    assert.equal(database.port, "1");
    assert.match(environment.PAYLOAD_SECRET, /(?:synthetic|packaging|smoke)/i);
    assert.deepEqual(Object.keys(environment).sort(), ["DATABASE_URI", "PAYLOAD_SECRET", "PREVIEW_AUTH_MODE"]);
    assert.ok(run.includes("PREVIEW_AUTH_MODE=public"));
    assert.equal(run[run.indexOf("--network") + 1], "none");
    assert.equal(run[run.indexOf("PREVIEW_AUTH_MODE=public") - 1], "--env");
    const script = f.calls.find((a) => a[0] === "exec")?.at(-1);
    assert.equal(
      spawnSync(process.execPath, ["--check"], {
        input: script,
        encoding: "utf8"
      }).status,
      0
    );
    assert.deepEqual(f.calls.at(-1), ["rm", "-f", "container-id"]);
    await deploymentAction("check-smoke", f.context, f.command);
  } finally {
    f.clean();
  }
});

test("failed smoke is not recorded; owned candidate is still cleaned up", async () => {
  const f = fixture();
  try {
    await assert.rejects(
      deploymentAction("smoke", f.context, async (argv) => {
        if (argv[0] === "exec") throw new Error("health failed");
        return f.command(argv);
      })
    );
    assert.deepEqual(f.calls.at(-1), ["rm", "-f", "container-id"]);
    await assert.rejects(deploymentAction("check-smoke", f.context, f.command));
  } finally {
    f.clean();
  }
});

test("smoke never removes a container with foreign ownership", async () => {
  const f = fixture();
  try {
    await assert.rejects(
      deploymentAction("smoke", f.context, async (argv) => {
        if (argv[0] === "container")
          return JSON.stringify([{ Id: "foreign", Config: { Labels: {} } }]);
        return f.command(argv);
      }),
      /ownership/
    );
    assert.ok(!f.calls.some((a) => a[0] === "rm"));
  } finally {
    f.clean();
  }
});

test("export checksum detects corruption", async () => {
  const f = fixture();
  try {
    await deploymentAction("export", f.context, f.command);
    await deploymentAction("check-export", f.context, f.command);
    assert.ok(
      JSON.parse(readFileSync(join(f.context.runDir, "artifact.json"), "utf8"))
        .sha256
    );
    writeFileSync(join(f.context.runDir, "image.tar"), "changed");
    await assert.rejects(
      deploymentAction("check-export", f.context, f.command),
      /checksum/
    );
  } finally {
    f.clean();
  }
});

test("rejects unknown actions and unsafe release/platform values before commands", async () => {
  const f = fixture();
  try {
    await assert.rejects(
      deploymentAction("oops", f.context, f.command),
      /Unknown/
    );
    await assert.rejects(
      deploymentAction(
        "build",
        { ...f.context, release: "../../bad" },
        f.command
      ),
      /release/
    );
    await assert.rejects(
      deploymentAction(
        "build",
        { ...f.context, platform: "darwin/arm64" },
        f.command
      ),
      /platform/
    );
    assert.equal(f.calls.length, 0);
  } finally {
    f.clean();
  }
});

test("snapshot/build stage uses isolated source, refuses existing image tags and detects changed source", async () => {
  const f = fixture();
  try {
    for (const name of ["app", "public", "deployment"])
      mkdirSync(join(f.context.root, name));
    for (const name of [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "proxy.ts",
      "deployment/Dockerfile",
      "deployment/Dockerfile.dockerignore"
    ])
      writeFileSync(join(f.context.root, name), "fixture");
    rmSync(join(f.context.runDir, "image.json"));
    const docker = (args: readonly string[]) =>
      args[0] === "image" && args[1] === "ls"
        ? Promise.resolve("")
        : f.command(args);
    await deploymentAction("check-retry-snapshot", f.context, docker);
    await deploymentAction("snapshot", f.context, docker);
    await deploymentAction("check-snapshot", f.context, docker);
    await assert.rejects(
      deploymentAction("check-retry-snapshot", f.context, docker)
    );
    await deploymentAction("check-retry-build", f.context, docker);
    await assert.rejects(
      deploymentAction("build", f.context, f.command),
      /already exists/
    );
    await deploymentAction("build", f.context, docker);
    const build = f.calls.find((a) => a[0] === "buildx");
    assert.ok(build?.includes("linux/amd64"));
    assert.equal(build?.at(-1), join(f.context.runDir, "source"));
    await assert.rejects(
      deploymentAction("check-retry-build", f.context, docker)
    );
    writeFileSync(join(f.context.root, "app/new.ts"), "changed");
    await assert.rejects(
      deploymentAction("check-snapshot", f.context, docker),
      /changed/
    );
  } finally {
    f.clean();
  }
});

test("retry checks require absent container/final artifact and smoke evidence stays tied to image", async () => {
  const f = fixture();
  try {
    const docker = (args: readonly string[]) =>
      args[0] === "ps" ? Promise.resolve("") : f.command(args);
    await deploymentAction("check-retry-smoke", f.context, docker);
    await assert.rejects(
      deploymentAction("check-retry-smoke", f.context, f.command),
      /remains/
    );
    await deploymentAction("check-retry-export", f.context, docker);
    writeFileSync(join(f.context.runDir, "image.tar"), "partial");
    await assert.rejects(
      deploymentAction("check-retry-export", f.context, docker),
      /exists/
    );
    writeFileSync(
      join(f.context.runDir, "smoke.json"),
      JSON.stringify({ id: "wrong" })
    );
    await assert.rejects(
      deploymentAction("check-smoke", f.context, docker),
      /stale/
    );
    writeFileSync(
      join(f.context.runDir, "image.json"),
      JSON.stringify({ id: "wrong" })
    );
    await assert.rejects(
      deploymentAction("check-build", f.context, docker),
      /changed/
    );
  } finally {
    f.clean();
  }
});
