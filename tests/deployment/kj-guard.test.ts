import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, test } from "node:test";

// The key job's host guard (deployment/ops/kj-guard.sh; VPS plan v6 and Review-B's carry-ins), driven through stub
// docker, nft, systemctl and friends on PATH. Logic only: real nft, Docker, systemd and the packet probe are proven
// on the disposable VM (plan v6 §4), not here.
const GUARD = resolve("deployment/ops/kj-guard.sh");
const IMAGE = `sha256:${"a".repeat(64)}`;
const CID = "b".repeat(64);
const INVOCATION = "0123456789abcdef0123456789abcdef";
const FENCE_LIST_SHA = createHash("sha256").update("table inet key_grant_fence_@ { stub }\n").digest("hex");

const STUBS: Record<string, string> = {
  flock: "exit 0",
  sync: "exit 0",
  logger: 'echo "logger $*" >>"$STUB/log"',
  chgrp: "exit 0",
  timeout: 'while [ "${1#-}" != "$1" ]; do [ "$1" = -k ] && shift; shift; done; shift; exec "$@"',
  stat: `fmt="$2"; f="$3"; b="$(basename "$f")"
[ -e "$f" ] || exit 1
if [ -f "$STUB/stat_$b" ]; then cat "$STUB/stat_$b"; exit 0; fi
case "$fmt" in '%u:%a') echo 0:600 ;; *) case "$b" in polygon-rpc.env|polygon-key-granter.env) echo "1000:1000 600" ;; alert-mail.env) echo "2002:2002 400" ;; *) echo "1000:1000 400" ;; esac ;; esac`,
  docker: `echo "docker $*" >>"$STUB/log"
case "$1" in
  image) echo "${IMAGE}" ;;
  info) exit 0 ;;
  ps) [ -e "$STUB/ps_fail" ] && exit 1
      case "$*" in *"--filter id="*) [ -f "$STUB/ps_id" ] && cat "$STUB/ps_id" ;; *) [ -f "$STUB/ps" ] && cat "$STUB/ps" ;; esac; exit 0 ;;
  create) while [ "$#" -gt 0 ]; do [ "$1" = --cidfile ] && cid="$2"; shift; done
      printf '%s' "${CID}" >"$cid"
      if [ -e "$STUB/fence_on_create" ]; then : >"$KJ_ROOT/fence/feedfacefeedface"; fi; exit 0 ;;
  *) exit 0 ;;
esac`,
  nft: `echo "nft $*" >>"$STUB/log"
mkdir -p "$STUB/tables"
case "$*" in
  "list tables") [ -e "$STUB/nft_fail" ] && exit 1; for t in $(ls "$STUB/tables"); do echo "table inet key_grant_fence_$t"; done ;;
  "-f -") n="$(sed -nE 's/^add table inet key_grant_fence_([0-9a-f]{16})$/\\1/p')"; : >"$STUB/tables/$n" ;;
  "-s list table inet key_grant_fence_"*) n="\${5#key_grant_fence_}"; [ -e "$STUB/tables/$n" ] || exit 1; echo "table inet key_grant_fence_$n { stub }" ;;
  "delete table inet key_grant_fence_"*) n="\${4#key_grant_fence_}"
      if [ -e "$KJ_ROOT/fence/$n" ]; then echo "marker_present_at_delete $n" >>"$STUB/log"; fi; rm -f "$STUB/tables/$n" ;;
  *) exit 0 ;;
esac`,
  // No bridge in the test host: the packet probe is deferred (key-grant-fence-probe.service runs it after Docker).
  ip: "exit 1",
  systemctl: `echo "systemctl $*" >>"$STUB/log"
case "$1" in is-active) echo inactive; exit 3 ;; is-enabled) echo disabled; exit 1 ;; show) [ "$3" = MainPID ] && echo 0; exit 0 ;; *) exit 0 ;; esac`,
};

let root = "";
afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }); root = ""; });

