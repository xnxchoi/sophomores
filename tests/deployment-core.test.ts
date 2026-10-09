import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync
} from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";
import { validateConfig, configHash } from "../scripts/deployment/config";
import {
  initializeRun,
  executeStage,
  reconcileStage,
  rollbackStage,
  resetStage,
  plan,
  type Executor
} from "../scripts/deployment/core";
import {
  readJournal,
  writeJournal,
  acquireLock,
  recoverLock
} from "../scripts/deployment/journal";

const configInput = () => ({
  schema: 1,
  target: "test",
  stages: [
    {
      id: "build",
      dependsOn: [],
      kind: "local",
      check: ["check-build"],
      apply: ["build"]
    },
    {
      id: "promote",
      dependsOn: ["build"],
      kind: "remote",
      check: ["check-live"],
      apply: ["promote"],
      rollback: ["undo"],
      rollbackCheck: ["check-undo"]
    }
  ]
});

function fixture() {
  const runDir = mkdtempSync(join(tmpdir(), "deployment-core-"));
  const config = validateConfig(configInput());
  const fingerprint = "source-v1";
  initializeRun({ config, runDir, fingerprint });
  return {
    config,
    runDir,
    fingerprint,
    cleanup: () => rmSync(runDir, { recursive: true, force: true })
  };
}

function executorFor(ready: Set<string>, calls: string[] = []): Executor {
  return async ([command]) => {
    calls.push(command);
    if (command === "build") ready.add("check-build");
    if (command === "promote") ready.add("check-live");
    if (command === "undo") {
      ready.delete("check-live");
      ready.add("check-undo");
    }
    return !command.startsWith("check-") || ready.has(command);
  };
}

test("config validates and normalizes without mutating input", () => {
  const input = configInput();
  const snapshot = JSON.stringify(input);
  assert.equal(validateConfig(input).target, "test");
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(
    configHash(validateConfig(input)),
    configHash(validateConfig(JSON.parse(snapshot)))
  );
  assert.deepEqual(
    plan(validateConfig(input)).map((s) => s.id),
    ["build", "promote"]
  );
});

test("config rejects invalid shape, commands, dependency graphs and manual mutation", () => {
  const good = configInput();
  const bad: unknown[] = [
    null,
    undefined,
    "",
    [],
    {},
    { ...good, schema: 2 },
    { ...good, target: "" },
    { ...good, extra: true },
    { ...good, stages: [] },
    { ...good, stages: [{ ...good.stages[0], id: "../escape" }] },
    { ...good, stages: [good.stages[0], good.stages[0]] },
    { ...good, stages: [{ ...good.stages[0], check: undefined }] },
    { ...good, stages: [{ ...good.stages[0], check: [] }] },
    { ...good, stages: [{ ...good.stages[0], check: ["x", "\0"] }] },
    { ...good, stages: [{ ...good.stages[0], check: [3] }] },
    { ...good, stages: [{ ...good.stages[0], kind: "shell" }] },
    { ...good, stages: [{ ...good.stages[0], kind: "manual" }] },
    { ...good, stages: [{ ...good.stages[0], dependsOn: ["absent"] }] },
    { ...good, stages: [{ ...good.stages[0], dependsOn: ["build"] }] },
    {
      ...good,
      stages: [{ ...good.stages[0], dependsOn: ["promote"] }, good.stages[1]]
    },
    { ...good, stages: [{ ...good.stages[0], rollback: ["undo"] }] },
    {
      ...good,
      stages: [
        {
          ...good.stages[0],
          apply: undefined,
          rollback: ["undo"],
          rollbackCheck: ["ok"]
        }
      ]
    },
    {
      ...good,
      stages: [
        { ...good.stages[1], dependsOn: ["build", "build"] },
        good.stages[0]
      ]
    }
  ];
  for (const input of bad) assert.throws(() => validateConfig(input));
  assert.equal(
    validateConfig({
      ...good,
      stages: [
        {
          id: "gate",
          kind: "manual",
          dependsOn: [],
          check: ["verify", "한글😀"]
        }
      ]
    }).stages.length,
    1
  );
});

