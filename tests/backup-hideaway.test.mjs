import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, chmodSync, symlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = new URL("../deployment/ops/backup-hideaway.sh", import.meta.url);
const id = "20261010T180000Z";
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "hideaway-backup-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin"); mkdirSync(bin);
  const base = join(dir, "backups");
  const media = Array.from({ length: 5 }, (_, index) => join(dir, `media-${index}`));
  for (const path of media) { mkdirSync(path); writeFileSync(join(path, "item.txt"), "original"); }
  let source = readFileSync(script, "utf8")
    .replace("(( EUID == 0 ))", "true")
    .replace("/var/lib/hideaway-backups", base)
    .replace("PATH=/usr/sbin:/usr/bin:/sbin:/bin", `PATH=${bin}:$PATH`);
  const paths = ["var/lib/docker/volumes/theestate_payload_assets_media/_data", "var/lib/docker/volumes/theestate_payload_media/_data", "var/lib/docker/volumes/theestate_payload_track_media/_data", "var/lib/docker/volumes/theestate_payload_users/_data", "opt/thehideaway/assets"];
  for (let index = 0; index < paths.length; index++) source = source.replace(paths[index], media[index].slice(1));
  const recoveryPaths = ["home/deploy/thehideaway", "etc/age/keys.txt", "etc/letsencrypt", "usr/local/bin/certbot-reload-nginx", "var/lib/hideaway/current-tag", "var/lib/hideaway/previous-tag", "var/lib/sophomores-ops/tls-20261010"];
  for (const path of recoveryPaths) source = source.replaceAll(path, join(dir, "root", path).slice(1));
  for (const path of ["home/deploy/thehideaway/nginx", "home/deploy/thehideaway/scripts", "etc/letsencrypt/renewal-hooks/deploy", "var/lib/sophomores-ops/tls-20261010"]) mkdirSync(join(dir, "root", path), { recursive: true });
  for (const path of ["home/deploy/thehideaway/compose.prod.yaml", "home/deploy/thehideaway/.env.production.enc", "home/deploy/thehideaway/.sops.yaml", "etc/age/keys.txt", "usr/local/bin/certbot-reload-nginx", "var/lib/hideaway/current-tag", "var/lib/hideaway/previous-tag"]) {
    const target = join(dir, "root", path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, "fixture");
  }
  symlinkSync(join(dir, "root/usr/local/bin/certbot-reload-nginx"), join(dir, "root/etc/letsencrypt/renewal-hooks/deploy/20-hideaway-nginx"));
  const target = join(dir, "capture.sh"); writeFileSync(target, source);
  function mock(name, body) { writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o700 }); }
  mock("flock", "exit 0");
  mock("age", "cat");
  mock("zstd", "cat");
  mock("tar", 'case " $* " in *" -xf "*) cat >/dev/null ;; *) printf archive ;; esac');
  mock("git", "printf fixture");
  mock("rm", 'for last do :; done; exec /bin/rm -rf "$last"');
  mock("docker", `if [ "$1" = inspect ] && [ "$2" = --format ]; then
    printf 'sha256:${"a".repeat(64)}\\nsha256:${"b".repeat(64)}\\nsha256:${"c".repeat(64)}\\n'
  elif [ "$1" = inspect ]; then printf '[{"Id":"app","State":{"StartedAt":"stable"}},{"Id":"db","State":{"StartedAt":"stable"}},{"Id":"proxy","State":{"StartedAt":"stable"}}]\\n'
  elif [ "$1 $2" = "image inspect" ]; then printf '[{"Id":"app"},{"Id":"db"},{"Id":"proxy"}]'
  elif [ "$1" = image ]; then printf image
  else cat >/dev/null; printf dump; fi`);
  const recipient = join(dir, "recipient"); writeFileSync(recipient, `age1${"q".repeat(58)}\n`);
  function run(stage, runId = id, extra = []) {
    return spawnSync("bash", [target, stage, runId, ...extra], { encoding: "utf8" });
  }
  return { dir, base, run, mock, recipient, media, bin };
}

