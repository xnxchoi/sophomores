import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  configHash,
  validateConfig,
  type DeploymentConfig,
  type Stage,
  type StageKind
} from "./config";
import {
  acquireLock,
  readJournal,
  writeJournal,
  type Journal,
  type StageRecord
} from "./journal";

export type Purpose =
  "check" | "apply" | "rollback" | "rollbackCheck" | "retryCheck";
export type Executor = (
  argv: readonly string[],
  context: { stageId: string; kind: StageKind; purpose: Purpose }
) => Promise<boolean>;
export interface RunOptions {
  config: DeploymentConfig;
  runDir: string;
  fingerprint: string;
}
export interface StageOptions extends RunOptions {
  stageId: string;
  executor: Executor;
  executeRemote?: boolean;
}

export function plan(config: DeploymentConfig): Stage[] {
  const remaining = [...validateConfig(config).stages];
  const ordered: Stage[] = [];
  while (remaining.length) {
    const index = remaining.findIndex((stage) =>
      stage.dependsOn.every((id) => ordered.some((item) => item.id === id))
    );
    ordered.push(...remaining.splice(index, 1));
  }
  return ordered;
}

export function initializeRun(options: RunOptions): Journal {
  const config = validateConfig(options.config);
  if (
    typeof options.fingerprint !== "string" ||
    !options.fingerprint ||
    options.fingerprint.length > 256
  )
    throw new Error("Invalid input fingerprint");
  const release = acquireLock(options.runDir);
  try {
    if (existsSync(join(options.runDir, "journal.json")))
      throw new Error("Deployment run already exists");
    const journal: Journal = {
      schema: 1,
      configHash: configHash(config),
      fingerprint: options.fingerprint,
      stages: Object.fromEntries(
        config.stages.map((stage) => [stage.id, { status: "pending" }])
      )
    };
    writeJournal(options.runDir, journal);
    return journal;
  } finally {
    release();
  }
}

function load(options: StageOptions): {
  journal: Journal;
  stage: Stage;
  config: DeploymentConfig;
} {
  const config = validateConfig(options.config);
  const journal = readJournal(options.runDir);
  if (journal.configHash !== configHash(config))
    throw new Error("Changed configuration; create a new run");
  if (journal.fingerprint !== options.fingerprint)
    throw new Error("Changed input fingerprint; create a new run");
  if (
    Object.keys(journal.stages).sort().join(",") !==
    config.stages
      .map((s) => s.id)
      .sort()
      .join(",")
  )
    throw new Error("Journal stage set does not match configuration");
  const stage = config.stages.find((item) => item.id === options.stageId);
  if (!stage) throw new Error("Unknown stage");
  return { journal, stage, config };
}

function record(
  options: RunOptions,
  journal: Journal,
  id: string,
  state: StageRecord
): Journal {
  const next = { ...journal, stages: { ...journal.stages, [id]: state } };
  writeJournal(options.runDir, next);
  return next;
}

async function check(
  options: StageOptions,
  stage: Stage,
  purpose: "check" | "rollbackCheck" | "retryCheck" = "check"
): Promise<boolean> {
  try {
    return (
      (await options.executor([...stage[purpose]!], {
        stageId: stage.id,
        kind: stage.kind,
        purpose
      })) === true
    );
  } catch {
    throw new Error(
      "Stage check could not execute; inspect prerequisites before retrying"
    );
  }
}

function dependencies(config: DeploymentConfig, stage: Stage): Stage[] {
  const needed = new Set<string>();
  const add = (item: Stage): void => {
    item.dependsOn.forEach((id) => {
      if (!needed.has(id)) {
        needed.add(id);
        add(config.stages.find((s) => s.id === id)!);
      }
    });
  };
  add(stage);
  return plan(config).filter((item) => needed.has(item.id));
}

async function verifyDependencies(
  options: StageOptions,
  journal: Journal,
  config: DeploymentConfig,
  stage: Stage
): Promise<void> {
  for (const dependency of dependencies(config, stage)) {
    if (journal.stages[dependency.id].status !== "succeeded")
      throw new Error("Dependency has not succeeded");
    if (!(await check(options, dependency))) {
      record(options, journal, dependency.id, {
        status: "unknown",
        intent: "forward"
      });
      throw new Error(
        "Dependency check failed; reconcile its current state before proceeding"
      );
    }
  }
}

function ensureCertain(journal: Journal): void {
  if (
    Object.values(journal.stages).some((item) =>
      ["running", "unknown"].includes(item.status)
    )
  )
    throw new Error(
      "Uncertain deployment state; reconcile before further actions"
    );
}

function authorize(stage: Stage, options: StageOptions): void {
  if (stage.kind === "remote" && !options.executeRemote)
    throw new Error(
      "Remote mutation requires explicit approval for this invocation"
    );
}