test("run initialization protects existing state and refuses drift", async () => {
  const f = fixture();
  try {
    assert.throws(() => initializeRun(f), /already exists/);
    assert.equal(readJournal(f.runDir).stages.build.status, "pending");
    await assert.rejects(
      executeStage({
        ...f,
        fingerprint: "changed",
        stageId: "build",
        executor: executorFor(new Set())
      }),
      /fingerprint/
    );
    await assert.rejects(
      executeStage({
        ...f,
        config: validateConfig({ ...configInput(), target: "other" }),
        stageId: "build",
        executor: executorFor(new Set())
      }),
      /configuration/
    );
    await assert.rejects(
      executeStage({
        ...f,
        stageId: "missing",
        executor: executorFor(new Set())
      }),
      /Unknown stage/
    );
  } finally {
    f.cleanup();
  }
});

test("executes, durably records intent before apply, then rechecks success without replay", async () => {
  const f = fixture();
  const ready = new Set<string>();
  const calls: string[] = [];
  try {
    const base = executorFor(ready, calls);
    const executor: Executor = async (argv, context) => {
      if (context.purpose === "apply")
        assert.equal(readJournal(f.runDir).stages.build.status, "running");
      return base(argv, context);
    };
    await executeStage({ ...f, stageId: "build", executor });
    await executeStage({ ...f, stageId: "build", executor });
    assert.deepEqual(calls, [
      "check-build",
      "build",
      "check-build",
      "check-build"
    ]);
    assert.equal(readJournal(f.runDir).stages.build.status, "succeeded");
  } finally {
    f.cleanup();
  }
});

test("requires completed and freshly checked dependencies and invocation remote approval", async () => {
  const f = fixture();
  const ready = new Set<string>();
  const calls: string[] = [];
  const executor = executorFor(ready, calls);
  try {
    await assert.rejects(
      executeStage({ ...f, stageId: "promote", executor, executeRemote: true }),
      /Dependency/
    );
    await executeStage({ ...f, stageId: "build", executor });
    await assert.rejects(
      executeStage({ ...f, stageId: "promote", executor }),
      /remote/i
    );
    assert.equal(calls.includes("promote"), false);
    ready.delete("check-build");
    await assert.rejects(
      executeStage({ ...f, stageId: "promote", executor, executeRemote: true }),
      /Dependency/
    );
    assert.equal(readJournal(f.runDir).stages.build.status, "unknown");
  } finally {
    f.cleanup();
  }
});

test("failed apply stays uncertain; only successful reconciliation permits continuation", async () => {
  const f = fixture();
  const ready = new Set<string>();
  try {
    await assert.rejects(
      executeStage({
        ...f,
        stageId: "build",
        executor: async ([cmd]) => {
          if (cmd === "build") throw new Error("SECRET");
          return false;
        }
      }),
      /uncertain/i
    );
    assert.equal(readJournal(f.runDir).stages.build.status, "unknown");
    assert.equal(
      readFileSync(join(f.runDir, "journal.json"), "utf8").includes("SECRET"),
      false
    );
    await assert.rejects(
      executeStage({ ...f, stageId: "build", executor: executorFor(ready) }),
      /reconcil/i
    );
    await assert.rejects(
      reconcileStage({ ...f, stageId: "build", executor: executorFor(ready) }),
      /not confirmed/i
    );
    ready.add("check-build");
    await reconcileStage({
      ...f,
      stageId: "build",
      executor: executorFor(ready)
    });
    assert.equal(readJournal(f.runDir).stages.build.status, "succeeded");
  } finally {
    f.cleanup();
  }
});