function setup() {
  root = mkdtempSync(join(tmpdir(), "kj-guard-"));
  const kj = join(root, "kj"), stub = join(root, "stub"), bin = join(root, "bin");
  for (const dir of ["config", "rpc", "signer", "mail", "alerts/spool", "alerts/mailer", "fence"]) mkdirSync(join(kj, dir), { recursive: true });
  mkdirSync(stub); mkdirSync(bin);
  for (const [name, body] of Object.entries(STUBS)) { writeFileSync(join(bin, name), `#!/bin/bash\n${body}\n`); chmodSync(join(bin, name), 0o755); }
  writeFileSync(join(kj, "config/guard.conf"), [`IMAGE=${IMAGE}`, "DBNET=sophomores-review-db", "KJNET=sophomores-key-grant-egress",
    "MAILNET=sophomores-review-egress", "BRIDGE=kjegress0", "TICK_MEMORY=768m", "PROBE_ADDR=172.30.0.250/24", "PROBE_GW=172.30.0.1",
    "PROBE_TARGET=192.0.2.1", `FENCE_LIST_SHA=${FENCE_LIST_SHA}`].join("\n") + "\n");
  writeFileSync(join(kj, "rpc/polygon-rpc.env"), "");
  writeFileSync(join(kj, "signer/polygon-key-granter.env"), "");
  writeFileSync(join(kj, "config/key-job.env"), "DATABASE_URI=x\nPAYLOAD_SECRET=x\nKEY_GRANT_POLYGON_MAX_COST_WEI=1\n");
  writeFileSync(join(kj, "mail/alert-mail.env"), "MEMBER_AUTH_MAIL_MODE=smtp\nMEMBER_AUTH_SMTP_HOST=x\nKEY_GRANT_ALERT_TO=x\n");
  chmodSync(GUARD, 0o755);
  const guard = (...args: string[]) => {
    const result = spawnSync("bash", [GUARD, ...args], { encoding: "utf8", env: {
      PATH: `${bin}:${process.env.PATH}`, KJ_ROOT: kj, KJ_RUN: join(root, "run"), STUB: stub, INVOCATION_ID: INVOCATION } });
    return { status: result.status, out: result.stdout.trim().split("\n").at(-1) ?? "" };
  };
  const log = () => existsSync(join(stub, "log")) ? readFileSync(join(stub, "log"), "utf8") : "";
  const tables = () => existsSync(join(stub, "tables")) ? readdirSync(join(stub, "tables")).sort() : [];
  const markers = () => readdirSync(join(kj, "fence")).filter((name) => /^[0-9a-f]{16}$/.test(name)).sort();
  return { kj, stub, guard, log, tables, markers };
}
const event = (out: string) => (JSON.parse(out) as { event: string }).event;

test("admission refuses while any fence generation exists: a marker, a table, or an nft listing that fails", () => {
  const { kj, stub, guard, log } = setup();
  writeFileSync(join(kj, "fence/0123456789abcdef"), "x");
  assert.equal(event(guard("run", "tick").out), "fenced");
  rmSync(join(kj, "fence/0123456789abcdef"));
  mkdirSync(join(stub, "tables")); writeFileSync(join(stub, "tables/0123456789abcdef"), "");
  assert.equal(event(guard("run", "tick").out), "fenced");
  rmSync(join(stub, "tables"), { recursive: true });
  writeFileSync(join(stub, "nft_fail"), "");
  assert.equal(event(guard("run", "tick").out), "fenced");
  assert.doesNotMatch(log(), /docker create/);
});

test("a fence that lands between create and start wins: the created container is removed and never started", () => {
  const { stub, guard, log } = setup();
  writeFileSync(join(stub, "fence_on_create"), "");
  const run = guard("run", "tick");
  assert.equal(run.status, 1);
  assert.equal(event(run.out), "fenced_before_start");
  assert.match(log(), new RegExp(`docker rm -f ${CID}`));
  assert.doesNotMatch(log(), /docker start/);
});

test("scheduled tick: labelled create, scheduled mode, env files in-process only, no first-run permit", () => {
  const { kj, guard, log } = setup();
  writeFileSync(join(kj, "config/live.env"), "KEY_GRANT_POLYGON_LIVE=1\nKEY_GRANT_POLYGON_ALLOWED_INTENTS=x\n");
  assert.equal(guard("run", "tick").status, 0);
  const create = log().split("\n").find((line) => line.startsWith("docker create")) ?? "";
  assert.match(create, new RegExp(`--label co\\.sophomores\\.key-job=tick --label co\\.sophomores\\.key-job-run=${INVOCATION}`));
  assert.match(create, /-e KEY_GRANT_TICK_MODE=scheduled/);
  assert.match(create, /--restart no/);
  assert.doesNotMatch(create, / --env-file /, "never docker --env-file");
  assert.doesNotMatch(create, /live\.env/, "the scheduled tick never mounts the first-run permit");
  assert.match(log(), new RegExp(`docker start -a ${CID}`));
  writeFileSync(join(kj, "config/scheduled.env"), "KEY_GRANT_POLYGON_LIVE=1\n");
  assert.equal(guard("run", "tick").status, 0);
  assert.match(log().split("\n").filter((line) => line.startsWith("docker create")).at(-1) ?? "", /scheduled\.env:\/run\/kj\/live\.env:ro/);
});

