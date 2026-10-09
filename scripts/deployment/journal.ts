import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type StageStatus =
  "pending" | "running" | "succeeded" | "failed" | "unknown" | "rolled_back";
export interface StageRecord {
  status: StageStatus;
  intent?: "forward" | "rollback";
}
export interface Journal {
  schema: 1;
  configHash: string;
  fingerprint: string;
  stages: Record<string, StageRecord>;
}

/** Journal intentionally contains no command output, command arguments, or environment. */
export function readJournal(runDir: string): Journal {
  try {
    const value = JSON.parse(
      readFileSync(join(runDir, "journal.json"), "utf8")
    );
    if (
      value.schema !== 1 ||
      typeof value.configHash !== "string" ||
      typeof value.fingerprint !== "string" ||
      !value.stages ||
      typeof value.stages !== "object" ||
      Array.isArray(value.stages)
    )
      throw new Error();
    if (
      Object.keys(value).some(
        (key) =>
          !["schema", "configHash", "fingerprint", "stages"].includes(key)
      )
    )
      throw new Error();
    for (const record of Object.values(value.stages) as StageRecord[]) {
      if (
        !record ||
        ![
          "pending",
          "running",
          "succeeded",
          "failed",
          "unknown",
          "rolled_back"
        ].includes(record.status) ||
        (record.intent !== undefined &&
          !["forward", "rollback"].includes(record.intent))
      )
        throw new Error();
      if (
        Object.keys(record).some((key) => !["status", "intent"].includes(key))
      )
        throw new Error();
      if (["running", "unknown"].includes(record.status) && !record.intent)
        throw new Error();
    }
    return value as Journal;
  } catch {
    throw new Error(
      "Invalid deployment journal; preserve it and investigate before proceeding"
    );
  }
}

/** Rename is atomic; fsync the file and containing directory before claiming a checkpoint. */
export function writeJournal(runDir: string, journal: Journal): void {
  const temporary = join(runDir, `.journal-${randomUUID()}.tmp`);
  const fd = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(fd, JSON.stringify(journal, null, 2));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, join(runDir, "journal.json"));
  const directory = openSync(runDir, "r");
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
}

export function acquireLock(runDir: string): () => void {
  mkdirSync(runDir, { recursive: true, mode: 0o700 });
  const directory = join(runDir, ".lock");
  try {
    mkdirSync(directory, { mode: 0o700 });
  } catch {
    throw new Error(
      "Deployment run is locked; inspect its owner before explicit recovery"
    );
  }
  const token = randomUUID();
  writeFileSync(
    join(directory, "owner.json"),
    JSON.stringify({ pid: process.pid, hostname: hostname(), token }),
    { mode: 0o600 }
  );
  return () => {
    // Never release a lock that an operator replaced while this process was working.
    if (
      existsSync(join(directory, "owner.json")) &&
      JSON.parse(readFileSync(join(directory, "owner.json"), "utf8")).token ===
        token
    )
      rmSync(directory, { recursive: true });
  };
}

/** Explicit operator recovery, not a time-based stale-lock heuristic. */
export function recoverLock(runDir: string, acknowledge: boolean): void {
  if (!acknowledge)
    throw new Error(
      "Lock recovery requires acknowledgement that no deployment is running"
    );
  const directory = join(runDir, ".lock");
  if (!existsSync(directory)) return;
  const file = join(directory, "owner.json");
  if (existsSync(file)) {
    let owner: { pid: number; hostname: string; token: string };
    try {
      owner = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      throw new Error("Malformed lock owner; inspect and recover manually");
    }
    if (
      !owner ||
      typeof owner.hostname !== "string" ||
      !owner.hostname ||
      typeof owner.token !== "string" ||
      !owner.token ||
      !Number.isSafeInteger(owner.pid) ||
      owner.pid <= 0
    )
      throw new Error("Malformed lock owner");
    if (owner.hostname !== hostname())
      throw new Error(
        "Cannot verify a foreign-host lock owner; inspect and recover manually"
      );
    try {
      process.kill(owner.pid, 0);
      throw new Error("Lock owner is still active");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH")
        throw new Error("Lock owner is still active or cannot be verified");
    }
  }
  rmSync(directory, { recursive: true });
}