test("interrupted running state refuses replay and resumes by observation only", async () => {
  const f = fixture();
  const j = readJournal(f.runDir);
  const calls: string[] = [];
  try {
    writeJournal(f.runDir, {
      ...j,
      stages: { ...j.stages, build: { status: "running", intent: "forward" } }
    });
    await assert.rejects(
      executeStage({
        ...f,
        stageId: "build",
        executor: executorFor(new Set(), calls)
      }),
      /reconcil/i
    );
    await reconcileStage({
      ...f,
      stageId: "build",
      executor: executorFor(new Set(["check-build"]), calls)
    });
    assert.deepEqual(calls, ["check-build"]);
  } finally {
    f.cleanup();
  }
});

test("postcondition failure and nonzero mutation result remain uncertain", async () => {
  for (const mutationResult of [false, true]) {
    const f = fixture();
    try {
      await assert.rejects(
        executeStage({
          ...f,
          stageId: "build",
          executor: async (_, ctx) => ctx.purpose === "apply" && mutationResult
        }),
        /uncertain/i
      );
      assert.equal(readJournal(f.runDir).stages.build.status, "unknown");
    } finally {
      f.cleanup();
    }
  }
});

test("manual gate has no acknowledgement shortcut and can retry after unmet check", async () => {
  const f = fixture();
  const runDir = join(f.runDir, "manual");
  const config = validateConfig({
    schema: 1,
    target: "manual",
    stages: [{ id: "dns", kind: "manual", dependsOn: [], check: ["dns"] }]
  });
  try {
    initializeRun({ ...f, config, runDir });
    await assert.rejects(
      executeStage({
        ...f,
        config,
        runDir,
        stageId: "dns",
        executor: async () => false
      }),
      /not satisfied/
    );
    assert.equal(readJournal(runDir).stages.dns.status, "failed");
    await executeStage({
      ...f,
      config,
      runDir,
      stageId: "dns",
      executor: async () => true
    });
    assert.equal(readJournal(runDir).stages.dns.status, "succeeded");
  } finally {
    f.cleanup();
  }
});

test("rollback requires opt-in and declared reversal, rechecks forward state and records reversal", async () => {
  const f = fixture();
  const executor = executorFor(new Set());
  try {
    await executeStage({ ...f, stageId: "build", executor });
    await executeStage({
      ...f,
      stageId: "promote",
      executor,
      executeRemote: true
    });
    await assert.rejects(
      rollbackStage({ ...f, stageId: "promote", executor }),
      /remote/i
    );
    await assert.rejects(
      rollbackStage({ ...f, stageId: "build", executor }),
      /rollback|dependent/i
    );
    await rollbackStage({
      ...f,
      stageId: "promote",
      executor,
      executeRemote: true
    });
    assert.equal(readJournal(f.runDir).stages.promote.status, "rolled_back");
    await assert.rejects(
      executeStage({ ...f, stageId: "promote", executor, executeRemote: true }),
      /rolled back/i
    );
  } finally {
    f.cleanup();
  }
});

test("interrupted rollback reconciles rollback condition, never forward condition", async () => {
  const f = fixture();
  const ready = new Set(["check-build", "check-live"]);
  try {
    await executeStage({
      ...f,
      stageId: "build",
      executor: executorFor(ready)
    });
    await executeStage({
      ...f,
      stageId: "promote",
      executor: executorFor(ready)
    });
    await assert.rejects(
      rollbackStage({
        ...f,
        stageId: "promote",
        executeRemote: true,
        executor: async (argv, ctx) =>
          ctx.purpose === "rollback" ? false : executorFor(ready)(argv, ctx)
      }),
      /uncertain/i
    );
    assert.equal(readJournal(f.runDir).stages.promote.intent, "rollback");
    await assert.rejects(
      reconcileStage({
        ...f,
        stageId: "promote",
        executor: executorFor(ready)
      }),
      /not confirmed/
    );
    ready.add("check-undo");
    ready.delete("check-live");
    await reconcileStage({
      ...f,
      stageId: "promote",
      executor: executorFor(ready)
    });
    assert.equal(readJournal(f.runDir).stages.promote.status, "rolled_back");
  } finally {
    f.cleanup();
  }
});

