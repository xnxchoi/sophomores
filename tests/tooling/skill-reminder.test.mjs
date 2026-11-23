import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// The project skill-reminder hook (.claude/settings.json): it reminds once per area,
// logs only under <project>/.tmp/skills-used, and never uses an unsafe session id in a path.
const hook = new URL("../../scripts/hooks/skill-reminder.sh", import.meta.url).pathname;
const run = (root, mode, input) =>
  spawnSync("bash", [hook, mode], { input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
const filesUnder = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));

test("reminds once per area, logs the reminder and loaded skills, and the packet line skips reminders", () => {
  const root = mkdtempSync(join(tmpdir(), "skill-reminder-"));
  const edit = { session_id: "abc-123", tool_input: { file_path: "/x/src/payload/c.ts" } };
  assert.match(run(root, "domain", edit).stdout, /Payload path/);
  assert.equal(run(root, "domain", edit).stdout, "");
  run(root, "log", { session_id: "abc-123", tool_input: { skill: "payload" } });
  const log = readFileSync(join(root, ".tmp/skills-used/abc-123.log"), "utf8");
  assert.match(log, /\treminded:payload\n/);
  assert.match(log, /\tpayload\n/);
  const packet = run(root, "packet", { session_id: "abc-123", tool_input: { command: "orca orchestration send --body hi" } }).stdout;
  assert.match(packet, /Skills used: payload \(log: \.tmp\/skills-used\/abc-123\.log\)/);
  assert.doesNotMatch(packet, /reminded/);
});

test("an unsafe session id is never used in a path: nothing is written, the reminder still shows", () => {
  const root = mkdtempSync(join(tmpdir(), "skill-reminder-"));
  for (const sid of ["../../escape", "a/b", "x;touch pwned", "$(touch pwned2)", "..", "a b"]) {
    const result = run(root, "domain", { session_id: sid, tool_input: { file_path: "/x/src/payload/c.ts" } });
    assert.match(result.stdout, /Payload path/);
    run(root, "log", { session_id: sid, tool_input: { skill: "evil" } });
  }
  assert.deepEqual(filesUnder(root), []);
  assert.equal(existsSync(join(root, "pwned")) || existsSync(join(root, "pwned2")), false);
});

test("a symlinked log directory is refused", () => {
  const root = mkdtempSync(join(tmpdir(), "skill-reminder-"));
  const elsewhere = mkdtempSync(join(tmpdir(), "skill-reminder-target-"));
  mkdirSync(join(root, ".tmp"));
  symlinkSync(elsewhere, join(root, ".tmp/skills-used"));
  run(root, "log", { session_id: "abc", tool_input: { skill: "payload" } });
  assert.deepEqual(readdirSync(elsewhere), []);
});
