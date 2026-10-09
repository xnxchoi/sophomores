import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { validateConfig } from "./deployment/config";
import {
  executeStage,
  initializeRun,
  plan,
  reconcileStage,
  rollbackStage,
  resetStage,
  type Executor
} from "./deployment/core";
import { acquireLock, readJournal, recoverLock } from "./deployment/journal";
import { sourceFingerprint } from "./deployment/package";
import { deploymentAction } from "./deployment/actions";
import { command, CommandExitError } from "./deployment/command";

const commands = [
  "plan",
  "init",
  "status",
  "run",
  "resume",
  "reconcile",
  "reset",
  "rollback",
  "recover-lock"
];
const usage =
  "deploy [plan|init|status|run|resume|reconcile|reset|rollback|recover-lock] --config deployment/local.json --run <id> [--stage <id>] [--platform linux/amd64|linux/arm64] [--allow-remote]";
type Context = {
  platform: string;
  root: string;
  automation: string;
  fingerprint: string;
};

function directory(path: string) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink())
    throw new Error("State directory must not be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 });
}
function automationHash(root: string) {
  const hash = createHash("sha256");
  const base = resolve(root, "scripts/deployment");
  for (const file of [
    "../deploy.ts",
    ...readdirSync(base)
      .filter((n) => n.endsWith(".ts"))
      .sort()
  ]) {
    const path = resolve(base, file);
    if (lstatSync(path).isSymbolicLink())
      throw new Error("Automation symlinks are not supported");
    hash.update(file).update(readFileSync(path));
  }
  return hash.digest("hex");
}
async function localDocker(
  args: readonly string[],
  root: string,
  activityDir: string
) {
  const contexts = JSON.parse(
    await command(["docker", "context", "inspect"], { cwd: root, activityDir })
  );
  const endpoint = contexts[0]?.Endpoints?.docker?.Host;
  if (typeof endpoint !== "string" || !endpoint.startsWith("unix://"))
    throw new Error(
      "Local Docker socket required; remote Docker contexts are not allowed"
    );
  // Explicit default builder avoids accidentally dispatching to a configured cloud builder.
  return command(["docker", "--host", endpoint, ...args], {
    cwd: root,
    activityDir,
    timeoutMs: args[0] === "buildx" ? 1_800_000 : 120_000
  });
}
function executor(
  root: string,
  runDir: string,
  release: string,
  platform: string,
  activityDir: string
): Executor {
  return async (argv, context) => {
    try {
      if (argv[0] === "@local") {
        if (argv.length !== 2 || context.kind !== "local")
          throw new Error("Invalid built-in action");
        const evidence: Record<string, string> = {
          "check-snapshot": "snapshot.json",
          "check-build": "image.json",
          "check-smoke": "smoke.json",
          "check-export": "artifact.json"
        };
        if (evidence[argv[1]] && !existsSync(join(runDir, evidence[argv[1]])))
          return false;
        await deploymentAction(
          argv[1],
          { root, runDir, release, platform },
          (args) => localDocker(args, root, activityDir)
        );
      } else {
        await command(argv, {
          cwd: root,
          activityDir,
          env: {
            SOPH_DEPLOY_RUN_DIR: runDir,
            SOPH_DEPLOY_RELEASE: release,
            SOPH_DEPLOY_PLATFORM: platform
          },
          timeoutMs: 1_800_000
        });
      }
      return true;
    } catch (error) {
      if (
        error instanceof CommandExitError &&
        error.code === 1 &&
        ["check", "rollbackCheck", "retryCheck"].includes(context.purpose) &&
        argv[0] !== "@local"
      )
        return false;
      // Exit status is evidence; arbitrary provider output is not safe to print or journal.
      console.error(
        `${context.stageId}: ${context.purpose} did not pass. Check prerequisites; use status/reconcile before retrying.`
      );
      throw new Error(
        "Stage command failed or its outcome cannot be established"
      );
    }
  };
}