test("locks serialize operations and recovery never removes an active local owner", () => {
  const f = fixture();
  try {
    const release = acquireLock(f.runDir);
    assert.throws(() => acquireLock(f.runDir), /locked/);
    assert.throws(() => recoverLock(f.runDir, false), /acknowledg/i);
    assert.throws(() => recoverLock(f.runDir, true), /active/);
    release();
    mkdirSync(join(f.runDir, ".lock"));
    writeFileSync(
      join(f.runDir, ".lock", "owner.json"),
      JSON.stringify({ pid: 2147483647, hostname: hostname(), token: "stale" })
    );
    recoverLock(f.runDir, true);
    acquireLock(f.runDir)();
  } finally {
    f.cleanup();
  }
});

test("lock recovery refuses unverified foreign or malformed owners", () => {
  const f = fixture();
  const lockDir = join(f.runDir, ".lock");
  try {
    mkdirSync(lockDir);
    writeFileSync(
      join(lockDir, "owner.json"),
      JSON.stringify({ pid: 99, hostname: "another-host", token: "owner" })
    );
    assert.throws(() => recoverLock(f.runDir, true), /foreign/i);
    writeFileSync(join(lockDir, "owner.json"), "{}");
    assert.throws(() => recoverLock(f.runDir, true), /Malformed/);
    writeFileSync(join(lockDir, "owner.json"), "broken");
    assert.throws(() => recoverLock(f.runDir, true), /Malformed/);
  } finally {
    f.cleanup();
  }
});

test("malformed journal fails closed without exposing contents", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.runDir, "journal.json"), "SECRET broken");
    assert.throws(() => readJournal(f.runDir), /Invalid deployment journal/);
    writeFileSync(join(f.runDir, "journal.json"), "{}");
    assert.throws(() => readJournal(f.runDir), /Invalid deployment journal/);
  } finally {
    f.cleanup();
  }
});

test("a crashed check never becomes permission to mutate", async () => {
  const f = fixture();
  const calls: string[] = [];
  try {
    await assert.rejects(
      executeStage({
        ...f,
        stageId: "build",
        executor: async (_, ctx) => {
          calls.push(ctx.purpose);
          if (ctx.purpose === "check") throw new Error("SECRET CHECK ERROR");
          return true;
        }
      }),
      /check could not/i
    );
    assert.deepEqual(calls, ["check"]);
    assert.equal(readJournal(f.runDir).stages.build.status, "pending");
  } finally {
    f.cleanup();
  }
});

test("invalid extra journal fields are rejected rather than propagated", () => {
  const f = fixture();
  try {
    writeFileSync(
      join(f.runDir, "journal.json"),
      JSON.stringify({ ...readJournal(f.runDir), output: "SECRET" })
    );
    assert.throws(() => readJournal(f.runDir), /Invalid deployment journal/);
  } finally {
    f.cleanup();
  }
});

test("large input is rejected and dense acyclic dependencies validate in bounded time", () => {
  assert.throws(() =>
    validateConfig({
      ...configInput(),
      stages: Array(10000).fill(configInput().stages[0])
    })
  );
  const stages = Array.from({ length: 25 }, (_, index) => ({
    id: `s-${index}`,
    kind: "manual",
    check: ["check"],
    dependsOn: Array.from({ length: index }, (_, n) => `s-${n}`)
  }));
  assert.equal(
    validateConfig({ schema: 1, target: "dense", stages }).stages.length,
    25
  );
});

test("concurrent invocation cannot run commands while another action owns the run", async () => {
  const f = fixture();
  let unblock!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  let ready = false;
  try {
    const first = executeStage({
      ...f,
      stageId: "build",
      executor: async (_, ctx) => {
        if (ctx.purpose === "apply") {
          entered();
          await waiting;
          ready = true;
        }
        return ready;
      }
    });
    await started;
    await assert.rejects(
      executeStage({
        ...f,
        stageId: "build",
        executor: async () => {
          assert.fail("concurrent execution");
        }
      }),
      /locked/
    );
    unblock();
    await first;
    assert.equal(readJournal(f.runDir).stages.build.status, "succeeded");
  } finally {
    unblock();
    f.cleanup();
  }
});

