import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { createRequire } from "node:module";
import { command, safeEnvironment } from "../scripts/deployment/command";

const root = resolve(import.meta.dirname, "..");
const cli = resolve(root, "scripts/deploy.ts");
const loader = createRequire(import.meta.url).resolve("tsx");
// Fixture processes load copies of these modules. Keep their separate V8 maps
// out of the parent unit-coverage report; CLI behavior is asserted via exit/state.
const childEnv = { ...process.env };
delete childEnv.NODE_V8_COVERAGE;
delete childEnv.NODE_TEST_CONTEXT;

test("executor removes provider secrets and handles nonzero exit and timeout", async () => {
  assert.equal(
    safeEnvironment({
      PATH: "/bin",
      BREVO_SMTP_PASS: "secret",
      NODE_OPTIONS: "--bad"
    }).BREVO_SMTP_PASS,
    undefined
  );
  assert.equal(
    safeEnvironment({ NODE_OPTIONS: "--bad" }).NODE_OPTIONS,
    undefined
  );
  assert.equal(
    await command([process.execPath, "-e", 'process.stdout.write("ok")']),
    "ok"
  );
  await assert.rejects(
    command([process.execPath, "-e", "process.exit(2)"]),
    /exit/
  );
  await assert.rejects(
    command([process.execPath, "-e", "setTimeout(()=>{},10000)"], {
      timeoutMs: 40
    }),
    /timeout/
  );
});

test("CLI plan is default and never executes configured checks", () => {
  const dir = mkdtempSync(join(tmpdir(), "soph-cli-"));
  try {
    const file = join(dir, "config.json");
    const touched = join(dir, "should-not-exist");
    writeFileSync(
      file,
      JSON.stringify({
        schema: 1,
        target: "fixture",
        stages: [
          {
            id: "verify",
            kind: "manual",
            dependsOn: [],
            check: [
              process.execPath,
              "-e",
              `require('fs').writeFileSync(${JSON.stringify(touched)},'oops')`
            ]
          }
        ]
      })
    );
    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", cli, "--config", file],
      { cwd: root, encoding: "utf8", env: childEnv }
    );
    assert.match(output, /verify/);
    assert.throws(() => readFileSync(touched));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI rejects traversal and unknown commands before creating state", () => {
  for (const args of [
    ["init", "--run", "../escape", "--platform", "linux/amd64"],
    ["explode"]
  ]) {
    const child = spawnSync(
      process.execPath,
      ["--import", "tsx", cli, ...args],
      { cwd: root, encoding: "utf8", env: childEnv }
    );
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /Invalid run|Unknown command/);
  }
});

test("CLI rollback uses archived config after app edits and deleted current config", () => {
  const dir = mkdtempSync(join(tmpdir(), "soph-cli-e2e-"));
  try {
    for (const name of ["app", "public", "deployment"])
      mkdirSync(join(dir, name));
    cpSync(join(root, "scripts"), join(dir, "scripts"), { recursive: true });
    for (const name of [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "proxy.ts",
      "deployment/Dockerfile",
      "deployment/Dockerfile.dockerignore"
    ])
      writeFileSync(
        join(dir, name),
        name === "package.json" ? "{}" : "fixture"
      );
    writeFileSync(join(dir, "app/page.tsx"), "original");
    const js = (code: string) => [
      process.execPath,
      "-e",
      `const fs=require('fs'), p=require('path').join(process.env.SOPH_DEPLOY_RUN_DIR,'live');${code}`
    ];
    const configPath = join(dir, "deployment/local.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        schema: 1,
        target: "fixture",
        stages: [
          {
            id: "promote",
            dependsOn: [],
            kind: "local",
            check: js("process.exit(fs.existsSync(p)?0:1)"),
            apply: js('fs.writeFileSync(p,"yes")'),
            rollback: js("fs.unlinkSync(p)"),
            rollbackCheck: js("process.exit(fs.existsSync(p)?1:0)")
          }
        ]
      })
    );
    const invoke = (...args: string[]) =>
      spawnSync(process.execPath, ["--import", loader, cli, ...args], {
        cwd: dir,
        env: childEnv,
        encoding: "utf8"
      });
    assert.equal(
      invoke("init", "--run", "fixture", "--platform", "linux/amd64").status,
      0
    );
    const run = invoke("resume", "--run", "fixture");
    assert.equal(run.status, 0, run.stderr);
    writeFileSync(join(dir, "app/page.tsx"), "changed while troubleshooting");
    assert.notEqual(invoke("resume", "--run", "fixture").status, 0);
    rmSync(configPath);
    assert.equal(invoke("status", "--run", "fixture").status, 0);
    const rollback = invoke(
      "rollback",
      "--run",
      "fixture",
      "--stage",
      "promote"
    );
    assert.equal(rollback.status, 0, rollback.stderr);
    assert.equal(
      JSON.parse(
        readFileSync(join(dir, ".deployment/runs/fixture/journal.json"), "utf8")
      ).stages.promote.status,
      "rolled_back"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("killed parent leaves durable child activity evidence; overlapping command is refused", async () => {
  const dir = mkdtempSync(join(tmpdir(), "soph-command-crash-"));
  const script = `import { command } from ${JSON.stringify(new URL("../scripts/deployment/command.ts", import.meta.url).href)}; await command([process.execPath,'-e','setTimeout(()=>{},30000)'],{activityDir:${JSON.stringify(dir)}});`;
  const child = spawn(
    process.execPath,
    ["--import", loader, "--input-type=module", "-e", script],
    { stdio: "ignore", env: childEnv }
  );
  let commandPid: number | undefined;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        commandPid = JSON.parse(
          readFileSync(join(dir, "activity.json"), "utf8")
        ).pid;
      } catch {
        /* Await intent/PID publication. */
      }
      if (commandPid) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(commandPid, "child activity was recorded");
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
    assert.ok(existsSync(join(dir, "activity.json")));
    await assert.rejects(
      command([process.execPath, "-e", ""], { activityDir: dir }),
      /EEXIST/
    );
  } finally {
    child.kill("SIGKILL");
    if (commandPid) {
      try {
        process.kill(-commandPid, "SIGKILL");
      } catch {
        /* Already stopped. */
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("activity marker is cleared after success but retained after timeout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "soph-command-marker-"));
  try {
    await command([process.execPath, "-e", ""], { activityDir: dir });
    assert.equal(existsSync(join(dir, "activity.json")), false);
    await assert.rejects(
      command([process.execPath, "-e", "setTimeout(()=>{},10000)"], {
        activityDir: dir,
        timeoutMs: 50
      }),
      /timeout/
    );
    assert.ok(existsSync(join(dir, "activity.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
