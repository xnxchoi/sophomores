import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

/** Do not forward app/provider secrets or Node preload options to deployment children. */
export function safeEnvironment(
  env: Record<string, string | undefined>
): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      [
        "PATH",
        "HOME",
        "TMPDIR",
        "LANG",
        "TERM",
        "SSH_AUTH_SOCK",
        "SystemRoot"
      ].flatMap((key) => (env[key] === undefined ? [] : [[key, env[key]]]))
    ),
    NODE_ENV: "production"
  };
}

export class CommandExitError extends Error {
  constructor(readonly code: number | null) {
    super(
      `Command exit ${code ?? "signal"}; inspect prerequisites and reconcile`
    );
  }
}

export function command(
  argv: readonly string[],
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
    activityDir?: string;
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = randomUUID();
    const activity = options.activityDir
      ? join(options.activityDir, "activity.json")
      : undefined;
    const record = (pid?: number) => {
      if (!activity) return;
      const fd = openSync(activity, pid ? "w" : "wx", 0o600);
      try {
        writeFileSync(
          fd,
          JSON.stringify({
            token,
            hostname: hostname(),
            parentPid: process.pid,
            pid: pid ?? null
          })
        );
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    };
    record(); // Intent exists even if the parent dies before recording the child PID.
    const child = spawn(argv[0], argv.slice(1), {
      cwd: options.cwd,
      env: { ...safeEnvironment(process.env), ...options.env },
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    let timedOut = false;
    let interrupted = false;
    const kill = () => {
      try {
        if (process.platform === "win32") child.kill("SIGKILL");
        else if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        /* Process may already have exited. Close event remains authoritative. */
      }
    };
    if (child.pid) {
      try {
        record(child.pid);
      } catch {
        kill();
        reject(
          new Error("Could not persist active command; inspect activity marker")
        );
        return;
      }
    }
    const interrupt = () => {
      interrupted = true;
      kill();
    };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", interrupt);
    const cleanup = () => {
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", interrupt);
      // Timed-out/terminated Docker clients can leave daemon-owned work running.
      // Retain the marker and require operator inspection instead of guessing.
      if (activity && !timedOut && !interrupted) {
        try {
          if (JSON.parse(readFileSync(activity, "utf8")).token === token)
            unlinkSync(activity);
        } catch {
          /* A missing/malformed marker is not permission to remove other state. */
        }
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, options.timeoutMs ?? 120_000);
    child.stdout.on("data", (chunk) => {
      output = (output + String(chunk)).slice(-2_000_000);
    });
    // Intentionally do not persist arbitrary subprocess output: it can contain secrets.
    child.stderr.resume();
    child.on("error", () => {
      clearTimeout(timer);
      cleanup();
      reject(
        new Error("Command could not start; check executable availability")
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      cleanup();
      if (timedOut)
        reject(new Error("Command timeout; reconcile before retrying"));
      else if (interrupted)
        reject(new Error("Command interrupted; reconcile before retrying"));
      else if (code !== 0) reject(new CommandExitError(code));
      else resolve(output.trim());
    });
  });
}