test("rollback refuses completed dependents before running any reversal", async () => {
  const f = fixture();
  const runDir = join(f.runDir, "dependent");
  const config = validateConfig({
    ...configInput(),
    stages: configInput().stages.map((s) =>
      s.id === "build"
        ? {
            ...s,
            rollback: ["undo-build"],
            rollbackCheck: ["check-undo-build"]
          }
        : s
    )
  });
  const calls: string[] = [];
  const executor = executorFor(new Set(), calls);
  try {
    initializeRun({ ...f, runDir, config });
    await executeStage({ ...f, runDir, config, stageId: "build", executor });
    await executeStage({
      ...f,
      runDir,
      config,
      stageId: "promote",
      executor,
      executeRemote: true
    });
    await assert.rejects(
      rollbackStage({ ...f, runDir, config, stageId: "build", executor }),
      /dependent/
    );
    assert.equal(calls.includes("undo-build"), false);
  } finally {
    f.cleanup();
  }
});

test("successful stage drift blocks replay and rollback when forward state cannot be proven", async () => {
  const f = fixture();
  const ready = new Set<string>();
  const executor = executorFor(ready);
  try {
    await executeStage({ ...f, stageId: "build", executor });
    await executeStage({
      ...f,
      stageId: "promote",
      executor,
      executeRemote: true
    });
    ready.delete("check-live");
    await assert.rejects(
      rollbackStage({
        ...f,
        stageId: "promote",
        executor,
        executeRemote: true
      }),
      /Forward state/
    );
    ready.add("check-live");
    await reconcileStage({ ...f, stageId: "promote", executor });
    ready.delete("check-live");
    await assert.rejects(
      executeStage({ ...f, stageId: "promote", executor, executeRemote: true }),
      /Previously successful/
    );
    assert.equal(readJournal(f.runDir).stages.promote.status, "unknown");
  } finally {
    f.cleanup();
  }
});

test("invalid fingerprints, journal stage mismatches and inapplicable reconciliation fail closed", async () => {
  const f = fixture();
  const executor = executorFor(new Set());
  try {
    assert.throws(
      () => initializeRun({ ...f, fingerprint: "" }),
      /fingerprint/
    );
    await assert.rejects(
      reconcileStage({ ...f, stageId: "build", executor }),
      /Only uncertain/
    );
    const j = readJournal(f.runDir);
    writeJournal(f.runDir, { ...j, stages: {} });
    await assert.rejects(
      executeStage({ ...f, stageId: "build", executor }),
      /stage set/
    );
  } finally {
    f.cleanup();
  }
});

test("crashed postcondition remains unknown and crashed reconciliation never changes intent", async () => {
  const f = fixture();
  let applied = false;
  try {
    await assert.rejects(
      executeStage({
        ...f,
        stageId: "build",
        executor: async (_, ctx) => {
          if (ctx.purpose === "apply") {
            applied = true;
            return true;
          }
          if (applied) throw new Error("SECRET");
          return false;
        }
      }),
      /uncertain/
    );
    await assert.rejects(
      reconcileStage({
        ...f,
        stageId: "build",
        executor: async () => {
          throw new Error("SECRET");
        }
      }),
      /check could not/
    );
    assert.deepEqual(readJournal(f.runDir).stages.build, {
      status: "unknown",
      intent: "forward"
    });
  } finally {
    f.cleanup();
  }
});