test("env files: exact key sets; LIVE or an allowlist in the wrong file refuses", () => {
  const { kj, guard } = setup();
  for (const extra of ["KEY_GRANT_POLYGON_LIVE=1", "KEY_GRANT_POLYGON_ALLOWED_INTENTS=x", "NODE_OPTIONS=--require /x", "export X=1"]) {
    writeFileSync(join(kj, "config/key-job.env"), `DATABASE_URI=x\n${extra}\n`);
    assert.equal(event(guard("run", "tick").out), "keyjob_env_refused", extra);
  }
  writeFileSync(join(kj, "config/key-job.env"), "DATABASE_URI=x\n");
  writeFileSync(join(kj, "config/scheduled.env"), "KEY_GRANT_POLYGON_LIVE=1\nKEY_GRANT_POLYGON_ALLOWED_INTENTS=x\n");
  assert.equal(event(guard("run", "tick").out), "scheduled_env_refused");
  writeFileSync(join(kj, "config/scheduled.env"), "KEY_GRANT_POLYGON_LIVE=0\n");
  assert.equal(event(guard("run", "tick").out), "scheduled_env_refused");
  rmSync(join(kj, "config/scheduled.env"));
  assert.equal(event(guard("run", "first-run").out), "live_env_refused", "no permit, no first run");
  writeFileSync(join(kj, "config/live.env"), "KEY_GRANT_POLYGON_LIVE=1\n");
  assert.equal(event(guard("run", "first-run").out), "live_env_refused", "first run needs its allowlist");
});

test("first run: its own mode and permit; reap deletes the permit whatever happened", () => {
  const { kj, guard, log } = setup();
  writeFileSync(join(kj, "config/live.env"), "KEY_GRANT_POLYGON_LIVE=1\nKEY_GRANT_POLYGON_ALLOWED_INTENTS=x\n");
  assert.equal(guard("run", "first-run").status, 0);
  assert.match(log(), /-e KEY_GRANT_TICK_MODE=first-run -v \S+\/config\/live\.env:\/run\/kj\/live\.env:ro/);
  assert.equal(event(guard("reap", "first-run").out), "reaped");
  assert.equal(existsSync(join(kj, "config/live.env")), false);
});

test("fence: marker then table per generation; unfence N releases N only, marker before table", () => {
  const { guard, tables, markers, log } = setup();
  assert.equal(event(guard("fence", "fence_query_failed").out), "fenced");
  assert.equal(event(guard("fence", "fence_stop_hung").out), "fenced");
  const [first, second] = markers();
  assert.deepEqual(tables(), [first, second].sort());
  const released = guard("unfence", first!);
  assert.equal(event(released.out), "released", released.out);
  assert.deepEqual(markers(), [second]);
  assert.deepEqual(tables(), [second], "generation M still blocks after N is removed");
  assert.doesNotMatch(log(), /marker_present_at_delete/);
  assert.match(log(), /systemctl stop docker\.socket docker\.service/);
  assert.equal(event(guard("run", "tick").out), "fenced");
  assert.equal(event(guard("fence", "rm -rf").out), "reason_invalid");
});

test("unfence holds when any tick or first-run container is still listed after the daemon reconcile", () => {
  const { stub, guard, markers } = setup();
  guard("fence", "fence_unknown_quiescence");
  const [n] = markers();
  writeFileSync(join(stub, "ps"), `${"c".repeat(64)} tick\n`);
  assert.equal(event(guard("unfence", n!).out), "container_present");
  assert.deepEqual(markers(), [n]);
});

test("the mailer still runs while fenced; a reap whose query fails fences a chain-capable unit", () => {
  const { kj, stub, guard, markers } = setup();
  writeFileSync(join(kj, "fence/0123456789abcdef"), "x");
  assert.equal(guard("run", "mail").status, 0);
  rmSync(join(kj, "fence/0123456789abcdef"));
  writeFileSync(join(stub, "ps_fail"), "");
  assert.equal(event(guard("reap", "tick").out), "reap_unproven");
  assert.equal(markers().length, 1);
  const spooled = readdirSync(join(kj, "alerts/spool")).filter((name) => /^slot-\d{3}\.alert\.json$/.test(name));
  assert.equal(spooled.length, 1);
  assert.deepEqual(JSON.parse(readFileSync(join(kj, "alerts/spool", spooled[0]!), "utf8")), { kind: "fence", reason: "fence_query_failed" });
});