export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      config: { type: "string", default: "deployment/local.json" },
      run: { type: "string" },
      stage: { type: "string" },
      platform: { type: "string" },
      "allow-remote": { type: "boolean", default: false },
      "ack-no-owner": { type: "boolean", default: false },
      help: { type: "boolean", default: false }
    }
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  const operation = positionals[0] ?? "plan";
  if (!commands.includes(operation) || positionals.length > 1)
    throw new Error("Unknown command");
  const root = realpathSync(process.cwd());
  if (operation === "plan") {
    const config = validateConfig(
      JSON.parse(readFileSync(resolve(root, values.config!), "utf8"))
    );
    console.log(
      JSON.stringify(
        {
          target: config.target,
          stages: plan(config).map(({ id, kind, dependsOn, rollback }) => ({
            id,
            kind,
            dependsOn,
            reversible: Boolean(rollback)
          }))
        },
        null,
        2
      )
    );
    return;
  }
  const release =
    values.run ??
    (operation === "init"
      ? `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomBytes(3).toString("hex")}`
      : "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(release))
    throw new Error("Invalid run ID; use --run <id>");
  const base = resolve(root, ".deployment");
  const runs = join(base, "runs");
  const runDir = join(runs, release);
  if (operation === "status") {
    console.log(JSON.stringify(readJournal(runDir), null, 2));
    return;
  }
  const recovery = ["rollback", "reconcile", "reset", "recover-lock"].includes(
    operation
  );
  const config = validateConfig(
    JSON.parse(
      readFileSync(
        recovery ? join(runDir, "config.json") : resolve(root, values.config!),
        "utf8"
      )
    )
  );
  directory(base);
  directory(runs);
  const locks = join(base, "targets");
  directory(locks);
  const targetDir = join(
    locks,
    createHash("sha256").update(config.target).digest("hex")
  );
  directory(targetDir);
  if (existsSync(join(targetDir, "activity.json")))
    throw new Error(
      "An interrupted command may still be active. Inspect activity.json and daemon/remote work; archive the marker only after confirming the operation stopped, then recover locks and reconcile."
    );
  if (operation === "recover-lock") {
    recoverLock(targetDir, values["ack-no-owner"]!);
    recoverLock(runDir, values["ack-no-owner"]!);
    console.log(
      "Lock recovery completed. Reconcile any interrupted stage before proceeding."
    );
    return;
  }
  const unlock = acquireLock(targetDir);
  try {
    if (operation === "init") {
      if (!["linux/amd64", "linux/arm64"].includes(values.platform ?? ""))
        throw new Error(
          "Choose --platform linux/amd64 or linux/arm64 after verifying the target architecture"
        );
      if (existsSync(runDir))
        throw new Error("Run already exists; use status/resume or a new ID");
      const automation = automationHash(root);
      const fingerprint = createHash("sha256")
        .update(sourceFingerprint(root))
        .update(automation)
        .update(values.platform!)
        .digest("hex");
      const context: Context = {
        root,
        platform: values.platform!,
        automation,
        fingerprint
      };
      initializeRun({ config, runDir, fingerprint });
      writeFileSync(join(runDir, "context.json"), JSON.stringify(context), {
        mode: 0o600,
        flag: "wx"
      });
      writeFileSync(join(runDir, "config.json"), JSON.stringify(config), {
        mode: 0o600,
        flag: "wx"
      });
      console.log(
        `Initialized ${release}. Next: deploy run --run ${release} --stage ${config.stages[0].id}`
      );
      return;
    }
    if (!existsSync(runDir) || lstatSync(runDir).isSymbolicLink())
      throw new Error("Run is missing or unsafe");
    const context = JSON.parse(
      readFileSync(join(runDir, "context.json"), "utf8")
    ) as Context;
    if (
      context.root !== root ||
      !["linux/amd64", "linux/arm64"].includes(context.platform)
    )
      throw new Error("Run context changed");
    const automation = automationHash(root);
    if (automation !== context.automation)
      throw new Error(
        "Deployment adapters changed; restore the original adapters before recovery, or create a new run for new work"
      );
    const fingerprint = recovery
      ? context.fingerprint
      : createHash("sha256")
          .update(sourceFingerprint(root))
          .update(automation)
          .update(context.platform)
          .digest("hex");
    const options = {
      config,
      runDir,
      fingerprint,
      executor: executor(root, runDir, release, context.platform, targetDir),
      executeRemote: values["allow-remote"]
    };
    if (operation === "resume") {
      for (const stage of plan(config)) {
        console.log(`Checking/running ${stage.id}`);
        await executeStage({ ...options, stageId: stage.id });
      }
    } else {
      if (!values.stage) throw new Error("Specify --stage <id>");
      const action =
        operation === "reconcile"
          ? reconcileStage
          : operation === "rollback"
            ? rollbackStage
            : operation === "reset"
              ? resetStage
              : executeStage;
      await action({ ...options, stageId: values.stage });
    }
    console.log("Completed requested operation; deployment journal updated.");
  } finally {
    unlock();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Deployment failed");
  process.exitCode = 1;
});