test("reset observes an explicit safe baseline without replaying the failed action", async () => {
  const f = fixture();
  const runDir = join(f.runDir, "reset");
  const config = validateConfig({
    ...configInput(),
    stages: configInput().stages.map((s) => ({
      ...s,
      retryCheck: [`retry-${s.id}`]
    }))
  });
  const options = { ...f, runDir, config, stageId: "build" };
  const calls: string[] = [];
  try {
    initializeRun(options);
    await assert.rejects(
      executeStage({ ...options, executor: async () => false }),
      /uncertain/
    );
    await resetStage({
      ...options,
      executor: async ([command], ctx) => {
        calls.push(command);
        assert.equal(ctx.purpose, "retryCheck");
        return true;
      }
    });
    assert.deepEqual(calls, ["retry-build"]);
    assert.deepEqual(readJournal(runDir).stages.build, { status: "pending" });
    await executeStage({ ...options, executor: executorFor(new Set()) });
    assert.equal(readJournal(runDir).stages.build.status, "succeeded");
  } finally {
    f.cleanup();
  }
});

test("unsafe or unavailable retry checks preserve uncertainty", async () => {
  const f = fixture();
  const runDir = join(f.runDir, "unsafe-reset");
  const config = validateConfig({
    ...configInput(),
    stages: configInput().stages.map((s) => ({ ...s, retryCheck: ["retry"] }))
  });
  const options = { ...f, runDir, config, stageId: "build" };
  try {
    initializeRun(options);
    await assert.rejects(
      executeStage({ ...options, executor: async () => false }),
      /uncertain/
    );
    await assert.rejects(
      resetStage({ ...options, executor: async () => false }),
      /safe retry/i
    );
    assert.deepEqual(readJournal(runDir).stages.build, {
      status: "unknown",
      intent: "forward"
    });
    await assert.rejects(
      resetStage({
        ...options,
        executor: async () => {
          throw new Error("secret");
        }
      }),
      /safe retry/i
    );
    assert.deepEqual(readJournal(runDir).stages.build, {
      status: "unknown",
      intent: "forward"
    });
  } finally {
    f.cleanup();
  }
});

test("reset rejects undeclared baseline, rollback intent, normal stages and other uncertainty", async () => {
  const f = fixture();
  try {
    await assert.rejects(
      resetStage({ ...f, stageId: "build", executor: async () => true }),
      /retry|uncertain/i
    );
    const runDir = join(f.runDir, "reset-rules");
    const config = validateConfig({
      ...configInput(),
      stages: configInput().stages.map((s) => ({ ...s, retryCheck: ["retry"] }))
    });
    const options = {
      ...f,
      config,
      runDir,
      stageId: "build",
      executor: async () => true
    };
    initializeRun(options);
    await assert.rejects(resetStage(options), /uncertain/i);
    let j = readJournal(runDir);
    writeJournal(runDir, {
      ...j,
      stages: { ...j.stages, build: { status: "unknown", intent: "rollback" } }
    });
    await assert.rejects(resetStage(options), /forward/i);
    j = readJournal(runDir);
    writeJournal(runDir, {
      ...j,
      stages: {
        build: { status: "running", intent: "forward" },
        promote: { status: "unknown", intent: "forward" }
      }
    });
    await assert.rejects(resetStage(options), /other/i);
  } finally {
    f.cleanup();
  }
});

test("remote reset requires invocation approval and fresh dependencies", async () => {
  const f = fixture();
  const runDir = join(f.runDir, "remote-reset");
  const config = validateConfig({
    ...configInput(),
    stages: configInput().stages.map((s) => ({ ...s, retryCheck: ["retry"] }))
  });
  const options = { ...f, runDir, config };
  const ready = new Set<string>();
  const executor = executorFor(ready);
  try {
    initializeRun(options);
    await executeStage({ ...options, stageId: "build", executor });
    await assert.rejects(
      executeStage({
        ...options,
        stageId: "promote",
        executeRemote: true,
        executor: async (argv, ctx) =>
          ctx.purpose === "apply" ? false : executor(argv, ctx)
      }),
      /uncertain/
    );
    await assert.rejects(
      resetStage({ ...options, stageId: "promote", executor }),
      /remote/i
    );
    ready.delete("check-build");
    await assert.rejects(
      resetStage({
        ...options,
        stageId: "promote",
        executor,
        executeRemote: true
      }),
      /Dependency/
    );
    assert.equal(readJournal(runDir).stages.promote.status, "unknown");
  } finally {
    f.cleanup();
  }
});