async function mutate(
  options: StageOptions,
  journal: Journal,
  stage: Stage,
  intent: "forward" | "rollback"
): Promise<Journal> {
  const purpose = intent === "forward" ? "apply" : "rollback";
  const running = record(options, journal, stage.id, {
    status: "running",
    intent
  });
  let success = false;
  try {
    success =
      (await options.executor([...stage[purpose]!], {
        stageId: stage.id,
        kind: stage.kind,
        purpose
      })) === true;
  } catch {
    /* Action might have happened: never automatically replay. */
  }
  let confirmed = false;
  if (success) {
    try {
      confirmed = await check(
        options,
        stage,
        intent === "forward" ? "check" : "rollbackCheck"
      );
    } catch {
      /* A failed observation cannot establish whether the action completed. */
    }
  }
  if (!confirmed) {
    record(options, running, stage.id, { status: "unknown", intent });
    throw new Error(
      "Mutation outcome is uncertain; inspect and reconcile before retrying"
    );
  }
  return record(options, running, stage.id, {
    status: intent === "forward" ? "succeeded" : "rolled_back",
    intent
  });
}

export async function executeStage(options: StageOptions): Promise<Journal> {
  const release = acquireLock(options.runDir);
  try {
    const { journal, stage, config } = load(options);
    ensureCertain(journal);
    const previous = journal.stages[stage.id];
    if (previous.status === "rolled_back")
      throw new Error("Stage was rolled back; create a new run");
    await verifyDependencies(options, journal, config, stage);
    if (await check(options, stage))
      return record(options, journal, stage.id, {
        status: "succeeded",
        intent: "forward"
      });
    if (previous.status === "succeeded") {
      record(options, journal, stage.id, {
        status: "unknown",
        intent: "forward"
      });
      throw new Error(
        "Previously successful stage changed; reconcile before replay"
      );
    }
    if (!stage.apply) {
      record(options, journal, stage.id, { status: "failed" });
      throw new Error(
        "Stage check not satisfied; resolve the manual prerequisite and retry"
      );
    }
    authorize(stage, options);
    return await mutate(options, journal, stage, "forward");
  } finally {
    release();
  }
}

/** Observes uncertain outcomes only; a failed check cannot prove an action never happened. */
export async function reconcileStage(options: StageOptions): Promise<Journal> {
  const release = acquireLock(options.runDir);
  try {
    const { journal, stage } = load(options);
    const previous = journal.stages[stage.id];
    if (!["unknown", "running"].includes(previous.status))
      throw new Error("Only uncertain stages require reconciliation");
    const reverse = previous.intent === "rollback";
    if (
      (reverse && !stage.rollbackCheck) ||
      !(await check(options, stage, reverse ? "rollbackCheck" : "check"))
    ) {
      record(options, journal, stage.id, { ...previous, status: "unknown" });
      throw new Error(
        "Outcome not confirmed; inspect and repair manually, then reconcile again"
      );
    }
    return record(options, journal, stage.id, {
      status: reverse ? "rolled_back" : "succeeded",
      intent: previous.intent
    });
  } finally {
    release();
  }
}

/** An explicit stage-specific proof of a safe baseline permits retry, never replay. */
export async function resetStage(options: StageOptions): Promise<Journal> {
  const release = acquireLock(options.runDir);
  try {
    const { journal, stage, config } = load(options);
    const previous = journal.stages[stage.id];
    if (!stage.retryCheck)
      throw new Error("Stage has no declared safe retry check");
    if (!["unknown", "running"].includes(previous.status))
      throw new Error("Only uncertain stages can be reset");
    if (previous.intent !== "forward")
      throw new Error(
        "Only forward uncertainty can be reset; reconcile rollback separately"
      );
    if (
      Object.entries(journal.stages).some(
        ([id, state]) =>
          id !== stage.id && ["unknown", "running"].includes(state.status)
      )
    )
      throw new Error("Resolve other uncertain stages before resetting");
    authorize(stage, options);
    await verifyDependencies(options, journal, config, stage);
    let safe = false;
    try {
      safe = await check(options, stage, "retryCheck");
    } catch {
      /* Lack of evidence is never proof that replay is safe. */
    }
    if (!safe) {
      record(options, journal, stage.id, {
        status: "unknown",
        intent: "forward"
      });
      throw new Error(
        "Safe retry baseline not confirmed; inspect and repair manually"
      );
    }
    return record(options, journal, stage.id, { status: "pending" });
  } finally {
    release();
  }
}

export async function rollbackStage(options: StageOptions): Promise<Journal> {
  const release = acquireLock(options.runDir);
  try {
    const { journal, stage, config } = load(options);
    ensureCertain(journal);
    if (!stage.rollback || !stage.rollbackCheck)
      throw new Error("Stage has no declared rollback");
    if (journal.stages[stage.id].status !== "succeeded")
      throw new Error("Only succeeded stages can be rolled back");
    const activeDependent = config.stages.some(
      (item) =>
        dependencies(config, item).some((dep) => dep.id === stage.id) &&
        journal.stages[item.id].status === "succeeded"
    );
    if (activeDependent)
      throw new Error("A completed dependent stage prevents rollback");
    authorize(stage, options);
    if (!(await check(options, stage))) {
      record(options, journal, stage.id, {
        status: "unknown",
        intent: "forward"
      });
      throw new Error(
        "Forward state cannot be confirmed; reconcile before rollback"
      );
    }
    return await mutate(options, journal, stage, "rollback");
  } finally {
    release();
  }
}
