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
const MAIL_ENV = ["MEMBER_AUTH_MAIL_MODE=smtp", "MEMBER_AUTH_SMTP_HOST=smtp.zeptomail.com", "MEMBER_AUTH_SMTP_PORT=465",
  "MEMBER_AUTH_SMTP_USERNAME=x", "MEMBER_AUTH_SMTP_PASSWORD=x", "MEMBER_AUTH_SMTP_FROM=x@example.com", "KEY_GRANT_ALERT_TO=x@example.com"].join("\n") + "\n";
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
  inspect) id="\${@: -1}"; if [ -f "$STUB/inspect" ]; then cat "$STUB/inspect"; else echo "$id ${IMAGE} \$(cat "$STUB/unit" 2>/dev/null || echo tick) $INVOCATION_ID"; fi ;;
  run) exit 0 ;;
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
      [ -e "$STUB/nft_delete_fail" ] && exit 1
      if [ ! -e "$KJ_ROOT/fence/$n" ]; then echo "marker_gone_before_delete $n" >>"$STUB/log"; fi; rm -f "$STUB/tables/$n"
      if [ -e "$STUB/nft_fail_after_delete" ]; then : >"$STUB/nft_fail"; fi ;;
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
  writeFileSync(join(kj, "mail/alert-mail.env"), MAIL_ENV);
  chmodSync(GUARD, 0o755);
  const guard = (...args: string[]) => {
    const result = spawnSync("bash", [GUARD, ...args], { encoding: "utf8", env: {
      PATH: `${bin}:${process.env.PATH}`, KJ_ROOT: kj, KJ_RUN: join(root, "run"), STUB: stub, INVOCATION_ID: INVOCATION } as unknown as NodeJS.ProcessEnv });
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
  assert.doesNotMatch(log(), /marker_gone_before_delete/, "the marker stays until the table is confirmed gone");
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

test("a fence needs no guard.conf: the marker and the table go in even when the configuration is missing", () => {
  const { kj, guard, markers, tables } = setup();
  rmSync(join(kj, "config/guard.conf"));
  const fenced = guard("fence", "fence_unknown_quiescence");
  assert.equal(markers().length, 1, "the intent is durable first");
  assert.deepEqual(tables(), markers(), "the drop is installed with the K2 bridge name");
  assert.equal(event(fenced.out), "fence_incomplete", "no owned-definition hash to verify against: escalated, marker kept");
  assert.equal(event(guard("run", "tick").out), "conf_missing");
});

test("receipt: read role only, the DB network only, no signer or RPC mount", () => {
  const { kj, guard, log } = setup();
  assert.equal(event(guard("receipt", "nope").out), "signer_invalid");
  assert.equal(event(guard("receipt", `0x${"2".repeat(40)}`).out), "receipt_env_refused");
  writeFileSync(join(kj, "config/queue-read.env"), "DATABASE_URI=x\nPAYLOAD_SECRET=x\n");
  assert.equal(guard("receipt", `0x${"2".repeat(40)}`).status, 0);
  const run = log().split("\n").find((line) => line.startsWith("docker run")) ?? "";
  assert.match(run, /--network sophomores-review-db -v \S+\/config\/queue-read\.env:\/run\/kj\/queue-read\.env:ro/);
  assert.doesNotMatch(run, /polygon-(rpc|key-granter)|sophomores-key-grant-egress|key-job\.env/);
  assert.match(run, /scripts\/key-grant-queue-read\.ts --signer 0x2{40}$/);
});

test("the mailer still runs while fenced; a reap whose query fails fences a chain-capable unit", () => {
  const { kj, stub, guard, markers } = setup();
  writeFileSync(join(kj, "fence/0123456789abcdef"), "x");
  assert.equal(guard("run", "mail").status, 0);
  rmSync(join(kj, "fence/0123456789abcdef"));
  writeFileSync(join(stub, "ps_fail"), "");
  assert.equal(event(guard("reap", "tick").out), "query_failed");
  assert.equal(markers().length, 1);
  const spooled = readdirSync(join(kj, "alerts/spool")).filter((name) => /^slot-\d{3}\.alert\.json$/.test(name));
  assert.equal(spooled.length, 1);
  assert.deepEqual(JSON.parse(readFileSync(join(kj, "alerts/spool", spooled[0]!), "utf8")), { kind: "fence", reason: "fence_query_failed" });
});

const RUN_OTHER = "f".repeat(32);

test("reap fails closed: an early exit of a chain-capable reap fences, and the permit goes first", () => {
  const { kj, stub, guard, markers } = setup();
  const conf = readFileSync(join(kj, "config/guard.conf"), "utf8");
  rmSync(join(kj, "config/guard.conf"));
  writeFileSync(join(kj, "config/live.env"), "KEY_GRANT_POLYGON_LIVE=1\nKEY_GRANT_POLYGON_ALLOWED_INTENTS=x\n");
  assert.equal(event(guard("reap", "first-run").out), "conf_missing");
  assert.equal(existsSync(join(kj, "config/live.env")), false, "the permit is deleted before anything that can fail");
  assert.equal(markers().length, 1, "a reap that couldn't prove anything fences");
  writeFileSync(join(kj, "config/guard.conf"), conf);
  mkdirSync(join(root, "run/tick"), { recursive: true });
  writeFileSync(join(root, "run/tick", `${INVOCATION}.cid`), "not-an-id");
  assert.equal(event(guard("reap", "tick").out), "cid_invalid");
  assert.equal(markers().length, 2);
  writeFileSync(join(root, "run/tick", `${INVOCATION}.cid`), CID);
  writeFileSync(join(stub, "ps"), "garbage line\n");
  assert.equal(event(guard("reap", "tick").out), "query_failed", "Docker output is checked as data");
  assert.equal(markers().length, 3);
  assert.equal(event(guard("reap", "mail").out), "query_failed");
  assert.equal(markers().length, 3, "the mailer is not chain-capable: no fence");
});

test("reap: a CID record alone never authorizes rm; the listed container's labels and image must match", () => {
  const { stub, guard, log, markers } = setup();
  mkdirSync(join(root, "run/tick"), { recursive: true });
  writeFileSync(join(root, "run/tick", `${INVOCATION}.cid`), CID);
  writeFileSync(join(stub, "ps"), `${CID} exited ${RUN_OTHER}\n`);
  assert.equal(event(guard("reap", "tick").out), "cid_label_mismatch");
  assert.doesNotMatch(log(), /docker rm/);
  writeFileSync(join(stub, "ps"), `${CID} exited ${INVOCATION}\n`);
  writeFileSync(join(stub, "inspect"), `${CID} sha256:${"9".repeat(64)} tick ${INVOCATION}\n`);
  assert.equal(event(guard("reap", "tick").out), "container_mismatch");
  assert.doesNotMatch(log(), /docker rm/);
  assert.equal(markers().length, 2);
  rmSync(join(stub, "inspect"));
  assert.equal(event(guard("reap", "tick").out), "reaped");
  assert.match(log(), new RegExp(`docker rm -f ${CID}`));
  assert.equal(existsSync(join(root, "run/tick", `${INVOCATION}.cid`)), false, "a proven record is pruned");
});

test("unfence proves the generation before changing anything, and refuses on any disagreement", () => {
  const { kj, stub, guard, log, markers } = setup();
  guard("fence", "fence_unknown_quiescence");
  const [n] = markers();
  writeFileSync(join(stub, "nft_fail"), "");
  assert.equal(event(guard("unfence", n!).out), "generation_unreadable");
  rmSync(join(stub, "nft_fail"));
  rmSync(join(stub, "tables", n!));
  assert.equal(event(guard("unfence", n!).out), "generation_incomplete", "a marker without its table: let the sweep finish");
  assert.deepEqual(markers(), [n]);
  assert.doesNotMatch(log(), /systemctl stop/, "refused before the daemon is touched");
  writeFileSync(join(stub, "tables", n!), "");
  rmSync(join(kj, "fence", n!));
  assert.equal(event(guard("unfence", n!).out), "released", "an orphan table from a release that died is finished");
});

test("config is parsed as data: unknown keys, duplicates or shell syntax refuse", () => {
  const { kj, guard } = setup();
  const conf = readFileSync(join(kj, "config/guard.conf"), "utf8");
  for (const bad of ["EXTRA=1", "IMAGE=$(id)", "DBNET=a b", 'BRIDGE="kjegress0"', `IMAGE=${IMAGE}`]) {
    writeFileSync(join(kj, "config/guard.conf"), `${conf}${bad}\n`);
    assert.equal(event(guard("run", "tick").out), "conf_invalid", bad);
  }
  writeFileSync(join(kj, "config/guard.conf"), conf.replace(/^FENCE_LIST_SHA=.*\n/m, ""));
  assert.equal(event(guard("run", "tick").out), "conf_invalid", "every key is required");
  for (const value of ['"quoted"', "'quoted'", " leading", "trailing ", "a#comment"]) {
    writeFileSync(join(kj, "config/guard.conf"), conf);
    writeFileSync(join(kj, "config/key-job.env"), `DATABASE_URI=${value}\n`);
    assert.equal(event(guard("run", "tick").out), "keyjob_env_refused", value);
  }
});

test("unfence keeps the marker when the delete fails or the listing after it fails", () => {
  const { stub, guard, markers } = setup();
  guard("fence", "fence_unknown_quiescence");
  const [n] = markers();
  writeFileSync(join(stub, "nft_delete_fail"), "");
  assert.equal(event(guard("unfence", n!).out), "table_delete_failed");
  assert.deepEqual(markers(), [n]);
  rmSync(join(stub, "nft_delete_fail"));
  writeFileSync(join(stub, "nft_fail_after_delete"), "");
  assert.equal(event(guard("unfence", n!).out), "release_unverified");
  assert.deepEqual(markers(), [n], "admission stays refused by the marker");
  rmSync(join(stub, "nft_fail")); rmSync(join(stub, "nft_fail_after_delete"));
  assert.equal(event(guard("sweep").out), "swept", "the sweep restores the table for the kept marker (fail closed)");
  assert.equal(event(guard("unfence", n!).out), "released");
});

test("mail env: exactly the mailer's seven keys, all required, mode smtp", () => {
  const { kj, guard } = setup();
  for (const env of [MAIL_ENV.replace(/^MEMBER_AUTH_SMTP_FROM=.*\n/m, ""), `${MAIL_ENV}MEMBER_AUTH_SMTP_EXTRA=x\n`,
    MAIL_ENV.replace("MEMBER_AUTH_MAIL_MODE=smtp", "MEMBER_AUTH_MAIL_MODE=disabled")]) {
    writeFileSync(join(kj, "mail/alert-mail.env"), env);
    assert.equal(event(guard("run", "mail").out), "mail_env_refused");
  }
});