test("rejects bad stage and unsafe run identifiers before creating backups", (t) => {
  const f = fixture(t);
  assert.notEqual(f.run("deploy").status, 0);
  assert.notEqual(f.run("init", "../../oops", [f.recipient]).status, 0);
  assert.equal(existsSync(f.base), false);
});
test("init is immutable and rejects an existing run", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  assert.notEqual(f.run("init", id, [f.recipient]).status, 0);
});
test("invalid recipient fails closed", (t) => {
  const f = fixture(t); writeFileSync(f.recipient, "ssh-rsa invalid\n");
  assert.notEqual(f.run("init", id, [f.recipient]).status, 0);
});
test("pipeline failure keeps ciphertext partial and blocks unsafe replay", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  f.mock("docker", "printf partial; exit 17");
  assert.notEqual(f.run("db").status, 0);
  assert.equal(existsSync(join(f.base, id, "database.dump.age.partial")), true);
  assert.equal(existsSync(join(f.base, id, "database.dump.age")), false);
  assert.notEqual(f.run("db").status, 0);
});
test("out of order stages and check of incomplete capture fail closed", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  assert.notEqual(f.run("config").status, 0);
  assert.notEqual(f.run("check").status, 0);
});
test("encryption failure cannot publish the database", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  f.mock("age", "cat; exit 23");
  assert.notEqual(f.run("db").status, 0);
  assert.equal(existsSync(join(f.base, id, "database.dump.age")), false);
});
test("media mutation during archive rejects capture and retains a partial", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  assert.equal(f.run("db").status, 0);
  f.mock("tar", `printf changed > '${join(f.media[0], "item.txt")}'; printf archive`);
  assert.notEqual(f.run("media").status, 0);
  assert.equal(existsSync(join(f.base, id, "media.tar.zst.age")), false);
  assert.equal(existsSync(join(f.base, id, "media.tar.zst.age.partial")), true);
});
test("unchanged media capture publishes only after both inventories agree", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  assert.equal(f.run("db").status, 0);
  assert.equal(f.run("media").status, 0);
  assert.equal(existsSync(join(f.base, id, "media.tar.zst.age")), true);
  assert.equal(existsSync(join(f.base, id, "media.tar.zst.age.partial")), false);
});
test("check validates ciphertext hashes without source access", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  const run = join(f.base, id);
  const files = ["database.dump.age", "globals.sql.age", "source-evidence.txt.age", "media.tar.zst.age", "config.tar.zst.age", "nginx-image.tar.zst.age"].map((name) => {
    writeFileSync(join(run, name), "ciphertext");
    return { name, bytes: 10, sha256: createHash("sha256").update("ciphertext").digest("hex") };
  });
  writeFileSync(join(run, "manifest.json"), JSON.stringify({ state: "complete", files }));
  writeFileSync(join(run, "finalize.done"), "complete");
  assert.notEqual(f.run("check").status, 0, "plaintext scratch blocks completion");
  rmSync(join(run, "private-scratch"), { recursive: true });
  f.mock("docker", "exit 99");
  assert.equal(f.run("check").status, 0);
  writeFileSync(join(run, "database.dump.age"), "corruption");
  assert.notEqual(f.run("check").status, 0);
});
test("rejects an insecure backup directory", (t) => {
  const f = fixture(t); mkdirSync(f.base); chmodSync(f.base, 0o755);
  assert.notEqual(f.run("init", id, [f.recipient]).status, 0);
});
test("rejects a symlinked backup base", (t) => {
  const f = fixture(t); symlinkSync(f.media[0], f.base);
  assert.notEqual(f.run("init", id, [f.recipient]).status, 0);
});
test("container identity drift prevents final manifest publication", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  writeFileSync(join(f.base, id, "config.done"), "complete");
  f.mock("docker", 'printf \'[{"Id":"replacement","State":{"StartedAt":"stable"}},{"Id":"db","State":{"StartedAt":"stable"}},{"Id":"proxy","State":{"StartedAt":"stable"}}]\\n\'');
  assert.notEqual(f.run("finalize").status, 0);
  assert.equal(existsSync(join(f.base, id, "manifest.json")), false);
  assert.equal(existsSync(join(f.base, id, "finalize.done")), false);
});
test("failed nginx image export remains partial and blocks config completion", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  assert.equal(f.run("db").status, 0);
  assert.equal(f.run("media").status, 0);
  const docker = join(f.bin, "docker");
  writeFileSync(docker, readFileSync(docker, "utf8").replace("elif [ \"$1\" = image ];", 'elif [ "$1 $2" = "image save" ]; then printf partial; exit 17\n  elif [ "$1" = image ];'));
  assert.notEqual(f.run("config").status, 0);
  assert.equal(existsSync(join(f.base, id, "nginx-image.tar.zst.age.partial")), true);
  assert.equal(existsSync(join(f.base, id, "nginx-image.tar.zst.age")), false);
  assert.equal(existsSync(join(f.base, id, "config.done")), false);
});
test("all stages complete, remove owned plaintext scratch and validate six artifacts", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", id, [f.recipient]).status, 0);
  for (const stage of ["db", "media", "config", "finalize", "check"]) {
    const result = f.run(stage);
    assert.equal(result.status, 0, `${stage}: ${result.stderr}`);
    if (stage === "config") {
      // Recovery metadata must be one JSON array, not concatenated arrays.
      const images = JSON.parse(readFileSync(join(f.base, id, "private-scratch/image-inspect.json"), "utf8"));
      assert.equal(images.length, 3);
    }
  }
  const run = join(f.base, id);
  assert.equal(existsSync(join(run, "private-scratch")), false);
  assert.equal(JSON.parse(readFileSync(join(run, "manifest.json"), "utf8")).files.length, 6);
  assert.notEqual(f.run("finalize").status, 0);
});
